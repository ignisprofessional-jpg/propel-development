import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/** Session expirée ou révoquée : on efface le cookie et on revient à l'écran du code. */
export function GET(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/connexion", request.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
