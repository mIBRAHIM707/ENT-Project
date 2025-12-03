"use client";

import { motion } from "framer-motion";

export default function Loading() {
  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-white dark:bg-black">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Glow Orb */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-emerald-500/20 blur-[120px] rounded-full -z-10" />

      {/* Header Skeleton */}
      <header className="sticky top-0 z-50 bg-white/60 dark:bg-black/50 backdrop-blur-xl border-b border-zinc-200/30 dark:border-zinc-800/30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="h-6 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
            <div className="h-9 w-9 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
            <div className="h-9 w-9 bg-zinc-900 dark:bg-white rounded-full animate-pulse" />
          </div>
        </div>
      </header>

      {/* Hero Skeleton */}
      <section className="relative pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Title skeleton */}
            <div className="space-y-3 flex flex-col items-center">
              <div className="h-14 w-[320px] sm:w-[450px] bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
              <div className="h-14 w-[200px] sm:w-[280px] bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl animate-pulse" />
            </div>
            
            {/* Subtitle skeleton */}
            <div className="h-6 w-[280px] sm:w-[420px] mx-auto bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />

            {/* Search bar skeleton */}
            <div className="mt-10 max-w-4xl mx-auto flex items-center justify-center gap-2 sm:gap-3">
              <div className="flex-1 max-w-md h-11 bg-white/80 dark:bg-zinc-800/80 rounded-full animate-pulse shadow-sm" />
              <div className="hidden sm:block w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
              <div className="w-24 h-11 bg-white/80 dark:bg-zinc-800/80 rounded-full animate-pulse" />
              <div className="w-24 h-11 bg-white/80 dark:bg-zinc-800/80 rounded-full animate-pulse" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories Grid Skeleton */}
      <section className="px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[160px]">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`${i === 0 ? 'col-span-2 row-span-2' : i === 1 ? 'col-span-2' : ''} rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 animate-pulse`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Jobs Grid Skeleton */}
      <section className="px-6 py-12 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-5"
              >
                {/* Status Badge Skeleton */}
                <div className="absolute -top-2.5 left-4">
                  <div className="h-5 w-14 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                </div>

                {/* Price Tag Skeleton */}
                <div className="absolute -top-3 right-4">
                  <div className="h-7 w-20 bg-emerald-200 dark:bg-emerald-900/30 rounded-full animate-pulse" />
                </div>

                {/* Header Skeleton */}
                <div className="flex items-start gap-4 mb-3 mt-2">
                  <div className="h-12 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
                  <div className="flex-1 min-w-0 pt-1 space-y-2">
                    <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                    <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                  </div>
                </div>

                {/* Title Skeleton */}
                <div className="space-y-2 mb-3">
                  <div className="h-5 w-full bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="h-5 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                </div>

                {/* Description Skeleton */}
                <div className="space-y-1.5 mb-3">
                  <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                </div>

                {/* Footer Tags Skeleton */}
                <div className="flex items-center gap-2">
                  <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
                  <div className="h-6 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
                  <div className="h-6 w-14 bg-amber-100 dark:bg-amber-900/30 rounded-lg animate-pulse" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
