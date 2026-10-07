import UserRole from "@/lib/rbac/roles";
import SuperAdminDashboard from "@/features/dashboard/components/super-admin/super-admin-dashboard";
import { AuthUser } from "@/lib/types";

export default function DashboardContent({ user }: { user: AuthUser }) {
  const userRole = user?.role as UserRole;

  switch (userRole) {
    case "super_admin":
      return <SuperAdminDashboard user={user} />;

    case "admin":
      return <div>Admin</div>;

    case "mentor":
      return <div>Mentor</div>;

    case "mentee":
      return <div>Mentee</div>;

    default:
      return null;
  }
}
