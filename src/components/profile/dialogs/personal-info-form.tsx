"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { zInviteAdmin, TInviteAdmin } from "@/features/auth/auth.schema";
import handleFormSubmit from "@/lib/helper/handle-RHF-submit";
import { inviteAdminAction } from "@/features/auth/auth.actions";
import UserRole from "@/lib/rbac/roles";
import { appToast } from "@/lib/helper/toast";

type InviteAdminFormProps = {
  onSuccess?: () => void;
};

export default function PersonalInfoForm({ onSuccess }: InviteAdminFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TInviteAdmin>({
    resolver: zodResolver(zInviteAdmin),
    defaultValues: {
      full_name: "",
      invite_email: "",
      target_role: UserRole.MENTEE,
    },
  });

  async function onSubmit(formData: TInviteAdmin) {
    await handleFormSubmit({
      action: () => inviteAdminAction(formData as TInviteAdmin),
      setError,
      successMessage: "Student invited successfully",
      onSuccess: () => {
        reset();
        onSuccess?.();
        appToast.success("Admin invited successfully");
      },
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        {/* Full Name */}
        <Field data-invalid={!!errors.full_name}>
          <FieldLabel htmlFor="full_name">Full Name</FieldLabel>

          <Input
            id="full_name"
            type="text"
            placeholder="John Doe"
            aria-invalid={!!errors.full_name}
            {...register("full_name")}
          />

          {errors.full_name && (
            <FieldError>{errors.full_name.message}</FieldError>
          )}
        </Field>

        {/* Email */}
        <Field data-invalid={!!errors.invite_email}>
          <FieldLabel htmlFor="invite_email">Email</FieldLabel>

          <Input
            id="invite_email"
            type="email"
            placeholder="m@example.com"
            aria-invalid={!!errors.invite_email}
            {...register("invite_email")}
          />

          {errors.invite_email && (
            <FieldError>{errors.invite_email.message}</FieldError>
          )}
        </Field>

        {/* Actions */}
        <FieldGroup>
          <Field>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Inviting..." : "Invie Admin"}
            </Button>
          </Field>
        </FieldGroup>
      </FieldGroup>
    </form>
  );
}
