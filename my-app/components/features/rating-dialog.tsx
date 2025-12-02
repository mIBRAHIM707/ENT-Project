"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createRating } from "@/app/actions/rating";

interface RatingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  ratedUserId: string;
  ratedUserName: string;
  ratedUserAvatar?: string;
  ratingType: "poster_to_helper" | "helper_to_poster";
}

export function RatingDialog({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  ratedUserId,
  ratedUserName,
  ratedUserAvatar,
  ratingType,
}: RatingDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayRating = hoveredRating || rating;

  const getRatingLabel = (value: number) => {
    switch (value) {
      case 1: return "Poor";
      case 2: return "Fair";
      case 3: return "Good";
      case 4: return "Great";
      case 5: return "Excellent";
      default: return "Select a rating";
    }
  };

  const handleSubmit = () => {
    if (rating === 0) return;
    setError(null);

    startTransition(async () => {
      const result = await createRating({
        jobId,
        ratedUserId,
        rating,
        ratingType,
        review: review.trim() || undefined,
      });

      if (result.success) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          onClose();
          // Reset state
          setRating(0);
          setReview("");
        }, 2000);
      } else if (result.error) {
        setError(result.error);
      }
    });
  };

  const handleClose = () => {
    if (!isPending && !showSuccess) {
      onClose();
      setRating(0);
      setReview("");
      setError(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px] rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden p-0">
        <AnimatePresence mode="wait">
          {showSuccess ? (
            /* Success State */
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-16 px-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="relative mb-6"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/30">
                  <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={2.5} />
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="absolute -top-1 -right-1"
                >
                  <Sparkles className="w-6 h-6 text-amber-400" />
                </motion.div>
              </motion.div>
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2"
              >
                Thanks for your feedback!
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-zinc-500 dark:text-zinc-400 text-center"
              >
                Your rating helps build trust in our community.
              </motion.p>
            </motion.div>
          ) : (
            /* Rating Form */
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              <DialogHeader className="text-center mb-6">
                <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  Rate your experience
                </DialogTitle>
                <DialogDescription className="text-zinc-500 dark:text-zinc-400 mt-1">
                  How was working with {ratedUserName}?
                </DialogDescription>
              </DialogHeader>

              {/* User Avatar */}
              <div className="flex flex-col items-center mb-6">
                <Avatar className="h-16 w-16 rounded-2xl ring-4 ring-zinc-100 dark:ring-zinc-800 mb-3">
                  <AvatarImage src={ratedUserAvatar} alt={ratedUserName} />
                  <AvatarFallback className="rounded-2xl text-lg font-semibold bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/50 dark:to-purple-900/50 text-violet-600 dark:text-violet-400">
                    {ratedUserName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <p className="font-semibold text-zinc-900 dark:text-white">{ratedUserName}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  for &quot;{jobTitle.slice(0, 40)}{jobTitle.length > 40 ? "..." : ""}&quot;
                </p>
              </div>

              {/* Star Rating - Premium */}
              <div className="flex flex-col items-center gap-3 mb-6">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <motion.button
                      key={value}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setRating(value)}
                      onMouseEnter={() => setHoveredRating(value)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="relative p-1 focus:outline-none"
                    >
                      <Star
                        className={`h-10 w-10 transition-all duration-200 ${
                          value <= displayRating
                            ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                            : "text-zinc-200 dark:text-zinc-700"
                        }`}
                        strokeWidth={1.5}
                      />
                    </motion.button>
                  ))}
                </div>
                <motion.p
                  key={displayRating}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-sm font-medium ${
                    displayRating > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-zinc-400"
                  }`}
                >
                  {getRatingLabel(displayRating)}
                </motion.p>
              </div>

              {/* Review Textarea */}
              <div className="mb-6">
                <Textarea
                  placeholder="Share your experience (optional)..."
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  className="min-h-[100px] rounded-xl border-zinc-200 dark:border-zinc-800 resize-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50"
                  maxLength={500}
                />
                <p className="text-xs text-zinc-400 mt-2 text-right">
                  {review.length}/500
                </p>
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-center text-sm text-red-500 dark:text-red-400 mb-4"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isPending}
                  className="flex-1 rounded-xl h-12 font-medium"
                >
                  Skip
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={rating === 0 || isPending}
                  className="flex-1 rounded-xl h-12 font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:shadow-none"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Star className="h-4 w-4 mr-2 fill-current" />
                      Submit Rating
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
