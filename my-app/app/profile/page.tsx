import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const supabase = await createClient();

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Count tasks posted by user
  const { count: tasksPosted } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Count tasks applied to (conversations where user is worker)
  const { count: tasksApplied } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("worker_id", user.id);

  return (
    <ProfileClient
      email={user.email || ""}
      displayName={profile?.full_name || ""}
      avatarUrl={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
      tasksPosted={tasksPosted || 0}
      tasksApplied={tasksApplied || 0}
      createdAt={profile?.created_at || user.created_at}
    />
  );
}
