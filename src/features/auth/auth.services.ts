import { TSignUp, zSignUp } from "@/features/auth/auth.schema";

type updateAvatarServiceInput = {
  data: TSignUp;
};

export async function signUpService({ data }: updateAvatarServiceInput) {
  console.log("signUpService: ", data);
}
