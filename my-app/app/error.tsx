"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-6">
      {/* Background */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-white dark:bg-black">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      {/* Glow Orb */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-red-500/20 blur-[120px] rounded-full -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative mx-auto mb-8"
        >
          <div className="absolute inset-0 w-24 h-24 mx-auto bg-red-500/20 blur-2xl rounded-full" />
          <div className="relative w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/50 dark:to-orange-950/50 flex items-center justify-center border border-red-200/50 dark:border-red-800/30 shadow-xl">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
        </motion.div>

        {/* Text */}
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-3">
          Something went wrong
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-sm mx-auto">
          We encountered an unexpected error. Don&apos;t worry, your data is safe. Try refreshing or head back home.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="h-12 px-6 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-semibold shadow-lg"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Link href="/">
            <Button
              variant="outline"
              className="h-12 px-6 rounded-2xl font-medium w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>

        {/* Error digest for debugging */}
        {error.digest && (
          <p className="mt-8 text-xs text-zinc-400 dark:text-zinc-600 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </motion.div>
    </div>
  );
}
