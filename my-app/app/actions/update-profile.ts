"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

interface UpdateProfileResult {
  success?: boolean;
  error?: string;
}

export async function updateProfile(formData: FormData): Promise<UpdateProfileResult> {
  const supabase = await createClient();

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in to update your profile" };
  }

  // Extract form data
  const displayName = formData.get("displayName") as string;

  // Validate
  if (!displayName || displayName.trim().length === 0) {
    return { error: "Display name is required" };
  }

  if (displayName.length > 50) {
    return { error: "Display name must be less than 50 characters" };
  }

  // Update profile in database
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: displayName.trim(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating profile:", error);
    return { error: error.message };
  }

  // Revalidate pages that show the user's name
  revalidatePath("/profile");
  revalidatePath("/");
  revalidatePath("/my-jobs");

  return { success: true };
}
