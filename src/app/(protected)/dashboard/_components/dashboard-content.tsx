import UserRole from "@/lib/rbac/roles";
import { AuthUser } from "@/lib/types";
import SuperAdminDashboard from "@/features/dashboard/components/super-admin/super-admin-dashboard";
import UserDashboard from "@/features/dashboard/components/user/user-dashboard";

export default function DashboardContent({ user }: { user: AuthUser }) {
  const userRole = user?.role as UserRole;

  switch (userRole) {
    case "super_admin":
      return <SuperAdminDashboard user={user} />;

    case "admin":
      return <div>Admin</div>;

    case "mentor":
      return <UserDashboard user={user} />;

    case "mentee":
      return <UserDashboard user={user} />;

    default:
      return null;
  }
}
