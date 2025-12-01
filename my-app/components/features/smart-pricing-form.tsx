"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export function SmartPricingForm() {
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState([2]); // 0-4 scale (Chill to ASAP)
  const [isThinking, setIsThinking] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const [calculatedPrice, setCalculatedPrice] = useState(0);

  // Debounced price calculation
  useEffect(() => {
    if (description.length === 0) {
      setShowPrice(false);
      return;
    }

    setIsThinking(true);
    setShowPrice(false);

    const timer = setTimeout(() => {
      // Dummy pricing logic
      const basePrice = 300;
      const textBonus = description.length * 2;
      const urgencyBonus = urgency[0] * 100;
      const price = basePrice + textBonus + urgencyBonus;

      setCalculatedPrice(price);
      setIsThinking(false);
      setShowPrice(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [description, urgency]);

  // Recalculate when urgency changes (but only if there's text)
  useEffect(() => {
    if (description.length > 0 && showPrice) {
      const basePrice = 300;
      const textBonus = description.length * 2;
      const urgencyBonus = urgency[0] * 100;
      setCalculatedPrice(basePrice + textBonus + urgencyBonus);
    }
  }, [urgency, description.length, showPrice]);

  const urgencyLabels = ["Chill", "Relaxed", "Normal", "Urgent", "ASAP"];

  return (
    <div className="space-y-6">
      {/* Large Borderless Textarea */}
      <div className="relative">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., I need someone to stand in line for me at the admin block..."
          className="min-h-[150px] text-lg border-none shadow-none resize-none focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Thinking Indicator */}
      <AnimatePresence>
        {isThinking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggested Price Card */}
      <AnimatePresence>
        {showPrice && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <Card className="rounded-2xl border-2 border-green-500/50 bg-gradient-to-br from-green-50 to-emerald-50 overflow-hidden">
              <CardContent className="p-6 space-y-6">
                {/* Price Display */}
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sm text-green-600 font-medium">
                    <Sparkles className="h-4 w-4" />
                    <span>Suggested Price</span>
                  </div>
                  <motion.div
                    key={calculatedPrice}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-4xl font-bold text-green-700"
                  >
                    Rs. {calculatedPrice.toLocaleString()}
                  </motion.div>
                </div>

                {/* Urgency Slider */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Urgency
                    </span>
                    <span className="text-sm font-semibold text-green-600 flex items-center gap-1">
                      {urgency[0] >= 3 && <Zap className="h-3 w-3" />}
                      {urgencyLabels[urgency[0]]}
                    </span>
                  </div>
                  <div className="px-1">
                    <Slider
                      value={urgency}
                      onValueChange={setUrgency}
                      min={0}
                      max={4}
                      step={1}
                      className="[&_[data-slot=slider-track]]:bg-green-200 [&_[data-slot=slider-range]]:bg-green-500 [&_[data-slot=slider-thumb]]:border-green-500"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Chill</span>
                    <span>ASAP</span>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  size="lg"
                  className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-lg h-14 font-semibold"
                >
                  Post for Rs. {calculatedPrice.toLocaleString()}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State Hint */}
      {!showPrice && !isThinking && description.length === 0 && (
        <div className="text-center text-muted-foreground/60 py-8">
          <p className="text-sm">Start typing to see the suggested price</p>
        </div>
      )}
    </div>
  );
}
