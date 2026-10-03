"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/features/auth/auth.actions";

export default function LogoutButton() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleSignoutUser() {
    setErrorMessage(null);

    try {
      setIsSubmitting(true);
      const result = await logoutAction();

      if (!result.success) {
        setErrorMessage("Unable to sign out right now.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to sign out right now.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        className="text-primary"
        disabled={isSubmitting}
        onClick={handleSignoutUser}
      >
        {isSubmitting ? "Signing out..." : "Sign out"}
      </Button>
      {errorMessage && (
        <p className="mt-3 text-sm text-error-500">{errorMessage}</p>
      )}
    </>
  );
}
