'use client';

import React, { useEffect, useRef, useState } from "react";
import { DropdownBase } from "../base/dropdown";
import IconTriangleDownWhite from "@public/icons/triangle-down.svg";
import IconLogout from "@public/icons/logout.svg";
import IconUser from "@public/icons/prices/user-black.svg";
import Image from "next/image";
import { ABCLogo } from "@/app/ui/base/abc-logo";
import { cookieBase } from "@/app/utils/cookie";
import Link from "next/link";
import { User } from "@/app/data/dataUser";
import { getCachedDepartments } from "@/app/service/permissions/permissions";
import { usePermissionLoaded } from "@/app/service/permissions/PermissionProvider";
import MenuHeaderComponent, { MenuItem } from "../menu/menu-header";
import AppsMenu from "./apps-menu";
import UtilitiesDropdown from "./utilities-dropdown";
import LocationSelector from "./location-selector";
import { CONFIG } from "@/app/utils/config";
import { Menu as MenuIcon } from "lucide-react";

export default function HeaderBase({
  menuItems,
  onMobileMenuToggle,
}: {
  menuItems?: MenuItem[];
  onMobileMenuToggle?: () => void;
}) {
  usePermissionLoaded();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [user_info, setUserInfo] = useState<User | null>(null);

  useEffect(() => {
    const info = cookieBase.get<User>("info_user");
    if (info) setTimeout(() => setUserInfo(info), 0);

    const handleScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const logout = () => {
    cookieBase.remove("info_user");
    cookieBase.remove("remember_login");
    document.cookie = "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    if (CONFIG.COOKIE_DOMAIN) {
      document.cookie = `accessToken=; domain=${CONFIG.COOKIE_DOMAIN}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
    window.location.href = `${CONFIG.AUTH_URL}/login`;
  };

  return (
    <div
      ref={wrapperRef}
      className="sticky top-0 z-50 bg-white transition-shadow duration-300 ease-out"
      style={{
        boxShadow: scrolled
          ? '0 1px 0 rgba(0,0,0,0.06), 0 4px 16px -4px rgba(0,0,0,0.08)'
          : '0 1px 0 rgba(0,0,0,0.06)',
      }}
    >
      {/* Main header row */}
      <div className="flex items-center justify-between px-3 sm:px-4 h-12 sm:h-14 gap-2 sm:gap-3">

        {/* Left: Mobile menu btn + Logo */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Mobile hamburger — only shows if onMobileMenuToggle is passed AND no header nav */}
          {onMobileMenuToggle && (
            <button
              onClick={onMobileMenuToggle}
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all active:scale-90"
              aria-label="Mở menu"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
          )}

          <Link href="/dashboard" className="flex items-center shrink-0">
            <ABCLogo className="text-2xl sm:text-3xl" />
          </Link>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-end min-w-0">
          {/* Location selector */}
          <LocationSelector />

          {/* Utilities */}
          <UtilitiesDropdown />

          {/* User menu */}
          <div className="flex items-center relative shrink-0">
            <DropdownBase
              classNameBtn=""
              iconBtn={
                <div className="flex items-center gap-1.5 h-9 px-2 rounded-xl hover:bg-slate-50 transition-colors">
                  {user_info?.avatar ? (
                    <Image
                      unoptimized
                      src={user_info.avatar as string}
                      alt="User"
                      width={26}
                      height={26}
                      className="rounded-full w-[26px] h-[26px] object-cover border-2 border-slate-100 shrink-0"
                    />
                  ) : (
                    <div className="w-[26px] h-[26px] rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <span className="text-blue-700 font-bold text-xs uppercase">
                        {String(user_info?.name || user_info?.username || 'U').charAt(0)}
                      </span>
                    </div>
                  )}
                  <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-[120px] truncate">
                    {user_info?.username}
                  </span>
                  <Image
                    src={IconTriangleDownWhite.src}
                    alt=""
                    width={10}
                    height={10}
                    className="flex-none opacity-40"
                  />
                </div>
              }
              classNameContent="w-[220px] py-2 shadow-xl rounded-2xl border border-slate-100"
            >
              {/* User info card */}
              <Link
                href="/portal"
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors rounded-t-xl mx-1"
              >
                {user_info?.avatar ? (
                  <Image
                    unoptimized
                    src={user_info.avatar as string}
                    alt="Avatar"
                    width={36}
                    height={36}
                    className="rounded-full w-9 h-9 object-cover border-2 border-blue-100 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-white font-bold text-sm uppercase">
                      {String(user_info?.name || 'U').charAt(0)}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm text-slate-800 truncate capitalize">{user_info?.name}</p>
                    {user_info?.level === 1 && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-400 text-amber-900 shrink-0">VIP</span>
                    )}
                    {user_info?.level === 2 && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500 text-white shrink-0">PRO</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 italic truncate">
                    {user_info?.department &&
                      getCachedDepartments().find(d => d.id === Number(user_info.department))?.name}
                  </p>
                </div>
              </Link>

              <div className="h-px bg-slate-100 mx-3 my-1" />

              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors rounded-xl mx-1 text-left group"
                style={{ width: 'calc(100% - 8px)' }}
                onClick={logout}
              >
                <Image src={IconLogout.src} alt="" width={16} height={16} className="opacity-50 group-hover:opacity-70" />
                <span className="text-slate-500 group-hover:text-red-600 font-medium text-sm transition-colors">Đăng xuất</span>
              </button>
            </DropdownBase>
          </div>
        </div>
      </div>

      {/* Navigation bar — hidden on mobile (using bottom tabs instead) */}
      <div className="hidden lg:block">
        <MenuHeaderComponent menuItems={menuItems} />
      </div>
    </div>
  );
}
