import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/drive/oauth";
import { getPrisma } from "@/lib/db";

/**
 * GET: OAuth callback. Exchange code for tokens, create/upsert user, set cookie.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/?error=missing_code", request.url)
    );
  }

  try {
    // 1. Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // 2. Fetch Google user profile using the access token
    const profileRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
    );
    if (!profileRes.ok) {
      throw new Error("Failed to fetch Google profile");
    }
    const profile = (await profileRes.json()) as {
      id: string;
      email: string;
      name?: string;
      picture?: string;
    };

    // 3. Create or update User
    const prisma = getPrisma();
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      create: {
        email: profile.email,
        name: profile.name ?? null,
        image: profile.picture ?? null,
      },
      update: {
        name: profile.name ?? undefined,
        image: profile.picture ?? undefined,
      },
    });

    // 4. Store Drive tokens linked to user ID
    await prisma.driveToken.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
    });

    // 5. Redirect with cookie
    const base =
      process.env.NEXTAUTH_URL ??
      request.url.split("/api")[0] ??
      "http://localhost:3000";
    const response = NextResponse.redirect(
      new URL("/?drive=connected", base)
    );
    response.cookies.set("libra_user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const base =
      process.env.NEXTAUTH_URL ??
      request.url.split("/api")[0] ??
      "http://localhost:3000";
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(message)}`, base)
    );
  }
}
