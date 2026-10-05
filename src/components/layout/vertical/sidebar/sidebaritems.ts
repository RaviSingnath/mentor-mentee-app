export interface ChildItem {
  id?: number | string;
  name: string;
  icon?: LucideIcon;
  items?: ChildItem[];
  item?: unknown;
  url?: string;
  color?: string;
  disabled?: boolean;
  subtitle?: string;
  badge?: boolean;
  badgeType?: string;
  badgeContent?: string;
  isActive?: boolean;
  external?: boolean;
  isPro?: boolean;
}

export interface MenuItem {
  heading?: string;
  name?: string;
  icon?: LucideIcon;
  id?: number;
  to?: string;
  item?: MenuItem[];
  items?: ChildItem[];
  url?: string;
  disabled?: boolean;
  subtitle?: string;
  badgeType?: string;
  badge?: boolean;
  badgeContent?: string;
  isActive?: boolean;
  isPro?: boolean;
}

import UserRole from "@/lib/rbac/roles";
import { uniqueId } from "lodash";

import {
  LucideIcon,
  House,
  CircleUserRound,
  Upload,
  UserGroup,
} from "lucide-react";

export const SidebarContent: Record<UserRole, MenuItem[]> = {
  [UserRole.SUPER_ADMIN]: [
    {
      heading: "Dashboard",
      items: [
        {
          id: uniqueId(),
          name: "Home",
          icon: House,
          url: "/dashboard",
        },
      ],
    },
    {
      heading: "Pages",
      items: [
        {
          id: uniqueId(),
          name: "Seed Data",
          icon: Upload,
          url: "/seed",
        },
        {
          id: uniqueId(),
          name: "Matches",
          icon: UserGroup,
          url: "/matches",
        },
      ],
    },
  ],
  [UserRole.ADMIN]: [
    {
      heading: "Dashboard",
      items: [
        {
          id: uniqueId(),
          name: "Home",
          icon: House,
          url: "/dashboard",
        },
      ],
    },
    {
      heading: "Pages",
      items: [
        {
          id: uniqueId(),
          name: "Seed Data",
          icon: Upload,
          url: "/seed",
        },
        {
          id: uniqueId(),
          name: "Matches",
          icon: UserGroup,
          url: "/matches",
        },
      ],
    },
  ],
  [UserRole.MENTOR]: [
    {
      heading: "Dashboard",
      items: [
        {
          id: uniqueId(),
          name: "Home",
          icon: House,
          url: "/dashboard",
        },
      ],
    },
    {
      heading: "Pages",
      items: [
        {
          id: uniqueId(),
          name: "Profile",
          icon: CircleUserRound,
          url: "/profile",
        },
        {
          id: uniqueId(),
          name: "Matches",
          icon: UserGroup,
          url: "/matches",
        },
        {
          id: uniqueId(),
          name: "Saved Matches",
          icon: UserGroup,
          url: "/saved-matches",
        },
      ],
    },
  ],
  [UserRole.MENTEE]: [
    {
      heading: "Dashboard",
      items: [
        {
          id: uniqueId(),
          name: "Home",
          icon: House,
          url: "/dashboard",
        },
      ],
    },
    {
      heading: "Pages",
      items: [
        {
          id: uniqueId(),
          name: "Profile",
          icon: CircleUserRound,
          url: "/profile",
        },
        {
          id: uniqueId(),
          name: "Matches",
          icon: UserGroup,
          url: "/matches",
        },
        {
          id: uniqueId(),
          name: "Saved Matches",
          icon: UserGroup,
          url: "/saved-matches",
        },
      ],
    },
  ],
};

export default SidebarContent;
