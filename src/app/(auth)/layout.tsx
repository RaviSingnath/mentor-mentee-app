import { type Metadata } from "next";

import "../globals.css";
import LeftLayout from "@/components/home/left-section/left-layout";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Mentor-Mentee Recommendation",
  description:
    "Connect with mentors who match your goals, schedule sessions, and track your progress, all in one place.",
  alternates: {
    types: {
      "application/rss+xml": `${process.env.NEXT_PUBLIC_SITE_URL}/feed.xml`,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <LeftLayout />

      <ThemeToggle />

      {children}
    </div>
  );
}
