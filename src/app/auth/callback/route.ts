import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_NEXT = "/members/dashboard";

function safeNext(raw: string | null): string {
  if (!raw) return DEFAULT_NEXT;
  // Reject anything that isn't a same-origin relative path — prevents open-redirect via ?next=https://evil/
  if (!raw.startsWith("/") || raw.startsWith("//")) return DEFAULT_NEXT;
  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      `${origin}/members/login?error=auth-callback-failed`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/members/login?error=auth-callback-failed`
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
