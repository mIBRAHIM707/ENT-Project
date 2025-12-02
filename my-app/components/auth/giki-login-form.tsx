"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, Loader2, CheckCircle2, AlertCircle, Sparkles, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

type Stage = "email" | "otp" | "success";

export function GikiLoginForm() {
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const supabase = createClient();

  // Extract roll number from email (e.g., u2023444@giki.edu.pk -> u2023444)
  const extractRollNumber = (email: string) => {
    const match = email.match(/^([a-z]?\d+)/i);
    return match ? match[1].toUpperCase() : "Student";
  };

  // Validate GIKI email
  const isValidGikiEmail = (email: string) => {
    const gikiRegex = /^[a-zA-Z0-9._%+-]+@giki\.edu(\.pk)?$/i;
    return gikiRegex.test(email);
  };

  // Handle email submission
  const handleSendCode = () => {
    setError(null);

    if (!email) {
      setError("Please enter your email");
      return;
    }

    if (!isValidGikiEmail(email)) {
      if (email.includes("@gmail") || email.includes("@yahoo") || email.includes("@hotmail")) {
        setError("🔒 Exclusive to GIKI Students only.");
      } else {
        setError("Please use your GIKI email (@giki.edu.pk)");
      }
      return;
    }

    startTransition(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setStage("otp");
      }
    });
  };

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      otpRefs.current[nextIndex]?.focus();
    } else {
      const newOtp = [...otp];
      newOtp[index] = value.replace(/\D/g, "");
      setOtp(newOtp);
      
      // Auto-focus next input
      if (value && index < 5) {
        otpRefs.current[index + 1]?.focus();
      }
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle OTP verification
  const handleVerifyOtp = () => {
    setError(null);
    const token = otp.join("");

    if (token.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    startTransition(async () => {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });

      if (error) {
        setError(error.message);
      } else {
        setStage("success");
        // Force navigation and refresh to update server components
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 1000);
      }
    });
  };

  // Auto-submit when OTP is complete
  useEffect(() => {
    if (otp.every(digit => digit) && stage === "otp") {
      handleVerifyOtp();
    }
  }, [otp, stage]);

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl shadow-zinc-900/10 dark:shadow-black/30"
      >
        {/* Glow Orbs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/20 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 mb-4 shadow-lg shadow-emerald-500/30"
            >
              {stage === "success" ? (
                <CheckCircle2 className="w-8 h-8 text-white" />
              ) : stage === "otp" ? (
                <KeyRound className="w-8 h-8 text-white" />
              ) : (
                <Mail className="w-8 h-8 text-white" />
              )}
            </motion.div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {stage === "success" ? "Welcome Back!" : stage === "otp" ? "Check Your Email" : "Welcome to CrowdServe"}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
              {stage === "success" 
                ? `Signed in as ${extractRollNumber(email)}`
                : stage === "otp" 
                ? `We sent a code to ${email}`
                : "Sign in with your GIKI email"
              }
            </p>
          </div>

          <AnimatePresence mode="wait">
            {/* Stage 1: Email Entry */}
            {stage === "email" && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    GIKI Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                    <Input
                      type="email"
                      placeholder="u2023444@giki.edu.pk"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                      className="pl-12 h-14 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus-visible:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-500/10 rounded-xl p-3"
                    >
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  onClick={handleSendCode}
                  disabled={isPending}
                  className="w-full h-14 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-semibold text-base shadow-lg"
                >
                  {isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Send Code
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
                  By continuing, you agree to our Terms of Service
                </p>
              </motion.div>
            )}

            {/* Stage 2: OTP Entry */}
            {stage === "otp" && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* OTP Inputs */}
                <div className="flex justify-center gap-2 sm:gap-3">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { otpRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border-2 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                    />
                  ))}
                </div>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center justify-center gap-2 text-red-500 dark:text-red-400 text-sm"
                    >
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  onClick={handleVerifyOtp}
                  disabled={isPending || otp.some(d => !d)}
                  className="w-full h-14 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base shadow-lg shadow-emerald-500/25"
                >
                  {isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Verify & Enter
                      <Sparkles className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>

                <button
                  onClick={() => {
                    setStage("email");
                    setOtp(["", "", "", "", "", ""]);
                    setError(null);
                  }}
                  className="w-full text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  ← Use a different email
                </button>
              </motion.div>
            )}

            {/* Stage 3: Success */}
            {stage === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-500/20 mb-4"
                >
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                </motion.div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                  Welcome back, {extractRollNumber(email)}! 🎉
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                  Redirecting you to the app...
                </p>
                <div className="mt-4">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-emerald-500" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
