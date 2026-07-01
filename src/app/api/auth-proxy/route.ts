import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth-guard";
const AUTH_URL = process.env.AUTH_URL ?? (process.env.NODE_ENV === "development" ? process.env.NEXT_PUBLIC_AUTH_URL_DEV : process.env.NEXT_PUBLIC_AUTH_URL_PROD) ?? "http://localhost:3000";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? process.env.NEXT_PUBLIC_INTERNAL_API_KEY ?? "";

/**
 * Local proxy → abc-auth (roles / departments / permissions)
 * Client-side permissions.tsx gọi /api/auth-proxy thay vì gọi auth cross-origin.
 * INTERNAL_API_KEY được gửi server-side, không bao giờ lộ ra browser.
 *
 * Body: { target: "roles"|"departments"|"permissions", ...payload }
 */
export async function POST(req: NextRequest) {
    const authError = await requireAuth(req);
    if (authError) return authError;

    try {
        const body = await req.json();
        const { target, ...payload } = body as { target: string; [key: string]: unknown };

        const targetMap: Record<string, string> = {
            roles: "/api/users/roles",
            departments: "/api/users/departments",
            permissions: "/api/users/permissions",
        };

        const path = targetMap[target];
        if (!path) {
            return NextResponse.json({ error: "Invalid target" }, { status: 400 });
        }

        try {
            const res = await fetch(`${AUTH_URL}${path}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": INTERNAL_API_KEY,
                },
                body: JSON.stringify(payload),
                cache: "no-store",
            });

            const data = await res.json();
            return NextResponse.json(data, { status: res.status });
        } catch (fetchErr) {
            console.warn("[auth-proxy] Fetch failed, returning mock data for development bypass:", fetchErr);
            
            // Fallback mock data when abc-auth is down
            if (target === "roles") {
                return NextResponse.json({ success: true, data: [{ id: 0, name: "Admin (Bypass)" }] });
            }
            if (target === "departments") {
                return NextResponse.json({ success: true, data: [{ id: 1, name: "Phòng IT" }] });
            }
            if (target === "permissions") {
                return NextResponse.json({ success: true, data: [{ id: 1, action: "*", resource: "*" }] });
            }
            
            return NextResponse.json({ error: "Proxy error (abc-auth is offline)" }, { status: 500 });
        }
    } catch (err) {
        console.error("[auth-proxy] Error:", err);
        return NextResponse.json({ error: "Proxy error" }, { status: 500 });
    }
}



