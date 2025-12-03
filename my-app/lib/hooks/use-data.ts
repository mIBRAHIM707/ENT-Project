import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";

// Types
export type JobStatus = "open" | "in_progress" | "completed" | "cancelled";

export interface Job {
  id: string;
  title: string;
  description?: string;
  price: number;
  urgency: string;
  location: string;
  category?: string;
  status?: JobStatus;
  assignedTo?: string | null;
  userId: string;
  studentName: string;
  avatarUrl: string;
  timeAgo: string;
  createdAt?: string | null;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  average_rating: number;
  total_ratings: number;
  tasks_completed: number;
  created_at: string;
}

// Supabase client singleton
const supabase = createClient();

// Helper function to convert timestamp to "time ago" format
function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  return `${diffInWeeks}w ago`;
}

// Extract registration number from GIKI email
function extractRegNumber(email: string | null): string {
  if (!email) return "Student";
  const match = email.match(/[a-z]?(\d+)@/i);
  return match ? match[1] : "Student";
}

/**
 * Hook to fetch open/in_progress jobs for the home feed
 */
export function useJobs() {
  return useSWR<Job[]>(
    "jobs:feed",
    async () => {
      const { data: jobsData, error } = await supabase
        .from("jobs_with_poster")
        .select("*")
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (jobsData || []).map((job) => ({
        id: job.id,
        title: job.title,
        description: job.description || "",
        price: job.price,
        urgency: job.urgency || "Flexible",
        location: job.location || "Campus",
        category: job.category || "",
        status: job.status || "open",
        assignedTo: job.assigned_to || null,
        userId: job.user_id || "",
        studentName: job.student_name || extractRegNumber(job.student_email),
        avatarUrl:
          job.avatar_url ||
          (job.user_id
            ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${job.user_id}`
            : "https://api.dicebear.com/7.x/avataaars/svg?seed=anonymous"),
        timeAgo: job.created_at ? getTimeAgo(job.created_at) : "Recently",
        createdAt: job.created_at || null,
      }));
    },
    {
      // Revalidate every 30 seconds for fresh data
      refreshInterval: 30000,
      // Keep showing stale data while revalidating
      revalidateOnFocus: true,
    }
  );
}

/**
 * Hook to fetch jobs posted by the current user
 */
export function useMyJobs(userId: string | null) {
  return useSWR(
    userId ? `jobs:my:${userId}` : null,
    async () => {
      if (!userId) return [];

      const { data: jobsData, error } = await supabase
        .from("jobs_with_poster")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch ratings this user has given
      const { data: ratingsData } = await supabase
        .from("ratings")
        .select("job_id")
        .eq("rater_id", userId)
        .eq("rating_type", "poster_to_helper");

      const ratedJobIds = new Set((ratingsData || []).map((r) => r.job_id));

      // Get applicant counts in parallel
      const jobsWithCounts = await Promise.all(
        (jobsData || []).map(async (job) => {
          const { count } = await supabase
            .from("conversations")
            .select("*", { count: "exact", head: true })
            .eq("job_id", job.id);

          return {
            id: job.id,
            title: job.title,
            description: job.description || "",
            price: job.price,
            urgency: job.urgency,
            location: job.location,
            status: (job.status as JobStatus) || "open",
            user_id: job.user_id,
            assigned_to: job.assigned_to,
            assigned_name: job.assigned_name,
            created_at: job.created_at,
            applicant_count: count || 0,
            hasRated: ratedJobIds.has(job.id),
          };
        })
      );

      return jobsWithCounts;
    },
    {
      revalidateOnFocus: true,
    }
  );
}

/**
 * Hook to fetch jobs assigned to the current user
 */
export function useMyGigs(userId: string | null) {
  return useSWR(
    userId ? `jobs:gigs:${userId}` : null,
    async () => {
      if (!userId) return [];

      const { data: jobsData, error } = await supabase
        .from("jobs_with_poster")
        .select("*")
        .eq("assigned_to", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch ratings this user has given
      const { data: ratingsData } = await supabase
        .from("ratings")
        .select("job_id")
        .eq("rater_id", userId)
        .eq("rating_type", "helper_to_poster");

      const ratedJobIds = new Set((ratingsData || []).map((r) => r.job_id));

      return (jobsData || []).map((job) => ({
        id: job.id,
        title: job.title,
        description: job.description || "",
        price: job.price,
        urgency: job.urgency,
        location: job.location,
        status: (job.status as JobStatus) || "in_progress",
        user_id: job.user_id,
        poster_name: job.student_name,
        poster_email: job.student_email,
        poster_avatar: job.avatar_url,
        assigned_at: job.updated_at || job.created_at,
        created_at: job.created_at,
        hasRated: ratedJobIds.has(job.id),
      }));
    },
    {
      revalidateOnFocus: true,
    }
  );
}

/**
 * Hook to get the current authenticated user
 */
export function useCurrentUser() {
  return useSWR("auth:user", async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  });
}

/**
 * Hook to get user profile
 */
export function useProfile(userId: string | null) {
  return useSWR(
    userId ? `profile:${userId}` : null,
    async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
    {
      revalidateOnFocus: false,
    }
  );
}

/**
 * Hook to get unread notification count
 */
export function useUnreadNotifications(userId: string | null) {
  return useSWR(
    userId ? `notifications:unread:${userId}` : null,
    async () => {
      if (!userId) return 0;

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;
      return count || 0;
    },
    {
      // Poll for new notifications every 15 seconds
      refreshInterval: 15000,
    }
  );
}
