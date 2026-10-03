"use client";

import Image from "next/image";
import Link from "next/link";
const FullLogo = () => {
  return (
    <Link href={"/"} className="flex gap-1 overflow-hidden">
      {/* Dark Logo   */}
      <Image
        src={"/logo/logo.svg"}
        alt="logo"
        width={32}
        height={32}
        className="block dark:hidden max-w-30 rtl:scale-x-[-1]"
      />
      {/* Light Logo  */}
      <Image
        src={"/logo/logo.svg"}
        alt="logo"
        width={32}
        height={32}
        className="hidden dark:block max-w-30 rtl:scale-x-[-1]"
      />
      <span className="dark:text-white font-bold text-xl">
        Mentor Mentee
      </span>
    </Link>
  );
};

export default FullLogo;
