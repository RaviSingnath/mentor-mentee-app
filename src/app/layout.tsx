import { type Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";

import { ThemeProvider } from "@/app/providers";

import "./globals.css";
import LeftLayout from "@/components/home/left-section/left-layout";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const monaSans = localFont({
  src: "../fonts/Mona-Sans.var.woff2",
  display: "swap",
  variable: "--font-mona-sans",
  weight: "200 900",
});

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
    <html
      lang="en"
      className={cn("h-full antialiased", inter.variable, monaSans.variable)}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-white dark:bg-gray-950">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen">{children}</div>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
