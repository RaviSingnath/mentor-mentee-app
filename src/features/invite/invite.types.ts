import UserRole from "@/lib/rbac/roles";
import { Database } from "../../../supabase/database.types";

export type Invitation = Database["public"]["Tables"]["invitations"]["Row"];

// DB enum is the single source of truth for the type
export type InvitationStatus = Database["public"]["Enums"]["invitation_status"];

export type InvitationInsert =
  Database["public"]["Tables"]["invitations"]["Insert"];

type BaseInvite = {
  email: string;
  full_name: string;
  token: string;
  role: UserRole;
};

export type InviteData = BaseInvite;
