"use client";

import { motion } from "framer-motion";
import { MapPin, Clock, ArrowUpRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface JobCardProps {
  title: string;
  price: number;
  urgency: string;
  distance: string;
  avatarUrl: string;
  studentName: string;
  timeAgo: string;
}

export function JobCard({
  title,
  price,
  urgency,
  distance,
  avatarUrl,
  studentName,
  timeAgo,
}: JobCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="group cursor-pointer"
    >
      <div className="relative bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-5 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 hover:shadow-xl hover:shadow-zinc-200/50 dark:hover:shadow-emerald-500/5 transition-all duration-300">
        {/* Price Tag - Floating */}
        <div className="absolute -top-3 right-4 px-3 py-1.5 bg-emerald-500 text-white text-sm font-semibold rounded-full shadow-lg shadow-emerald-500/30">
          Rs. {price.toLocaleString()}
        </div>

        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <Avatar className="h-12 w-12 rounded-xl ring-2 ring-zinc-100 dark:ring-zinc-800">
            <AvatarImage src={avatarUrl} alt={studentName} />
            <AvatarFallback className="rounded-xl text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {studentName
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 tracking-tight">{studentName}</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">{timeAgo}</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>

        {/* Title */}
        <h3 className="font-semibold text-zinc-900 dark:text-white tracking-tight text-lg leading-snug mb-4">
          {title}
        </h3>

        {/* Footer Tags */}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <MapPin className="h-3 w-3" strokeWidth={2} />
            {distance}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-medium">
            <Clock className="h-3 w-3" strokeWidth={2} />
            {urgency}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// Mock data for testing
export const MOCK_JOBS: JobCardProps[] = [
  {
    title: "Need help moving furniture",
    price: 2500,
    urgency: "Today",
    distance: "0.5 km",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=ali",
    studentName: "Ali Hassan",
    timeAgo: "2 hours ago",
  },
  {
    title: "Looking for Math tutor",
    price: 1500,
    urgency: "This week",
    distance: "1.2 km",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sara",
    studentName: "Sara Ahmed",
    timeAgo: "5 hours ago",
  },
  {
    title: "Laptop repair needed",
    price: 3000,
    urgency: "ASAP",
    distance: "0.8 km",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=usman",
    studentName: "Usman Khan",
    timeAgo: "1 day ago",
  },
  {
    title: "Design a poster for event",
    price: 2000,
    urgency: "3 days",
    distance: "2.0 km",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=fatima",
    studentName: "Fatima Malik",
    timeAgo: "3 hours ago",
  },
  {
    title: "Need a photographer for convocation",
    price: 5000,
    urgency: "Next week",
    distance: "Campus",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=ahmed",
    studentName: "Ahmed Raza",
    timeAgo: "6 hours ago",
  },
];