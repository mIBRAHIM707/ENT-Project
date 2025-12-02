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
  ArrowLeft
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
import { SmartPricingForm } from "@/components/features/smart-pricing-form";
import { ChatSheet } from "@/components/features/chat-sheet";
import { UserMenu } from "@/components/auth/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

interface Job {
  id: string;
  title: string;
  description: string;
  price: number;
  urgency: string;
  location: string;
  user_id: string;
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

  const supabase = createClient();

  // Extract fetch logic into a reusable function
  const fetchJobs = useCallback(async (userId: string) => {
    const { data: jobsData, error } = await supabase
      .from("jobs")
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
          ...job,
          applicant_count: count || 0,
        };
      })
    );

    setJobs(jobsWithCounts);
  }, [supabase]);

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
        // Could show a toast here
      }
    });
  };

  const handleViewChat = (job: Job) => {
    setSelectedJob(job);
    setChatSheetOpen(true);
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

            {/* Task Count */}
            <div className="flex items-center justify-between px-1">
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
                {jobs.length} active task{jobs.length !== 1 ? "s" : ""}
              </p>
            </div>

            <AnimatePresence mode="popLayout">
              {jobs.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 30 }}
                  layout
                  className="group bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-5 hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200"
                >
                  <div className="flex items-center gap-5">
                    {/* Left: Title + Time */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[16px] text-zinc-900 dark:text-white truncate mb-1">
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-3 text-[13px] text-zinc-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTimeAgo(job.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {job.applicant_count} applicant{job.applicant_count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Price + Status */}
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="secondary" 
                        className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-semibold px-3 py-1"
                      >
                        Rs. {job.price}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className="border-blue-200 text-blue-600 dark:border-blue-500/30 dark:text-blue-400"
                      >
                        Open
                      </Badge>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleViewChat(job)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-[14px] transition-colors"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">View Chats</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDeleteClick(job)}
                        className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
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
    </div>
  );
}
