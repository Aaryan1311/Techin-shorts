import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for auth pages, onboarding, API routes, static files
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/audio") ||
    pathname === "/manifest.json"
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request });

  // Not logged in — allow access (feed works for anonymous users)
  if (!token) {
    return NextResponse.next();
  }

  // Logged in but not onboarded — redirect to onboarding
  if (token.onboarded === false) {
    const onboardingUrl = new URL("/onboarding", request.url);
    return NextResponse.redirect(onboardingUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
