"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, 
  MessageCircle, 
  MapPin, 
  Clock, 
  Loader2,
  ArrowLeft,
  User,
  Users,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Types
interface Job {
  id: string;
  title: string;
  description?: string;
  price: number;
  urgency: string;
  location: string;
  userId: string;
  studentName: string;
  avatarUrl: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  senderEmail?: string;
}

interface Applicant {
  conversationId: string;
  workerId: string;
  workerEmail: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

interface ChatSheetProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string | null;
  currentUserEmail: string | null; // Available for future features
}

// Helper to extract reg number
function extractRegNumber(email: string | null | undefined): string {
  if (!email) return "User";
  const match = email.match(/[a-z]?(\d+)@/i);
  return match ? match[1] : "User";
}

export function ChatSheet({ 
  job, 
  isOpen, 
  onClose, 
  currentUserId,
}: ChatSheetProps) {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [otherUserEmail, setOtherUserEmail] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [isLoadingApplicants, setIsLoadingApplicants] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  const isOwner = currentUserId === job?.userId;

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Reset state when sheet closes or job changes
  useEffect(() => {
    if (!isOpen) {
      setActiveConversationId(null);
      setMessages([]);
      setNewMessage("");
      setOtherUserEmail(null);
      setApplicants([]);
    }
  }, [isOpen, job?.id]);

  // Fetch applicants for job owner
  useEffect(() => {
    if (!isOpen || !job || !currentUserId || !isOwner) return;

    const fetchApplicants = async () => {
      setIsLoadingApplicants(true);

      // Get all conversations for this job
      const { data: conversations, error } = await supabase
        .from("conversations")
        .select("id, worker_id, created_at")
        .eq("job_id", job.id);

      if (error || !conversations || conversations.length === 0) {
        setApplicants([]);
        setIsLoadingApplicants(false);
        return;
      }

      // Get worker profiles
      const workerIds = conversations.map(c => c.worker_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", workerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

      // Get last message for each conversation
      const applicantData: Applicant[] = await Promise.all(
        conversations.map(async (conv) => {
          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content, created_at")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          return {
            conversationId: conv.id,
            workerId: conv.worker_id,
            workerEmail: profileMap.get(conv.worker_id) || "",
            lastMessage: lastMsg?.content,
            lastMessageTime: lastMsg?.created_at,
          };
        })
      );

      setApplicants(applicantData);
      setIsLoadingApplicants(false);
    };

    fetchApplicants();
  }, [isOpen, job, currentUserId, isOwner, supabase]);

  // Check for existing conversation when sheet opens (for non-owners)
  useEffect(() => {
    if (!isOpen || !job || !currentUserId || isOwner) return;

    const checkExistingConversation = async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id")
        .eq("job_id", job.id)
        .eq("worker_id", currentUserId)
        .single();

      if (data) {
        setActiveConversationId(data.id);
      }
    };

    checkExistingConversation();
  }, [isOpen, job, currentUserId, isOwner, supabase]);

  // Fetch messages when conversation is active
  useEffect(() => {
    if (!activeConversationId) return;

    const fetchMessages = async () => {
      setIsLoading(true);
      
      // First fetch messages
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        setIsLoading(false);
        return;
      }

      if (data && data.length > 0) {
        // Fetch sender profiles separately
        const senderIds = [...new Set(data.map(m => m.sender_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", senderIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

        const formattedMessages: Message[] = data.map((msg) => ({
          id: msg.id,
          conversationId: msg.conversation_id,
          senderId: msg.sender_id,
          content: msg.content,
          createdAt: msg.created_at,
          senderEmail: profileMap.get(msg.sender_id) || null,
        }));
        
        setMessages(formattedMessages);

        // Get the other user's email for display
        const otherMsg = formattedMessages.find(m => m.senderId !== currentUserId);
        if (otherMsg?.senderEmail) {
          setOtherUserEmail(otherMsg.senderEmail);
        }
      } else {
        setMessages([]);
      }
      setIsLoading(false);
    };

    fetchMessages();

    // Set up realtime subscription
    channelRef.current = supabase
      .channel(`messages:${activeConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        async (payload) => {
          // Fetch the sender info for the new message
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", payload.new.sender_id)
            .single();

          const newMsg: Message = {
            id: payload.new.id,
            conversationId: payload.new.conversation_id,
            senderId: payload.new.sender_id,
            content: payload.new.content,
            createdAt: payload.new.created_at,
            senderEmail: profile?.email,
          };

          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [activeConversationId, currentUserId, supabase]);

  // Start a new conversation
  const handleStartChat = async () => {
    if (!job || !currentUserId) return;

    setIsLoading(true);

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("job_id", job.id)
      .eq("worker_id", currentUserId)
      .single();

    if (existing) {
      setActiveConversationId(existing.id);
      setIsLoading(false);
      return;
    }

    // Create new conversation
    const { data: newConversation, error } = await supabase
      .from("conversations")
      .insert({
        job_id: job.id,
        worker_id: currentUserId,
      })
      .select("id")
      .single();

    if (!error && newConversation) {
      setActiveConversationId(newConversation.id);
    }
    setIsLoading(false);
  };

  // Send a message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversationId || !currentUserId) return;

    setIsSending(true);
    const messageContent = newMessage.trim();
    setNewMessage("");

    const { error } = await supabase.from("messages").insert({
      conversation_id: activeConversationId,
      sender_id: currentUserId,
      content: messageContent,
    });

    if (error) {
      console.error("Error sending message:", error);
      setNewMessage(messageContent); // Restore on error
    }
    setIsSending(false);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!job) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md p-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-zinc-200/50 dark:border-zinc-800/50 flex flex-col"
      >
        {/* Premium Header */}
        <SheetHeader className="p-5 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-gradient-to-b from-white to-zinc-50/50 dark:from-zinc-900 dark:to-zinc-900/50">
          <div className="flex items-center gap-3">
            {activeConversationId && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setActiveConversationId(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-semibold text-zinc-900 dark:text-white truncate tracking-tight">
                {activeConversationId 
                  ? `Chat with ${isOwner ? extractRegNumber(otherUserEmail) : job.studentName}` 
                  : job.title}
              </SheetTitle>
              {!activeConversationId && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Posted by {job.studentName}
                </p>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {!activeConversationId ? (
              /* Job Details View - Premium Design */
              <motion.div
                key="details"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-1 p-5 overflow-y-auto"
              >
                {/* Hero Price Section */}
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-3xl blur-2xl" />
                  <div className="relative text-center py-8 px-6 rounded-3xl bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-800/80 dark:to-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">Budget</p>
                    <div className="inline-flex items-baseline gap-1">
                      <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Rs.</span>
                      <span className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                        {job.price.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Job Info Cards */}
                <div className="space-y-4">
                  {/* Poster Card */}
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-800/50 dark:to-zinc-800/30 border border-zinc-200/50 dark:border-zinc-700/30">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl blur-sm opacity-50" />
                      <Avatar className="relative h-14 w-14 rounded-xl border-2 border-white dark:border-zinc-700 shadow-lg">
                        <AvatarImage src={job.avatarUrl} className="rounded-xl" />
                        <AvatarFallback className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-semibold">
                          {job.studentName.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-zinc-900 dark:text-white tracking-tight">
                        {job.studentName}
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Task Owner
                      </p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-800/50 dark:to-zinc-800/30 border border-zinc-200/50 dark:border-zinc-700/30">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 mb-3">
                        <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-0.5">Location</p>
                      <p className="font-medium text-zinc-900 dark:text-white">{job.location}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-800/50 dark:to-zinc-800/30 border border-zinc-200/50 dark:border-zinc-700/30">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 mb-3">
                        <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-0.5">Urgency</p>
                      <p className="font-medium text-zinc-900 dark:text-white">{job.urgency}</p>
                    </div>
                  </div>

                  {/* Description */}
                  {job.description && (
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-800/50 dark:to-zinc-800/30 border border-zinc-200/50 dark:border-zinc-700/30">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">About this task</p>
                      <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {job.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Section */}
                <div className="mt-8 space-y-4">
                  {!currentUserId ? (
                    <div className="text-center p-8 rounded-3xl bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-800/50 dark:to-zinc-800/30 border border-zinc-200/50 dark:border-zinc-700/30">
                      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-200 dark:bg-zinc-700 mx-auto mb-4">
                        <User className="h-8 w-8 text-zinc-500 dark:text-zinc-400" />
                      </div>
                      <p className="text-zinc-900 dark:text-white font-medium mb-1">Sign in to apply</p>
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">
                        Connect with the task owner
                      </p>
                      <Button 
                        className="rounded-full px-8 h-11 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-medium"
                        onClick={() => window.location.href = "/login"}
                      >
                        Sign In
                      </Button>
                    </div>
                  ) : isOwner ? (
                    <div className="space-y-4">
                      {isLoadingApplicants ? (
                        <div className="flex items-center justify-center p-8">
                          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                        </div>
                      ) : applicants.length === 0 ? (
                        <div className="text-center p-8 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-500/10 dark:to-orange-500/5 border border-amber-200/50 dark:border-amber-500/20">
                          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-500/20 mx-auto mb-4">
                            <MessageCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                          </div>
                          <p className="text-amber-900 dark:text-amber-300 font-medium mb-1">Your Task</p>
                          <p className="text-amber-700/80 dark:text-amber-400/60 text-sm">
                            Waiting for applicants to reach out...
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-4">
                            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              {applicants.length} Applicant{applicants.length > 1 ? "s" : ""}
                            </p>
                          </div>
                          {applicants.map((applicant) => (
                            <motion.div
                              key={applicant.conversationId}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <button
                                onClick={() => {
                                  setActiveConversationId(applicant.conversationId);
                                  setOtherUserEmail(applicant.workerEmail);
                                }}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-800/50 dark:to-zinc-800/30 border border-zinc-200/50 dark:border-zinc-700/30 hover:border-emerald-300 dark:hover:border-emerald-600/50 transition-colors text-left"
                              >
                                <Avatar className="h-12 w-12 rounded-xl border-2 border-white dark:border-zinc-700 shadow">
                                  <AvatarImage 
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${applicant.workerId}`} 
                                    className="rounded-xl"
                                  />
                                  <AvatarFallback className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-semibold text-sm">
                                    {extractRegNumber(applicant.workerEmail).slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-zinc-900 dark:text-white">
                                    {extractRegNumber(applicant.workerEmail)}
                                  </p>
                                  {applicant.lastMessage ? (
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                                      {applicant.lastMessage}
                                    </p>
                                  ) : (
                                    <p className="text-sm text-zinc-400 dark:text-zinc-500 italic">
                                      No messages yet
                                    </p>
                                  )}
                                </div>
                                <ChevronRight className="h-5 w-5 text-zinc-400" />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        onClick={handleStartChat}
                        disabled={isLoading}
                        className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-lg shadow-xl shadow-emerald-500/30 border-0"
                      >
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <MessageCircle className="mr-2 h-5 w-5" />
                            Start Conversation
                          </>
                        )}
                      </Button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ) : (
              /* Chat View */
              <motion.div
                key="chat"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageCircle className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-3" />
                      <p className="text-zinc-500 dark:text-zinc-400">
                        No messages yet
                      </p>
                      <p className="text-zinc-400 dark:text-zinc-500 text-sm">
                        Send a message to get started!
                      </p>
                    </div>
                  ) : (
                    <>
                      {messages.map((message, index) => {
                        const isMe = message.senderId === currentUserId;
                        const showAvatar = index === 0 || 
                          messages[index - 1].senderId !== message.senderId;
                        
                        return (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                          >
                            <div className={`flex items-end gap-2 max-w-[80%] ${isMe ? "flex-row-reverse" : ""}`}>
                              {showAvatar && !isMe && (
                                <Avatar className="h-7 w-7 border border-zinc-200 dark:border-zinc-700">
                                  <AvatarImage 
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${message.senderId}`} 
                                  />
                                  <AvatarFallback className="text-xs bg-zinc-200 dark:bg-zinc-700">
                                    {extractRegNumber(message.senderEmail).slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              {!showAvatar && !isMe && <div className="w-7" />}
                              <div
                                className={`px-4 py-2.5 rounded-2xl ${
                                  isMe
                                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-br-md"
                                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-bl-md"
                                }`}
                              >
                                <p className="text-sm leading-relaxed">{message.content}</p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <div className="flex items-center gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Type a message..."
                      className="flex-1 h-12 rounded-xl bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus-visible:ring-emerald-500"
                      disabled={isSending}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isSending}
                      size="icon"
                      className="h-12 w-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25"
                    >
                      {isSending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
