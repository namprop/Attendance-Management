import { hasPermission } from "./permissions";

interface WithPermissionProps {
    roleId: string | number;
    permission: string;
    mode?: "hidden" | "readonly"; // mặc định là "hidden"
    children: React.ReactNode;
}

export function WithPermission({
    roleId,
    permission,
    mode = "hidden",
    children,
}: WithPermissionProps) {
    const isAllowed = hasPermission(roleId, permission);

    // Nếu không có quyền và mode là hidden → ẩn hoàn toàn
    if (!isAllowed && mode === "hidden") {
        return null;
    }

    // Nếu không có quyền nhưng mode là readonly → hiển thị, nhưng không thao tác được
    if (!isAllowed && mode === "readonly") {
        return (
            <div className="relative">
                {/* Nội dung gốc */}
                <div className="pointer-events-none opacity-60 select-none">
                    {children}
                </div>

                {/* Overlay để hiển thị không cho thao tác nhưng vẫn nhìn rõ */}
                <div className="absolute inset-0 bg-transparent cursor-not-allowed z-10"></div>
            </div>
        );
    }

    // Nếu có quyền đầy đủ → render bình thường
    return <>{children}</>;
}
