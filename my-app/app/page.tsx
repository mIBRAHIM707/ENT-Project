import { createClient } from "@/utils/supabase/server";
import { HomeClient } from "@/components/features/home-client";

// Helper function to convert timestamp to "time ago" format
function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "Just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  return `${diffInWeeks}w ago`;
}

// Extract registration number from GIKI email (e.g., u2023446@giki.edu.pk -> 2023446)
function extractRegNumber(email: string | null): string {
  if (!email) return "Student";
  const match = email.match(/[a-z]?(\d+)@/i);
  return match ? match[1] : "Student";
}

// Database row type from jobs_with_poster view
interface JobRow {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  urgency: string;
  location: string;
  user_id: string | null;
  created_at?: string;
  student_name?: string | null;
  student_email?: string | null;
  avatar_url?: string | null;
}

export default async function Home() {
  const supabase = await createClient();

  // Fetch jobs with poster info from the view
  const { data: jobsData, error } = await supabase
    .from("jobs_with_poster")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching jobs:", error);
  }

  // Transform database rows to UI format
  const jobs = (jobsData || []).map((job: JobRow) => ({
    id: job.id,
    title: job.title,
    description: job.description || "",
    price: job.price,
    urgency: job.urgency || "Flexible",
    location: job.location || "Campus",
    userId: job.user_id || "",
    // Use display name if set, otherwise fall back to roll number from email
    studentName: job.student_name || extractRegNumber(job.student_email),
    avatarUrl: job.avatar_url || 
      (job.user_id 
        ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${job.user_id}`
        : "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest"),
    timeAgo: job.created_at ? getTimeAgo(job.created_at) : "Recently",
    createdAt: job.created_at || null,
  }));

  return <HomeClient jobs={jobs} />;
}
