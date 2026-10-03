import { LoginForm } from "@/components/auth/login-form";

export default function LoginSection() {
  return (
    <div className="min-h-screen">
      <section className="flex min-h-screen items-center justify-center px-6 py-16 sm:px-8 lg:ml-[50%] lg:w-1/2 lg:px-12">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </section>
    </div>
  );
}
