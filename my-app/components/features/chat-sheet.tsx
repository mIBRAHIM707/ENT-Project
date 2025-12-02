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
  User
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
    }
  }, [isOpen, job?.id]);

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
      const { data, error } = await supabase
        .from("messages")
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          created_at,
          profiles!messages_sender_id_fkey (email)
        `)
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedMessages: Message[] = data.map((msg: any) => ({
          id: msg.id,
          conversationId: msg.conversation_id,
          senderId: msg.sender_id,
          content: msg.content,
          createdAt: msg.created_at,
          senderEmail: msg.profiles?.email || (Array.isArray(msg.profiles) ? msg.profiles[0]?.email : null),
        }));
        setMessages(formattedMessages);

        // Get the other user's email for display
        const otherMsg = formattedMessages.find(m => m.senderId !== currentUserId);
        if (otherMsg?.senderEmail) {
          setOtherUserEmail(otherMsg.senderEmail);
        }
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
        className="w-full sm:max-w-md p-0 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            {activeConversationId && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -ml-2"
                onClick={() => setActiveConversationId(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-semibold text-zinc-900 dark:text-white truncate">
                {activeConversationId 
                  ? `Chat with ${extractRegNumber(isOwner ? otherUserEmail : job.studentName)}` 
                  : job.title}
              </SheetTitle>
              {!activeConversationId && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
              /* Job Details View */
              <motion.div
                key="details"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 p-4 overflow-y-auto"
              >
                {/* Price Badge */}
                <div className="flex justify-center mb-6">
                  <div className="inline-flex items-center px-5 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-xl shadow-lg shadow-emerald-500/25">
                    Rs. {job.price}
                  </div>
                </div>

                {/* Job Info */}
                <div className="space-y-4">
                  {/* Poster */}
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50">
                    <Avatar className="h-12 w-12 border-2 border-white dark:border-zinc-700">
                      <AvatarImage src={job.avatarUrl} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                        {job.studentName.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-white">
                        {job.studentName}
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Job Poster
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/50">
                      <MapPin className="h-4 w-4 text-zinc-500" />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">{job.location}</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/50">
                      <Clock className="h-4 w-4 text-zinc-500" />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">{job.urgency}</span>
                    </div>
                  </div>

                  {/* Description */}
                  {job.description && (
                    <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50">
                      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                        Description
                      </p>
                      <p className="text-zinc-700 dark:text-zinc-300">
                        {job.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="mt-8">
                  {!currentUserId ? (
                    <div className="text-center p-6 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50">
                      <User className="h-10 w-10 text-zinc-400 mx-auto mb-3" />
                      <p className="text-zinc-600 dark:text-zinc-400 mb-2">
                        Login to apply for this job
                      </p>
                      <Button 
                        variant="outline"
                        className="rounded-full"
                        onClick={() => window.location.href = "/login"}
                      >
                        Login
                      </Button>
                    </div>
                  ) : isOwner ? (
                    <div className="text-center p-6 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                      <MessageCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                      <p className="text-amber-700 dark:text-amber-400 font-medium">
                        This is your job posting
                      </p>
                      <p className="text-amber-600/80 dark:text-amber-400/60 text-sm mt-1">
                        Waiting for applicants to message you...
                      </p>
                    </div>
                  ) : (
                    <Button
                      onClick={handleStartChat}
                      disabled={isLoading}
                      className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-lg shadow-lg shadow-emerald-500/25"
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <MessageCircle className="mr-2 h-5 w-5" />
                          Start Chat / Apply
                        </>
                      )}
                    </Button>
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
