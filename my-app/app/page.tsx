"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Utensils, BookOpen, Laptop, Car } from "lucide-react";
import { JobCard, MOCK_JOBS } from "@/components/features/job-card";
import { SmartPricingForm } from "@/components/features/smart-pricing-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

// Bento Category Data
const categories = [
  {
    title: "Food Delivery",
    emoji: "🍔",
    icon: Utensils,
    bg: "bg-gradient-to-br from-orange-100 to-amber-50",
    span: "col-span-2 row-span-2",
    textColor: "text-orange-900",
  },
  {
    title: "Assignments",
    emoji: "📚",
    icon: BookOpen,
    bg: "bg-gradient-to-br from-blue-100 to-sky-50",
    span: "col-span-2 row-span-1",
    textColor: "text-blue-900",
  },
  {
    title: "Tech Support",
    emoji: "💻",
    icon: Laptop,
    bg: "bg-gradient-to-br from-zinc-100 to-slate-50",
    span: "col-span-1 row-span-1",
    textColor: "text-zinc-900",
  },
  {
    title: "Ride Share",
    emoji: "🚗",
    icon: Car,
    bg: "bg-gradient-to-br from-emerald-100 to-green-50",
    span: "col-span-1 row-span-1",
    textColor: "text-emerald-900",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-50/50 via-white to-white">
      {/* Minimalist Header */}
      <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-zinc-200/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tighter text-zinc-900">
            TaskVibe
          </h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="text-zinc-600 font-medium">
              Login
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="icon"
                  className="rounded-full h-9 w-9 bg-zinc-900 hover:bg-zinc-800 shadow-lg shadow-zinc-900/20"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-3xl border-0">
                <VisuallyHidden.Root>
                  <DialogTitle>Create a Task</DialogTitle>
                </VisuallyHidden.Root>
                <SmartPricingForm />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Massive Typography */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tighter text-zinc-900 leading-[1.1]"
          >
            Get campus life sorted.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg sm:text-xl text-zinc-500 mt-6 tracking-tight"
          >
            The marketplace for Topi.
          </motion.p>

          {/* Spotlight Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-10 max-w-2xl mx-auto"
          >
            <Dialog>
              <DialogTrigger asChild>
                <button className="w-full group">
                  <div className="flex items-center gap-4 px-6 py-5 bg-white rounded-2xl border border-zinc-200 shadow-lg shadow-zinc-200/50 hover:shadow-xl hover:shadow-zinc-200/50 hover:border-zinc-300 transition-all duration-300">
                    <Search className="h-5 w-5 text-zinc-400" />
                    <span className="text-lg text-zinc-400 font-light tracking-tight">
                      What do you need done today?
                    </span>
                  </div>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-3xl border-0">
                <VisuallyHidden.Root>
                  <DialogTitle>Create a Task</DialogTitle>
                </VisuallyHidden.Root>
                <SmartPricingForm />
              </DialogContent>
            </Dialog>
          </motion.div>
        </div>
      </section>

      {/* Bento Categories Section */}
      <section className="px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <motion.h3
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-6"
          >
            Explore
          </motion.h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[140px]">
            {categories.map((category, index) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className={`${category.span} ${category.bg} rounded-3xl p-6 cursor-pointer transition-shadow duration-300 hover:shadow-xl relative overflow-hidden group`}
              >
                {/* Large Emoji Background */}
                <span className="absolute -bottom-4 -right-4 text-8xl opacity-20 group-hover:opacity-30 transition-opacity">
                  {category.emoji}
                </span>

                {/* Content */}
                <div className="relative z-10">
                  <category.icon
                    className={`h-6 w-6 ${category.textColor} opacity-80 mb-3`}
                    strokeWidth={1.5}
                  />
                  <h4
                    className={`font-semibold tracking-tight ${category.textColor}`}
                  >
                    {category.title}
                  </h4>
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
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">
              Happening Now
            </h3>
          </motion.div>

          {/* Jobs Grid with More Whitespace */}
          <AnimatePresence>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {MOCK_JOBS.map((job, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.08,
                    ease: "easeOut",
                  }}
                >
                  <JobCard {...job} />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
