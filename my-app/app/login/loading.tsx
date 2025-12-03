import { Skeleton } from "@/components/ui/skeleton";

export default function LoginLoading() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-6">
      {/* Background */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-white dark:bg-black">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_60%,transparent_100%)]" />
      </div>

      {/* Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/20 blur-[150px] rounded-full -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-teal-500/15 blur-[120px] rounded-full -z-10" />

      {/* Login Form Skeleton */}
      <div className="w-full max-w-md">
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8 space-y-3">
            <Skeleton className="h-14 w-14 rounded-2xl mx-auto" />
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Email Input */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>

            {/* OTP Section */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>

            {/* Submit Button */}
            <Skeleton className="h-12 w-full rounded-xl mt-6" />
          </div>

          {/* Info */}
          <div className="mt-6 text-center">
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center w-full">
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
    </div>
  );
}
