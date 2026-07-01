import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-me";
const key = new TextEncoder().encode(JWT_SECRET);
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? process.env.NEXT_PUBLIC_INTERNAL_API_KEY ?? "";

/**
 * Kiểm tra request có hợp lệ không bằng Token JWT
 */
export async function requireAuth(req: NextRequest): Promise<NextResponse | null> {
    const authHeader = req.headers.get('authorization');
    const apiKey = req.headers.get('x-api-key');
    let token = '';

    // 1. Check API Key
    if (apiKey && apiKey === INTERNAL_API_KEY) {
        return null; // OK
    }

    // 2. Check Authorization Header
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }

    // 3. Check Cookies
    if (!token) {
        const cookieToken = req.cookies.get('accessToken');
        if (cookieToken) {
            token = cookieToken.value;
        }
    }

    if (!token) {
        return NextResponse.json({ message: "Vui lòng đăng nhập" }, { status: 401 });
    }

    try {
        await jwtVerify(token, key);
        return null; // Token hợp lệ
    } catch (err) {
        return NextResponse.json({ message: "Token không hợp lệ hoặc đã hết hạn" }, { status: 401 });
    }
}

// Mock Permission Matrix
// Định nghĩa sẵn các quyền cho Role ID (1: Admin, 2: Employee)
const PERMISSION_MATRIX: Record<number, string[]> = {
    1: [ // Admin roles
        "read:users", "write:users",
        "read:contracts", "write:contracts",
        "read:attendance", "write:attendance",
        "manage:system", "read:kiosk", "write:kiosk"
    ],
    2: [ // Employee roles
        "read:attendance"
    ]
};

/**
 * Kiểm tra phân quyền chi tiết (Dynamic Permissions).
 */
export async function requirePermission(req: NextRequest, permissionKey: string): Promise<NextResponse | null> {
    // Đầu tiên phải qua Auth
    const authError = await requireAuth(req);
    if (authError) return authError;

    // Lấy token
    let token = '';
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    } else {
        token = req.cookies.get('accessToken')?.value || '';
    }

    try {
        const { payload } = await jwtVerify(token, key);
        const roleId = payload.roleId as number;

        // Nếu là Admin bypass (roleId = 1) -> Cho phép hết
        if (roleId === 1) {
            return null;
        }

        const permissions = PERMISSION_MATRIX[roleId] || [];
        if (!permissions.includes(permissionKey)) {
            return NextResponse.json({ message: "Bạn không có quyền thực hiện thao tác này" }, { status: 403 });
        }

        return null;
    } catch (err) {
        return NextResponse.json({ message: "Lỗi xác thực quyền" }, { status: 403 });
    }
}
