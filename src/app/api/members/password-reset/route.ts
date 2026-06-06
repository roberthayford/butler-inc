import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { passwordResetLimiter } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

const resetRequestSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = passwordResetLimiter.check(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const body = await request.json();
  const parsed = resetRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid email", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl(request)}/auth/callback?next=/members/reset-password`,
  });

  // Never reveal whether the email is registered. Log server-side only.
  if (error) {
    console.error("password-reset request failed:", error.message);
  }

  return NextResponse.json({ ok: true });
}
