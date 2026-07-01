'use client';

import { startTransition } from 'react';

import React, { useEffect, useState, useCallback } from 'react';
import { ABCLogo } from '@/app/ui/base/abc-logo';
import { useRouter, usePathname } from 'next/navigation';
import { ConfigProvider, Layout, Badge, notification } from 'antd';
import {
  Monitor, ClipboardCheck, FileSpreadsheet, Users,
  Calendar, Sparkles, Cpu, Menu as MenuIcon, Tablet, Network, Clock, Activity, FileWarning,
  X, Receipt, Settings, ListChecks, FileText, AlarmClock, ChevronRight, ChevronDown,
  Home, LayoutDashboard
} from 'lucide-react';
import NextTopLoader from 'nextjs-toploader';
import { useTimekeepingStore } from '@/app/store/timekeeping/useTimekeepingStore';
import { cookieBase } from '@/app/utils/cookie';
import { hasPermission, getCachedRoles } from '@/app/service/permissions/permissions';
import type { User } from '@/app/data/dataUser';
import { usePermissionLoaded } from '@/app/service/permissions/PermissionProvider';
import Link from 'next/link';
import { Button } from 'antd';
import HeaderBase from '../../header/header';
import GlobalRightSidebar from '../components/sidebar/GlobalRightSidebar';

const { Content } = Layout;

const MENU_ITEMS = [
  { key: '/dashboard', icon: <Monitor className="w-4 h-4" />, label: 'Bảng điều khiển', permission: 'timekeeping_dashboard' },
  { key: '/payroll-results', icon: <Receipt className="w-4 h-4" />, label: 'Kết quả lương tháng', permission: 'timekeeping_payroll' },
  { key: '/time-records', icon: <ClipboardCheck className="w-4 h-4" />, label: 'Lịch sử chấm công', permission: 'timekeeping_records' },
  { key: '/statistics', icon: <FileSpreadsheet className="w-4 h-4" />, label: 'Công & Thống kê', permission: 'timekeeping_statistics', adminOnly: true },
  { key: '/attendance-requests', icon: <FileWarning className="w-4 h-4" />, label: 'Yêu cầu xử lý công', permission: 'timekeeping_records', adminOnly: true },
  { key: '/overtime-requests', icon: <AlarmClock className="w-4 h-4" />, label: 'Quản lý tăng ca', permission: 'timekeeping_records', adminOnly: true },
  { key: '/leaves', icon: <Calendar className="w-4 h-4" />, label: 'Yêu cầu nghỉ phép', badge: true, permission: 'timekeeping_leaves' },
  { key: '/create-leave', icon: <Calendar className="w-4 h-4" />, label: 'Tạo đơn xin nghỉ' },
  { key: '/leave-management/configs', icon: <Settings className="w-4 h-4" />, label: 'Cấu hình đơn xin nghỉ', adminOnly: true },
  { key: '/leave-management/types', icon: <ListChecks className="w-4 h-4" />, label: 'Quản lý hình thức xin nghỉ', adminOnly: true },
  { key: '/leave-management/requests', icon: <FileSpreadsheet className="w-4 h-4" />, label: 'Danh sách đơn xin nghỉ', adminOnly: true },
  { key: '/organization', icon: <Network className="w-4 h-4" />, label: 'Sơ đồ tổ chức', permission: 'timekeeping_organization', adminOnly: true },
  { key: '/online-checkin-settings', icon: <Monitor className="w-4 h-4" />, label: 'Cài đặt công làm Online', permission: 'timekeeping_online_checkin_settings', adminOnly: true },
  { key: '/members', icon: <Users className="w-4 h-4" />, label: 'Hồ sơ thành viên', permission: 'timekeeping_members', adminOnly: true },
  { key: '/contracts/templates', icon: <FileText className="w-4 h-4" />, label: 'Mẫu hợp đồng', permission: 'timekeeping_members', adminOnly: true },
  { key: '/contracts/types', icon: <FileText className="w-4 h-4" />, label: 'Loại hợp đồng', permission: 'timekeeping_members', adminOnly: true },
  { key: '/shifts', icon: <Clock className="w-4 h-4" />, label: 'Ca làm việc', permission: 'timekeeping_shifts', adminOnly: true },
  { key: '/ai-advisor', icon: <Sparkles className="w-4 h-4" />, label: 'Tính năng AI Chấm công', permission: 'timekeeping_ai_advisor' },
  { key: '/hardware-integration', icon: <Cpu className="w-4 h-4" />, label: 'Tích hợp Máy vân tay', permission: 'timekeeping_hardware', adminOnly: true },
  { key: '/kiosk-devices', icon: <Tablet className="w-4 h-4" />, label: 'Thiết bị Chấm công Chấm Công', permission: 'timekeeping_kiosk_devices', adminOnly: true },
  { key: '/zkteco-devices', icon: <Tablet className="w-4 h-4" />, label: 'Quản lý máy ZKTeco', permission: 'timekeeping_kiosk_devices', adminOnly: true },
  { key: '/zkteco-panel', icon: <Cpu className="w-4 h-4" />, label: 'Cổng Connector ZKTeco', permission: 'timekeeping_kiosk_devices', adminOnly: true },
  { key: '/zkteco-devices/employee-sync', icon: <Users className="w-4 h-4" />, label: 'Đồng bộ Connector ZKTeco', permission: 'timekeeping_kiosk_devices', adminOnly: true },
  { key: '/simulator', icon: <Activity className="w-4 h-4" />, label: 'Giả lập chấm công', permission: 'timekeeping_simulator', adminOnly: true },
  { key: '/simulator-online', icon: <Activity className="w-4 h-4" />, label: 'Giả lập công Online', permission: 'timekeeping_simulator_online', adminOnly: true },
  { key: '/leave-simulator', icon: <Activity className="w-4 h-4" />, label: 'Giả lập nghỉ phép', permission: 'timekeeping_leave_simulator', adminOnly: true },
  { key: '/kiosk', icon: <Tablet className="w-4 h-4" />, label: 'Máy chấm công Kiosk', permission: 'timekeeping_kiosk' },
  { key: '/portal', icon: <Users className="w-4 h-4" />, label: 'Cổng thông tin nhân viên', permission: 'timekeeping_portal' },
  { key: '/contract-templates', icon: <FileSpreadsheet className="w-4 h-4" />, label: 'Mẫu hợp đồng', permission: 'timekeeping_contracts', adminOnly: true },
  { key: '/contracts', icon: <ClipboardCheck className="w-4 h-4" />, label: 'Hợp đồng nhân sự', permission: 'timekeeping_contracts', adminOnly: true },
];

// ─── Mobile Drawer Menu ───────────────────────────────────────────────────────
interface DrawerMenuGroup {
  label: string;
  icon: React.ReactNode;
  href?: string;
  target?: string;
  badge?: number;
  children?: { href: string; label: string; icon: React.ReactNode; badge?: number }[];
}

function MobileDrawer({
  open,
  onClose,
  groups,
  pathname,
  pendingTotal,
}: {
  open: boolean;
  onClose: () => void;
  groups: DrawerMenuGroup[];
  pathname: string;
  pendingTotal: number;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggle = useCallback((key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  // Auto-expand active group
  useEffect(() => {
    groups.forEach(g => {
      if (g.children?.some(c => pathname.startsWith(c.href))) {
        setExpandedGroups(prev => new Set([...prev, g.label]));
      }
    });
  }, [pathname, groups]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-998 transition-all duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-999 flex flex-col transition-transform duration-300 ease-out`}
        style={{
          width: '290px',
          background: 'linear-gradient(180deg, #1e3a8a 0%, #1d4ed8 40%, #2563eb 100%)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: open ? '4px 0 32px rgba(0,0,0,0.25)' : 'none',
        }}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/15 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Monitor className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">Chấm công</p>
              <p className="text-blue-200 text-[10px] font-medium mt-0.5">Timekeeping HQ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-all active:scale-90 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5" style={{ scrollbarWidth: 'none' }}>
          {groups.map((group) => {
            const isExpanded = expandedGroups.has(group.label);
            const isGroupActive = group.href
              ? pathname === group.href || pathname.startsWith(group.href + '/')
              : group.children?.some(c => pathname.startsWith(c.href));

            if (group.href) {
              return (
                <Link
                  key={group.href}
                  href={group.href}
                  target={group.target}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 relative group ${
                    isGroupActive
                      ? 'bg-white text-blue-700 shadow-md'
                      : 'text-white/85 hover:bg-white/12 hover:text-white'
                  }`}
                >
                  <span className={`shrink-0 ${isGroupActive ? 'text-blue-600' : 'text-white/70'}`}>
                    {group.icon}
                  </span>
                  <span className="text-sm font-medium flex-1">{group.label}</span>
                  {group.badge !== undefined && group.badge > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {group.badge > 99 ? '99+' : group.badge}
                    </span>
                  )}
                </Link>
              );
            }

            return (
              <div key={group.label}>
                <button
                  onClick={() => toggle(group.label)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                    isGroupActive && !isExpanded ? 'bg-white/15 text-white' : 'text-white/85 hover:bg-white/12 hover:text-white'
                  }`}
                >
                  <span className="shrink-0 text-white/70">{group.icon}</span>
                  <span className="text-sm font-medium flex-1 text-left">{group.label}</span>
                  {group.badge !== undefined && group.badge > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center mr-1">
                      {group.badge > 99 ? '99+' : group.badge}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-white/50 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Sub items */}
                <div
                  className="overflow-hidden transition-all duration-250 ease-out"
                  style={{ maxHeight: isExpanded ? `${(group.children?.length ?? 0) * 52}px` : '0px' }}
                >
                  <div className="ml-4 mt-0.5 mb-1 border-l-2 border-white/20 pl-3 space-y-0.5">
                    {group.children?.map(child => {
                      const isActive = pathname.startsWith(child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                            isActive
                              ? 'bg-white text-blue-700 shadow-sm font-semibold'
                              : 'text-white/75 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span className={`shrink-0 ${isActive ? 'text-blue-600' : 'text-white/60'}`}>{child.icon}</span>
                          <span className="text-xs font-medium flex-1 truncate">{child.label}</span>
                          {child.badge !== undefined && child.badge > 0 && (
                            <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                              {child.badge > 99 ? '99+' : child.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Drawer Footer */}
        <div className="px-4 py-3 border-t border-white/15 shrink-0">
          <p className="text-blue-200/60 text-[10px] font-medium text-center">Chấm công Timekeeping HQ</p>
        </div>
      </div>
    </>
  );
}

// ─── Bottom Tab Bar (Mobile) ──────────────────────────────────────────────────
function BottomTabBar({
  pathname,
  pendingLeavesCount,
  pendingOvertimeCount,
  onMenuOpen,
}: {
  pathname: string;
  pendingLeavesCount: number;
  pendingOvertimeCount: number;
  onMenuOpen: () => void;
}) {
  const tabs = [
    { href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Tổng quan' },
    { href: '/time-records', icon: <ClipboardCheck className="w-5 h-5" />, label: 'Chấm công' },
    {
      href: '/leaves',
      icon: <Calendar className="w-5 h-5" />,
      label: 'Nghỉ phép',
      badge: pendingLeavesCount,
    },
    { href: '/members', icon: <Users className="w-5 h-5" />, label: 'Nhân viên' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-500 lg:hidden"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid rgba(226,232,240,0.8)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-stretch h-[60px]">
        {tabs.map(tab => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-all duration-200 active:scale-95"
            >
              <span className={`relative transition-all duration-200 ${isActive ? 'text-blue-600 scale-110' : 'text-slate-400'}`}>
                {tab.icon}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </span>
              <span className={`text-[10px] font-semibold transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
              )}
            </Link>
          );
        })}

        {/* Menu button */}
        <button
          onClick={onMenuOpen}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:text-slate-600 transition-colors active:scale-95"
        >
          <MenuIcon className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Menu</span>
        </button>
      </div>
    </nav>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────
export default function TimekeepingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [realUser, setRealUser] = useState<User | null>(null);

  const notifiedLeaveCountRef = React.useRef<number | null>(null);
  const notifiedOvertimeCountRef = React.useRef<number | null>(null);
  const [api, contextHolder] = notification.useNotification();

  const {
    employees, activeEmployeeId, isLoading, pendingLeavesCount, pendingOvertimeCount,
    refreshState, refreshPendingLeavesCount, refreshPendingOvertimeCount,
  } = useTimekeepingStore();

  const isPermissionLoaded = usePermissionLoaded();

  const [mounted, setMounted] = useState(false);
  const isPageLoading = !mounted || isLoading || !isPermissionLoaded;
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

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

  // Close drawer on route change
  useEffect(() => {
    startTransition(() => {
      setDrawerOpen(false);
    });
  }, [pathname]);

  const userInfo = cookieBase.get<User>('info_user');
  let userRoleVal: unknown = userInfo?.role;
  if (typeof userRoleVal === 'string' && userRoleVal.startsWith('{')) {
    try { userRoleVal = JSON.parse(userRoleVal); } catch (e) { }
  }
  const roleId = ((userRoleVal !== undefined && userRoleVal !== null)
    ? (typeof userRoleVal === 'object'
      ? ((userRoleVal as Record<string, unknown>).id || (userRoleVal as Record<string, unknown>)._id)
      : userRoleVal)
    : -1) as string | number;

  useEffect(() => {
    const stored = localStorage.getItem('realUser');
    if (stored) {
      setTimeout(() => setRealUser(JSON.parse(stored)), 0);
    }
  }, []);

  const roles = getCachedRoles();
  const userRole = roles.find(r => String(r.id) === String(roleId));
  const isSuperAdmin = hasPermission(roleId, '*');
  const isHRorManager = isSuperAdmin || hasPermission(roleId, 'hr');
  const showAdminFeatures = isSuperAdmin || isHRorManager;
  const canSeeLeaveRequests = isSuperAdmin || isHRorManager || hasPermission(roleId, 'timekeeping_leaves');

  const hasPerm = React.useCallback((perm?: string) => {
    if (isSuperAdmin) return true;
    if (perm) return hasPermission(roleId, perm);
    return true;
  }, [isSuperAdmin, roleId]);

  useEffect(() => {
    const fetchCounts = async () => {
      if (!mounted || !canSeeLeaveRequests) return;
      await Promise.all([
        refreshPendingLeavesCount(),
        refreshPendingOvertimeCount()
      ]);
    };
    void fetchCounts();
  }, [mounted, canSeeLeaveRequests, refreshPendingLeavesCount, refreshPendingOvertimeCount]);

  useEffect(() => {
    if (!mounted || !canSeeLeaveRequests) return;
    if (pendingLeavesCount > 0 && notifiedLeaveCountRef.current !== pendingLeavesCount) {
      const timer = setTimeout(() => {
        api.info({
          title: 'Có yêu cầu nghỉ phép mới',
          description: `Bạn có ${pendingLeavesCount} yêu cầu nghỉ phép đang chờ duyệt.`,
          placement: 'bottomRight',
          icon: <Calendar className="w-4 h-4 text-blue-500" />,
          onClick: () => router.push('/leaves'),
          style: { cursor: 'pointer' },
        });
      }, 500);
      notifiedLeaveCountRef.current = pendingLeavesCount;
      return () => clearTimeout(timer);
    }
  }, [pendingLeavesCount, canSeeLeaveRequests, api, mounted]);

  useEffect(() => {
    if (!mounted || !canSeeLeaveRequests) return;
    if (pendingOvertimeCount > 0 && notifiedOvertimeCountRef.current !== pendingOvertimeCount) {
      const timer = setTimeout(() => {
        api.info({
          title: 'Có yêu cầu tăng ca mới',
          description: `Bạn có ${pendingOvertimeCount} đơn xin tăng ca đang chờ duyệt.`,
          placement: 'bottomRight',
          icon: <AlarmClock className="w-4 h-4 text-violet-500" />,
          onClick: () => router.push('/overtime-requests'),
          style: { cursor: 'pointer' },
        });
      }, 800);
      notifiedOvertimeCountRef.current = pendingOvertimeCount;
      return () => clearTimeout(timer);
    }
  }, [pendingOvertimeCount, canSeeLeaveRequests, api, mounted]);

  const canAccessRoute = React.useCallback((routeKey: string) => {
    if (routeKey.startsWith('/portal') || routeKey.startsWith('/kiosk')) return true;
    const routeConfig = MENU_ITEMS.find(m => m.key !== '/' && routeKey.startsWith(m.key));
    if (!routeConfig) return true;
    if (routeConfig.adminOnly && !showAdminFeatures) return false;
    return hasPerm(routeConfig.permission);
  }, [showAdminFeatures, hasPerm]);

  // ── Build menu groups for header + drawer ─────────────────────────────────
  const menuGroups: DrawerMenuGroup[] = [
    {
      label: 'Tổng quan',
      icon: <Monitor className="w-4 h-4" />,
      href: '/dashboard',
    },
    {
      label: 'Nhân sự',
      icon: <Users className="w-4 h-4" />,
      children: [
        { href: '/organization', label: 'Sơ đồ tổ chức', icon: <Network className="w-4 h-4" /> },
        { href: '/members', label: 'Hồ sơ thành viên', icon: <Users className="w-4 h-4" /> },
      ].filter(item => {
        const found = MENU_ITEMS.find(m => m.key === item.href);
        if (!found) return false;
        if (found.adminOnly && !showAdminFeatures) return false;
        return hasPerm(found.permission);
      })
    },
    {
      label: 'Quản lý hợp đồng',
      icon: <FileText className="w-4 h-4" />,
      children: [
        { href: '/contracts/templates', label: 'Mẫu hợp đồng', icon: <FileText className="w-4 h-4" /> },
        { href: '/contracts/types', label: 'Loại hợp đồng', icon: <FileText className="w-4 h-4" /> },
      ].filter(item => {
        const found = MENU_ITEMS.find(m => m.key === item.href);
        if (!found) return false;
        if (found.adminOnly && !showAdminFeatures) return false;
        return hasPerm(found.permission);
      })
    },
    {
      label: 'Cài đặt Ca & Online',
      icon: <Clock className="w-4 h-4" />,
      children: [
        { href: '/shifts', label: 'Ca làm việc', icon: <Clock className="w-4 h-4" /> },
        { href: '/online-checkin-settings', label: 'Cài đặt chấm công Online', icon: <Activity className="w-4 h-4" /> },
      ].filter(item => {
        const found = MENU_ITEMS.find(m => m.key === item.href);
        if (!found) return false;
        if (found.adminOnly && !showAdminFeatures) return false;
        return hasPerm(found.permission);
      })
    },
    {
      label: 'Chấm công',
      icon: <ClipboardCheck className="w-4 h-4" />,
      badge: (pendingLeavesCount + pendingOvertimeCount) > 0 ? (pendingLeavesCount + pendingOvertimeCount) : undefined,
      children: [
        { href: '/time-records', label: 'Lịch sử chấm công', icon: <ClipboardCheck className="w-4 h-4" /> },
        { href: '/statistics', label: 'Công & Thống kê', icon: <FileSpreadsheet className="w-4 h-4" /> },
        { href: '/attendance-requests', label: 'Yêu cầu xử lý công', icon: <FileWarning className="w-4 h-4" /> },
        { href: '/overtime-requests', label: 'Quản lý tăng ca', icon: <AlarmClock className="w-4 h-4" />, badge: pendingOvertimeCount > 0 ? pendingOvertimeCount : undefined },
        { href: '/leaves', label: 'Yêu cầu nghỉ phép', icon: <Calendar className="w-4 h-4" />, badge: pendingLeavesCount > 0 ? pendingLeavesCount : undefined },
        { href: '/create-leave', label: 'Tạo đơn xin nghỉ', icon: <Calendar className="w-4 h-4" /> },
      ].filter(item => {
        const found = MENU_ITEMS.find(m => m.key === item.href);
        if (!found) return false;
        if (found.adminOnly && !showAdminFeatures) return false;
        return hasPerm(found.permission);
      })
    },
    {
      label: 'Quản lý xin nghỉ',
      icon: <Settings className="w-4 h-4" />,
      children: [
        { href: '/leave-management/requests', label: 'Danh sách đơn xin nghỉ', icon: <FileSpreadsheet className="w-4 h-4" /> },
        { href: '/leave-management/configs', label: 'Cấu hình đơn xin nghỉ', icon: <Settings className="w-4 h-4" /> },
        { href: '/leave-management/types', label: 'Hình thức xin nghỉ', icon: <ListChecks className="w-4 h-4" /> },
      ].filter(item => {
        const found = MENU_ITEMS.find(m => m.key === item.href);
        if (!found) return false;
        if (found.adminOnly && !showAdminFeatures) return false;
        return hasPerm(found.permission);
      })
    },
    ...(hasPerm('timekeeping_portal') ? [{
      label: 'Cổng nhân viên',
      icon: <Users className="w-4 h-4" />,
      href: '/portal',
      target: '_blank',
    }] : []),
    ...(hasPerm('timekeeping_kiosk') ? [{
      label: 'Máy chấm công Kiosk',
      icon: <Tablet className="w-4 h-4" />,
      href: '/kiosk',
      target: '_blank',
    }] : []),
    {
      label: 'Thiết bị & Nâng cao',
      icon: <Cpu className="w-4 h-4" />,
      children: [
        { href: '/hardware-integration', label: 'Tích hợp Máy vân tay', icon: <Cpu className="w-4 h-4" /> },
        { href: '/kiosk-devices', label: 'Thiết bị Chấm công Chấm Công', icon: <Tablet className="w-4 h-4" /> },
        { href: '/zkteco-devices', label: 'Quản lý máy ZKTeco', icon: <Tablet className="w-4 h-4" /> },
        { href: '/zkteco-panel', label: 'Cổng Connector ZKTeco', icon: <Cpu className="w-4 h-4" /> },
        { href: '/zkteco-devices/employee-sync', label: 'Đồng bộ Connector ZKTeco', icon: <Users className="w-4 h-4" /> },
      ].filter(item => {
        const found = MENU_ITEMS.find(m => m.key === item.href);
        if (!found) return false;
        if (found.adminOnly && !showAdminFeatures) return false;
        return hasPerm(found.permission);
      })
    }
  ].filter(group => group.href || (group.children && group.children.length > 0));

  // Legacy format for HeaderBase
  const menuItems = menuGroups.map(g => ({
    label: g.label,
    icon: g.icon,
    href: g.href,
    target: g.target,
    badge: g.badge,
    children: g.children,
  }));

  const canRenderRoute = mounted && canAccessRoute(pathname);
  const pendingTotal = pendingLeavesCount + pendingOvertimeCount;

  // ── Loading Screen ────────────────────────────────────────────────────────
  if (isPageLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center z-9999"
        style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 50%, #f0fdf4 100%)' }}>
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(59,130,246,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(16,185,129,0.06) 0%, transparent 60%)'
        }} />
        <div className="relative flex flex-col items-center gap-6">
          {/* Logo with glow */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-2xl bg-blue-500/10 blur-2xl animate-pulse" />
            <ABCLogo className="text-5xl relative z-10" />
          </div>

          {/* Spinner */}
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-[3px] border-blue-100" />
            <div className="absolute inset-0 rounded-full border-[3px] border-t-blue-600 border-r-blue-400 animate-spin" />
          </div>

          <div className="text-center">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.15em] font-mono">
              Chấm công Timekeeping
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Đang khởi động phiên bảo mật...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#2563eb',
          borderRadius: 8,
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          colorBgContainer: '#ffffff',
          colorBgLayout: '#f8fafc',
        },
        components: {
          Layout: { headerBg: 'transparent', bodyBg: '#f8fafc', siderBg: '#ffffff' },
          Menu: {
            itemBg: 'transparent',
            itemSelectedBg: '#eff6ff',
            itemSelectedColor: '#2563eb',
            itemHoverBg: '#f8fafc',
            itemBorderRadius: 8,
          },
        },
      }}
    >
      <NextTopLoader
        color="#2563eb"
        initialPosition={0.08}
        crawlSpeed={200}
        height={2}
        crawl={true}
        showSpinner={false}
        easing="ease"
        speed={200}
        shadow="0 0 8px #2563eb80"
        zIndex={1600}
      />
      {contextHolder}

      {/* Mobile Drawer */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        groups={menuGroups}
        pathname={pathname}
        pendingTotal={pendingTotal}
      />

      <Layout style={{ minHeight: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
        <HeaderBase menuItems={menuItems} onMobileMenuToggle={() => setDrawerOpen(p => !p)} />

        <Content
          className="flex-1 bg-transparent p-0 m-0"
          style={{
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Main scrollable area */}
          <div
            className="flex-1 overflow-auto overflow-x-hidden relative scroll-smooth"
            style={{
              padding: 'clamp(12px, 3vw, 24px)',
              paddingBottom: 'calc(clamp(12px, 3vw, 24px) + 76px)', // bottom nav space on mobile
            }}
          >
            <main className="mx-auto max-w-[2840px] h-full">
              {canRenderRoute ? children : (
                <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
                  <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 shadow-sm">
                    <FileWarning className="w-10 h-10 text-slate-300" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-700">Chưa có quyền truy cập</h2>
                  <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                    Tài khoản của bạn chưa được cấp quyền xem trang này. Vui lòng liên hệ Admin.
                  </p>
                  <Link href="/portal">
                    <Button type="primary" className="mt-6 h-10 px-6 font-semibold rounded-xl">
                      Quay lại Cổng thông tin
                    </Button>
                  </Link>
                </div>
              )}
            </main>
          </div>
        </Content>
      </Layout>

      {/* Bottom Tab Bar — Mobile only */}
      <BottomTabBar
        pathname={pathname}
        pendingLeavesCount={pendingLeavesCount}
        pendingOvertimeCount={pendingOvertimeCount}
        onMenuOpen={() => setDrawerOpen(true)}
      />

      <GlobalRightSidebar />
    </ConfigProvider>
  );
}
