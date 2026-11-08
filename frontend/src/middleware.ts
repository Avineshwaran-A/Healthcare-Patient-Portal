import { NextResponse, type NextRequest } from "next/server";

// Cheap edge gate: no session cookie → sign-in page. Real authentication and
// role checks happen in FastAPI and in each workspace layout.
export function middleware(req: NextRequest) {
  if (!req.cookies.get("hcpp_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/patient/:path*", "/doctor/:path*", "/admin/:path*"] };
