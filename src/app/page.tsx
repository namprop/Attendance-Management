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
    
    const token = cookieBase.get('accessToken');
    if (token) {
      router.replace("/dashboard");
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
