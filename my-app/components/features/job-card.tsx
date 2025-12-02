"use client";

import { motion } from "framer-motion";
import { 
  MapPin, 
  Clock, 
  ArrowUpRight, 
  CircleDot, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  UtensilsCrossed,
  BookOpen,
  Monitor,
  Car,
  ShoppingBag,
  GraduationCap,
  Shirt,
  Printer,
  Package,
  MoreHorizontal,
  type LucideIcon
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Status configuration with premium styling
type JobStatus = "open" | "in_progress" | "completed" | "cancelled";

const STATUS_CONFIG: Record<JobStatus, {
  label: string;
  icon: LucideIcon;
  className: string;
  dotColor: string;
}> = {
  open: {
    label: "Open",
    icon: CircleDot,
    className: "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/25 dark:text-emerald-300 dark:border-emerald-500/40",
    dotColor: "bg-emerald-500",
  },
  in_progress: {
    label: "In Progress",
    icon: Loader2,
    className: "bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-500/25 dark:text-blue-300 dark:border-blue-500/40",
    dotColor: "bg-blue-500",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "bg-zinc-200 text-zinc-700 border border-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-600",
    dotColor: "bg-zinc-500",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className: "bg-red-100 text-red-800 border border-red-300 dark:bg-red-500/25 dark:text-red-300 dark:border-red-500/40",
    dotColor: "bg-red-500",
  },
};

// Category icons mapping
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "food-delivery": UtensilsCrossed,
  "academic": BookOpen,
  "tech-support": Monitor,
  "transport": Car,
  "shopping": ShoppingBag,
  "tutoring": GraduationCap,
  "laundry": Shirt,
  "printing": Printer,
  "moving": Package,
  "other": MoreHorizontal,
};

interface JobCardProps {
  title: string;
  description?: string;
  price: number;
  urgency: string;
  distance: string;
  avatarUrl: string;
  studentName: string;
  timeAgo: string;
  createdAt?: string;
  status?: JobStatus;
  category?: string;
  onClick?: () => void;
}

// Helper to format absolute date for tooltip
function formatAbsoluteDate(dateString?: string): string {
  if (!dateString) {
    return new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function JobCard({
  title,
  description,
  price,
  urgency,
  distance,
  avatarUrl,
  studentName,
  timeAgo,
  createdAt,
  status = "open",
  category,
  onClick,
}: JobCardProps) {
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;
  const CategoryIcon = category ? CATEGORY_ICONS[category] || MoreHorizontal : null;
  const isCompleted = status === "completed" || status === "cancelled";

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="group cursor-pointer"
      onClick={onClick}
    >
      <div className={`relative bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-5 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 hover:shadow-xl hover:shadow-zinc-200/50 dark:hover:shadow-emerald-500/5 transition-all duration-300 ${isCompleted ? "opacity-75" : ""}`}>
        {/* Status Badge - Top Left, Apple-style pill */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`absolute -top-2.5 left-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${statusConfig.className}`}
        >
          {status === "in_progress" ? (
            <StatusIcon className="h-3 w-3 animate-spin" />
          ) : (
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
          )}
          {statusConfig.label}
        </motion.div>

        {/* Price Tag - Floating Right */}
        <div className="absolute -top-3 right-4 px-3 py-1.5 bg-emerald-500 text-white text-sm font-semibold rounded-full shadow-lg shadow-emerald-500/30">
          Rs. {price.toLocaleString()}
        </div>

        {/* Header */}
        <div className="flex items-start gap-4 mb-3 mt-2">
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
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 cursor-help hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                  {timeAgo}
                </p>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900">
                {formatAbsoluteDate(createdAt)}
              </TooltipContent>
            </Tooltip>
          </div>
          <ArrowUpRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>

        {/* Title - with line clamp */}
        <h3 className="font-semibold text-zinc-900 dark:text-white tracking-tight text-lg leading-snug mb-2 line-clamp-2">
          {title}
        </h3>

        {/* Description Preview - Enhanced with 2 lines */}
        {description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {description}
          </p>
        )}

        {/* Footer Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Tag */}
          {CategoryIcon && category && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 rounded-lg text-xs font-medium">
              <CategoryIcon className="h-3 w-3" strokeWidth={2} />
              {category.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          )}
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

// Skeleton component for loading state
export function JobCardSkeleton() {
  return (
    <div className="relative bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-5">
      {/* Status Badge Skeleton */}
      <div className="absolute -top-2.5 left-4">
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>

      {/* Price Tag Skeleton */}
      <div className="absolute -top-3 right-4">
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>

      {/* Header Skeleton */}
      <div className="flex items-start gap-4 mb-3 mt-2">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="flex-1 min-w-0 pt-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      {/* Title Skeleton */}
      <div className="space-y-2 mb-3">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
      </div>

      {/* Description Skeleton */}
      <div className="space-y-1.5 mb-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* Footer Tags Skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-20 rounded-lg" />
        <Skeleton className="h-6 w-16 rounded-lg" />
        <Skeleton className="h-6 w-14 rounded-lg" />
      </div>
    </div>
  );
}