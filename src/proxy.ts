import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { CONFIG } from './app/utils/config';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-me';
const key = new TextEncoder().encode(SECRET_KEY);
const AUTH_URL_LOGIN = `${CONFIG.AUTH_URL}/login`;

export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - api (API routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - models (AI model files)
    // - favicon.ico (favicon file)
    '/((?!api|_next/static|_next/image|models|favicon.ico).*)',
  ],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ✅ Bypass auth for static files and Next.js internal requests
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/models/') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // ✅ Bypass auth for all API routes — mobile app (hupuna-ship) calls these directly
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // ✅ Bypass auth for Kiosk routes (Public access, check IP in page)
  if (pathname.startsWith('/kiosk')) {
    return NextResponse.next();
  }

  let accessToken = request.cookies.get('accessToken')?.value;

  // Handle JSON stringified cookies
  if (accessToken && accessToken.startsWith('"')) {
    try {
      accessToken = JSON.parse(accessToken);
    } catch { }
  }

  // Also accept Authorization: Bearer <token> from mobile clients
  if (!accessToken) {
    const authHeader = request.headers.get('authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.slice(7);
    }
  }

  // 1. Verify Access Token
  let isValidToken = false;
  let payload: Record<string, unknown> | null = null;

  if (accessToken) {
    try {
      const verified = await jwtVerify(accessToken, key);
      payload = verified.payload;
      isValidToken = true;
    } catch (e) {
      isValidToken = false;
    }
  }

  // 2. If Token is Invalid -> Redirect to Auth App
  if (!isValidToken) {
    const loginUrl = new URL(AUTH_URL_LOGIN);
    loginUrl.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Valid Token Logic — Permissions Check
  let permissions: string[] = [];
  const roleId = payload?.role;

  // Nếu là Admin (role === 0), tự động gán full quyền
  if (roleId === 0 || roleId === "0") {
    permissions = ['*'];
  }
  // Ngược lại nếu là các role khác, đi tìm trong CSDL
  else if (roleId !== undefined && roleId !== null) {
    try {
      // Gọi qua API Auth Proxy nội bộ để lấy danh sách roles
      // Dùng cache của Next.js 60s để tránh làm chậm Middleware ở mỗi request
      const res = await fetch(new URL('/api/auth-proxy', request.url), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({ target: 'roles', action: 'read' }),
        next: { revalidate: 60 }
      });

      if (res.ok) {
        const json = await res.json();
        const roles = json?.data || [];

        // Dùng == thay vì === để tránh lỗi type chuỗi vs số
        const userRole = roles.find((r: { id?: string | number; _id?: string | number; permissions?: string[] }) => r.id == roleId || r._id == roleId);

        if (userRole && Array.isArray(userRole.permissions)) {
          permissions = userRole.permissions;
        }
      }
    } catch (err) {
    }
  }

  // Điều kiện được vào Timekeeping: có quyền * hoặc hr
  const hasTimekeepingAccess = permissions.includes('*') || permissions.includes('hr');

  let response = NextResponse.next();

  // Chuyển hướng khi vừa đăng nhập
  if (pathname === '/' || pathname === '/login') {
    if (hasTimekeepingAccess) {
      response = NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      response = NextResponse.redirect(new URL('/portal', request.url));
    }
  }
  // Chặn tài khoản thường truy cập vào các trang ngoài portal
  else if (!hasTimekeepingAccess && !pathname.startsWith('/portal')) {
    response = NextResponse.redirect(new URL('/portal', request.url));
  }

  // 4. Restore 'info_user' cookie for legacy app compatibility
  if (payload) {
    // Set info_user cookie on the response so the client/browser receives it
    // We encode it as a stringified JSON as expected by the legacy app
    response.cookies.set('info_user', JSON.stringify(payload), {
      path: '/',
      sameSite: 'lax',
      // Adjust secure/domain opts as needed for prod
    });
  }

  return response;
}
