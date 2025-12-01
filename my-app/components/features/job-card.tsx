"use client";

import { motion } from "framer-motion";
import { MapPin, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface JobCardProps {
  title: string;
  price: number;
  urgency: string;
  distance: string;
  avatarUrl: string;
  studentName: string;
  timeAgo: string;
}

export function JobCard({
  title,
  price,
  urgency,
  distance,
  avatarUrl,
  studentName,
  timeAgo,
}: JobCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Large Avatar on the left */}
            <Avatar className="h-16 w-16 rounded-xl">
              <AvatarImage src={avatarUrl} alt={studentName} />
              <AvatarFallback className="rounded-xl text-lg">
                {studentName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header with title and price badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{title}</h3>
                  <p className="text-sm text-muted-foreground">{studentName}</p>
                </div>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 rounded-xl shrink-0">
                  Rs. {price.toLocaleString()}
                </Badge>
              </div>

              {/* Footer with distance and urgency */}
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{distance}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{urgency}</span>
                </div>
                <span className="ml-auto text-xs">{timeAgo}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Mock data for testing
export const MOCK_JOBS: JobCardProps[] = [
  {
    title: "Need help moving furniture",
    price: 2500,
    urgency: "Today",
    distance: "0.5 km",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=ali",
    studentName: "Ali Hassan",
    timeAgo: "2 hours ago",
  },
  {
    title: "Looking for Math tutor",
    price: 1500,
    urgency: "This week",
    distance: "1.2 km",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sara",
    studentName: "Sara Ahmed",
    timeAgo: "5 hours ago",
  },
  {
    title: "Laptop repair needed",
    price: 3000,
    urgency: "ASAP",
    distance: "0.8 km",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=usman",
    studentName: "Usman Khan",
    timeAgo: "1 day ago",
  },
  {
    title: "Design a poster for event",
    price: 2000,
    urgency: "3 days",
    distance: "2.0 km",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=fatima",
    studentName: "Fatima Malik",
    timeAgo: "3 hours ago",
  },
  {
    title: "Need a photographer for convocation",
    price: 5000,
    urgency: "Next week",
    distance: "Campus",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=ahmed",
    studentName: "Ahmed Raza",
    timeAgo: "6 hours ago",
  },
];