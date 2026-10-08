import { AuthUser } from "@/lib/types";

type UserDashboardProps = {
  user: AuthUser;
};

export default async function UserDashboard({ user }: UserDashboardProps) {
  return "Mentor and Mentee user Dashboard";
}
