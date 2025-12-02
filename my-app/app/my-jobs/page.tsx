"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trash2, 
  MessageCircle, 
  ClipboardList, 
  Plus, 
  Clock, 
  Users,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  CircleDot,
  UserCheck,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { createClient } from "@/utils/supabase/client";
import { deleteJob } from "@/app/actions/delete-job";
import { updateJobStatus } from "@/app/actions/update-job-status";
import { SmartPricingForm } from "@/components/features/smart-pricing-form";
import { ChatSheet } from "@/components/features/chat-sheet";
import { RatingDialog } from "@/components/features/rating-dialog";
import { UserMenu } from "@/components/auth/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

// Create a single instance outside the component to prevent re-creation
const supabase = createClient();

type JobStatus = "open" | "in_progress" | "completed" | "cancelled";

// Status configuration with premium styling
const STATUS_CONFIG: Record<JobStatus, {
  label: string;
  className: string;
  dotColor: string;
}> = {
  open: {
    label: "Open",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30",
    dotColor: "bg-emerald-500",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30",
    dotColor: "bg-blue-500",
  },
  completed: {
    label: "Completed",
    className: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
    dotColor: "bg-zinc-400",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30",
    dotColor: "bg-red-500",
  },
};

interface Job {
  id: string;
  title: string;
  description: string;
  price: number;
  urgency: string;
  location: string;
  status: JobStatus;
  user_id: string;
  assigned_to: string | null;
  assigned_name: string | null;
  created_at: string;
  applicant_count: number;
}

function formatTimeAgo(dateString: string): string {
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
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function MyJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [isPending, startTransition] = useTransition();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [chatSheetOpen, setChatSheetOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  
  // Status management
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<"complete" | "cancel" | null>(null);
  const [jobToUpdate, setJobToUpdate] = useState<Job | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  
  // Rating dialog
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [jobToRate, setJobToRate] = useState<Job | null>(null);

  // Extract fetch logic into a reusable function
  const fetchJobs = useCallback(async (userId: string) => {
    // Use the view to get assigned user info
    const { data: jobsData, error } = await supabase
      .from("jobs_with_poster")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching jobs:", error);
      return;
    }

    // For each job, count the conversations (applicants)
    const jobsWithCounts = await Promise.all(
      (jobsData || []).map(async (job) => {
        const { count } = await supabase
          .from("conversations")
          .select("*", { count: "exact", head: true })
          .eq("job_id", job.id);

        return {
          id: job.id,
          title: job.title,
          description: job.description || "",
          price: job.price,
          urgency: job.urgency,
          location: job.location,
          status: (job.status as JobStatus) || "open",
          user_id: job.user_id,
          assigned_to: job.assigned_to,
          assigned_name: job.assigned_name,
          created_at: job.created_at,
          applicant_count: count || 0,
        };
      })
    );

    setJobs(jobsWithCounts);
  }, []);

  useEffect(() => {
    async function fetchData() {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);
      setCurrentUserEmail(user.email || null);

      await fetchJobs(user.id);
      setLoading(false);
    }

    fetchData();
  }, [supabase, fetchJobs]);

  // Handle successful job creation
  const handleJobCreated = async () => {
    setCreateDialogOpen(false);
    if (currentUserId) {
      await fetchJobs(currentUserId);
    }
  };

  const handleDeleteClick = (job: Job) => {
    setJobToDelete(job);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!jobToDelete) return;

    startTransition(async () => {
      const result = await deleteJob(jobToDelete.id);
      if (result.success) {
        setJobs((prev) => prev.filter((j) => j.id !== jobToDelete.id));
        setDeleteDialogOpen(false);
        setJobToDelete(null);
      } else {
        console.error("Failed to delete job:", result.error);
      }
    });
  };

  // Status update handlers
  const handleStatusAction = (job: Job, action: "complete" | "cancel") => {
    setJobToUpdate(job);
    setStatusAction(action);
    setStatusDialogOpen(true);
  };

  const handleConfirmStatusUpdate = () => {
    if (!jobToUpdate || !statusAction) return;

    const newStatus = statusAction === "complete" ? "completed" : "cancelled";

    startTransition(async () => {
      const result = await updateJobStatus(jobToUpdate.id, newStatus);
      if (result.success) {
        setJobs((prev) => 
          prev.map((j) => 
            j.id === jobToUpdate.id ? { ...j, status: newStatus } : j
          )
        );
        setStatusDialogOpen(false);
        setJobToUpdate(null);
        setStatusAction(null);
      } else {
        console.error("Failed to update status:", result.error);
      }
    });
  };

  const handleViewChat = (job: Job) => {
    setSelectedJob(job);
    setChatSheetOpen(true);
  };

  const handleRateHelper = (job: Job) => {
    setJobToRate(job);
    setRatingDialogOpen(true);
  };

  const extractRegNumber = (email: string | null): string => {
    if (!email) return "User";
    const match = email.match(/[a-z]?(\d+)@/i);
    return match ? match[1] : "User";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-zinc-200 dark:border-zinc-700 border-t-emerald-500 animate-spin" />
          <p className="text-zinc-500 text-sm">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black relative">
      {/* Chat Sheet */}
      {selectedJob && (
        <ChatSheet
          job={{
            id: selectedJob.id,
            title: selectedJob.title,
            description: selectedJob.description,
            price: selectedJob.price,
            urgency: selectedJob.urgency,
            location: selectedJob.location,
            userId: selectedJob.user_id,
            studentName: extractRegNumber(currentUserEmail),
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedJob.user_id}`,
          }}
          isOpen={chatSheetOpen}
          onClose={() => setChatSheetOpen(false)}
          currentUserId={currentUserId}
          currentUserEmail={currentUserEmail}
        />
      )}

      {/* Rating Dialog */}
      {jobToRate && jobToRate.assigned_to && (
        <RatingDialog
          isOpen={ratingDialogOpen}
          onClose={() => {
            setRatingDialogOpen(false);
            setJobToRate(null);
          }}
          jobId={jobToRate.id}
          jobTitle={jobToRate.title}
          ratedUserId={jobToRate.assigned_to}
          ratedUserName={jobToRate.assigned_name || "Helper"}
          ratedUserAvatar={`https://api.dicebear.com/7.x/avataaars/svg?seed=${jobToRate.assigned_to}`}
          ratingType="poster_to_helper"
        />
      )}

      {/* Grid Background */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-white dark:bg-black">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Glow Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-violet-500/20 blur-[120px] rounded-full -z-10" />
      <div className="absolute top-[400px] right-0 w-[400px] h-[300px] bg-emerald-500/10 blur-[100px] rounded-full -z-10" />

      {/* Glass Header */}
      <header className="sticky top-0 z-50 bg-white/60 dark:bg-black/50 backdrop-blur-xl border-b border-zinc-200/30 dark:border-zinc-800/30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              </motion.button>
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
              My Active Tasks
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserMenu />
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="icon"
                  className="rounded-full h-9 w-9 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-lg"
                >
                  <Plus className="h-4 w-4 text-white dark:text-zinc-900" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <VisuallyHidden.Root>
                  <DialogTitle>Create a Task</DialogTitle>
                </VisuallyHidden.Root>
                <SmartPricingForm onSuccess={handleJobCreated} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {jobs.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24"
          >
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center shadow-xl">
                <ClipboardList className="h-10 w-10 text-zinc-400" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Plus className="h-5 w-5 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
              No tasks yet
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-center max-w-sm mb-8">
              Post your first task and let the GIKI community help you get things done
            </p>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold text-[15px] hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-lg"
                >
                  Create your first task
                </motion.button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <VisuallyHidden.Root>
                  <DialogTitle>Create a Task</DialogTitle>
                </VisuallyHidden.Root>
                <SmartPricingForm onSuccess={handleJobCreated} />
              </DialogContent>
            </Dialog>
          </motion.div>
        ) : (
          /* Job List */
          <div className="space-y-4">
            {/* Post New Task CTA */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-100 dark:via-white dark:to-zinc-100 rounded-2xl p-5 flex items-center justify-between shadow-xl"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 dark:bg-zinc-900/20 flex items-center justify-center">
                  <Plus className="h-6 w-6 text-white dark:text-zinc-900" />
                </div>
                <div>
                  <h3 className="font-semibold text-white dark:text-zinc-900 text-[15px]">
                    Need more help?
                  </h3>
                  <p className="text-zinc-400 dark:text-zinc-600 text-[13px]">
                    Post another task and let the community assist you
                  </p>
                </div>
              </div>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-semibold text-[14px] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-lg"
                  >
                    Post New Task
                  </motion.button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <VisuallyHidden.Root>
                    <DialogTitle>Create a Task</DialogTitle>
                  </VisuallyHidden.Root>
                  <SmartPricingForm onSuccess={handleJobCreated} />
                </DialogContent>
              </Dialog>
            </motion.div>

            {/* Premium Tab Bar */}
            <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl w-fit">
              <button
                onClick={() => setActiveTab("active")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "active"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                Active ({jobs.filter(j => j.status === "open" || j.status === "in_progress").length})
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "completed"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                Completed ({jobs.filter(j => j.status === "completed" || j.status === "cancelled").length})
              </button>
            </div>

            <AnimatePresence mode="popLayout">
              {jobs
                .filter(job => 
                  activeTab === "active" 
                    ? job.status === "open" || job.status === "in_progress"
                    : job.status === "completed" || job.status === "cancelled"
                )
                .map((job, index) => {
                  const statusConfig = STATUS_CONFIG[job.status];
                  const isActive = job.status === "open" || job.status === "in_progress";
                  
                  return (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 30 }}
                      layout
                      className={`group bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-5 hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 ${!isActive ? "opacity-75" : ""}`}
                    >
                      {/* Main Row */}
                      <div className="flex items-start gap-5">
                        {/* Left: Title + Meta */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-[16px] text-zinc-900 dark:text-white truncate">
                              {job.title}
                            </h3>
                            {/* Status Badge - Premium pill */}
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusConfig.className}`}>
                              {job.status === "in_progress" ? (
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              ) : (
                                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
                              )}
                              {statusConfig.label}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-[13px] text-zinc-500 dark:text-zinc-400">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {formatTimeAgo(job.created_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {job.applicant_count} applicant{job.applicant_count !== 1 ? "s" : ""}
                            </span>
                            {job.assigned_name && (
                              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                <UserCheck className="h-3.5 w-3.5" />
                                {job.assigned_name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: Price */}
                        <Badge 
                          variant="secondary" 
                          className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-semibold px-3 py-1 shrink-0"
                        >
                          Rs. {job.price}
                        </Badge>
                      </div>

                      {/* Action Row */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          {/* View Chats */}
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleViewChat(job)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-[13px] transition-colors"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            Chats
                          </motion.button>
                          
                          {/* Rate (only for completed) */}
                          {job.status === "completed" && job.assigned_to && (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleRateHelper(job)}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium text-[13px] transition-colors"
                            >
                              <Star className="h-3.5 w-3.5" />
                              Rate Helper
                            </motion.button>
                          )}
                        </div>

                        {/* Status Actions */}
                        {isActive && (
                          <div className="flex items-center gap-2">
                            {/* Mark Complete */}
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleStatusAction(job, "complete")}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium text-[13px] transition-colors"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Complete
                            </motion.button>
                            
                            {/* Cancel */}
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleStatusAction(job, "cancel")}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 font-medium text-[13px] transition-colors"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Cancel
                            </motion.button>
                            
                            {/* Delete */}
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleDeleteClick(job)}
                              className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </motion.button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
            </AnimatePresence>

            {/* Empty state for tab */}
            {jobs.filter(job => 
              activeTab === "active" 
                ? job.status === "open" || job.status === "in_progress"
                : job.status === "completed" || job.status === "cancelled"
            ).length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  {activeTab === "active" ? (
                    <ClipboardList className="h-7 w-7 text-zinc-400" />
                  ) : (
                    <CheckCircle2 className="h-7 w-7 text-zinc-400" />
                  )}
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                  {activeTab === "active" 
                    ? "No active tasks" 
                    : "No completed tasks yet"}
                </p>
              </motion.div>
            )}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-white text-center">
              Delete this task?
            </DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400 mt-2">
              This will permanently delete <span className="font-medium text-zinc-700 dark:text-zinc-300">&quot;{jobToDelete?.title}&quot;</span> and all associated conversations. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="flex-1 rounded-xl h-11"
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isPending}
              className="flex-1 rounded-xl h-11 bg-red-600 hover:bg-red-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Task"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Confirmation Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <DialogHeader className="text-center">
            <div className={`mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center ${
              statusAction === "complete" 
                ? "bg-emerald-100 dark:bg-emerald-500/20" 
                : "bg-zinc-100 dark:bg-zinc-800"
            }`}>
              {statusAction === "complete" ? (
                <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="h-7 w-7 text-zinc-600 dark:text-zinc-400" />
              )}
            </div>
            <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-white text-center">
              {statusAction === "complete" ? "Mark as Completed?" : "Cancel this task?"}
            </DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400 mt-2">
              {statusAction === "complete" 
                ? <>This will mark <span className="font-medium text-zinc-700 dark:text-zinc-300">&quot;{jobToUpdate?.title}&quot;</span> as completed. You can rate the helper after this.</>
                : <>This will cancel <span className="font-medium text-zinc-700 dark:text-zinc-300">&quot;{jobToUpdate?.title}&quot;</span>. It will be moved to your completed tasks.</>
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setStatusDialogOpen(false)}
              className="flex-1 rounded-xl h-11"
              disabled={isPending}
            >
              Go Back
            </Button>
            <Button
              onClick={handleConfirmStatusUpdate}
              disabled={isPending}
              className={`flex-1 rounded-xl h-11 ${
                statusAction === "complete"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900"
              }`}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : statusAction === "complete" ? (
                "Mark Complete"
              ) : (
                "Cancel Task"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
