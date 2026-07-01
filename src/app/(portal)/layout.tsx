'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ConfigProvider, Layout, Menu, Button, Badge } from 'antd';
import {
  Monitor, CalendarCheck, FileText, UserCircle, Menu as MenuIcon, LogOut, Clock, Receipt, Wifi, AlarmClock
} from 'lucide-react';
import Link from 'next/link';
import { PortalUserProvider, usePortalUser } from './portal-context';
import AppsMenu from '@/app/ui/header/apps-menu';
import LocationSelector from '@/app/ui/header/location-selector';
import UtilitiesDropdown from '@/app/ui/header/utilities-dropdown';
import { DropdownBase } from '@/app/ui/base/dropdown';
import IconTriangleDownWhite from '@public/icons/triangle-down.svg';
import IconUser from '@public/icons/prices/user-black.svg';
import IconLogout from '@public/icons/logout.svg';
import Image from 'next/image';
import { ABCLogo } from "@/app/ui/base/abc-logo";
import { getCachedDepartments } from "@/app/service/permissions/permissions";
import { cookieBase } from "@/app/utils/cookie";
import type { User } from "@/app/data/dataUser";
import { ButtonBase } from "@/app/ui/base/button";

const { Sider, Header, Content } = Layout;

const PORTAL_MENU_ITEMS = [
  { key: '/portal', icon: <Monitor className="w-4 h-4" />, label: 'Tổng quan' },
  { key: '/portal/profile', icon: <UserCircle className="w-4 h-4" />, label: 'Hồ sơ cá nhân' },
  { key: '/portal/history', icon: <Clock className="w-4 h-4" />, label: 'Lịch sử chấm công' },
  // { key: '/portal/payroll-results', icon: <Receipt className="w-4 h-4" />, label: 'Bảng lương của tôi' },
  { key: '/portal/requests', icon: <FileText className="w-4 h-4" />, label: 'Đơn từ & Yêu cầu' },
  { key: '/portal/overtime-requests', icon: <AlarmClock className="w-4 h-4 text-violet-500" />, label: 'Xin tăng ca' },
  { key: '/portal/online-checkin', icon: <Wifi className="w-4 h-4" />, label: 'Chấm công làm Online' },
  { key: '/portal/public-leave', icon: <FileText className="w-4 h-4 text-emerald-500" />, label: 'Tạo đơn xin nghỉ (Nhanh)' },
];

function PortalLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { displayName, employee, logout } = usePortalUser();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const [mounted, setMounted] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState<Date | null>(null);
  const [userInfo, setUserInfo] = React.useState<User | null>(null);

  useEffect(() => {
    const info = cookieBase.get<User>("info_user");
    if (info) setTimeout(() => setUserInfo(info), 0);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      setCurrentTime(new Date());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [mounted]);

  let activeKey = '/portal';
  if (pathname.startsWith('/portal/online-checkin')) activeKey = '/portal/online-checkin';
  else if (pathname.startsWith('/portal/profile')) activeKey = '/portal/profile';
  else if (pathname.startsWith('/portal/history')) activeKey = '/portal/history';
  // else if (pathname.startsWith('/portal/payroll-results')) activeKey = '/portal/payroll-results';
  else if (pathname.startsWith('/portal/requests')) activeKey = '/portal/requests';
  else if (pathname.startsWith('/portal/overtime-requests')) activeKey = '/portal/overtime-requests';

  const menuItems = PORTAL_MENU_ITEMS.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: <span className="font-semibold text-xs">{item.label}</span>,
  }));

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        components: {
          Layout: { headerBg: 'rgba(255, 255, 255, 0.7)', bodyBg: 'transparent', siderBg: 'rgba(255, 255, 255, 0.8)' },
          Menu: {
            itemBg: 'transparent',
            itemSelectedBg: 'rgba(22, 119, 255, 0.1)',
            itemSelectedColor: '#1677ff',
            itemHoverBg: 'rgba(0, 0, 0, 0.04)',
          },
        },
      }}
    >
      <Layout style={{ minHeight: '100vh', overflow: 'hidden' }}>
        {/* ── SIDEBAR ─────────────────────────────────────────────── */}
        <Sider
          width={260}
          breakpoint="lg"
          collapsedWidth="0"
          trigger={null}
          collapsible
          collapsed={isCollapsed}
          onCollapse={(v) => setIsCollapsed(v)}
          style={{
            borderRight: isCollapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.3)',
            height: '100vh',
            position: 'fixed',
            left: 0, top: 0, bottom: 0,
            zIndex: 100,
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            backgroundColor: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '1px 0 20px rgba(0, 0, 0, 0.03)',
          }}
        >
          <div className="flex flex-col h-full justify-between">
            <div>
              {/* Brand Logo */}
              <div className="px-4">
                <div className="flex flex-col items-center justify-center text-center">
                  <ABCLogo className="text-3xl" />
                  <span className="text-[10px] relative bottom-5 text-slate-400 uppercase tracking-widest font-extrabold mt-1.5 block">
                    CHẤM CÔNG PORTAL
                  </span>
                </div>
                <div className="h-px bg-slate-100 w-full" />
              </div>

              {/* Navigation Menu */}
              <div className="px-2 py-2">
                <Menu
                  mode="inline"
                  selectedKeys={[activeKey]}
                  onClick={({ key }) => {
                    if (key === '/portal/public-leave') {
                      const code = employee?.employeeCode || userInfo?.employeeCode;
                      window.open(code ? `/public-leave?code=${code}` : '/public-leave', '_blank');
                      return;
                    }
                    router.push(key);
                    if (window.innerWidth < 1024) {
                      setIsCollapsed(true);
                    }
                  }}
                  items={menuItems}
                />
              </div>
            </div>

            {/* Persona Panel (bottom of sidebar) */}
            <div className="p-4 border-t border-slate-100 bg-linear-to-b from-white to-slate-50/50">
              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 shadow-xs">

                <div className="mt-3 pt-3 border-t border-slate-200/50">
                  <button
                    onClick={logout}
                    className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-red-600 text-xs font-semibold transition-colors hover:bg-red-50 bg-white border border-red-100"
                  >
                    <LogOut size={14} />
                    Đăng xuất
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Sider>

        {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
        {/* Overlay backdrop for mobile when sidebar is open */}
        {!isCollapsed && (
          <div
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[90] lg:hidden"
            onClick={() => setIsCollapsed(true)}
          />
        )}
        <Layout
          className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'ml-0' : 'lg:ml-[260px] ml-0'}`}
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'radial-gradient(circle at 15% 50%, rgba(22, 119, 255, 0.03), transparent 25%), radial-gradient(circle at 85% 30%, rgba(16, 185, 129, 0.03), transparent 25%), #f8fafc',
          }}
        >
          {/* Header */}
          <Header
            style={{
              padding: '0 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              zIndex: 99,
              width: '100%',
              borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
              height: 52,
              lineHeight: 'normal',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 30px rgba(0, 0, 0, 0.01)',
            }}
          >
            {/* LEFT SIDE: AppsMenu, Logo, Toggle */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button
                type="text"
                icon={<MenuIcon className="w-4.5 h-4.5 text-slate-600" />}
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="flex items-center justify-center hover:bg-slate-100 rounded-lg p-1.5 shrink-0 lg:hidden"
                aria-label="Toggle Sidebar"
              />
              <AppsMenu />
              <Link href="/dashboard" className="hidden sm:block ml-1">
                <ABCLogo className="text-2xl sm:text-3xl flex-none" />
              </Link>
              <div className="flex flex-col justify-center ml-1 sm:ml-2 border-l border-slate-300 pl-2 sm:pl-3">
                <h1 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-1.5 m-0 leading-normal truncate">
                  Portal Nhân Sự
                  <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-sm shrink-0">
                    NV
                  </span>
                </h1>
              </div>
            </div>

            {/* RIGHT SIDE: Clock, Utilities, Location, Profile */}
            <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-3 flex-1">
              <div className="text-right hidden xl:block mr-2">
                <div className="text-slate-800 font-extrabold font-mono leading-none text-xs sm:text-sm">
                  {mounted && currentTime ? currentTime.toLocaleTimeString('vi-VN', {
                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
                  }) : '--:--:--'}
                </div>
                <div className="text-slate-400 text-[8px] sm:text-[9px] uppercase tracking-wider font-bold">
                  {mounted && currentTime ? currentTime.toLocaleDateString('vi-VN', {
                    weekday: 'short', day: '2-digit', month: '2-digit',
                  }) : '--/--'}
                </div>
              </div>
              {/* LocationSelector removed for a cleaner Portal header */}
              <UtilitiesDropdown />
              <div className="flex items-center gap-2 relative">
                <DropdownBase
                  classNameBtn=""
                  iconBtn={
                    <div className="flex items-center justify-center gap-1">
                      <Image src={IconUser.src} alt="" width={18} height={18} className="flex-none" />
                      <span className="hidden sm:inline font-medium text-slate-700">{userInfo?.username || employee?.name}</span>
                      <Image src={IconTriangleDownWhite.src} alt="" width={12} height={12} className="flex-none" />
                    </div>
                  }
                  classNameContent="w-[200px] py-3 shadow-lg rounded-md"
                >
                  <div className="grid grid-cols-12 gap-3 py-2 pl-6 justify-center items-center">
                    <div className="col-span-3">
                      <div className="font-bold text-md uppercase text-gray-800 rounded-full bg-gray-200 w-8 h-8 flex items-center justify-center">
                        {String(userInfo?.name || employee?.name || '?').charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="col-span-9">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-sm capitalize line-clamp-1">{userInfo?.name || employee?.name}</div>
                        {userInfo?.level === 1 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-400 text-yellow-900 border border-yellow-500 shadow-sm animate-pulse">VIP</span>
                        )}
                        {userInfo?.level === 2 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500 text-white border border-purple-600 shadow-sm">PRO</span>
                        )}
                      </div>
                      <div className="text-[10px] font-bold text-gray-500 italic line-clamp-1">
                        Phòng {userInfo?.department ? getCachedDepartments().find((item) => item.id === Number(userInfo.department))?.name : employee?.departmentName}
                      </div>
                    </div>
                  </div>
                  <ul className="flex flex-col">
                    <li className="py-2 pl-7 hover:bg-gray-100 flex items-center gap-3 cursor-pointer" onClick={() => logout()}>
                      <Image src={IconLogout.src} alt="" width={18} height={18} />
                      <span className="text-gray-600 font-medium text-sm">Đăng xuất</span>
                    </li>
                  </ul>
                </DropdownBase>
              </div>
            </div>
          </Header>

          {/* Page Content */}
          <Content className="p-4 sm:p-6 lg:p-8" style={{ overflowY: 'auto', flex: 1 }}>
            {children}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalUserProvider>
      <PortalLayoutInner>
        {children}
      </PortalLayoutInner>
    </PortalUserProvider>
  );
}
