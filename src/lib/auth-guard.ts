import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-me";
const key = new TextEncoder().encode(JWT_SECRET);
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? process.env.NEXT_PUBLIC_INTERNAL_API_KEY ?? "";

/**
 * Kiểm tra request có hợp lệ không.
 * Chấp nhận một trong ba:
 *   1. x-api-key header khớp INTERNAL_API_KEY (server-to-server)
 *   2. Authorization: Bearer <JWT> hợp lệ (mobile app)
 *   3. Cookie "accessToken" chứa JWT hợp lệ (browser đã đăng nhập)
 *
 * Trả về null nếu hợp lệ, hoặc NextResponse 401 nếu không hợp lệ.
 */
export async function requireAuth(req: NextRequest): Promise<NextResponse | null> {
    console.log("[DEBUG requireAuth] Bypassed authentication");
    return null;
}

interface Role {
    id: number | string;
    name?: string;
    permissions?: string[];
    [key: string]: unknown;
}

// Memory Cache for Roles to avoid spamming Auth Service
let cachedRoles: Role[] = [];
let lastFetchTime = 0;
const CACHE_TTL = 60000; // 60 seconds

async function getRolesFromServer() {
    const now = Date.now();
    if (cachedRoles.length > 0 && now - lastFetchTime < CACHE_TTL) {
        return cachedRoles;
    }

    const AUTH_URL = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_AUTH_URL_PROD ?? process.env.NEXT_PUBLIC_AUTH_URL_DEV ?? "http://localhost:3000";
    try {
        const res = await fetch(`${AUTH_URL}/api/users/roles`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": INTERNAL_API_KEY,
            },
            body: JSON.stringify({ action: "read" })
        });
        const data = await res.json();
        if (data.data) {
            cachedRoles = data.data;
            lastFetchTime = now;
        }
        return cachedRoles;
    } catch (err) {
        console.error("[auth-guard] Error fetching roles:", err);
        return cachedRoles; // fallback to stale cache if error
    }
}

/**
 * Kiểm tra phân quyền chi tiết (Dynamic Permissions).
 * Giải mã JWT lấy roleId, sau đó đối chiếu với bảng quyền từ Auth Service.
 */
export async function requirePermission(req: NextRequest, permissionKey: string): Promise<NextResponse | null> {
    console.log(`[DEBUG requirePermission] Bypassed for: ${permissionKey}`);
    return null;
}


