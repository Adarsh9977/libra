import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPrisma } from "@/lib/db";

/**
 * GET /api/auth/me — return the current user from the libra_user_id cookie.
 */
export async function GET() {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("libra_user_id")?.value;
        if (!userId) {
            return NextResponse.json({ user: null });
        }
        const prisma = getPrisma();
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, image: true },
        });
        if (!user) {
            return NextResponse.json({ user: null });
        }
        return NextResponse.json({ user });
    } catch {
        return NextResponse.json({ user: null });
    }
}
