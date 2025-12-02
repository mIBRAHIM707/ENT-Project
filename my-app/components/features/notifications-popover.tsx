"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, MessageCircle, X, Inbox, ChevronRight, ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Notification {
  id: string;
  type: "message";
  conversationId: string;
  jobId: string;
  jobTitle: string;
  senderId: string;
  senderEmail: string;
  content: string;
  createdAt: string;
  read: boolean;
}

// Conversation thread for the full inbox view
interface ConversationThread {
  conversationId: string;
  jobId: string;
  jobTitle: string;
  otherUserId: string;
  otherUserEmail: string;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageFromMe: boolean;
  messageCount: number;
  isJobOwner: boolean; // true if current user owns the job
}

interface NotificationsPopoverProps {
  userId: string | null;
  onOpenChat?: (jobId: string, conversationId: string) => void;
}

// Helper to extract reg number from email
function extractRegNumber(email: string | null | undefined): string {
  if (!email) return "User";
  const match = email.match(/[a-z]?(\d+)@/i);
  return match ? match[1] : "User";
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function NotificationsPopover({ userId, onOpenChat }: NotificationsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showFullInbox, setShowFullInbox] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const supabase = createClient();

  // Fetch all conversation threads for full inbox view
  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    setLoadingConversations(true);

    try {
      // Get conversations where user is the worker
      const { data: workerConvs } = await supabase
        .from("conversations")
        .select(`
          id,
          job_id,
          worker_id,
          jobs (
            id,
            title,
            user_id
          )
        `)
        .eq("worker_id", userId);

      // Get all conversations to find ones where user owns the job
      const { data: allConvs } = await supabase
        .from("conversations")
        .select(`
          id,
          job_id,
          worker_id,
          jobs (
            id,
            title,
            user_id
          )
        `);

      // Combine conversations
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

      // Build conversation threads
      const threads: ConversationThread[] = [];

      for (const conv of myConversations) {
        const job = conv.jobs as unknown as { id: string; title: string; user_id: string };
        const isJobOwner = job.user_id === userId;
        const otherUserId = isJobOwner ? conv.worker_id : job.user_id;

        // Get the other user's profile
        const { data: otherProfile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", otherUserId)
          .single();

        // Get message count and last message
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
            lastMessage: lastMessage.content,
            lastMessageAt: lastMessage.created_at,
            lastMessageFromMe: lastMessage.sender_id === userId,
            messageCount: count || 0,
            isJobOwner,
          });
        }
      }

      // Sort by last message date
      threads.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

      setConversations(threads);
    } finally {
      setLoadingConversations(false);
    }
  }, [userId, supabase]);

  // Fetch notifications on mount (for the popover - shows latest messages from others)
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    // Get conversations where user is the worker
    const { data: workerConvs } = await supabase
      .from("conversations")
      .select(`
        id,
        job_id,
        worker_id,
        jobs (
          id,
          title,
          user_id
        )
      `)
      .eq("worker_id", userId);

    // Get all conversations to find ones where user owns the job
    const { data: allConvs } = await supabase
      .from("conversations")
      .select(`
        id,
        job_id,
        worker_id,
        jobs (
          id,
          title,
          user_id
        )
      `);

    // Combine conversations
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

    // Get latest message from each conversation where user is NOT the sender
    const notifs: Notification[] = [];

    for (const conv of myConversations) {
      const { data: latestMessage } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conv.id)
        .neq("sender_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latestMessage) {
        // Get sender profile
        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", latestMessage.sender_id)
          .single();

        const job = conv.jobs as unknown as { id: string; title: string; user_id: string };

        notifs.push({
          id: latestMessage.id,
          type: "message",
          conversationId: conv.id,
          jobId: job.id,
          jobTitle: job.title,
          senderId: latestMessage.sender_id,
          senderEmail: senderProfile?.email || "",
          content: latestMessage.content,
          createdAt: latestMessage.created_at,
          read: false,
        });
      }
    }

    // Sort by date, newest first
    notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setNotifications(notifs);
    setUnreadCount(notifs.length);
  }, [userId, supabase]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!userId) return;

    let channel: RealtimeChannel;

    const setupRealtime = async () => {
      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          async (payload) => {
            // Check if this message is for a conversation the user is part of
            const { data: conv } = await supabase
              .from("conversations")
              .select(`
                id,
                job_id,
                worker_id,
                jobs (
                  id,
                  title,
                  user_id
                )
              `)
              .eq("id", payload.new.conversation_id)
              .single();

            if (!conv) return;

            const job = conv.jobs as unknown as { id: string; title: string; user_id: string };
            const isUserInConversation = conv.worker_id === userId || job.user_id === userId;
            const isFromOtherUser = payload.new.sender_id !== userId;

            if (isUserInConversation && isFromOtherUser) {
              // Get sender profile
              const { data: senderProfile } = await supabase
                .from("profiles")
                .select("email")
                .eq("id", payload.new.sender_id)
                .single();

              const newNotif: Notification = {
                id: payload.new.id,
                type: "message",
                conversationId: conv.id,
                jobId: job.id,
                jobTitle: job.title,
                senderId: payload.new.sender_id,
                senderEmail: senderProfile?.email || "",
                content: payload.new.content,
                createdAt: payload.new.created_at,
                read: false,
              };

              setNotifications((prev) => {
                // Remove old notification from same conversation
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

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId, supabase]);

  const handleNotificationClick = (notif: Notification) => {
    if (onOpenChat) {
      onOpenChat(notif.jobId, notif.conversationId);
    }
    setIsOpen(false);
  };

  const handleConversationClick = (thread: ConversationThread) => {
    if (onOpenChat) {
      onOpenChat(thread.jobId, thread.conversationId);
    }
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
      {/* Notification Bell Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
      >
        <Bell className="h-[18px] w-[18px] text-zinc-600 dark:text-zinc-400" />
        
        {/* Notification Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-lg shadow-emerald-500/30"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Popover Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] z-50 overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl shadow-zinc-200/50 dark:shadow-zinc-950/50"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/10">
                    <Inbox className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-white">Inbox</h3>
                    {unreadCount > 0 && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {unreadCount} new message{unreadCount > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="overflow-y-auto max-h-[380px] scrollbar-premium">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
                      <MessageCircle className="h-7 w-7 text-zinc-400" />
                    </div>
                    <p className="text-zinc-900 dark:text-white font-medium mb-1">All caught up!</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
                      New messages will appear here
                    </p>
                  </div>
                ) : (
                  <div className="py-2">
                    {notifications.map((notif, index) => (
                      <motion.button
                        key={notif.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleNotificationClick(notif)}
                        className={`w-full flex items-start gap-3.5 px-5 py-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                          !notif.read ? "bg-emerald-50/50 dark:bg-emerald-500/5" : ""
                        }`}
                      >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-11 w-11 rounded-xl ring-2 ring-white dark:ring-zinc-800 shadow-md">
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${notif.senderId}`}
                              className="rounded-xl"
                            />
                            <AvatarFallback className="rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 text-white font-bold text-sm">
                              {extractRegNumber(notif.senderEmail).slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          {/* Message type indicator */}
                          <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-zinc-900">
                            <MessageCircle className="h-2.5 w-2.5 text-white" />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <p className="font-semibold text-zinc-900 dark:text-white text-sm">
                              {extractRegNumber(notif.senderEmail)}
                            </p>
                            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex-shrink-0">
                              {formatRelativeTime(notif.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                            {notif.jobTitle}
                          </p>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2">
                            {notif.content}
                          </p>
                        </div>

                        {/* Unread indicator */}
                        {!notif.read && (
                          <div className="flex-shrink-0 mt-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                <button 
                  onClick={() => {
                    setIsOpen(false); // Close the popover first
                    setShowFullInbox(true);
                    fetchConversations();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  View all conversations
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Full Inbox Modal - Conversations View */}
      <AnimatePresence>
        {showFullInbox && (
          <>
            {/* Full Screen Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFullInbox(false)}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            />

            {/* Full Inbox Panel */}
            <motion.div
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 z-[101] w-full max-w-md h-screen bg-white dark:bg-zinc-900 shadow-2xl"
              style={{ height: '100vh' }}
            >
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-10">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowFullInbox(false)}
                    className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Conversations</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {conversations.length} active chat{conversations.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowFullInbox(false)}
                  className="h-9 w-9 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Conversations List */}
              <div className="absolute top-[88px] left-0 right-0 bottom-0 overflow-y-auto scrollbar-premium bg-white dark:bg-zinc-900">
                {loadingConversations ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="mt-4 text-sm text-zinc-500">Loading conversations...</p>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-6 bg-white dark:bg-zinc-900">
                    <div className="flex items-center justify-center w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-5">
                      <Users className="h-9 w-9 text-zinc-400" />
                    </div>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">No conversations yet</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
                      Start chatting by applying to a gig or when someone applies to yours
                    </p>
                  </div>
                ) : (
                  <div className="p-4 space-y-3 bg-white dark:bg-zinc-900 min-h-full">
                    {conversations.map((thread, index) => (
                      <motion.button
                        key={thread.conversationId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.05, 0.3) }}
                        onClick={() => handleConversationClick(thread)}
                        className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-4 text-left transition-all hover:shadow-lg hover:scale-[1.02] border border-zinc-200 dark:border-zinc-700 shadow-sm"
                      >
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <Avatar className="h-14 w-14 rounded-2xl ring-2 ring-zinc-100 dark:ring-zinc-800 shadow-md">
                              <AvatarImage
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${thread.otherUserId}`}
                                className="rounded-2xl"
                              />
                              <AvatarFallback className="rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold text-lg">
                                {extractRegNumber(thread.otherUserEmail).slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            {/* Role indicator */}
                            <div className={`absolute -bottom-1 -right-1 flex items-center justify-center w-6 h-6 rounded-full ring-2 ring-white dark:ring-zinc-900 ${
                              thread.isJobOwner 
                                ? "bg-purple-500" 
                                : "bg-blue-500"
                            }`}>
                              <span className="text-[10px] font-bold text-white">
                                {thread.isJobOwner ? "👤" : "💼"}
                              </span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="font-bold text-zinc-900 dark:text-white text-base">
                                {extractRegNumber(thread.otherUserEmail)}
                              </p>
                              <span className="text-xs text-zinc-400 dark:text-zinc-500 flex-shrink-0">
                                {formatRelativeTime(thread.lastMessageAt)}
                              </span>
                            </div>
                            
                            {/* Job title badge */}
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                thread.isJobOwner 
                                  ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                              }`}>
                                {thread.isJobOwner ? "Your gig" : "Applied"}
                              </span>
                              <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                {thread.jobTitle}
                              </span>
                            </div>
                            
                            {/* Last message */}
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-1">
                              {thread.lastMessageFromMe && (
                                <span className="text-zinc-400 dark:text-zinc-500">You: </span>
                              )}
                              {thread.lastMessage}
                            </p>
                          </div>

                          {/* Message count & Arrow */}
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                {thread.messageCount}
                              </span>
                            </div>
                            <ChevronRight className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />
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
