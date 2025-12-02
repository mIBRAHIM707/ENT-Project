"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Briefcase, UserCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/utils/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
}

// Create a single instance outside the component to prevent re-creation
const supabase = createClient();

export function UserMenu() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Get user on mount and listen for auth changes
  useEffect(() => {
    setMounted(true);
    let isMounted = true;

    // Fetch profile data
    const fetchProfile = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", userId)
        .single();
      if (isMounted) {
        setProfile(data);
      }
    };

    // Get initial user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (isMounted) {
        setUser(user);
        if (user) {
          await fetchProfile(user.id);
        }
        setLoading(false);
      }
    };

    getUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (isMounted) {
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile(session.user.id);
          } else {
            setProfile(null);
          }
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  // Extract roll number from email (e.g., u2023444@giki.edu.pk -> U2023444)
  const extractRollNumber = (email: string) => {
    const match = email.match(/^([a-z]?\d+)/i);
    return match ? match[1].toUpperCase() : "User";
  };

  // Generate DiceBear avatar URL
  const getAvatarUrl = (email: string) => {
    const seed = encodeURIComponent(email);
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  };

  // Get initials from name or roll number
  const getInitials = (name: string) => {
    // If it looks like a roll number (starts with letter + digits), use first 2 chars
    if (/^[a-z]?\d+/i.test(name)) {
      return name.slice(0, 2).toUpperCase();
    }
    // Otherwise get initials from words (e.g., "Ali Khan" -> "AK")
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Don't render anything until mounted (prevents hydration mismatch)
  if (!mounted) {
    return (
      <Button variant="ghost" className="text-zinc-600 dark:text-zinc-400 font-medium">
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <Button variant="ghost" className="text-zinc-600 dark:text-zinc-400 font-medium">
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  // Show login button if not logged in
  if (!user) {
    return (
      <Link href="/login">
        <Button 
          variant="ghost" 
          className="text-zinc-600 dark:text-zinc-400 font-medium hover:text-zinc-900 dark:hover:text-white"
        >
          Login
        </Button>
      </Link>
    );
  }

  // Show user menu if logged in
  const userEmail = user.email || "";
  const rollNumber = extractRollNumber(userEmail);
  const displayName = profile?.full_name || rollNumber;
  const avatarUrl = profile?.avatar_url || getAvatarUrl(userEmail);
  const initials = getInitials(displayName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative h-9 w-9 rounded-full p-0 hover:ring-2 hover:ring-emerald-500/50 transition-all"
        >
          <Avatar className="h-9 w-9 border-2 border-zinc-200 dark:border-zinc-700">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-56 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl" 
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              {displayName}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-800" />
        <DropdownMenuItem 
          className="cursor-pointer rounded-lg mx-1 focus:bg-zinc-100 dark:focus:bg-zinc-800"
          asChild
        >
          <Link href="/profile" className="flex items-center">
            <UserCircle className="mr-2 h-4 w-4 text-zinc-500" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem 
          className="cursor-pointer rounded-lg mx-1 focus:bg-zinc-100 dark:focus:bg-zinc-800"
          asChild
        >
          <Link href="/my-jobs" className="flex items-center">
            <Briefcase className="mr-2 h-4 w-4 text-zinc-500" />
            <span>My Posted Jobs</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-800" />
        <DropdownMenuItem 
          onClick={handleLogout}
          className="cursor-pointer rounded-lg mx-1 text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-500/10 focus:text-red-600 dark:focus:text-red-400"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
