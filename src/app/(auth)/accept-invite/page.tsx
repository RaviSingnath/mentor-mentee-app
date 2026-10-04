import { Metadata } from "next";
import { Suspense } from "react";
import AcceptInviteForm from "@/components/auth/accept-invite-form";

export const metadata: Metadata = {
  title: "Next.js Blank Page | Next.js Dashboard Template",
  description: "This is Next.js Blank Page Dashboard Template",
};

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div>Loading search...</div>}>
      <section className="flex min-h-screen items-center justify-center px-6 py-16 sm:px-8 lg:ml-[50%] lg:w-1/2 lg:px-12">
        <div className="w-full max-w-md">
          <AcceptInviteForm />
        </div>
      </section>
    </Suspense>
  );
}
