"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteJob(jobId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Security Check: Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in to delete a job" };
    }

    // Authorization: Ensure the job belongs to the user before deleting
    // RLS policies handle this too, but we add an explicit check for extra security
    const { data: job, error: fetchError } = await supabase
      .from("jobs")
      .select("id, user_id")
      .eq("id", jobId)
      .single();

    if (fetchError || !job) {
      return { success: false, error: "Job not found" };
    }

    if (job.user_id !== user.id) {
      return { success: false, error: "You are not authorized to delete this job" };
    }

    // Operation: Delete the job
    const { error: deleteError } = await supabase
      .from("jobs")
      .delete()
      .eq("id", jobId)
      .eq("user_id", user.id); // Extra safety: ensure user owns the job

    if (deleteError) {
      console.error("Error deleting job:", deleteError);
      return { success: false, error: "Failed to delete job" };
    }

    // Cleanup: Revalidate paths to refresh the UI
    revalidatePath("/");
    revalidatePath("/my-jobs");

    return { success: true };
  } catch (error) {
    console.error("Unexpected error deleting job:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
