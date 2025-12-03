import { Skeleton } from "@/components/ui/skeleton";

export default function MyJobsLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-black relative">
      {/* Grid Background */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-white dark:bg-black">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Glow Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-violet-500/20 blur-[120px] rounded-full -z-10" />

      {/* Header Skeleton */}
      <header className="sticky top-0 z-50 bg-white/60 dark:bg-black/50 backdrop-blur-xl border-b border-zinc-200/30 dark:border-zinc-800/30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-9 h-9 rounded-full" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="space-y-4">
          {/* Post New Task CTA Skeleton */}
          <div className="bg-gradient-to-r from-zinc-200 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 rounded-2xl p-5 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>

          {/* Tab Bar Skeleton */}
          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl w-fit">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>

          {/* Job Cards Skeleton */}
          {[...Array(3)].map((_, index) => (
            <div
              key={index}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-5"
            >
              {/* Main Row */}
              <div className="flex items-start gap-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <Skeleton className="h-7 w-20 rounded-full" />
              </div>

              {/* Action Row */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-24 rounded-lg" />
                  <Skeleton className="h-8 w-20 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
