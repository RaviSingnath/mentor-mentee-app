"use client";

import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/context/AuthProvider";
import EditPersonalInfoButton from "@/components/profile/edit-personal-info-buton";
import EditAddressButton from "@/components/profile/edit-address-button";
import UserRole, { UserRoleLabel } from "@/lib/rbac/roles";

const UserProfile = () => {
  const { user } = useAuth();
  const userRole = user?.role as UserRole | undefined;

  const socialLinks = [
    {
      href: "https://www.facebook.com/wrappixel",
      icon: "streamline-logos:linkedin-logo-solid",
    },
    { href: "https://github.com/wrappixel", icon: "ion:logo-github" },
  ];

  return (
    <div className="flex flex-col p-px bg-border gap-px">
      <div className="flex flex-col gap-px bg-border">
        <Card className="p-6 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center gap-6 rounded-xl relative w-full break-words">
            <div>
              <div className="flex size-20 items-center justify-center rounded-full bg-muted text-base font-semibold uppercase">
                {user?.full_name?.[0] ?? "U"}
              </div>
            </div>
            <div className="flex flex-wrap gap-4 justify-center sm:justify-between items-center w-full">
              <div className="flex flex-col sm:text-left text-center gap-1.5">
                <h5 className="card-title">{user?.full_name}</h5>
                <div className="flex flex-wrap items-center gap-1 md:gap-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {userRole ? (UserRoleLabel[userRole] ?? "") : ""}
                  </p>
                  <div className="hidden h-4 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {user?.city} {user?.state}, {user?.country}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {socialLinks.map((item, index) => (
                  <Link
                    key={index}
                    href={item.href}
                    target="_blank"
                    className="flex h-11 w-11 items-center justify-center gap-2 rounded-full shadow-md border border-border hover:bg-gray-50 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                  >
                    <Icon icon={item.icon} width="20" height="20" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-px">
          <div className="space-y-6 bg-background md:p-6 p-4 relative w-full break-words">
            <h5 className="card-title">Personal Information</h5>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-7 2xl:gap-x-32">
              <div>
                <p className="text-xs text-gray-500">First Name</p>
                <p>{user?.full_name}</p>
              </div>
              {/* <div>
                <p className="text-xs text-gray-500">Last Name</p>
                <p>{personal.lastName}</p>
              </div> */}
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p>{user?.email}</p>
              </div>
              {/* <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p>{personal.phone}</p>
              </div> */}
              <div>
                <p className="text-xs text-gray-500">Position</p>
                <p>{user?.experience_level}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <EditPersonalInfoButton>
                <Icon icon="ic:outline-edit" width="18" height="18" /> Edit
              </EditPersonalInfoButton>
            </div>
          </div>

          <div className="space-y-6 bg-background md:p-6 p-4 relative w-full break-words">
            <h5 className="card-title">Address Details</h5>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-7 2xl:gap-x-32">
              <div>
                <p className="text-xs text-gray-500">Location</p>
                <p>{user?.city}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Province / State</p>
                <p>{user?.state}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">PIN Code</p>
                <p>{user?.country}</p>
              </div>
              {/* <div>
                <p className="text-xs text-gray-500">ZIP</p>
                <p>{address.zip}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Federal Tax No.</p>
                <p>{address.taxNo}</p>
              </div> */}
            </div>
            <div className="flex justify-end">
              <EditAddressButton>
                <Icon icon="ic:outline-edit" width="18" height="18" /> Edit
              </EditAddressButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
