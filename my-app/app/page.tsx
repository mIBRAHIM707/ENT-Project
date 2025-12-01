"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { JobCard, MOCK_JOBS } from "@/components/features/job-card";
import { SmartPricingForm } from "@/components/features/smart-pricing-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header with Glassmorphism */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-green-600">TaskVibe</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button className="rounded-xl bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4" />
                Post Job
              </Button>
            </SheetTrigger>
            {/* Bottom on mobile, Right on desktop */}
            <SheetContent
              side="bottom"
              className="md:hidden rounded-t-2xl max-h-[90vh] overflow-y-auto"
            >
              <SheetHeader>
                <SheetTitle className="text-xl">Create a Task</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-6">
                <SmartPricingForm />
              </div>
            </SheetContent>
            <SheetContent
              side="right"
              className="hidden md:flex md:flex-col md:w-[450px] md:max-w-[450px]"
            >
              <SheetHeader>
                <SheetTitle className="text-xl">Create a Task</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-4 pb-6">
                <SmartPricingForm />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <AnimatePresence>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MOCK_JOBS.map((job, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.1,
                  ease: "easeOut",
                }}
              >
                <JobCard {...job} />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </main>
    </div>
  );
}
