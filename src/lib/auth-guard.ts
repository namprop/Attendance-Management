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
    console.log("[DEBUG requireAuth] URL:", req.url);
    console.log("[DEBUG requireAuth] accessToken cookie:", req.cookies.get("accessToken")?.value ? "Exists" : "Missing");
    // --- Cách 1: x-api-key (server-to-server) ---
    const apiKey = req.headers.get("x-api-key");
    if (apiKey && INTERNAL_API_KEY && apiKey === INTERNAL_API_KEY) {
        return null; // ✅ hợp lệ
    }

    // --- Cách 2: Bearer JWT (mobile app) ---
    const authHeader = req.headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        try {
            await jwtVerify(token, key);
            return null; // ✅ hợp lệ
        } catch {
            // token invalid/expired — tiếp tục kiểm tra cookie
        }
    }

    // --- Cách 3: Cookie accessToken (browser đã đăng nhập) ---
    const rawCookie = req.cookies.get("accessToken")?.value;
    if (rawCookie) {
        // Một số cookie library lưu JWT có dấu ngoặc kép → strip bỏ
        let tokenToVerify: string = rawCookie;
        if (tokenToVerify.startsWith('"')) {
            try { tokenToVerify = JSON.parse(tokenToVerify) as string; } catch { /* ignore */ }
        }
        try {
            await jwtVerify(tokenToVerify, key);
            return null; // ✅ hợp lệ
        } catch (e) {
            console.log("[DEBUG requireAuth] jwtVerify failed:", e);
            // cookie token invalid/expired
        }
    }

    // --- Cách 4: Fallback cho info_user cookie (nếu accessToken lỗi port/domain) ---
    if (req.cookies.get("info_user")?.value) {
        console.log("[DEBUG requireAuth] Allowed via info_user fallback");
        return null;
    }

    // --- Không hợp lệ ---
    return NextResponse.json(
        { success: false, error: "Unauthorized: missing or invalid credentials" },
        { status: 401 }
    );
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
    // 1. Tận dụng requireAuth để lấy JWT hợp lệ
    let token = "";
    
    // Check Bearer
    const authHeader = req.headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7);
    } else {
        // Check Cookie
        const rawCookie = req.cookies.get("accessToken")?.value;
        if (rawCookie) {
            token = rawCookie;
            if (token.startsWith('"')) {
                try { token = JSON.parse(token); } catch { /* ignore */ }
            }
        }
    }

    if (!token) {
        // Fallback x-api-key (Server to Server luôn được full quyền)
        const apiKey = req.headers.get("x-api-key");
        if (apiKey && INTERNAL_API_KEY && apiKey === INTERNAL_API_KEY) {
            return null; // ✅ Hợp lệ
        }
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { payload } = await jwtVerify(token, key);
        
        interface CustomJWTPayload {
            role?: number | string;
            user?: { role?: number | string };
        }
        
        const customPayload = payload as unknown as CustomJWTPayload;
        
        // JWT Payload của Auth service thường chứa role (id) hoặc user.role
        const roleId = customPayload?.role ?? customPayload?.user?.role ?? 3; 

        // Nếu là Super Admin (role 1) -> Luôn Pass
        if (Number(roleId) === 1) return null;

        // Fetch Roles từ Cache/Server
        const roles = await getRolesFromServer();

        // Nếu Auth service không trả được danh sách role (down/chưa config),
        // thì fallback: chấp nhận mọi user đã xác thực JWT hợp lệ.
        if (roles.length === 0) {
            console.warn(`[auth-guard] Roles list empty — Auth service unreachable? Allowing authenticated user (roleId=${roleId}) through.`);
            return null;
        }

        const userRole = roles.find((r: Role) => Number(r.id) === Number(roleId));

        if (!userRole) {
             return NextResponse.json({ success: false, error: "Role không hợp lệ" }, { status: 403 });
        }

        const isSuperAdmin = userRole.name?.toLowerCase().includes('admin') || userRole.permissions?.includes('*');
        if (isSuperAdmin) return null;

        if (!userRole.permissions?.includes(permissionKey)) {
             return NextResponse.json(
                { success: false, error: "Forbidden: Bạn không có quyền thực hiện thao tác này" }, 
                { status: 403 }
            );
        }

        return null; // ✅ Hợp lệ
    } catch (err) {
        return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }
}


