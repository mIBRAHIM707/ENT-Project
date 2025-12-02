"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
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
  ChevronRight,
  UserCheck,
  CheckCircle2,
  CircleDot
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
import { assignWorker } from "@/app/actions/update-job-status";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Create a single instance outside the component to prevent re-creation
const supabase = createClient();

// Types
type JobStatus = "open" | "in_progress" | "completed" | "cancelled";

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
  status?: JobStatus;
  assignedTo?: string | null;
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
  workerName: string | null;
  lastMessage?: string;
  lastMessageTime?: string;
}

interface ChatSheetProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string | null;
  currentUserEmail: string | null;
}

// Helper to extract reg number
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

// Format time for messages
function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  // Assignment state
  const [currentViewingWorkerId, setCurrentViewingWorkerId] = useState<string | null>(null);
  const [currentViewingWorkerName, setCurrentViewingWorkerName] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus>(job?.status || "open");
  const [assignedWorkerId, setAssignedWorkerId] = useState<string | null>(job?.assignedTo || null);
  const [isPending, startTransition] = useTransition();

  const isOwner = currentUserId === job?.userId;

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, scrollToBottom]);

  // Reset state when sheet closes or job changes
  useEffect(() => {
    if (!isOpen) {
      setActiveConversationId(null);
      setMessages([]);
      setNewMessage("");
      setOtherUserEmail(null);
      setApplicants([]);
      setCurrentViewingWorkerId(null);
      setCurrentViewingWorkerName(null);
      setJobStatus("open");
      setAssignedWorkerId(null);
    }
  }, [isOpen, job?.id]);

  // Fetch fresh job status from database when sheet opens
  useEffect(() => {
    if (!isOpen || !job) return;

    const fetchJobStatus = async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("status, assigned_to")
        .eq("id", job.id)
        .maybeSingle();

      if (!error && data) {
        setJobStatus((data.status as JobStatus) || "open");
        setAssignedWorkerId(data.assigned_to || null);
      }
    };

    fetchJobStatus();
  }, [isOpen, job?.id, job]);

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
        .select("id, email, full_name")
        .in("id", workerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, { email: p.email, name: p.full_name }]) || []);

      // Get last message for each conversation
      const applicantData: Applicant[] = await Promise.all(
        conversations.map(async (conv) => {
          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content, created_at")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const profile = profileMap.get(conv.worker_id);
          return {
            conversationId: conv.id,
            workerId: conv.worker_id,
            workerEmail: profile?.email || "",
            workerName: profile?.name || null,
            lastMessage: lastMsg?.content,
            lastMessageTime: lastMsg?.created_at,
          };
        })
      );

      setApplicants(applicantData);
      setIsLoadingApplicants(false);
    };

    fetchApplicants();
  }, [isOpen, job, currentUserId, isOwner]);

  // Check for existing conversation when sheet opens (for non-owners)
  useEffect(() => {
    if (!isOpen || !job || !currentUserId || isOwner) return;

    const checkExistingConversation = async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id")
        .eq("job_id", job.id)
        .eq("worker_id", currentUserId)
        .maybeSingle();

      if (data) {
        setActiveConversationId(data.id);
      }
    };

    checkExistingConversation();
  }, [isOpen, job, currentUserId, isOwner]);

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
            .maybeSingle();

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
  }, [activeConversationId, currentUserId]);

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
      .maybeSingle();

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

  // Assign worker to job
  const handleAssignWorker = async () => {
    if (!job || !currentViewingWorkerId) return;

    startTransition(async () => {
      const result = await assignWorker(job.id, currentViewingWorkerId);
      if (result.success) {
        // Update local state immediately
        setJobStatus("in_progress");
        setAssignedWorkerId(currentViewingWorkerId);
      } else {
        console.error("Failed to assign worker:", result.error);
      }
    });
  };

  // Compute whether to show assign button - use derived state for reliability
  const canAssign = isOwner && 
    jobStatus === "open" && 
    currentViewingWorkerId && 
    !assignedWorkerId &&
    activeConversationId;

  if (!job) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md p-0 bg-zinc-50 dark:bg-zinc-950 border-0 flex flex-col overflow-hidden"
      >
        {/* World-Class Glassmorphic Header */}
        <SheetHeader className="sticky top-0 z-10 px-5 py-4 border-b border-zinc-200/30 dark:border-zinc-800/30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            {activeConversationId && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  onClick={() => setActiveConversationId(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-lg font-semibold text-zinc-900 dark:text-white truncate tracking-tight">
                  {activeConversationId 
                    ? `${isOwner ? (currentViewingWorkerName || extractRegNumber(otherUserEmail)) : job.studentName}` 
                    : job.title}
                </SheetTitle>
                {activeConversationId && jobStatus !== "open" && assignedWorkerId && assignedWorkerId === currentViewingWorkerId && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-500/30">
                    <UserCheck className="h-2.5 w-2.5" />
                    Assigned
                  </span>
                )}
              </div>
              {!activeConversationId ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Posted by {job.studentName}
                </p>
              ) : (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                    jobStatus === "open" 
                      ? "text-emerald-600 dark:text-emerald-400" 
                      : jobStatus === "in_progress"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-zinc-500"
                  }`}>
                    {jobStatus === "open" && <CircleDot className="h-3 w-3" />}
                    {jobStatus === "in_progress" && <Loader2 className="h-3 w-3 animate-spin" />}
                    {jobStatus === "completed" && <CheckCircle2 className="h-3 w-3" />}
                    {jobStatus === "open" ? "Open" : jobStatus === "in_progress" ? "In Progress" : jobStatus === "completed" ? "Completed" : "Cancelled"}
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-600">•</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{job.title}</span>
                </div>
              )}
            </div>
            
            {/* Assign Worker Button - Only for owner in open jobs viewing an unassigned applicant */}
            <AnimatePresence mode="wait">
              {canAssign ? (
                <motion.div
                  key="assign-btn"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Button
                    size="sm"
                    onClick={handleAssignWorker}
                    disabled={isPending}
                    className="rounded-full h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-lg shadow-emerald-500/25"
                  >
                    {isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <UserCheck className="h-3 w-3 mr-1" />
                        Assign
                      </>
                    )}
                  </Button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {!activeConversationId ? (
              /* Job Details View - Apple/Spotify Premium Design */
              <motion.div
                key="details"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex-1 overflow-y-auto scrollbar-premium"
              >
                {/* Hero Section - Spotify Album Art Style */}
                <div className="relative px-6 pt-6 pb-8">
                  {/* Ambient Glow Background */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] bg-gradient-to-b from-emerald-500/30 via-emerald-500/10 to-transparent blur-3xl" />
                  </div>
                  
                  {/* Price Hero - Centered like Spotify's now playing */}
                  <div className="relative">
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.4 }}
                      className="text-center"
                    >
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Budget</span>
                      </div>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-lg font-medium text-zinc-400 dark:text-zinc-500">Rs.</span>
                        <span className="text-6xl font-bold tracking-tight text-zinc-900 dark:text-white">
                          {job.price.toLocaleString()}
                        </span>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Content Section */}
                <div className="px-5 pb-6 space-y-4">
                  {/* Task Owner - Apple Contact Card Style */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-800/80 dark:to-zinc-900/80"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
                    <div className="relative flex items-center gap-4 p-4">
                      <div className="relative">
                        <Avatar className="h-14 w-14 rounded-2xl ring-2 ring-white dark:ring-zinc-700 shadow-xl">
                          <AvatarImage src={job.avatarUrl} className="rounded-2xl" />
                          <AvatarFallback className="rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold text-lg">
                            {job.studentName.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {/* Online indicator */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-zinc-900 dark:text-white text-lg tracking-tight">
                          {job.studentName}
                        </p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          Task Owner
                        </p>
                      </div>
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20">
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Info Pills - Apple Style Horizontal Scroll Look */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex gap-3"
                  >
                    {/* Location Pill */}
                    <div className="flex-1 p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-500/10 dark:to-indigo-500/5 border border-blue-100/50 dark:border-blue-500/10">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-blue-500/15 dark:bg-blue-500/20">
                          <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-[11px] font-semibold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wider">Location</span>
                      </div>
                      <p className="font-semibold text-zinc-900 dark:text-white pl-0.5">{job.location}</p>
                    </div>

                    {/* Urgency Pill */}
                    <div className="flex-1 p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-500/10 dark:to-orange-500/5 border border-amber-100/50 dark:border-amber-500/10">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/15 dark:bg-amber-500/20">
                          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-[11px] font-semibold text-amber-600/70 dark:text-amber-400/70 uppercase tracking-wider">Urgency</span>
                      </div>
                      <p className="font-semibold text-zinc-900 dark:text-white pl-0.5">{job.urgency}</p>
                    </div>
                  </motion.div>

                  {/* Description - Apple Notes Style */}
                  {job.description && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="p-5 rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/50"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-4 rounded-full bg-gradient-to-b from-emerald-400 to-teal-500" />
                        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">About this task</span>
                      </div>
                      <p className="text-[15px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {job.description}
                      </p>
                    </motion.div>
                  )}

                  {/* Applicants Section - Spotify Artist Followers Style */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    {!currentUserId ? (
                      <div className="text-center py-10 px-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
                          <User className="h-7 w-7 text-zinc-400" />
                        </div>
                        <p className="text-zinc-900 dark:text-white font-semibold mb-1">Sign in to apply</p>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-5">
                          Connect with the task owner
                        </p>
                        <Button 
                          className="rounded-full px-8 h-12 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 font-semibold shadow-sm"
                          onClick={() => window.location.href = "/login"}
                        >
                          Sign In
                        </Button>
                      </div>
                    ) : isOwner ? (
                      <div className="space-y-3">
                        {isLoadingApplicants ? (
                          <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                          </div>
                        ) : applicants.length === 0 ? (
                          <div className="text-center py-10 px-6 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-800/50 dark:to-zinc-900/50">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-500/20 mb-4">
                              <MessageCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <p className="text-zinc-900 dark:text-white font-semibold mb-1">No applicants yet</p>
                            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                              Waiting for someone to reach out...
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* Section Header */}
                            <div className="flex items-center justify-between px-1 mb-2">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-emerald-500" />
                                <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                                  {applicants.length} Applicant{applicants.length > 1 ? "s" : ""}
                                </span>
                              </div>
                            </div>
                            
                            {/* Applicant Cards */}
                            <div className="space-y-2">
                              {applicants.map((applicant, index) => {
                                const isAssigned = assignedWorkerId === applicant.workerId;
                                return (
                                  <motion.button
                                    key={applicant.conversationId}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 * index }}
                                    whileHover={{ x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                      setActiveConversationId(applicant.conversationId);
                                      setOtherUserEmail(applicant.workerEmail);
                                      setCurrentViewingWorkerId(applicant.workerId);
                                      setCurrentViewingWorkerName(getDisplayName(applicant.workerName, applicant.workerEmail));
                                    }}
                                    className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl transition-colors text-left group ${
                                      isAssigned 
                                        ? "bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/20"
                                        : "bg-zinc-100/80 dark:bg-zinc-800/50 hover:bg-zinc-200/80 dark:hover:bg-zinc-800"
                                    }`}
                                  >
                                    <Avatar className="h-11 w-11 rounded-xl ring-2 ring-white dark:ring-zinc-700 shadow-md">
                                      <AvatarImage 
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${applicant.workerId}`} 
                                        className="rounded-xl"
                                      />
                                      <AvatarFallback className="rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 text-white font-bold text-sm">
                                        {extractRegNumber(applicant.workerEmail).slice(0, 2)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="font-semibold text-zinc-900 dark:text-white">
                                          {getDisplayName(applicant.workerName, applicant.workerEmail)}
                                        </p>
                                        {isAssigned && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                                            <UserCheck className="h-2.5 w-2.5" />
                                            Assigned
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                                        {applicant.lastMessage || "Tap to start chatting"}
                                      </p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400 dark:group-hover:text-zinc-500 transition-colors" />
                                  </motion.button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      /* Apply Button - Spotify Play Button Style */
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="pt-2"
                      >
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleStartChat}
                          disabled={isLoading}
                          className="w-full h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-base shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                          {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <>
                              <MessageCircle className="h-5 w-5" />
                              Apply for this Task
                            </>
                          )}
                        </motion.button>
                        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-3">
                          Start a conversation with the owner
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              /* World-Class Chat View */
              <motion.div
                key="chat"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-1 flex flex-col overflow-hidden relative"
              >
                {/* Messages Container with Mesh Gradient Background */}
                <div 
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto px-4 pt-4 pb-28 scrollbar-premium"
                  style={{
                    background: 'radial-gradient(ellipse at top, rgba(16, 185, 129, 0.03) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(20, 184, 166, 0.03) 0%, transparent 50%)'
                  }}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading messages...</p>
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full blur-2xl" />
                        <div className="relative w-20 h-20 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shadow-xl mb-4">
                          <MessageCircle className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
                        </div>
                      </div>
                      <p className="text-zinc-900 dark:text-white font-medium mb-1">
                        Start the conversation
                      </p>
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-[200px]">
                        Send a message to connect with this person
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message, index) => {
                        const isMe = message.senderId === currentUserId;
                        const showAvatar = index === 0 || 
                          messages[index - 1].senderId !== message.senderId;
                        const isLastInGroup = index === messages.length - 1 ||
                          messages[index + 1]?.senderId !== message.senderId;
                        
                        // Detect system notification messages
                        const isSystemMessage = 
                          message.content.startsWith("You've been selected for") ||
                          message.content.startsWith("Task completed.") ||
                          message.content.startsWith("This task has been cancelled.");
                        
                        // Render system messages as centered cards
                        if (isSystemMessage) {
                          return (
                            <motion.div
                              key={message.id}
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ duration: 0.3, ease: "easeOut" }}
                              className="flex justify-center my-4"
                            >
                              <div className="relative max-w-[85%]">
                                {/* Subtle glow effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-violet-500/10 rounded-2xl blur-xl" />
                                
                                {/* Card */}
                                <div className="relative px-5 py-4 rounded-2xl bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-700/50 shadow-xl">
                                  <div className="flex items-start gap-3">
                                    {/* Icon */}
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                      message.content.startsWith("You've been selected") 
                                        ? "bg-emerald-100 dark:bg-emerald-500/20" 
                                        : message.content.startsWith("Task completed")
                                          ? "bg-blue-100 dark:bg-blue-500/20"
                                          : "bg-zinc-100 dark:bg-zinc-700"
                                    }`}>
                                      {message.content.startsWith("You've been selected") && (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                      )}
                                      {message.content.startsWith("Task completed") && (
                                        <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                      )}
                                      {message.content.startsWith("This task has been cancelled") && (
                                        <CircleDot className="h-4 w-4 text-zinc-500" />
                                      )}
                                    </div>
                                    
                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[13px] font-medium text-zinc-900 dark:text-white leading-snug">
                                        {message.content}
                                      </p>
                                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                                        {formatMessageTime(message.createdAt)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        }
                        
                        return (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                          >
                            <div className={`flex items-end gap-2 max-w-[80%] ${isMe ? "flex-row-reverse" : ""}`}>
                              {/* Avatar for their messages */}
                              {!isMe && (
                                showAvatar ? (
                                  <Avatar className="h-8 w-8 border-2 border-white dark:border-zinc-800 shadow-md">
                                    <AvatarImage 
                                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${message.senderId}`} 
                                    />
                                    <AvatarFallback className="text-xs bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600">
                                      {extractRegNumber(message.senderEmail).slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : (
                                  <div className="w-8" />
                                )
                              )}
                              
                              {/* Message Bubble */}
                              <div className="flex flex-col gap-1">
                                <div
                                  className={`px-4 py-3 ${
                                    isMe
                                      ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl rounded-tr-sm shadow-lg shadow-emerald-500/20"
                                      : "bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-tl-sm shadow-lg shadow-zinc-200/50 dark:shadow-zinc-950/50"
                                  }`}
                                >
                                  <p className="text-[15px] leading-relaxed">{message.content}</p>
                                </div>
                                {/* Timestamp for last message in group */}
                                {isLastInGroup && (
                                  <p className={`text-[10px] text-zinc-400 dark:text-zinc-500 px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                                    {formatMessageTime(message.createdAt)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                      <div ref={messagesEndRef} className="h-1" />
                    </div>
                  )}
                </div>

                {/* Floating Dock Input */}
                <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-2 bg-gradient-to-t from-zinc-50 dark:from-zinc-950 via-zinc-50/80 dark:via-zinc-950/80 to-transparent">
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center gap-2 p-2 pl-5 rounded-full bg-white dark:bg-zinc-900 shadow-xl shadow-zinc-300/50 dark:shadow-zinc-950/50 border border-zinc-200/50 dark:border-zinc-800/50"
                  >
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Type a message..."
                      className="flex-1 h-10 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-white"
                      disabled={isSending}
                    />
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || isSending}
                        size="icon"
                        className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:shadow-none transition-all"
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </motion.div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
