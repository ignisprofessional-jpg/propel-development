import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.rpc("dashboard_logout"); // supprime la session côté base
  const res = NextResponse.redirect(new URL("/connexion", request.url), { status: 303 });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
