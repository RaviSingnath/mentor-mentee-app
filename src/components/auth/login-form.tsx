"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useForm } from "react-hook-form";
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
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { zLogin, TLogin } from "@/features/auth/auth.schema";
import { loginAction } from "@/features/auth/auth.actions";

export function LoginForm({ ...props }: React.ComponentProps<typeof Card>) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TLogin>({
    resolver: zodResolver(zLogin),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const isBusy = isSubmitting || isNavigating;

  async function onSubmit(formData: TLogin) {
    clearErrors("root.server");
    try {
      const response = await loginAction(formData);

      if (!response.success) {
        if (response.errors) {
          for (const [field, msgs] of Object.entries(response.errors)) {
            setError(field as keyof TLogin, {
              type: "server",
              message: msgs[0],
            });
          }
        } else {
          setError("root.server", {
            type: "server",
            message: response.message,
          });
        }
        return;
      }

      startTransition(() => {
        router.push("/dashboard");
      });
    } catch (error) {
      console.error(error);
      setError("root.server", {
        type: "server",
        message: "Something went wrong. Please try again.",
      });
    }
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Login to your account</CardTitle>
        <CardDescription>
          Enter your email below to login to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
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

            {errors.root?.server && (
              <p role="alert" className="text-destructive text-sm">
                {errors.root.server.message}
              </p>
            )}

            <Field>
              <Button type="submit" disabled={isBusy}>
                {isBusy ? "Logging you in…" : "Login"}
              </Button>
              <Button variant="outline" type="button" disabled>
                Login with Google
              </Button>
              <FieldDescription className="text-center">
                Don&apos;t have an account? <Link href="/signup">Sign up</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
