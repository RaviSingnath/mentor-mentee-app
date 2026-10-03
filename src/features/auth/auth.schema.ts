import * as z from "zod";
import UserRole from "@/lib/rbac/roles";

export const zSignUp = z
  .object({
    full_name: z.string().trim().min(1, "Full name is required"),
    email: z.email({
      message: "Invalid email address",
    }),
    role: z
      .string()
      .min(1, "Please select a role")
      .refine(
        (value) => Object.values(UserRole).includes(value as UserRole),
        "Please select a valid role",
      ),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirm_password: z.string().min(6, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type TSignUp = z.infer<typeof zSignUp>;

export const zLogin = z.object({
  email: z.email({ error: "Enter a valid email address" }).trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export type TLogin = z.infer<typeof zLogin>;
