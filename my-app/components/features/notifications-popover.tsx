"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, MessageSquare, X, ChevronRight, ArrowLeft, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Create a single instance outside the component to prevent re-creation
const supabase = createClient();

interface Notification {
  id: string;
  type: "message";
  conversationId: string;
  jobId: string;
  jobTitle: string;
  senderId: string;
  senderEmail: string;
  senderName: string | null;
  content: string;
  createdAt: string;
  read: boolean;
}

interface ConversationThread {
  conversationId: string;
  jobId: string;
  jobTitle: string;
  otherUserId: string;
  otherUserEmail: string;
  otherUserName: string | null;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageFromMe: boolean;
  messageCount: number;
  isJobOwner: boolean;
}

interface NotificationsPopoverProps {
  userId: string | null;
  onOpenChat?: (jobId: string, conversationId: string) => void;
}

function extractRegNumber(email: string | null | undefined): string {
  if (!email) return "User";
  const match = email.match(/[a-z]?(\d+)@/i);
  return match ? match[1] : "User";
}

// Get display name or fall back to roll number
function getDisplayName(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim()) return name;
  return extractRegNumber(email);
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function NotificationsPopover({ userId, onOpenChat }: NotificationsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showFullInbox, setShowFullInbox] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingConversations, setLoadingConversations] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    setLoadingConversations(true);

    try {
      const { data: workerConvs } = await supabase
        .from("conversations")
        .select(`id, job_id, worker_id, jobs (id, title, user_id)`)
        .eq("worker_id", userId);

      const { data: allConvs } = await supabase
        .from("conversations")
        .select(`id, job_id, worker_id, jobs (id, title, user_id)`);

      const myConversations = [...(workerConvs || [])];
      const seenIds = new Set(myConversations.map(c => c.id));
      
      for (const conv of allConvs || []) {
        const job = conv.jobs as unknown as { id: string; title: string; user_id: string };
        if (job && job.user_id === userId && !seenIds.has(conv.id)) {
          myConversations.push(conv);
        }
      }

      if (myConversations.length === 0) {
        setConversations([]);
        return;
      }

      const threads: ConversationThread[] = [];

      for (const conv of myConversations) {
        const job = conv.jobs as unknown as { id: string; title: string; user_id: string };
        const isJobOwner = job.user_id === userId;
        const otherUserId = isJobOwner ? conv.worker_id : job.user_id;

        const { data: otherProfile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", otherUserId)
          .maybeSingle();

        const { data: messages, count } = await supabase
          .from("messages")
          .select("*", { count: "exact" })
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const lastMessage = messages?.[0];

        if (lastMessage) {
          threads.push({
            conversationId: conv.id,
            jobId: job.id,
            jobTitle: job.title,
            otherUserId,
            otherUserEmail: otherProfile?.email || "",
            otherUserName: otherProfile?.full_name || null,
            lastMessage: lastMessage.content,
            lastMessageAt: lastMessage.created_at,
            lastMessageFromMe: lastMessage.sender_id === userId,
            messageCount: count || 0,
            isJobOwner,
          });
        }
      }

      threads.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      setConversations(threads);
    } finally {
      setLoadingConversations(false);
    }
  }, [userId]);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    const { data: workerConvs } = await supabase
      .from("conversations")
      .select(`id, job_id, worker_id, jobs (id, title, user_id)`)
      .eq("worker_id", userId);

    const { data: allConvs } = await supabase
      .from("conversations")
      .select(`id, job_id, worker_id, jobs (id, title, user_id)`);

    const myConversations = [...(workerConvs || [])];
    const seenIds = new Set(myConversations.map(c => c.id));
    
    for (const conv of allConvs || []) {
      const job = conv.jobs as unknown as { id: string; title: string; user_id: string };
      if (job && job.user_id === userId && !seenIds.has(conv.id)) {
        myConversations.push(conv);
      }
    }

    if (myConversations.length === 0) {
      setNotifications([]);
      return;
    }

    const notifs: Notification[] = [];

    for (const conv of myConversations) {
      const { data: latestMessage } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conv.id)
        .neq("sender_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestMessage) {
        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", latestMessage.sender_id)
          .maybeSingle();

        const job = conv.jobs as unknown as { id: string; title: string; user_id: string };

        notifs.push({
          id: latestMessage.id,
          type: "message",
          conversationId: conv.id,
          jobId: job.id,
          jobTitle: job.title,
          senderId: latestMessage.sender_id,
          senderEmail: senderProfile?.email || "",
          senderName: senderProfile?.full_name || null,
          content: latestMessage.content,
          createdAt: latestMessage.created_at,
          read: false,
        });
      }
    }

    notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setNotifications(notifs);
    setUnreadCount(notifs.length);
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!userId) return;

    let channel: RealtimeChannel;

    const setupRealtime = async () => {
      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          async (payload) => {
            const { data: conv } = await supabase
              .from("conversations")
              .select(`id, job_id, worker_id, jobs (id, title, user_id)`)
              .eq("id", payload.new.conversation_id)
              .maybeSingle();

            if (!conv) return;

            const job = conv.jobs as unknown as { id: string; title: string; user_id: string };
            const isUserInConversation = conv.worker_id === userId || job.user_id === userId;
            const isFromOtherUser = payload.new.sender_id !== userId;

            if (isUserInConversation && isFromOtherUser) {
              const { data: senderProfile } = await supabase
                .from("profiles")
                .select("email, full_name")
                .eq("id", payload.new.sender_id)
                .maybeSingle();

              const newNotif: Notification = {
                id: payload.new.id,
                type: "message",
                conversationId: conv.id,
                jobId: job.id,
                jobTitle: job.title,
                senderId: payload.new.sender_id,
                senderEmail: senderProfile?.email || "",
                senderName: senderProfile?.full_name || null,
                content: payload.new.content,
                createdAt: payload.new.created_at,
                read: false,
              };

              setNotifications((prev) => {
                const filtered = prev.filter((n) => n.conversationId !== conv.id);
                return [newNotif, ...filtered];
              });
              setUnreadCount((prev) => prev + 1);
            }
          }
        )
        .subscribe();
    };

    setupRealtime();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [userId]);

  const handleNotificationClick = (notif: Notification) => {
    if (onOpenChat) onOpenChat(notif.jobId, notif.conversationId);
    setIsOpen(false);
  };

  const handleConversationClick = (thread: ConversationThread) => {
    if (onOpenChat) onOpenChat(thread.jobId, thread.conversationId);
    setShowFullInbox(false);
    setIsOpen(false);
  };

  const markAllAsRead = () => {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  if (!userId) return null;

  return (
    <div className="relative">
      {/* Bell Button - Apple Style */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-300"
      >
        <Bell className="h-[18px] w-[18px] text-zinc-700 dark:text-zinc-300" />
        
        {/* Badge - Spotify Green */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold shadow-lg shadow-emerald-500/40"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown - Anthropic/Apple Fusion */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />

            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              className="absolute right-0 top-full mt-3 w-[400px] z-50 rounded-3xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-zinc-200/50 dark:border-zinc-700/50 shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden"
            >
              {/* Header - Clean & Minimal */}
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900 dark:text-white">
                    Messages
                  </h2>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={markAllAsRead}
                        className="px-3 py-1.5 text-[13px] font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-full transition-colors"
                      >
                        Mark all read
                      </motion.button>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <X className="h-4 w-4 text-zinc-500" />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-[420px] overflow-y-auto scrollbar-none">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="relative mb-5">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center">
                        <MessageSquare className="h-8 w-8 text-zinc-400" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    </div>
                    <p className="text-[17px] font-semibold text-zinc-900 dark:text-white mb-1">All caught up</p>
                    <p className="text-[14px] text-zinc-500 dark:text-zinc-400 text-center max-w-[240px]">
                      You&apos;ll see new messages here when they arrive
                    </p>
                  </div>
                ) : (
                  <div className="px-3 pb-3 space-y-2">
                    {notifications.map((notif, index) => (
                      <motion.button
                        key={notif.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 30 }}
                        onClick={() => handleNotificationClick(notif)}
                        className={`w-full flex items-start gap-4 p-4 rounded-2xl text-left transition-all duration-200 group ${
                          !notif.read 
                            ? "bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200/50 dark:border-emerald-500/20" 
                            : "bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-800"
                        }`}
                      >
                        {/* Avatar with online indicator style */}
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-12 w-12 rounded-2xl shadow-md ring-2 ring-white dark:ring-zinc-800">
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${notif.senderId}`}
                              className="rounded-2xl"
                            />
                            <AvatarFallback className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white font-semibold">
                              {getDisplayName(notif.senderName, notif.senderEmail).slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          {!notif.read && (
                            <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <span className="font-semibold text-[15px] text-zinc-900 dark:text-white">
                              {getDisplayName(notif.senderName, notif.senderEmail)}
                            </span>
                            <span className="text-[12px] text-zinc-400 dark:text-zinc-500 tabular-nums">
                              {formatRelativeTime(notif.createdAt)}
                            </span>
                          </div>
                          <p className="text-[13px] text-emerald-600 dark:text-emerald-400 font-medium mb-1 truncate">
                            {notif.jobTitle}
                          </p>
                          <p className="text-[14px] text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-snug">
                            {notif.content}
                          </p>
                        </div>

                        {/* Arrow indicator on hover */}
                        <ChevronRight className="flex-shrink-0 w-5 h-5 text-zinc-300 dark:text-zinc-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer - View All Button */}
              <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    setIsOpen(false);
                    setShowFullInbox(true);
                    fetchConversations();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold text-[15px] hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                >
                  View all conversations
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Full Inbox Panel - Premium Slide-in */}
      <AnimatePresence>
        {showFullInbox && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setShowFullInbox(false)}
              className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 z-[101] w-full max-w-[480px] h-screen bg-white dark:bg-zinc-900"
              style={{ height: '100dvh' }}
            >
              {/* Header - Apple Style */}
              <div className="absolute top-0 left-0 right-0 z-10 px-6 py-5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50">
                <div className="flex items-center gap-4">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowFullInbox(false)}
                    className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                  </motion.button>
                  <div className="flex-1">
                    <h1 className="text-[24px] font-bold tracking-tight text-zinc-900 dark:text-white">
                      Conversations
                    </h1>
                    <p className="text-[14px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {conversations.length} active thread{conversations.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Conversations List */}
              <div className="absolute top-[100px] left-0 right-0 bottom-0 overflow-y-auto scrollbar-premium">
                {loadingConversations ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-2 border-zinc-200 dark:border-zinc-700" />
                      <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-emerald-500 animate-spin" />
                    </div>
                    <p className="mt-4 text-[14px] text-zinc-500">Loading conversations...</p>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full px-8">
                    <div className="relative mb-6">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center">
                        <Send className="h-10 w-10 text-emerald-500" />
                      </div>
                    </div>
                    <p className="text-[20px] font-semibold text-zinc-900 dark:text-white mb-2">No conversations yet</p>
                    <p className="text-[15px] text-zinc-500 dark:text-zinc-400 text-center max-w-[280px] leading-relaxed">
                      When you apply to a gig or someone applies to yours, your conversations will appear here
                    </p>
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    {conversations.map((thread, index) => (
                      <motion.button
                        key={thread.conversationId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 30 }}
                        onClick={() => handleConversationClick(thread)}
                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-3xl p-5 text-left transition-all duration-200 group border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                      >
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <Avatar className="h-14 w-14 rounded-2xl shadow-lg ring-2 ring-white dark:ring-zinc-700">
                              <AvatarImage
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${thread.otherUserId}`}
                                className="rounded-2xl"
                              />
                              <AvatarFallback className="rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold text-lg">
                                {getDisplayName(thread.otherUserName, thread.otherUserEmail).slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3 mb-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-semibold text-[16px] text-zinc-900 dark:text-white truncate">
                                  {getDisplayName(thread.otherUserName, thread.otherUserEmail)}
                                </span>
                                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  thread.isJobOwner 
                                    ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                                }`}>
                                  {thread.isJobOwner ? "Your gig" : "Applied"}
                                </span>
                              </div>
                              <span className="flex-shrink-0 text-[12px] text-zinc-400 dark:text-zinc-500 tabular-nums">
                                {formatRelativeTime(thread.lastMessageAt)}
                              </span>
                            </div>
                            
                            <p className="text-[13px] text-emerald-600 dark:text-emerald-400 font-medium truncate mb-1.5">
                              {thread.jobTitle}
                            </p>
                            
                            <p className="text-[14px] text-zinc-500 dark:text-zinc-400 truncate">
                              {thread.lastMessageFromMe && (
                                <span className="text-zinc-400 dark:text-zinc-500">You: </span>
                              )}
                              {thread.lastMessage}
                            </p>
                          </div>

                          {/* Right side */}
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <div className="flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-zinc-200/80 dark:bg-zinc-700/80">
                              <span className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-300">
                                {thread.messageCount}
                              </span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
