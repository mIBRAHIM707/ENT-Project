"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

interface CreateJobResult {
  success?: boolean;
  error?: string;
}

export async function createJob(formData: FormData): Promise<CreateJobResult> {
  const supabase = await createClient();

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in to post a job" };
  }

  // Extract form data
  const title = formData.get("title") as string;
  const priceString = formData.get("price") as string;
  const urgency = (formData.get("urgency") as string) || "Flexible";
  const location = (formData.get("location") as string) || "Campus";

  // Validate required fields
  if (!title || !priceString) {
    return { error: "Title and price are required" };
  }

  // Convert price to number
  const price = parseInt(priceString, 10);
  if (isNaN(price) || price < 0) {
    return { error: "Invalid price" };
  }

  // Insert job into database with the authenticated user's ID
  const { error } = await supabase.from("jobs").insert({
    title,
    price,
    urgency,
    location,
    user_id: user.id,
  });

  if (error) {
    console.error("Error creating job:", error);
    return { error: error.message };
  }

  // Revalidate the home page to show the new job
  revalidatePath("/");

  return { success: true };
}
