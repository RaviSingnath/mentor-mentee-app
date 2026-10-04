import type { AuthUser } from "@/lib/types";
import getGreeting from "@/lib/helper/user-greeting";
import UserRole from "@/lib/rbac/roles";

type DashboardWrapperProps = {
  user: AuthUser;
  children: React.ReactNode;
  desc?: string;
  ActionButton?: React.ReactNode;
};

export default function DashboardWrapper({
  user,
  desc,
  children,
  ActionButton,
}: DashboardWrapperProps) {
  const greeting = `${getGreeting()}, ${user.full_name}`;

  return user.role === UserRole.SUPER_ADMIN ? (
    <div className="grid grid-cols-12 gap-4 md:gap-6">{children}</div>
  ) : (
    <div className="border-brand-100 min-h-screen w-full rounded-2xl border bg-white text-gray-800 dark:border-gray-800 dark:bg-black dark:text-white/90">
      <div className="flex flex-wrap items-center justify-between px-6 py-5">
        <div>
          <h1 className="font-display text-[26px] font-semibold">{greeting}</h1>
          {desc && <p className="mt-1 text-sm text-gray-500">{desc}</p>}
        </div>

        {ActionButton && ActionButton}
      </div>

      <div className="border-brand-50 border-t p-4 sm:p-6 dark:border-gray-800">
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}
