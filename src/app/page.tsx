"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cookieBase } from '@/app/utils/cookie';
import { getCachedRoles } from '@/app/service/permissions/permissions';
import { usePermissionLoaded } from '@/app/service/permissions/PermissionProvider';
import { User } from '@/app/data/dataUser';

export default function HomePage() {
  const router = useRouter();
  const loaded = usePermissionLoaded();
  
  useEffect(() => {
    if (!loaded) return;
    
    const user = cookieBase.get<User>("info_user");
    if (user) {
      let userRoleVal: unknown = user.role;
      if (typeof userRoleVal === 'string' && userRoleVal.startsWith('{')) {
        try { userRoleVal = JSON.parse(userRoleVal); } catch(e) {}
      }
      const roleId = typeof userRoleVal === 'object' && userRoleVal !== null ? Number((userRoleVal as Record<string, unknown>).id) : Number(userRoleVal);

      // TODO: Tự viết lại logic check role
      const isSuperAdmin = true;
      const hasHrPermission = true;

      if (!isSuperAdmin && !hasHrPermission) {
        router.replace("/portal/profile");
      } else {
        router.replace("/dashboard");
      }
    } else {
      router.replace("/login");
    }
  }, [router, loaded]);
  
  return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center animate-pulse text-slate-500 font-medium">
        Đang kiểm tra quyền truy cập...
      </div>
    </div>
  );
}
