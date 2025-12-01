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
    <div className="bg-white p-8 min-h-[500px] flex flex-col">
      {/* Premium Notepad Textarea */}
      <div className="mb-16">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your task..."
          className="min-h-[180px] text-3xl font-light border-none shadow-none resize-none focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/30 leading-relaxed"
        />
      </div>

      {/* Thinking Indicator */}
      <AnimatePresence>
        {isThinking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-center gap-3 text-zinc-400 mb-8"
          >
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium tracking-wide">Calculating...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glassmorphism Floating Price Dock */}
      <AnimatePresence>
        {showPrice && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="mt-auto"
          >
            <div className="relative backdrop-blur-2xl bg-white/80 border border-zinc-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-3xl p-8 space-y-8">
              {/* Emerald Glow */}
              <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full -z-10" />

              {/* Price Display */}
              <div className="text-center space-y-2">
                <p className="text-xs uppercase tracking-widest text-zinc-400 font-medium">
                  Suggested Price
                </p>
                <motion.div
                  key={calculatedPrice}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-7xl font-light tracking-tighter text-zinc-900"
                >
                  Rs. {calculatedPrice.toLocaleString()}
                </motion.div>
              </div>

              {/* Elegant Urgency Slider */}
              <div className="space-y-4">
                <div className="px-2">
                  <Slider
                    value={urgency}
                    onValueChange={setUrgency}
                    min={0}
                    max={4}
                    step={1}
                    className="[&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-zinc-200 [&_[data-slot=slider-range]]:bg-emerald-500 [&_[data-slot=slider-thumb]]:border-emerald-500 [&_[data-slot=slider-thumb]]:h-5 [&_[data-slot=slider-thumb]]:w-5"
                  />
                </div>
                <div className="flex justify-between items-center text-sm text-zinc-500">
                  <span className="flex items-center gap-2">
                    <Coffee className="h-4 w-4" strokeWidth={1.5} />
                    Chill
                  </span>
                  <span className="flex items-center gap-2 text-emerald-600 font-medium">
                    ASAP
                    <Zap className="h-4 w-4" strokeWidth={1.5} fill="currentColor" />
                  </span>
                </div>
              </div>

              {/* Premium Submit Button */}
              <Button
                size="lg"
                className="w-full h-16 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-xl font-semibold shadow-lg shadow-emerald-500/25 transition-all duration-300"
              >
                Post for Rs. {calculatedPrice.toLocaleString()}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State Hint */}
      {!showPrice && !isThinking && description.length === 0 && (
        <div className="mt-auto text-center text-zinc-300 py-12">
          <p className="text-lg font-light">Start typing to see the magic</p>
        </div>
      )}
    </div>
  );
}
