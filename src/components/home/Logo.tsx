import Image from "next/image";
import { useId } from "react";

export function Logo(props: React.ComponentPropsWithoutRef<"svg">) {
  const id = useId();

  return (
    <Image
      preload
      src="/logo/logo.svg"
      width={48}
      height={48}
      alt="Mentor Mentee"
      className="h-auto w-16"
    />
  );
}
