import type { AuthUser } from "@/lib/types";
import DashboardWrapper from "@/components/layout/dashboard-wrapper";
import { AdminTable } from "./admin-table";
import AddAdminButton from "./add-admin-button";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SuperAdminDashboardProps = {
  user: AuthUser;
};

export default async function SuperAdminDashboard({
  user,
}: SuperAdminDashboardProps) {
  return (
    <DashboardWrapper user={user}>
      <div className="col-span-12">
        <Card>
          <CardHeader>
            <CardTitle>Admin List</CardTitle>

            <CardAction>
              <AddAdminButton />
            </CardAction>
          </CardHeader>
          <CardContent>
            <AdminTable />
          </CardContent>
        </Card>
      </div>
    </DashboardWrapper>
  );
}
