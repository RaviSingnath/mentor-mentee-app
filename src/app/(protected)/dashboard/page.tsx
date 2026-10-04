import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUserServer } from "@/lib/auth/getCurrentUserServer";
import SuperAdminDashboard from "@/features/dashboard/components/super-admin/super-admin-dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Mentor Mentee Dashboard",
};

export default async function DashboardPage() {
  const user = await getCurrentUserServer();

  if (!user) {
    redirect("/login");
  }

  switch (user.role) {
    case "super_admin": {
      // const data = await getSupervisorDashboardService();
      return <SuperAdminDashboard user={user} />;
    }

    default:
      redirect("/unauthorized");
  }
}
