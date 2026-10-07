import { MoreHorizontalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InvitesListItem } from "@/features/invite/invite.service";
import { formatDateTime } from "@/utils/date";

export function AdminTable({ invites }: { invites: InvitesListItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Invited By</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created At</TableHead>
          <TableHead>Accepted At</TableHead>
          <TableHead>Exprire At</TableHead>
          {/* <TableHead className="text-right">Actions</TableHead> */}
        </TableRow>
      </TableHeader>
      <TableBody>
        {invites.map((invite) => (
          <TableRow key={invite.id}>
            <TableCell className="font-medium">{invite.full_name}</TableCell>
            <TableCell className="font-medium">{invite.email}</TableCell>
            <TableCell className="font-medium">
              {invite.invited_by.full_name}
            </TableCell>
            <TableCell className="font-medium">{invite.role}</TableCell>
            <TableCell className="font-medium">{invite.status}</TableCell>

            <TableCell className="font-medium">
              {invite.created_at && formatDateTime(invite.created_at)}
            </TableCell>
            <TableCell className="font-medium">
              {invite.accepted_at ? formatDateTime(invite.accepted_at) : "-"}
            </TableCell>
            <TableCell className="font-medium">
              {invite.expires_at && formatDateTime(invite.expires_at)}
            </TableCell>

            {/* <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontalIcon />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  <DropdownMenuItem>Duplicate</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell> */}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
