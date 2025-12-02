"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Mail, 
  User, 
  Briefcase, 
  HandHelping, 
  Calendar,
  Loader2,
  CheckCircle2,
  Pencil,
  Save
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { updateProfile } from "@/app/actions/update-profile";
import Link from "next/link";

interface ProfileClientProps {
  email: string;
  displayName: string;
  avatarUrl: string;
  tasksPosted: number;
  tasksApplied: number;
  createdAt: string;
}

// Extract roll number from GIKI email
function extractRollNumber(email: string): string {
  const match = email.match(/^([a-z]?\d+)/i);
  return match ? match[1].toUpperCase() : "Student";
}

// Format date
function formatJoinDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { 
    month: "long", 
    year: "numeric" 
  });
}

export function ProfileClient({
  email,
  displayName,
  avatarUrl,
  tasksPosted,
  tasksApplied,
  createdAt,
}: ProfileClientProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(displayName);
  const [isPending, startTransition] = useTransition();
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rollNumber = extractRollNumber(email);
  const joinDate = formatJoinDate(createdAt);

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("displayName", name);
      
      const result = await updateProfile(formData);
      
      if (result.success) {
        setShowSuccess(true);
        setIsEditing(false);
        setTimeout(() => setShowSuccess(false), 2000);
      } else if (result.error) {
        setError(result.error);
      }
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black relative">
      {/* Grid Background */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-white dark:bg-black">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Glow Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-500/20 blur-[120px] rounded-full -z-10" />
      <div className="absolute top-[300px] right-0 w-[400px] h-[300px] bg-emerald-500/10 blur-[100px] rounded-full -z-10" />

      {/* Glass Header */}
      <header className="sticky top-0 z-50 bg-white/60 dark:bg-black/50 backdrop-blur-xl border-b border-zinc-200/30 dark:border-zinc-800/30">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
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
              Student Profile
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Profile Card - Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl shadow-zinc-900/10 dark:shadow-black/30"
        >
          {/* Decorative Gradient */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-transparent" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="relative p-8 sm:p-10">
            {/* Avatar Section */}
            <div className="flex flex-col items-center mb-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
                className="relative"
              >
                <Avatar className="h-28 w-28 ring-4 ring-white dark:ring-zinc-800 shadow-2xl">
                  <AvatarImage src={avatarUrl} alt={rollNumber} />
                  <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                    {rollNumber.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                {/* Online indicator */}
                <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
                </div>
              </motion.div>

              {/* Roll Number & Join Date */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-4 text-center"
              >
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  {rollNumber}
                </h2>
                <div className="flex items-center justify-center gap-1.5 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Joined {joinDate}</span>
                </div>
              </motion.div>
            </div>

            {/* Info Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4 mb-8"
            >
              {/* Email - Read Only */}
              <div className="p-4 rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20">
                    <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-0.5">
                      Email
                    </p>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                      {email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Display Name - Editable */}
              <div className="p-4 rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-500/10 dark:bg-violet-500/20">
                    <User className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      Display Name
                    </p>
                    {isEditing ? (
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Ali - CS '25"
                        className="h-9 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 focus-visible:ring-violet-500"
                        maxLength={50}
                      />
                    ) : (
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">
                        {displayName || "Not set"}
                      </p>
                    )}
                  </div>
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditing(true)}
                      className="h-9 w-9 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-500/20"
                    >
                      <Pencil className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Save Button & Error */}
              {isEditing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex flex-col gap-3"
                >
                  {error && (
                    <p className="text-sm text-red-500 dark:text-red-400 text-center">
                      {error}
                    </p>
                  )}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setName(displayName);
                        setError(null);
                      }}
                      className="flex-1 h-11 rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isPending}
                      className="flex-1 h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Success Message */}
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Profile updated!</span>
                </motion.div>
              )}
            </motion.div>

            {/* Stats Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-4">
                Activity
              </p>
              <div className="grid grid-cols-2 gap-4">
                {/* Tasks Posted */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/5 border border-emerald-200/50 dark:border-emerald-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/20 dark:bg-emerald-500/30">
                      <Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-xs font-semibold text-emerald-700/70 dark:text-emerald-400/70 uppercase tracking-wider">
                      Posted
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-emerald-900 dark:text-white">
                    {tasksPosted}
                  </p>
                  <p className="text-sm text-emerald-600/70 dark:text-emerald-400/60 mt-1">
                    tasks created
                  </p>
                </div>

                {/* Tasks Applied */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/5 border border-blue-200/50 dark:border-blue-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/20 dark:bg-blue-500/30">
                      <HandHelping className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-xs font-semibold text-blue-700/70 dark:text-blue-400/70 uppercase tracking-wider">
                      Applied
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-blue-900 dark:text-white">
                    {tasksApplied}
                  </p>
                  <p className="text-sm text-blue-600/70 dark:text-blue-400/60 mt-1">
                    tasks helped
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 flex gap-4"
        >
          <Link href="/my-jobs" className="flex-1">
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Briefcase className="h-4 w-4 mr-2" />
              View My Tasks
            </Button>
          </Link>
          <Link href="/" className="flex-1">
            <Button
              className="w-full h-12 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100"
            >
              Browse Tasks
            </Button>
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
