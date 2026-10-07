import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUserServer } from "@/lib/auth/getCurrentUserServer";
import DashboardWrapper from "@/components/layout/dashboard-wrapper";
import DashboardContent from "./_components/dashboard-content";
import UserRole from "@/lib/rbac/roles";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Mentor Mentee Dashboard",
};

export default async function DashboardPage() {
  const user = await getCurrentUserServer();

  if (!user) {
    redirect("/");
  }

  return (
    <DashboardWrapper user={user}>
      <DashboardContent user={user} />
    </DashboardWrapper>
  );
}
