"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, MessageCircle, X, Inbox, ChevronRight, Clock, CheckCheck, ArrowLeft } from "lucide-react";
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

interface AllMessage {
  id: string;
  conversationId: string;
  jobId: string;
  jobTitle: string;
  senderId: string;
  senderEmail: string;
  content: string;
  createdAt: string;
  isFromMe: boolean;
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
  const [allMessages, setAllMessages] = useState<AllMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingAllMessages, setLoadingAllMessages] = useState(false);
  const supabase = createClient();

  // Fetch all messages for full inbox view
  const fetchAllMessages = useCallback(async () => {
    if (!userId) return;
    setLoadingAllMessages(true);

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

      // Get conversations where user owns the job
      const { data: ownerConvs } = await supabase
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

      // Combine and dedupe conversations
      const allConvs = [...(workerConvs || [])];
      const seenIds = new Set(allConvs.map(c => c.id));
      
      for (const conv of ownerConvs || []) {
        const job = conv.jobs as unknown as { id: string; title: string; user_id: string };
        if (job && job.user_id === userId && !seenIds.has(conv.id)) {
          allConvs.push(conv);
        }
      }

      if (allConvs.length === 0) {
        setAllMessages([]);
        return;
      }

      // Get ALL messages from all conversations
      const allMsgs: AllMessage[] = [];

      for (const conv of allConvs) {
        const { data: messages } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(50); // Limit per conversation

        if (messages) {
          for (const msg of messages) {
            // Get sender profile
            const { data: senderProfile } = await supabase
              .from("profiles")
              .select("email")
              .eq("id", msg.sender_id)
              .single();

            const job = conv.jobs as unknown as { id: string; title: string; user_id: string };

            allMsgs.push({
              id: msg.id,
              conversationId: conv.id,
              jobId: job.id,
              jobTitle: job.title,
              senderId: msg.sender_id,
              senderEmail: senderProfile?.email || "",
              content: msg.content,
              createdAt: msg.created_at,
              isFromMe: msg.sender_id === userId,
            });
          }
        }
      }

      // Sort by date, newest first
      allMsgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setAllMessages(allMsgs);
    } finally {
      setLoadingAllMessages(false);
    }
  }, [userId, supabase]);

  // Fetch notifications on mount
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

    // Get conversations where user owns the job
    const { data: ownerConvs } = await supabase
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

    // Combine and dedupe conversations
    const conversations = [...(workerConvs || [])];
    const seenIds = new Set(conversations.map(c => c.id));
    
    for (const conv of ownerConvs || []) {
      const job = conv.jobs as unknown as { id: string; title: string; user_id: string };
      if (job && job.user_id === userId && !seenIds.has(conv.id)) {
        conversations.push(conv);
      }
    }

    if (conversations.length === 0) {
      setNotifications([]);
      return;
    }

    // Get latest message from each conversation where user is NOT the sender
    const notifs: Notification[] = [];

    for (const conv of conversations) {
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
          read: false, // We'd need a read status table for proper tracking
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
                jobs!inner (
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
              {notifications.length > 0 && (
                <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                  <button 
                    onClick={() => {
                      setShowFullInbox(true);
                      fetchAllMessages();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                  >
                    View all messages
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Full Inbox Modal */}
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
              className="fixed right-0 top-0 bottom-0 z-[101] w-full max-w-lg bg-white dark:bg-zinc-900 shadow-2xl"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowFullInbox(false)}
                    className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">All Messages</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {allMessages.length} message{allMessages.length !== 1 ? "s" : ""}
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

              {/* Messages List */}
              <div className="h-[calc(100vh-88px)] overflow-y-auto scrollbar-premium">
                {loadingAllMessages ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="mt-4 text-sm text-zinc-500">Loading messages...</p>
                  </div>
                ) : allMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-6">
                    <div className="flex items-center justify-center w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-5">
                      <MessageCircle className="h-9 w-9 text-zinc-400" />
                    </div>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">No messages yet</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
                      Start a conversation by applying to a gig or when someone applies to yours
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {allMessages.map((msg, index) => (
                      <motion.button
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.02, 0.3) }}
                        onClick={() => {
                          if (onOpenChat) {
                            onOpenChat(msg.jobId, msg.conversationId);
                          }
                          setShowFullInbox(false);
                          setIsOpen(false);
                        }}
                        className="w-full flex items-start gap-4 px-6 py-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-12 w-12 rounded-xl ring-2 ring-white dark:ring-zinc-800 shadow-md">
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderId}`}
                              className="rounded-xl"
                            />
                            <AvatarFallback className="rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 text-white font-bold">
                              {extractRegNumber(msg.senderEmail).slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          {msg.isFromMe && (
                            <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900">
                              <CheckCheck className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-semibold text-zinc-900 dark:text-white">
                              {msg.isFromMe ? "You" : extractRegNumber(msg.senderEmail)}
                            </p>
                            <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
                              <Clock className="h-3 w-3" />
                              <span className="text-xs">
                                {formatRelativeTime(msg.createdAt)}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1.5">
                            {msg.jobTitle}
                          </p>
                          <p className="text-sm text-zinc-600 dark:text-zinc-300 line-clamp-2">
                            {msg.content}
                          </p>
                        </div>

                        <ChevronRight className="flex-shrink-0 h-5 w-5 text-zinc-300 dark:text-zinc-600 mt-3" />
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
