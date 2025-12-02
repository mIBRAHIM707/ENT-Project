"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

interface CreateRatingResult {
  success?: boolean;
  error?: string;
}

interface RatingData {
  jobId: string;
  ratedUserId: string;
  rating: number;
  review?: string;
  ratingType: "poster_to_helper" | "helper_to_poster";
}

export async function createRating(data: RatingData): Promise<CreateRatingResult> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "You must be logged in" };
  }

  // Verify the job exists and is completed
  const { data: job, error: fetchError } = await supabase
    .from("jobs")
    .select("id, user_id, assigned_to, status")
    .eq("id", data.jobId)
    .maybeSingle();

  if (fetchError || !job) {
    return { error: "Job not found" };
  }

  if (job.status !== "completed") {
    return { error: "You can only rate after the job is completed" };
  }

  // Verify user is involved in the job
  const isOwner = job.user_id === user.id;
  const isHelper = job.assigned_to === user.id;

  if (!isOwner && !isHelper) {
    return { error: "You are not involved in this job" };
  }

  // Verify rating type matches user role
  if (data.ratingType === "poster_to_helper" && !isOwner) {
    return { error: "Only the job poster can rate the helper" };
  }

  if (data.ratingType === "helper_to_poster" && !isHelper) {
    return { error: "Only the helper can rate the poster" };
  }

  // Verify rated user is correct
  if (data.ratingType === "poster_to_helper" && data.ratedUserId !== job.assigned_to) {
    return { error: "Invalid rated user" };
  }

  if (data.ratingType === "helper_to_poster" && data.ratedUserId !== job.user_id) {
    return { error: "Invalid rated user" };
  }

  // Validate rating value
  if (data.rating < 1 || data.rating > 5) {
    return { error: "Rating must be between 1 and 5" };
  }

  // Insert the rating
  const { error } = await supabase.from("ratings").insert({
    job_id: data.jobId,
    rater_id: user.id,
    rated_id: data.ratedUserId,
    rating: data.rating,
    review: data.review || null,
    rating_type: data.ratingType,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "You have already rated for this job" };
    }
    console.error("Error creating rating:", error);
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/profile");

  return { success: true };
}

// Get ratings for a user
export async function getUserRatings(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ratings")
    .select(`
      id,
      rating,
      review,
      rating_type,
      created_at,
      job_id,
      jobs (title),
      rater:profiles!ratings_rater_id_fkey (full_name, avatar_url)
    `)
    .eq("rated_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching ratings:", error);
    return { ratings: [], error: error.message };
  }

  return { ratings: data || [] };
}

// Get rating stats for a user
export async function getUserRatingStats(userId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("average_rating, total_ratings, tasks_completed")
    .eq("id", userId)
    .maybeSingle();

  return {
    averageRating: profile?.average_rating || 0,
    totalRatings: profile?.total_ratings || 0,
    tasksCompleted: profile?.tasks_completed || 0,
  };
}
