"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

type JobStatus = "open" | "in_progress" | "completed" | "cancelled";

interface UpdateJobStatusResult {
  success?: boolean;
  error?: string;
}

// Assign a worker to a job and set status to in_progress
export async function assignWorker(
  jobId: string,
  workerId: string
): Promise<UpdateJobStatusResult> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "You must be logged in" };
  }

  // Verify user owns the job
  const { data: job, error: fetchError } = await supabase
    .from("jobs")
    .select("user_id, status, title")
    .eq("id", jobId)
    .maybeSingle();

  if (fetchError || !job) {
    return { error: "Job not found" };
  }

  if (job.user_id !== user.id) {
    return { error: "You can only assign workers to your own jobs" };
  }

  if (job.status !== "open") {
    return { error: "Can only assign workers to open jobs" };
  }

  // Update job with assigned worker and status
  const { error } = await supabase
    .from("jobs")
    .update({
      assigned_to: workerId,
      status: "in_progress",
    })
    .eq("id", jobId);

  if (error) {
    console.error("Error assigning worker:", error);
    return { error: error.message };
  }

  // Find or create conversation with the worker and send notification message
  const { data: existingConv } = await supabase
    .from("conversations")
    .select("id")
    .eq("job_id", jobId)
    .eq("worker_id", workerId)
    .maybeSingle();

  let conversationId = existingConv?.id;

  if (!conversationId) {
    // Create conversation if it doesn't exist
    const { data: newConv, error: convError } = await supabase
      .from("conversations")
      .insert({
        job_id: jobId,
        worker_id: workerId,
      })
      .select("id")
      .single();

    if (convError) {
      console.error("Error creating conversation:", convError);
    } else {
      conversationId = newConv?.id;
    }
  }

  // Send notification message - Premium Apple-style
  if (conversationId) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: `You've been selected for "${job.title}". Ready when you are.`,
    });
  }

  revalidatePath("/");
  revalidatePath("/my-jobs");
  revalidatePath("/my-gigs");

  return { success: true };
}

// Update job status
export async function updateJobStatus(
  jobId: string,
  status: JobStatus
): Promise<UpdateJobStatusResult> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "You must be logged in" };
  }

  // Fetch job to check permissions
  const { data: job, error: fetchError } = await supabase
    .from("jobs")
    .select("user_id, assigned_to, status, title")
    .eq("id", jobId)
    .maybeSingle();

  if (fetchError || !job) {
    return { error: "Job not found" };
  }

  const isOwner = job.user_id === user.id;
  const isAssignedWorker = job.assigned_to === user.id;

  // Permission checks based on status transition
  if (status === "cancelled" && !isOwner) {
    return { error: "Only the job owner can cancel a job" };
  }

  if (status === "completed") {
    if (!isOwner && !isAssignedWorker) {
      return { error: "Only the job owner or assigned worker can complete a job" };
    }
    if (job.status !== "in_progress") {
      return { error: "Job must be in progress to be completed" };
    }
  }

  if (status === "open" && !isOwner) {
    return { error: "Only the job owner can reopen a job" };
  }

  // Build update object
  const updateData: Record<string, unknown> = { status };
  
  if (status === "completed") {
    updateData.completed_at = new Date().toISOString();
  }
  
  if (status === "open") {
    updateData.assigned_to = null;
    updateData.completed_at = null;
  }

  if (status === "cancelled") {
    updateData.assigned_to = null;
  }

  const { error } = await supabase
    .from("jobs")
    .update(updateData)
    .eq("id", jobId);

  if (error) {
    console.error("Error updating job status:", error);
    return { error: error.message };
  }

  // Send notification messages for status changes - Premium Apple-style
  if (job.assigned_to) {
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("job_id", jobId)
      .eq("worker_id", job.assigned_to)
      .maybeSingle();

    if (conv) {
      let notificationMessage = "";
      
      if (status === "completed") {
        notificationMessage = `Task completed. "${job.title}" is now finished. Thank you for your work.`;
      } else if (status === "cancelled") {
        notificationMessage = `This task has been cancelled. "${job.title}" is no longer available.`;
      }
      
      if (notificationMessage) {
        await supabase.from("messages").insert({
          conversation_id: conv.id,
          sender_id: user.id,
          content: notificationMessage,
        });
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/my-jobs");
  revalidatePath("/my-gigs");

  return { success: true };
}

// Unassign a worker from a job (return to open)
export async function unassignWorker(jobId: string): Promise<UpdateJobStatusResult> {
  return updateJobStatus(jobId, "open");
}
