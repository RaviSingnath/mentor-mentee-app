"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
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
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Item, ItemContent, ItemTitle } from "@/components/ui/item";
import { Input } from "@/components/ui/input";

import { TSignUp, zSignUp } from "@/features/auth/auth.schema";
import UserRole, { UserRoleLabel } from "@/lib/rbac/roles";
import { signUpAction } from "@/features/auth/auth.actions";
import { appToast } from "@/lib/helper/toast";

type RoleOption = {
  role: UserRole;
  label: string;
};

const roles: RoleOption[] = [
  { role: UserRole.MENTOR, label: UserRoleLabel.mentor },
  { role: UserRole.MENTEE, label: UserRoleLabel.mentee },
];

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TSignUp>({
    resolver: zodResolver(zSignUp),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      confirm_password: "",
      role: "",
    },
  });

  async function onSubmit(formData: TSignUp) {
    try {
      const response = await signUpAction(formData);

      if (!response.success) {
        if (response.errors) {
          Object.entries(response.errors).forEach(([field, messages]) => {
            setError(field as keyof TSignUp, {
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

      reset();
      appToast.success(
        "Signup successfully done. Please check you mail to confirm your email.",
      );
    } catch (error) {
      console.error(error);
      appToast.error("Something went wrong. Please try again.");

      setError("root", {
        type: "server",
        message: "Something went wrong. Please try again.",
      });
    }
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>

        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>

      <CardContent>
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
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">Email</FieldLabel>

              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                aria-invalid={!!errors.email}
                {...register("email")}
              />

              {errors.email ? (
                <FieldError>{errors.email.message}</FieldError>
              ) : (
                <FieldDescription>
                  We&apos;ll use this to contact you. We will not share your
                  email with anyone else.
                </FieldDescription>
              )}
            </Field>

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

            {/* Role */}
            <FieldSet data-invalid={!!errors.role}>
              <FieldLabel
                htmlFor="role"
                className={errors.role ? "text-destructive" : undefined}
              >
                Who you are?
              </FieldLabel>

              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Combobox
                    items={roles}
                    value={
                      roles.find((role) => role.role === field.value) ?? null
                    }
                    onValueChange={(role) => field.onChange(role?.role ?? "")}
                  >
                    <ComboboxInput
                      id="role"
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      aria-invalid={!!errors.role}
                    />

                    <ComboboxContent>
                      <ComboboxEmpty>No role found.</ComboboxEmpty>

                      <ComboboxList>
                        {(role) => (
                          <ComboboxItem key={role.role} value={role}>
                            <Item size="xs" className="p-0">
                              <ItemContent>
                                <ItemTitle className="whitespace-nowrap">
                                  {role.label}
                                </ItemTitle>
                              </ItemContent>
                            </Item>
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                )}
              />

              {errors.role && <FieldError>{errors.role.message}</FieldError>}
            </FieldSet>

            {/* Root/server error */}
            {errors.root && <FieldError>{errors.root.message}</FieldError>}

            {/* Actions */}
            <FieldGroup>
              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating account..." : "Create Account"}
                </Button>

                <Button variant="outline" type="button" disabled>
                  Sign up with Google
                </Button>

                <FieldDescription className="px-6 text-center">
                  Already have an account? <Link href="/">Sign in</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
