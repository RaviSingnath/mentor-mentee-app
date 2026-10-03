import { TSignUp, zSignUp, TLogin, zLogin } from "@/features/auth/auth.schema";
import createClient from "../../../supabase/server";

type signupServiceInput = {
  data: TSignUp;
};

export async function signUpService({ data }: signupServiceInput) {
  console.log("signUpService: ", data);
  const supabase = await createClient();

  const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;

  const { data: signupData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.full_name,
        role: data.role,
      },
      emailRedirectTo: redirectUrl,
    },
  });

  console.log(error);

  if (error) {
    throw new Error("Error occured while singing in.");
  }

  return signupData;
}

type loginServiceInput = {
  data: TLogin;
};

export async function loginService({ data }: loginServiceInput) {
  const supabase = await createClient();

  const { data: singInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

  if (signInError) {
    throw new Error("Error occured while singing in.");
  }

  return singInData;
}

export async function logoutService(): Promise<null> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message ?? "Signout failed. Please try again.");
  }

  return null;
}
