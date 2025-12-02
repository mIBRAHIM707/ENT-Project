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

  // Fetch user profile with rating stats
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, average_rating, total_ratings, tasks_completed")
    .eq("id", user.id)
    .maybeSingle();

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

  // Fetch ratings received by this user
  const { data: ratings } = await supabase
    .from("ratings")
    .select(`
      id,
      rating,
      review,
      rating_type,
      created_at,
      job_id,
      rater_id
    `)
    .eq("rated_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch rater profiles separately
  const raterIds = [...new Set((ratings || []).map(r => r.rater_id))];
  const { data: raterProfiles } = raterIds.length > 0 
    ? await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email")
        .in("id", raterIds)
    : { data: [] };

  // Fetch job titles
  const jobIds = [...new Set((ratings || []).map(r => r.job_id))];
  const { data: jobs } = jobIds.length > 0
    ? await supabase
        .from("jobs")
        .select("id, title")
        .in("id", jobIds)
    : { data: [] };

  // Combine data
  const ratingsWithDetails = (ratings || []).map(r => {
    const rater = raterProfiles?.find(p => p.id === r.rater_id);
    const job = jobs?.find(j => j.id === r.job_id);
    return {
      ...r,
      raterName: rater?.full_name || null,
      raterEmail: rater?.email || null,
      raterAvatar: rater?.avatar_url || null,
      jobTitle: job?.title || "Unknown Task",
    };
  });

  return (
    <ProfileClient
      email={user.email || ""}
      displayName={profile?.full_name || ""}
      avatarUrl={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
      tasksPosted={tasksPosted || 0}
      tasksApplied={tasksApplied || 0}
      createdAt={profile?.created_at || user.created_at}
      averageRating={profile?.average_rating || 0}
      totalRatings={profile?.total_ratings || 0}
      ratings={ratingsWithDetails}
    />
  );
}
