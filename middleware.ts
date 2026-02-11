import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;

  // Tillåt auth-sidor
  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) {
    return res;
  }

  // Blockera allt annat om ej inloggad
  if (!user) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}
export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};
