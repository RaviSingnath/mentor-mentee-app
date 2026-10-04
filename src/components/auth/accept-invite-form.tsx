"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

import { zAcceptInvite, TAcceptInvite } from "@/features/auth/auth.schema";
import { createClient } from "../../../supabase/client";
import { acceptInviteAction } from "@/features/invite/invite.action";

export default function AcceptInviteForm({
  ...props
}: React.ComponentProps<typeof Card>) {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TAcceptInvite>({
    resolver: zodResolver(zAcceptInvite),
    defaultValues: {
      password: "",
      confirm_password: "",
    },
  });

  const inviteSession = useMemo(() => {
    if (typeof window === "undefined") return null;

    const params = new URLSearchParams(window.location.hash.slice(1));

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (!accessToken || !refreshToken || type !== "invite") {
      return null;
    }

    return {
      accessToken,
      refreshToken,
    };
  }, []);

  async function onSubmit(formData: TAcceptInvite) {
    try {
      if (!inviteSession) {
        setError("password", {
          type: "server",
          message: "Invitation has expired. Please request a new invitation.",
        });
        return;
      }

      // 1. Establish the authenticated session from the invite link
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: inviteSession.accessToken,
        refresh_token: inviteSession.refreshToken,
      });

      if (sessionError) {
        setError("password", {
          type: "server",
          message: sessionError.message,
        });
        return;
      }

      // 2. Set the user's password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (passwordError) {
        setError("password", {
          type: "server",
          message: passwordError.message,
        });
        return;
      }

      if (!token) {
        setError("password", {
          type: "server",
          message: "Token not found",
        });
        return;
      }

      // 3. Finalize the invitation
      const response = await acceptInviteAction(formData, token);

      if (!response.success) {
        if (response.errors) {
          Object.entries(response.errors).forEach(([field, messages]) => {
            setError(field as keyof TAcceptInvite, {
              type: "server",
              message: messages[0],
            });
          });
        }

        if (response.message) {
          setError("root", {
            type: "server",
            message: response.message,
          });
        }

        return;
      }

      // 4. NOW refresh — profiles row is guaranteed to exist, hook will find it
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error("Failed to refresh auth session:", refreshError);
      }

      reset();

      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error(err);

      setError("password", {
        type: "server",
        message: "Something went wrong. Please try again.",
      });
    }
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Set your password</CardTitle>

        <CardDescription>
          Your invite has been accepted. Choose a password to finish setting up
          your account.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            {/* Password */}
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">Password</FieldLabel>

              <Input
                id="password"
                type="password"
                aria-invalid={!!errors.password}
                {...register("password")}
              />

              {errors.password ? (
                <FieldError>{errors.password.message}</FieldError>
              ) : (
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
              )}
            </Field>

            {/* Confirm Password */}
            <Field data-invalid={!!errors.confirm_password}>
              <FieldLabel htmlFor="confirm_password">
                Confirm Password
              </FieldLabel>

              <Input
                id="confirm_password"
                type="password"
                aria-invalid={!!errors.confirm_password}
                {...register("confirm_password")}
              />

              {errors.confirm_password ? (
                <FieldError>{errors.confirm_password.message}</FieldError>
              ) : (
                <FieldDescription>
                  Please confirm your password.
                </FieldDescription>
              )}
            </Field>

            {/* Actions */}
            <FieldGroup>
              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Submiting..." : "Submit"}
                </Button>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
