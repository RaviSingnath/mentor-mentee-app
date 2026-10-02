import { useId } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function SignInForm() {
  const id = useId();

  return (
    <form className="relative isolate mt-8 flex items-center pr-1">
      <Input placeholder="Enter text" />
      <label htmlFor={id} className="sr-only">
        Email address
      </label>
      <input
        required
        type="email"
        autoComplete="email"
        name="email"
        id={id}
        placeholder="Email address"
        className="peer w-0 flex-auto bg-transparent px-4 py-2.5 text-base text-white placeholder:text-gray-500 focus:outline-hidden sm:text-[0.8125rem]/6"
      />
      <Button type="submit">Get updates</Button>
    </form>
  );
}
