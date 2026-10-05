"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { SubjectOption } from "@/lib/matches/types";
import { useAuth } from "@/lib/context/AuthProvider";
import UserRole from "@/lib/rbac/roles";

export function SubjectPicker({
  options,
  value,
}: {
  options: SubjectOption[];
  value: string | null;
}) {
  const { user } = useAuth();
  const userRole = user?.role as UserRole | undefined;

  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const mentees = options.filter((o) => o.role === "mentee");
  const mentors = options.filter((o) => o.role === "mentor");

  return userRole === "super_admin" || userRole === "admin" ? (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">Find matches for</span>
      <select
        className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        value={value ?? ""}
        disabled={pending}
        onChange={(e) => {
          const id = e.target.value;
          startTransition(() =>
            router.push(id ? `/matches?subject=${id}` : "/matches"),
          );
        }}
      >
        <option value="" disabled>
          Choose a person…
        </option>
        <optgroup label={`Mentees (${mentees.length}) – shows mentors`}>
          {mentees.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </optgroup>
        <optgroup label={`Mentors (${mentors.length}) – shows mentees`}>
          {mentors.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </optgroup>
      </select>
    </label>
  ) : (
    ""
  );
}
