import type { AuthUser } from "@/lib/types";
import { AdminTable } from "./admin-table";
import AddAdminButton from "./add-admin-button";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getInvitesService } from "@/features/invite/invite.service";

type SuperAdminDashboardProps = {
  user: AuthUser;
};

export default async function SuperAdminDashboard({
  user,
}: SuperAdminDashboardProps) {
  const invites = await getInvitesService();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite List</CardTitle>

        <CardAction>
          <AddAdminButton />
        </CardAction>
      </CardHeader>
      <CardContent>
        <AdminTable invites={invites} />
      </CardContent>
    </Card>
  );
}
