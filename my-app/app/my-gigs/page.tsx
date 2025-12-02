"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, 
  Briefcase, 
  Clock, 
  MapPin,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  XCircle,
  Star,
  User
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
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/utils/supabase/client";
import { updateJobStatus } from "@/app/actions/update-job-status";
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

interface TakenJob {
  id: string;
  title: string;
  description: string;
  price: number;
  urgency: string;
  location: string;
  status: JobStatus;
  user_id: string;
  poster_name: string | null;
  poster_email: string | null;
  poster_avatar: string | null;
  assigned_at: string;
  created_at: string;
  hasRated: boolean;
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

function extractRegNumber(email: string | null): string {
  if (!email) return "User";
  const match = email.match(/[a-z]?(\d+)@/i);
  return match ? match[1] : "User";
}

function getDisplayName(name: string | null, email: string | null): string {
  if (name && name.trim()) return name;
  return extractRegNumber(email);
}

export default function MyGigsPage() {
  const [jobs, setJobs] = useState<TakenJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [chatSheetOpen, setChatSheetOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<TakenJob | null>(null);
  
  // Status management
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [jobToComplete, setJobToComplete] = useState<TakenJob | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  
  // Rating dialog
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [jobToRate, setJobToRate] = useState<TakenJob | null>(null);

  // Fetch taken jobs
  const fetchJobs = useCallback(async (userId: string) => {
    // Fetch jobs where user is the assigned worker
    const { data: jobsData, error } = await supabase
      .from("jobs_with_poster")
      .select("*")
      .eq("assigned_to", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching taken jobs:", error);
      return;
    }

    // Fetch ratings this user has given (as helper rating poster)
    const { data: ratingsData } = await supabase
      .from("ratings")
      .select("job_id")
      .eq("rater_id", userId)
      .eq("rating_type", "helper_to_poster");

    const ratedJobIds = new Set((ratingsData || []).map(r => r.job_id));

    const takenJobs: TakenJob[] = (jobsData || []).map((job) => ({
      id: job.id,
      title: job.title,
      description: job.description || "",
      price: job.price,
      urgency: job.urgency,
      location: job.location,
      status: (job.status as JobStatus) || "in_progress",
      user_id: job.user_id,
      poster_name: job.student_name,
      poster_email: job.student_email,
      poster_avatar: job.avatar_url,
      assigned_at: job.updated_at || job.created_at,
      created_at: job.created_at,
      hasRated: ratedJobIds.has(job.id),
    }));

    setJobs(takenJobs);
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
  }, [fetchJobs]);

  const handleCompleteClick = (job: TakenJob) => {
    setJobToComplete(job);
    setStatusDialogOpen(true);
  };

  const handleConfirmComplete = () => {
    if (!jobToComplete) return;

    startTransition(async () => {
      const result = await updateJobStatus(jobToComplete.id, "completed");
      if (result.success) {
        setJobs((prev) => 
          prev.map((j) => 
            j.id === jobToComplete.id ? { ...j, status: "completed" } : j
          )
        );
        setStatusDialogOpen(false);
        setJobToComplete(null);
      } else {
        console.error("Failed to update status:", result.error);
      }
    });
  };

  const handleViewChat = (job: TakenJob) => {
    setSelectedJob(job);
    setChatSheetOpen(true);
  };

  const handleRatePoster = (job: TakenJob) => {
    setJobToRate(job);
    setRatingDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-zinc-200 dark:border-zinc-700 border-t-emerald-500 animate-spin" />
          <p className="text-zinc-500 text-sm">Loading your gigs...</p>
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
            studentName: getDisplayName(selectedJob.poster_name, selectedJob.poster_email),
            avatarUrl: selectedJob.poster_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedJob.user_id}`,
          }}
          isOpen={chatSheetOpen}
          onClose={() => setChatSheetOpen(false)}
          currentUserId={currentUserId}
          currentUserEmail={currentUserEmail}
        />
      )}

      {/* Rating Dialog */}
      {jobToRate && (
        <RatingDialog
          isOpen={ratingDialogOpen}
          onClose={() => {
            setRatingDialogOpen(false);
            setJobToRate(null);
          }}
          jobId={jobToRate.id}
          jobTitle={jobToRate.title}
          ratedUserId={jobToRate.user_id}
          ratedUserName={getDisplayName(jobToRate.poster_name, jobToRate.poster_email)}
          ratedUserAvatar={jobToRate.poster_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${jobToRate.user_id}`}
          ratingType="helper_to_poster"
        />
      )}

      {/* Grid Background */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-white dark:bg-black">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Glow Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-blue-500/20 blur-[120px] rounded-full -z-10" />
      <div className="absolute top-[400px] left-0 w-[400px] h-[300px] bg-emerald-500/10 blur-[100px] rounded-full -z-10" />

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
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                My Gigs
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Tasks assigned to you
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserMenu />
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
                <Briefcase className="h-10 w-10 text-zinc-400" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <User className="h-5 w-5 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
              No gigs yet
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-center max-w-sm mb-8">
              When someone assigns a task to you, it will appear here. Browse the feed and apply to tasks!
            </p>
            <Link href="/">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold text-[15px] hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-lg"
              >
                Browse Tasks
              </motion.button>
            </Link>
          </motion.div>
        ) : (
          /* Job List */
          <div className="space-y-4">
            {/* Hero Stats Card */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-2xl p-6 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-lg mb-1">
                    Your Earnings
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">
                      Rs. {jobs.filter(j => j.status === "completed").reduce((acc, j) => acc + j.price, 0).toLocaleString()}
                    </span>
                    <span className="text-blue-200 text-sm">earned</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {jobs.filter(j => j.status === "in_progress").length}
                    </div>
                    <div className="text-blue-200 text-xs">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {jobs.filter(j => j.status === "completed").length}
                    </div>
                    <div className="text-blue-200 text-xs">Completed</div>
                  </div>
                </div>
              </div>
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
                Active ({jobs.filter(j => j.status === "in_progress").length})
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
                    ? job.status === "in_progress"
                    : job.status === "completed" || job.status === "cancelled"
                )
                .map((job, index) => {
                  const statusConfig = STATUS_CONFIG[job.status];
                  const isActive = job.status === "in_progress";
                  
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
                      <div className="flex items-start gap-4">
                        {/* Poster Avatar */}
                        <Avatar className="h-12 w-12 rounded-xl ring-2 ring-zinc-100 dark:ring-zinc-800 shadow-md">
                          <AvatarImage 
                            src={job.poster_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${job.user_id}`} 
                            className="rounded-xl"
                          />
                          <AvatarFallback className="rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 text-white font-bold">
                            {getDisplayName(job.poster_name, job.poster_email).slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>

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
                              ) : job.status === "completed" ? (
                                <CheckCircle2 className="h-2.5 w-2.5" />
                              ) : job.status === "cancelled" ? (
                                <XCircle className="h-2.5 w-2.5" />
                              ) : (
                                <CircleDot className="h-2.5 w-2.5" />
                              )}
                              {statusConfig.label}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-[13px] text-zinc-500 dark:text-zinc-400 mb-1">
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                              by {getDisplayName(job.poster_name, job.poster_email)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-[13px] text-zinc-500 dark:text-zinc-400">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {job.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {job.urgency}
                            </span>
                          </div>
                        </div>

                        {/* Right: Price */}
                        <Badge 
                          variant="secondary" 
                          className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold px-3 py-1.5 text-base shrink-0"
                        >
                          Rs. {job.price}
                        </Badge>
                      </div>

                      {/* Action Row */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          {/* View Chat */}
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleViewChat(job)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-[13px] transition-colors"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            Chat with Poster
                          </motion.button>
                          
                          {/* Rate (only for completed) */}
                          {job.status === "completed" && (
                            job.hasRated ? (
                              <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-[13px]">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Rated
                              </span>
                            ) : (
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleRatePoster(job)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium text-[13px] transition-colors"
                              >
                                <Star className="h-3.5 w-3.5" />
                                Rate Poster
                              </motion.button>
                            )
                          )}
                        </div>

                        {/* Status Actions */}
                        {isActive && (
                          <div className="flex items-center gap-2">
                            {/* Mark Complete */}
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleCompleteClick(job)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-[13px] transition-colors shadow-lg shadow-emerald-500/25"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Mark Complete
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
                ? job.status === "in_progress"
                : job.status === "completed" || job.status === "cancelled"
            ).length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  {activeTab === "active" ? (
                    <Briefcase className="h-7 w-7 text-zinc-400" />
                  ) : (
                    <CheckCircle2 className="h-7 w-7 text-zinc-400" />
                  )}
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                  {activeTab === "active" 
                    ? "No active gigs" 
                    : "No completed gigs yet"}
                </p>
              </motion.div>
            )}
          </div>
        )}
      </main>

      {/* Complete Confirmation Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-white text-center">
              Complete this gig?
            </DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400 mt-2">
              This will mark <span className="font-medium text-zinc-700 dark:text-zinc-300">&quot;{jobToComplete?.title}&quot;</span> as completed. The poster will be notified and you&apos;ll earn Rs. {jobToComplete?.price}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setStatusDialogOpen(false)}
              className="flex-1 rounded-xl h-11"
              disabled={isPending}
            >
              Not Yet
            </Button>
            <Button
              onClick={handleConfirmComplete}
              disabled={isPending}
              className="flex-1 rounded-xl h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                "Complete Gig"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
