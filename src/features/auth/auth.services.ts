import { TSignUp, zSignUp, TLogin, zLogin } from "@/features/auth/auth.schema";

type signupServiceInput = {
  data: TSignUp;
};

export async function signUpService({ data }: signupServiceInput) {
  console.log("signUpService: ", data);
}

type loginServiceInput = {
  data: TLogin;
};

export async function loginService({ data }: loginServiceInput) {
  console.log("loginService: ", data);
}
