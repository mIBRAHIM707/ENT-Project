"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Utensils, BookOpen, Laptop, Car, Sparkles } from "lucide-react";
import { JobCard } from "@/components/features/job-card";
import { SmartPricingForm } from "@/components/features/smart-pricing-form";
import { ChatSheet } from "@/components/features/chat-sheet";
import { NotificationsPopover } from "@/components/features/notifications-popover";
import { UserMenu } from "@/components/auth/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { createClient } from "@/utils/supabase/client";

// Create a single instance outside the component to prevent re-creation
const supabase = createClient();

// Job type from database
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
  timeAgo: string;
}

interface HomeClientProps {
  jobs: Job[];
}

// Bento Category Data - Vibrant colors like Spotify
const categories = [
  {
    title: "Food Delivery",
    description: "Get meals delivered to your hostel",
    emoji: "🍔",
    icon: Utensils,
    span: "col-span-2 row-span-2",
    iconColor: "text-orange-500",
    iconBg: "bg-orange-500/20",
    cardBg: "bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/40",
    borderColor: "border-orange-200/50 dark:border-orange-800/30",
    hoverBorder: "hover:border-orange-400/50",
  },
  {
    title: "Assignments",
    description: "Academic help when you need it",
    emoji: "📚",
    icon: BookOpen,
    span: "col-span-2 row-span-1",
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/20",
    cardBg: "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40",
    borderColor: "border-blue-200/50 dark:border-blue-800/30",
    hoverBorder: "hover:border-blue-400/50",
  },
  {
    title: "Tech Support",
    description: "Fix your devices",
    emoji: "💻",
    icon: Laptop,
    span: "col-span-1 row-span-1",
    iconColor: "text-purple-500",
    iconBg: "bg-purple-500/20",
    cardBg: "bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/40 dark:to-violet-950/40",
    borderColor: "border-purple-200/50 dark:border-purple-800/30",
    hoverBorder: "hover:border-purple-400/50",
  },
  {
    title: "Ride Share",
    description: "Split travel costs",
    emoji: "🚗",
    icon: Car,
    span: "col-span-1 row-span-1",
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-500/20",
    cardBg: "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40",
    borderColor: "border-emerald-200/50 dark:border-emerald-800/30",
    hoverBorder: "hover:border-emerald-400/50",
  },
];

export function HomeClient({ jobs }: HomeClientProps) {
  const [headerDialogOpen, setHeaderDialogOpen] = useState(false);
  const [heroDialogOpen, setHeroDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Chat sheet state
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [chatSheetOpen, setChatSheetOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // Prevent hydration mismatch with Radix UI dialogs
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get current user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      setCurrentUserEmail(user?.email || null);
    };
    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setCurrentUserId(session?.user?.id || null);
      setCurrentUserEmail(session?.user?.email || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle job card click
  const handleJobClick = (job: Job) => {
    setSelectedJob({
      ...job,
      description: job.description || "",
    });
    setChatSheetOpen(true);
  };

  // Handle opening chat from notification
  const handleOpenChatFromNotification = useCallback(async (jobId: string, conversationId: string) => {
    // Find the job in our list or fetch it
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      setSelectedJob({
        ...job,
        description: job.description || "",
      });
      setChatSheetOpen(true);
    } else {
      // Fetch job from database if not in current list
      const { data: jobData } = await supabase
        .from("jobs")
        .select("*, profiles!jobs_user_id_fkey(email)")
        .eq("id", jobId)
        .single();
      
      if (jobData) {
        const email = jobData.profiles?.email || "";
        const regMatch = email.match(/[a-z]?(\d+)@/i);
        const regNumber = regMatch ? regMatch[1] : "User";
        
        setSelectedJob({
          id: jobData.id,
          title: jobData.title,
          description: jobData.description || "",
          price: jobData.price,
          urgency: jobData.urgency,
          location: jobData.location,
          userId: jobData.user_id,
          studentName: regNumber,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${jobData.user_id}`,
          timeAgo: "Just now",
        });
        setChatSheetOpen(true);
      }
    }
  }, [jobs]);

  return (
    <div className="relative min-h-screen">
      {/* Chat Sheet */}
      <ChatSheet
        job={selectedJob ? {
          id: selectedJob.id,
          title: selectedJob.title,
          description: selectedJob.description,
          price: selectedJob.price,
          urgency: selectedJob.urgency,
          location: selectedJob.location,
          userId: selectedJob.userId,
          studentName: selectedJob.studentName,
          avatarUrl: selectedJob.avatarUrl,
        } : null}
        isOpen={chatSheetOpen}
        onClose={() => setChatSheetOpen(false)}
        currentUserId={currentUserId}
        currentUserEmail={currentUserEmail}
      />

      {/* Fixed Grid Background - Apple Style */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-white dark:bg-black">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      </div>

      {/* Hero Glow Orb */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-emerald-500/20 blur-[120px] rounded-full -z-10" />

      {/* Secondary Glow Orbs for depth */}
      <div className="absolute top-[600px] left-0 w-[600px] h-[400px] bg-blue-500/10 blur-[120px] rounded-full -z-10" />
      <div className="absolute top-[400px] right-0 w-[500px] h-[300px] bg-purple-500/10 blur-[120px] rounded-full -z-10" />

      {/* Minimalist Header */}
      <header className="sticky top-0 z-50 bg-white/60 dark:bg-black/50 backdrop-blur-xl border-b border-zinc-200/30 dark:border-zinc-800/30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tighter text-zinc-900 dark:text-zinc-100">
            CrowdServe
          </h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserMenu />
            <NotificationsPopover 
              userId={currentUserId} 
              onOpenChat={handleOpenChatFromNotification} 
            />
            {mounted ? (
              <Dialog open={headerDialogOpen} onOpenChange={setHeaderDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="icon"
                    className="rounded-full h-9 w-9 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-lg shadow-zinc-900/20 dark:shadow-white/10"
                  >
                    <Plus className="h-4 w-4 text-white dark:text-zinc-900" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <VisuallyHidden.Root>
                    <DialogTitle>Create a Task</DialogTitle>
                  </VisuallyHidden.Root>
                  <SmartPricingForm onSuccess={() => setHeaderDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            ) : (
              <Button
                size="icon"
                className="rounded-full h-9 w-9 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-lg shadow-zinc-900/20 dark:shadow-white/10"
              >
                <Plus className="h-4 w-4 text-white dark:text-zinc-900" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Massive Typography - Maximum Contrast */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tighter text-zinc-900 dark:text-zinc-100 leading-[1.1]"
          >
            Get campus life{" "}
            <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              sorted.
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 mt-6 tracking-tight max-w-xl mx-auto"
          >
            The student marketplace for GIKI. Post tasks, find help, earn money.
          </motion.p>

          {/* Premium Glass Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-10 max-w-2xl mx-auto"
          >
            {mounted ? (
              <Dialog open={heroDialogOpen} onOpenChange={setHeroDialogOpen}>
                <DialogTrigger asChild>
                  <button className="w-full group">
                    <div className="flex items-center gap-4 px-6 py-5 backdrop-blur-2xl bg-white/60 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg shadow-zinc-900/5 dark:shadow-black/20 hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-500/50 transition-all duration-300">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 group-hover:bg-emerald-500/10 transition-colors">
                        <Search className="h-5 w-5 text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                      </div>
                      <span className="text-lg text-zinc-500 dark:text-zinc-400 font-light tracking-tight">
                        What do you need done today?
                      </span>
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <VisuallyHidden.Root>
                    <DialogTitle>Create a Task</DialogTitle>
                  </VisuallyHidden.Root>
                  <SmartPricingForm onSuccess={() => setHeroDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            ) : (
              <button className="w-full group">
                <div className="flex items-center gap-4 px-6 py-5 backdrop-blur-2xl bg-white/60 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg shadow-zinc-900/5 dark:shadow-black/20 hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-500/50 transition-all duration-300">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 group-hover:bg-emerald-500/10 transition-colors">
                    <Search className="h-5 w-5 text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                  </div>
                  <span className="text-lg text-zinc-500 dark:text-zinc-400 font-light tracking-tight">
                    What do you need done today?
                  </span>
                </div>
              </button>
            )}
          </motion.div>
        </div>
      </section>

      {/* Bento Categories Section - Spotify/Apple Inspired */}
      <section className="px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <motion.h3
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-6"
          >
            Explore
          </motion.h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[160px]">
            {categories.map((category, index) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className={`${category.span} relative rounded-3xl p-6 cursor-pointer overflow-hidden group
                  ${category.cardBg}
                  border ${category.borderColor}
                  ${category.hoverBorder}
                  hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20
                  transition-all duration-150 ease-out
                `}
              >
                {/* Large Emoji Background */}
                <span className="absolute -bottom-4 -right-4 text-[100px] opacity-20 dark:opacity-10 group-hover:opacity-30 dark:group-hover:opacity-20 transition-opacity select-none pointer-events-none">
                  {category.emoji}
                </span>

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col">
                  {/* Icon with colored background */}
                  <div className={`w-11 h-11 rounded-xl ${category.iconBg} backdrop-blur-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-150`}>
                    <category.icon
                      className={`h-5 w-5 ${category.iconColor}`}
                      strokeWidth={2}
                    />
                  </div>
                  <h4 className="font-bold tracking-tight text-zinc-900 dark:text-white text-lg">
                    {category.title}
                  </h4>
                  {category.description && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">
                      {category.description}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Feed Section */}
      <section className="px-6 py-12 pb-24">
        <div className="max-w-6xl mx-auto">
          {/* Section Header with Live Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 mb-8"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">
              Happening Now
            </h3>
          </motion.div>

          {/* Jobs Grid */}
          <AnimatePresence>
            {jobs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.map((job, index) => (
                  <motion.div
                    key={job.id || `job-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.4,
                      delay: index * 0.08,
                      ease: "easeOut",
                    }}
                  >
                    <JobCard
                      title={job.title}
                      description={job.description}
                      price={job.price}
                      urgency={job.urgency}
                      distance={job.location}
                      avatarUrl={job.avatarUrl}
                      studentName={job.studentName}
                      timeAgo={job.timeAgo}
                      onClick={() => handleJobClick(job)}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              /* Empty State */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="relative mb-6">
                  {/* Glow */}
                  <div className="absolute inset-0 w-24 h-24 bg-emerald-500/20 blur-2xl rounded-full" />
                  <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                    <Sparkles className="w-10 h-10 text-emerald-500" />
                  </div>
                </div>
                <h4 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">
                  No tasks yet
                </h4>
                <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-sm">
                  Be the first to post a task and get help from fellow students!
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 h-12 font-semibold shadow-lg shadow-emerald-500/25">
                      <Plus className="w-4 h-4 mr-2" />
                      Post First Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <VisuallyHidden.Root>
                      <DialogTitle>Create a Task</DialogTitle>
                    </VisuallyHidden.Root>
                    <SmartPricingForm />
                  </DialogContent>
                </Dialog>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
