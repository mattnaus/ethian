import { auth } from "@/auth";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextResponse } from "next/server";

const intlMiddleware = createIntlMiddleware(routing);

export default auth((req) => {
  // Run next-intl middleware to detect locale and set NEXT_LOCALE cookie
  const intlResponse = intlMiddleware(req);

  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (!isLoggedIn && !isAuthPage && pathname !== "/") {
    const redirect = NextResponse.redirect(new URL("/login", req.url));
    intlResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  if (isLoggedIn && isAuthPage) {
    const redirect = NextResponse.redirect(new URL("/inbox", req.url));
    intlResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return intlResponse;
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
