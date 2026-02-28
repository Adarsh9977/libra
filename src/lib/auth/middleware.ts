import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPrisma } from "@/lib/db";

const UNAUTHORIZED_MESSAGE = "You must be signed in to perform this action.";

/**
 * Require an authenticated user. Use at the start of protected API route handlers.
 * Returns a 401 JSON response if the user is not logged in or session is invalid;
 * otherwise returns the authenticated userId.
 */
export async function requireAuth(): Promise<
  NextResponse | { userId: string }
> {
  const cookieStore = await cookies();
  const userId = cookieStore.get("libra_user_id")?.value;

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", message: UNAUTHORIZED_MESSAGE },
      { status: 401 }
    );
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid or expired session." },
      { status: 401 }
    );
  }

  return { userId };
}
