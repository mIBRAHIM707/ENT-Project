import { Skeleton } from "@/components/ui/skeleton";

export default function MyGigsLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-black relative">
      {/* Grid Background */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-white dark:bg-black">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Glow Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-blue-500/20 blur-[120px] rounded-full -z-10" />

      {/* Header Skeleton */}
      <header className="sticky top-0 z-50 bg-white/60 dark:bg-black/50 backdrop-blur-xl border-b border-zinc-200/30 dark:border-zinc-800/30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-9 h-9 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="space-y-4">
          {/* Stats Hero Skeleton */}
          <div className="bg-gradient-to-r from-blue-200 to-indigo-200 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-28 bg-white/30" />
                <Skeleton className="h-9 w-40 bg-white/30" />
              </div>
              <div className="flex gap-4">
                <div className="text-center space-y-1">
                  <Skeleton className="h-8 w-8 mx-auto bg-white/30" />
                  <Skeleton className="h-3 w-12 bg-white/30" />
                </div>
                <div className="text-center space-y-1">
                  <Skeleton className="h-8 w-8 mx-auto bg-white/30" />
                  <Skeleton className="h-3 w-16 bg-white/30" />
                </div>
              </div>
            </div>
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
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <Skeleton className="h-12 w-12 rounded-xl" />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>

                {/* Price */}
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>

              {/* Action Row */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <Skeleton className="h-8 w-32 rounded-lg" />
                <Skeleton className="h-9 w-32 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
