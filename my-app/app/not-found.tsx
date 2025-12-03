import { motion } from "framer-motion";
import { Search, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-6">
      {/* Background */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-white dark:bg-black">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      {/* Glow Orb */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-violet-500/20 blur-[120px] rounded-full -z-10" />

      <div className="max-w-md w-full text-center">
        {/* 404 Display */}
        <div className="relative mb-8">
          <h1 className="text-[120px] sm:text-[160px] font-bold tracking-tighter text-zinc-200 dark:text-zinc-800 leading-none select-none">
            404
          </h1>
        </div>

        {/* Text */}
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-3">
          Page not found
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-sm mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button
              className="h-12 px-6 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-semibold shadow-lg w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
