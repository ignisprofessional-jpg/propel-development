import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, looksLikeToken } from "@/lib/session";
import { isDevPreviewEnabled } from "@/lib/auth";

const PUBLIC_PATHS = ["/connexion", "/auth/", "/api/stripe/webhook", "/api/inbound/"];

/**
 * Filtre rapide (sans appel réseau) : sans cookie de session, retour à l'écran du code.
 * La validité réelle du jeton est vérifiée en base par le layout protégé et par RLS.
 */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) return NextResponse.next();
  if (isDevPreviewEnabled() && path.startsWith("/design")) return NextResponse.next();

  if (!looksLikeToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = path === "/" ? "" : `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
