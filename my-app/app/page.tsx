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

// Database row type
interface JobRow {
  id: string;
  title: string;
  price: number;
  urgency: string;
  location: string;
  user_id: string | null;
  created_at?: string; // Optional - may not exist in table
}

export default async function Home() {
  const supabase = await createClient();

  // Fetch jobs from Supabase (without ordering by created_at if it doesn't exist)
  const { data: jobsData, error } = await supabase
    .from("jobs")
    .select("*");

  if (error) {
    console.error("Error fetching jobs:", error);
  }

  // Transform database rows to UI format
  const jobs = (jobsData || []).map((job: JobRow) => ({
    id: job.id,
    title: job.title,
    price: job.price,
    urgency: job.urgency || "Flexible",
    location: job.location || "Campus",
    // Guest mode: use placeholder for missing user info
    studentName: job.user_id ? "Student" : "Guest User",
    avatarUrl: job.user_id
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${job.user_id}`
      : "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest",
    timeAgo: job.created_at ? getTimeAgo(job.created_at) : "Recently",
  }));

  return <HomeClient jobs={jobs} />;
}
