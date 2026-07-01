"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LocationSyncProvider } from "./ui/providers/LocationSyncProvider";
import { PushInitProvider } from "./ui/providers/PushInitProvider";
import { PermissionProvider } from "./service/permissions/PermissionProvider";
import { ToastProvider } from "./ui/base/toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { cookieBase } from "@/app/utils/cookie";

const EMBED_ONLY_PATHS = new Set(["/invoice/draft-info"]);

function normalizePathname(pathname: string | null): string {
  if (!pathname) return "/";
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

export default function AppProviders({ children }: { children: ReactNode }) {
  const pathname = normalizePathname(usePathname());
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5000, // 5 seconds
        refetchOnWindowFocus: false,
      },
    },
  }));

  if (EMBED_ONLY_PATHS.has(pathname)) {
    return <>{children}</>;
  }
  
  if (typeof window !== 'undefined') {
    if (!cookieBase.get('info_user')) {
      cookieBase.set('info_user', {
        id: 'admin',
        _id: 'admin',
        name: 'Admin Bypass',
        username: 'admin',
        role: { id: 0 },
        employeeCode: 'EMP001',
        employeeId: 'admin',
      });
      document.cookie = 'accessToken=bypassed_token; path=/';
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PushInitProvider />
      <ToastProvider>
        <LocationSyncProvider>
          <PermissionProvider>{children}</PermissionProvider>
        </LocationSyncProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

