"use client";

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, Coffee, Zap, CheckCircle2, Sparkles, MapPin, Tag,
  UtensilsCrossed, BookOpen, Monitor, Car, ShoppingBag, 
  GraduationCap, Shirt, Printer, Package, MoreHorizontal,
  type LucideIcon
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createJob } from "@/app/actions/create-job";

// Task categories with icons
export const TASK_CATEGORIES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "food-delivery", label: "Food Delivery", icon: UtensilsCrossed },
  { value: "assignments", label: "Assignments", icon: BookOpen },
  { value: "tech-support", label: "Tech Support", icon: Monitor },
  { value: "ride-share", label: "Ride Share", icon: Car },
  { value: "shopping", label: "Shopping", icon: ShoppingBag },
  { value: "tutoring", label: "Tutoring", icon: GraduationCap },
  { value: "laundry", label: "Laundry", icon: Shirt },
  { value: "printing", label: "Printing", icon: Printer },
  { value: "moving", label: "Moving Help", icon: Package },
  { value: "other", label: "Other", icon: MoreHorizontal },
];

// Campus location options
const CAMPUS_LOCATIONS = [
  "Hostel 1",
  "Hostel 2",
  "Hostel 3",
  "Hostel 4",
  "Hostel 5",
  "Hostel 6",
  "Hostel 7",
  "Hostel 8",
  "Hostel 9",
  "Hostel 10",
  "Hostel 11",
  "Hostel 12",
  "New Girls Hostel",
  "Library",
  "Academic Block",
  "Cafe",
  "Admin Block",
  "Sports Complex",
  "Auditorium",
  "Other",
];

interface SmartPricingFormProps {
  onSuccess?: () => void;
}

export function SmartPricingForm({ onSuccess }: SmartPricingFormProps) {
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState([2]); // 0-4 scale (Chill to ASAP)
  const [isThinking, setIsThinking] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");

  // Map urgency slider value to text
  const getUrgencyText = (value: number) => {
    const urgencyMap = ["Flexible", "This week", "3 days", "Today", "ASAP"];
    return urgencyMap[value] || "Flexible";
  };

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
    <div className="relative bg-white dark:bg-zinc-950 border-0 dark:border dark:border-zinc-800 max-h-[85dvh] flex flex-col shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-2 flex-shrink-0">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Create a Task</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Describe what you need and we'll suggest a fair price</p>
      </div>

      {/* Scrollable Content */}
      <div className="px-6 py-4 flex-1 overflow-y-auto min-h-0">
        {/* Premium Notepad Textarea */}
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., I need someone to pick up my parcel from the admin block..."
          className="w-full min-h-[100px] text-base font-normal border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 resize-none focus-visible:ring-1 focus-visible:ring-emerald-500 bg-zinc-50 dark:bg-zinc-800/50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100 leading-relaxed"
        />

        {/* Location & Category Row */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {/* Location Selector */}
          <div>
            <label className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-semibold mb-2 block">
              Location
            </label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="w-full h-11 rounded-xl bg-white dark:bg-zinc-800/80 border-0 shadow-sm ring-1 ring-zinc-200/80 dark:ring-zinc-700/50 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 transition-all">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                  <span className="truncate text-sm">{location || "Select..."}</span>
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-0 shadow-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl max-h-60">
                {CAMPUS_LOCATIONS.map((loc) => (
                  <SelectItem 
                    key={loc} 
                    value={loc}
                    className="rounded-xl cursor-pointer"
                  >
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Selector */}
          <div>
            <label className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-semibold mb-2 block">
              Category
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full h-11 rounded-xl bg-white dark:bg-zinc-800/80 border-0 shadow-sm ring-1 ring-zinc-200/80 dark:ring-zinc-700/50 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 transition-all">
                <div className="flex items-center gap-2">
                  {category ? (
                    <>
                      {(() => {
                        const selectedCat = TASK_CATEGORIES.find(c => c.value === category);
                        if (selectedCat) {
                          const IconComponent = selectedCat.icon;
                          return <IconComponent className="h-4 w-4 text-emerald-500 flex-shrink-0" />;
                        }
                        return <Tag className="h-4 w-4 text-zinc-400 flex-shrink-0" />;
                      })()}
                      <span className="truncate text-sm font-medium">{TASK_CATEGORIES.find(c => c.value === category)?.label}</span>
                    </>
                  ) : (
                    <>
                      <Tag className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                      <span className="text-zinc-400 text-sm">Select...</span>
                    </>
                  )}
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-0 shadow-2xl shadow-black/20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-1 min-w-[200px]">
                {TASK_CATEGORIES.map((cat) => {
                  const IconComponent = cat.icon;
                  return (
                    <SelectItem 
                      key={cat.value} 
                      value={cat.value}
                      className="rounded-xl py-2.5 px-3 focus:bg-zinc-100 dark:focus:bg-zinc-800 cursor-pointer transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <IconComponent className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                        <span className="font-medium text-sm">{cat.label}</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Price Section - Inside scrollable area */}
        {/* Thinking Indicator */}
        <AnimatePresence>
          {isThinking && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-center gap-3 text-emerald-600 dark:text-emerald-400 py-6"
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
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="mt-4"
            >
              {/* Light: Emerald tint, Dark: Deep black/green */}
              <div className="relative rounded-2xl p-5 space-y-5 overflow-hidden
                bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/50
                dark:bg-zinc-900 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-900
              ">
                {/* Glow Orbs - Both modes */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/20 blur-3xl rounded-full translate-y-1/2 -translate-x-1/2" />

                {/* Price Display */}
                <div className="relative text-center space-y-0.5">
                  <p className="text-[10px] uppercase tracking-widest text-emerald-700/70 dark:text-zinc-500 font-semibold">
                    Suggested Price
                  </p>
                  <motion.div
                    key={calculatedPrice}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-4xl font-bold tracking-tighter text-emerald-900 dark:text-white"
                  >
                    Rs. {calculatedPrice.toLocaleString()}
                  </motion.div>
                </div>

                {/* Urgency Slider */}
                <div className="relative space-y-3">
                  <div className="flex justify-between items-center text-[10px] text-emerald-700/60 dark:text-zinc-500 uppercase tracking-widest font-semibold">
                    <span>Urgency</span>
                  </div>
                  <div className="px-1">
                    <Slider
                      value={urgency}
                      onValueChange={setUrgency}
                      min={0}
                      max={4}
                      step={1}
                      className="[&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-emerald-200 dark:[&_[data-slot=slider-track]]:bg-zinc-800 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-emerald-500 [&_[data-slot=slider-range]]:to-teal-500 [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:border-emerald-500 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:h-4 [&_[data-slot=slider-thumb]]:w-4 [&_[data-slot=slider-thumb]]:shadow-md"
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1.5 text-emerald-700/60 dark:text-zinc-500">
                      <Coffee className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Chill
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                      ASAP
                      <Zap className="h-3.5 w-3.5" strokeWidth={1.5} fill="currentColor" />
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  size="lg"
                  disabled={isPending}
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      const formData = new FormData();
                      formData.append("title", description.slice(0, 100));
                      formData.append("description", description);
                      formData.append("price", calculatedPrice.toString());
                      formData.append("urgency", getUrgencyText(urgency[0]));
                      formData.append("location", location || "Campus");
                      formData.append("category", category || "other");

                      const result = await createJob(formData);

                      if (result.success) {
                        setShowSuccess(true);
                        setDescription("");
                        setShowPrice(false);
                        setTimeout(() => {
                          setShowSuccess(false);
                          onSuccess?.();
                        }, 2500);
                      } else if (result.error) {
                        setError(result.error);
                      }
                    });
                  }}
                  className="relative w-full h-12 rounded-xl text-base font-bold tracking-tight transition-all duration-300 overflow-hidden
                    bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25
                    dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 dark:shadow-white/10
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Posting...
                    </span>
                  ) : (
                    `Post for Rs. ${calculatedPrice.toLocaleString()}`
                  )}
                </Button>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-center text-sm text-red-500 dark:text-red-400"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success State - Premium Notification */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute inset-0 flex items-center justify-center bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl z-50"
            >
              <div className="text-center space-y-6 px-8">
                {/* Animated Success Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                  className="relative mx-auto"
                >
                  {/* Glow Ring */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
                    className="absolute inset-0 w-24 h-24 mx-auto rounded-full bg-emerald-500/30"
                  />
                  <div className="relative w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-500/40">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
                    >
                      <CheckCircle2 className="w-12 h-12 text-white" strokeWidth={2.5} />
                    </motion.div>
                  </div>
                </motion.div>

                {/* Text */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    Task Posted! 🎉
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                    Your task is now live. Helpers will reach out soon!
                  </p>
                </motion.div>

                {/* Sparkle particles */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center justify-center gap-1"
                >
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ y: 0, opacity: 0.5 }}
                      animate={{ y: [-5, 5, -5], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                    >
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Progress bar */}
                <motion.div className="w-48 mx-auto h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2.5, ease: "linear" }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                  />
                </motion.div>
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
