"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

interface CreateJobResult {
  success?: boolean;
  error?: string;
}

export async function createJob(formData: FormData): Promise<CreateJobResult> {
  const supabase = await createClient();

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

  // Insert job into database (matching your table: title, price, urgency, location)
  // Note: user_id is required in your table - for MVP without auth, we skip it
  // You'll need to either make user_id nullable or add auth later
  const { error } = await supabase.from("jobs").insert({
    title,
    price,
    urgency,
    location,
  });

  if (error) {
    console.error("Error creating job:", error);
    return { error: error.message };
  }

  // Revalidate the home page to show the new job
  revalidatePath("/");

  return { success: true };
}
