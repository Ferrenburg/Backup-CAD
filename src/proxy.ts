import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback"];
const MFA_PATHS = ["/mfa/enroll", "/mfa/verify"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user) {
    if (isPublic) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Logged in but on the login page — send them onward.
  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // MFA required for all accounts (§6.3). A user with no verified factor
  // gets routed to enrollment and nothing else; a user with a factor who
  // hasn't stepped up this session gets routed to the challenge.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const isMfaPath = MFA_PATHS.some((p) => pathname.startsWith(p));
  const requiredMfaPath =
    aal?.nextLevel === "aal1"
      ? "/mfa/enroll"
      : aal && aal.currentLevel !== aal.nextLevel
        ? "/mfa/verify"
        : null;

  if (requiredMfaPath) {
    if (pathname.startsWith(requiredMfaPath)) return response;
    const url = request.nextUrl.clone();
    url.pathname = requiredMfaPath;
    return NextResponse.redirect(url);
  }
  if (isMfaPath) {
    // MFA already fully satisfied — no reason to be on an /mfa/* screen.
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? "readonly";
  const active = profile?.active ?? false;
  const hasAccess = active && role !== "readonly";

  if (!hasAccess) {
    if (pathname.startsWith("/pending")) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/pending";
    return NextResponse.redirect(url);
  }

  if (hasAccess && pathname.startsWith("/pending")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/outage/new") && !["supervisor", "admin"].includes(role)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
