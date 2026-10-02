import Link from "next/link";
import { IconLink } from "@/components/home/IconLink";
import { Logo } from "@/components/home/Logo";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { SignInForm } from "../../auth/sign-in-form";

function GitHubIcon(props: React.ComponentPropsWithoutRef<"svg">) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor" {...props}>
      <path d="M8 .198a8 8 0 0 0-8 8 7.999 7.999 0 0 0 5.47 7.59c.4.076.547-.172.547-.384 0-.19-.007-.694-.01-1.36-2.226.482-2.695-1.074-2.695-1.074-.364-.923-.89-1.17-.89-1.17-.725-.496.056-.486.056-.486.803.056 1.225.824 1.225.824.714 1.224 1.873.87 2.33.666.072-.518.278-.87.507-1.07-1.777-.2-3.644-.888-3.644-3.954 0-.873.31-1.586.823-2.146-.09-.202-.36-1.016.07-2.118 0 0 .67-.214 2.2.82a7.67 7.67 0 0 1 2-.27 7.67 7.67 0 0 1 2 .27c1.52-1.034 2.19-.82 2.19-.82.43 1.102.16 1.916.08 2.118.51.56.82 1.273.82 2.146 0 3.074-1.87 3.75-3.65 3.947.28.24.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.14.46.55.38A7.972 7.972 0 0 0 16 8.199a8 8 0 0 0-8-8Z" />
    </svg>
  );
}

export function Intro() {
  return (
    <>
      <div>
        <Link href="/" className="flex items-end gap-2">
          <Logo className="inline-block h-8 w-auto" />
          <span className="text-white font-bold text-2xl sm:text-3xl">
            Mentor Mentee
          </span>
        </Link>
      </div>
      <h1 className="mt-14 font-display text-4xl/tight font-light text-white">
        Grow faster with{" "}
        <span className="text-sky-300 text-5xl/tight">
          who&#39;s been there
        </span>
      </h1>
      <p className="mt-4 text-sm tracking-normal font-display text-gray-300">
        Mentorship works when the match is right and the conversations keep
        happening. Our app helps mentees find mentors who fit their goals, and
        gives both sides simple tools to plan sessions, share notes, and see how
        far they&#39;ve come.
      </p>
      {/* <SignUpForm />
      <SignInForm /> */}
    </>
  );
}

export function IntroFooter() {
  return (
    <p className="flex items-baseline gap-x-2 text-[0.8125rem]/6 text-gray-500">
      Brought to you by{" "}
      <IconLink
        href="https://github.com/RaviSingnath"
        icon={GitHubIcon}
        compact
      >
        Ravi Verma
      </IconLink>
    </p>
  );
}
