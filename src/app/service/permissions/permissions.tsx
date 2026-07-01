import { Role, Department } from "@/app/data/dataUser";

// === Internal Cache ===
let _roles: Role[] = [];
let _departments: Department[] = [];
let _permissions: { key: string; label: string }[] = [];
let _cacheLoaded = false;

/**
 * Gọi qua /api/auth-proxy (same-origin) thay vì cross-origin trực tiếp.
 * Auth-proxy sẽ tự thêm x-api-key khi forward sang hupuna-auth.
 */
async function proxyFetch(target: string): Promise<Response> {
    return fetch("/api/auth-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, action: "read" }),
    });
}

export async function loadRolesFromDB(): Promise<void> {
    try {
        const res = await proxyFetch("roles");
        const json = await res.json();
        if (json.data?.length) _roles = json.data;
    } catch {
        console.warn("⚠️ Không thể load roles từ DB");
    }
}

export async function loadDepartmentsFromDB(): Promise<void> {
    try {
        const res = await proxyFetch("departments");
        const json = await res.json();
        if (json.data?.length) _departments = json.data;
    } catch {
        console.warn("⚠️ Không thể load departments từ DB");
    }
}

export async function loadPermissionsFromDB(): Promise<void> {
    try {
        const res = await proxyFetch("permissions");
        const json = await res.json();
        if (json.data?.length) _permissions = json.data;
    } catch {
        console.warn("⚠️ Không thể load permissions từ DB");
    }
}

export async function loadAllFromDB(): Promise<void> {
    await Promise.all([
        loadRolesFromDB(),
        loadDepartmentsFromDB(),
        loadPermissionsFromDB(),
    ]);
    _cacheLoaded = true;
}

export function hasPermission(roleId: string | number, permission: string): boolean {
    // Admin (role 0) có toàn quyền
    if (roleId === 0 || roleId === '0') return true;

    // Dùng == để so sánh lỏng lẻo (loose equality) cho trường hợp số và chuỗi
    // Check cả id và _id (cho MongoDB)
    const role = _roles.find((r) => r.id == roleId || (r as Role & { _id?: string | number })._id == roleId);
    if (!role) return false;
    
    // Nếu chưa load mảng permissions hoặc mảng rỗng thì return false
    if (!Array.isArray(role.permissions)) return false;
    
    if (role.permissions.includes("*")) return true;
    return role.permissions.includes(permission);
}

export function getCachedRoles(): Role[] { return _roles; }
export function getCachedDepartments(): Department[] { return _departments; }
export function getCachedPermissions(): { key: string; label: string }[] { return _permissions; }
export function isCacheLoaded(): boolean { return _cacheLoaded; }

export async function invalidateRolesCache(): Promise<void> {
    _cacheLoaded = false;
    await loadAllFromDB();
}
