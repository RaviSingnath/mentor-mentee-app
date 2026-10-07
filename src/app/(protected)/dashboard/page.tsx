import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUserServer } from "@/lib/auth/getCurrentUserServer";
import DashboardWrapper from "@/components/layout/dashboard-wrapper";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Mentor Mentee Dashboard",
};

export default async function DashboardPage() {
  const user = await getCurrentUserServer();

  if (!user) {
    redirect("/");
  }

  return <DashboardWrapper user={user}></DashboardWrapper>;
}
