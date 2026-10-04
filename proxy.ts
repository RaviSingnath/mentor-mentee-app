import { type NextRequest } from "next/server";
import { updateSession } from "./supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Keep Supabase SSR cookies fresh for page requests, while avoiding
     * API routes and static assets where auth redirects can cause loops.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
