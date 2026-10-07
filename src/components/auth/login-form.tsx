"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

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

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TLogin>({
    resolver: zodResolver(zLogin),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(formData: TLogin) {
    try {
      const response = await loginAction(formData);

      if (!response.success) {
        if (response.errors) {
          Object.entries(response.errors).forEach(([field, messages]) => {
            setError(field as keyof TLogin, {
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
      router.push("/profile");
      // router.refresh();
    } catch (error) {
      console.error(error);

      setError("root", {
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
            <Field>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Log you in..." : "Login"}
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
