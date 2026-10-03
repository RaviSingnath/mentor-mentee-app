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

import { uniqueId } from "lodash";

import {
  BarChart3,
  Banknote,
  BookOpen,
  CreditCard,
  FileText,
  Files,
  HelpCircle,
  Key,
  Lock,
  LogIn,
  LucideIcon,
  PieChart,
  Plug,
  ScanLine,
  Settings,
  ShieldCheck,
  Table,
  Tag,
  Ticket,
  Unlink,
  UserPlus,
  Smile,
  House,
  NotebookText,
  Component,
  Table2,
  Form,
  CircleUserRound,
  Sparkles,
  Calendar,
  MessageCircle,
  Mail,
  Contact,
  Receipt,
  UserCircle,
  ShoppingBag,
  List,
  Users,
  Package,
  ChartBar,
  ShoppingCart,
  GraduationCap,
  HeartPulse,
} from "lucide-react";

const SidebarContent: MenuItem[] = [
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
        name: "User Profile",
        icon: CircleUserRound,
        url: "/profile",
      },
    ],
  },
];

export default SidebarContent;
