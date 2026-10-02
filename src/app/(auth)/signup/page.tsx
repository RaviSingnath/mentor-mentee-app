import { SignupForm } from "@/components/auth/signup-form";

export default function Page() {
  return (
    <section className="flex min-h-screen items-center justify-center px-6 py-16 sm:px-8 lg:ml-[50%] lg:w-1/2 lg:px-12">
      <div className="w-full max-w-md">
        <SignupForm />
      </div>
    </section>
  );
}
