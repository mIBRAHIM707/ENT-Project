"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Coffee, Zap } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export function SmartPricingForm() {
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState([2]); // 0-4 scale (Chill to ASAP)
  const [isThinking, setIsThinking] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const [calculatedPrice, setCalculatedPrice] = useState(0);

  // Helper function to calculate price
  const calculatePrice = (text: string, urgencyValue: number) => {
    const basePrice = 300;
    const textBonus = text.length * 2;
    const urgencyBonus = urgencyValue * 100;
    return basePrice + textBonus + urgencyBonus;
  };

  // Debounced price calculation - only for description changes
  useEffect(() => {
    if (description.length === 0) {
      setShowPrice(false);
      setIsThinking(false);
      return;
    }

    setIsThinking(true);
    setShowPrice(false);

    const timer = setTimeout(() => {
      const price = calculatePrice(description, urgency[0]);
      setCalculatedPrice(price);
      setIsThinking(false);
      setShowPrice(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [description]); // Only depend on description, not urgency

  // Instant recalculation when urgency changes (no loading state)
  useEffect(() => {
    if (description.length > 0 && showPrice) {
      const price = calculatePrice(description, urgency[0]);
      setCalculatedPrice(price);
    }
  }, [urgency, description, showPrice]);

  return (
    <div className="bg-white dark:bg-zinc-950 border-0 dark:border dark:border-zinc-800 min-h-[550px] flex flex-col shadow-xl">
      {/* Header */}
      <div className="px-8 pt-8 pb-2">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Create a Task</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Describe what you need and we'll suggest a fair price</p>
      </div>

      {/* Premium Notepad Textarea */}
      <div className="px-6 py-4 flex-1">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., I need someone to pick up my parcel from the admin block..."
          className="w-full min-h-[180px] text-lg font-normal border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 resize-none focus-visible:ring-1 focus-visible:ring-emerald-500 bg-zinc-50 dark:bg-zinc-800/50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100 leading-relaxed"
        />
        {/* Character count */}
        {description.length > 0 && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
            {description.length} characters
          </p>
        )}
      </div>

      {/* Bottom Section - Pinned */}
      <div className="px-8 pb-8 mt-auto">
        {/* Thinking Indicator */}
        <AnimatePresence>
          {isThinking && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-center gap-3 text-emerald-600 dark:text-emerald-400 py-8"
            >
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium tracking-tight">Analyzing your task...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Adaptive Price Card */}
        <AnimatePresence>
          {showPrice && (
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
            >
              {/* Light: Emerald tint, Dark: Deep black/green */}
              <div className="relative rounded-3xl p-6 space-y-6 overflow-hidden
                bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/50
                dark:bg-zinc-900 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-900
              ">
                {/* Glow Orbs - Both modes */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-500/20 blur-3xl rounded-full translate-y-1/2 -translate-x-1/2" />

                {/* Price Display */}
                <div className="relative text-center space-y-1">
                  <p className="text-xs uppercase tracking-widest text-emerald-700/70 dark:text-zinc-500 font-semibold">
                    Suggested Price
                  </p>
                  <motion.div
                    key={calculatedPrice}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-5xl sm:text-6xl font-bold tracking-tighter text-emerald-900 dark:text-white"
                  >
                    Rs. {calculatedPrice.toLocaleString()}
                  </motion.div>
                </div>

                {/* Urgency Slider */}
                <div className="relative space-y-4">
                  <div className="flex justify-between items-center text-xs text-emerald-700/60 dark:text-zinc-500 uppercase tracking-widest font-semibold">
                    <span>Urgency</span>
                  </div>
                  <div className="px-1">
                    <Slider
                      value={urgency}
                      onValueChange={setUrgency}
                      min={0}
                      max={4}
                      step={1}
                      className="[&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-emerald-200 dark:[&_[data-slot=slider-track]]:bg-zinc-800 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-emerald-500 [&_[data-slot=slider-range]]:to-teal-500 [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:border-emerald-500 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:h-5 [&_[data-slot=slider-thumb]]:w-5 [&_[data-slot=slider-thumb]]:shadow-lg"
                    />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-emerald-700/60 dark:text-zinc-500">
                      <Coffee className="h-4 w-4" strokeWidth={1.5} />
                      Chill
                    </span>
                    <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                      ASAP
                      <Zap className="h-4 w-4" strokeWidth={1.5} fill="currentColor" />
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  size="lg"
                  className="relative w-full h-14 rounded-2xl text-lg font-bold tracking-tight transition-all duration-300 overflow-hidden
                    bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25
                    dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 dark:shadow-white/10
                  "
                >
                  Post for Rs. {calculatedPrice.toLocaleString()}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!showPrice && !isThinking && description.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 space-y-4"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-zinc-800">
              <span className="text-3xl">✨</span>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 tracking-tight">Start typing to see the magic</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
