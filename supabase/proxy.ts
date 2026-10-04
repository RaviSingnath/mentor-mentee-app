import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const protectedRoutes = ["/dashboard", "/profile"];

// route -> roles allowed to access it
const roleRoutes: Record<string, string[]> = {
  "/dashboard": ["super_admin", "admin", "mentor", "mentee"],
  "/profile": ["super_admin", "admin", "mentor", "mentee"],
};

interface AppClaims {
  sub: string;
  user_role?: "super_admin" | "admin" | "mentor" | "mentee";
}

function isProtectedRoute(pathname: string) {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function getRequiredRoles(pathname: string): string[] | null {
  const match = Object.keys(roleRoutes).find(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  return match ? roleRoutes[match] : null;
}

function redirectWithSupabaseCookies(
  request: NextRequest,
  supabaseResponse: NextResponse,
  pathname: string,
) {
  const redirectResponse = NextResponse.redirect(
    new URL(pathname, request.url),
  );

  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}

// TODO: Check use case of the homeForRole function
function homeForRole(role?: string): string | null {
  switch (role) {
    case "super_admin":
      return "/dashboard";
    case "admin":
      return "/dashboard";
    case "mentor":
      return "/dashboard";
    case "mentee":
      return "/dashboard";
    default:
      return null;
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/";
  const routeIsProtected = isProtectedRoute(pathname);

  // Only decode/verify the JWT when we actually need to know who the user is
  let claims: AppClaims | null = null;
  if (routeIsProtected || isLoginPage) {
    const { data, error } = await supabase.auth.getClaims();
    if (!error && data) {
      claims = data.claims as AppClaims;
    }
  }

  // Redirect unauthenticated users away from protected routes
  if (!claims && routeIsProtected) {
    return redirectWithSupabaseCookies(request, supabaseResponse, "/");
  }

  // Redirect logged-in users away from the login page, to their role's home
  if (claims && isLoginPage) {
    const home = homeForRole(claims.user_role);

    if (home) {
      return redirectWithSupabaseCookies(request, supabaseResponse, home);
    }

    return redirectWithSupabaseCookies(
      request,
      supabaseResponse,
      "/unauthorized",
    );
  }

  // Role-gate specific protected routes
  if (claims && routeIsProtected) {
    const requiredRoles = getRequiredRoles(pathname);
    if (requiredRoles && !requiredRoles.includes(claims.user_role ?? "")) {
      return redirectWithSupabaseCookies(
        request,
        supabaseResponse,
        "/unauthorized",
      );
    }
  }

  return supabaseResponse;
}
