'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, MapPin, Users, Network, Plus } from 'lucide-react';
import { hasPermission, getCachedRoles } from '@/app/service/permissions/permissions';
import { usePermissionLoaded } from '@/app/service/permissions/PermissionProvider';
import Unauthorized from '@/app/ui/timekeeping/components/unauthorized/Unauthorized';
import { cookieBase } from '@/app/utils/cookie';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useQuery } from '@tanstack/react-query';
import BranchTab from './components/BranchTab';
import LocationTab from './components/LocationTab';
import DeptGroupTab from './components/DeptGroupTab';
import DepartmentTab from './components/DepartmentTab';
import OrganizationWizard from './components/OrganizationWizard';
import OrganizationSidebar from './components/OrganizationSidebar';
import { User } from '@/app/data/dataUser';

export default function OrganizationPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [realUser, setRealUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('branches');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const isPermissionLoaded = usePermissionLoaded();

  useEffect(() => {
    const userObj = cookieBase.get<User>('info_user');
    setTimeout(() => {
      if (userObj) setRealUser(userObj);
      setIsLoaded(true);
    }, 0);
  }, []);

  // Permission check - Require Admin/Super Admin
  const roleId = realUser?.role ?? '';
  const roles = getCachedRoles();
  const isSuperAdmin = hasPermission(roleId, '*');
  const hasOrgAccess = isSuperAdmin || 
    hasPermission(roleId, 'timekeeping_branch_create') || hasPermission(roleId, 'timekeeping_branch_edit') || hasPermission(roleId, 'timekeeping_branch_delete') ||
    hasPermission(roleId, 'timekeeping_location_create') || hasPermission(roleId, 'timekeeping_location_edit') || hasPermission(roleId, 'timekeeping_location_delete') ||
    hasPermission(roleId, 'timekeeping_department_create') || hasPermission(roleId, 'timekeeping_department_edit') || hasPermission(roleId, 'timekeeping_department_delete');

  const canFetch = isLoaded && isPermissionLoaded && (realUser ? hasOrgAccess : true);

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await fetch('/api/branch-timekeeping');
      const data = await res.json();
      return data.data || [];
    },
    enabled: canFetch
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const res = await fetch('/api/v1/kiosk/locations');
      const data = await res.json();
      return data.data || [];
    },
    enabled: canFetch
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await fetch('/api/department-groups-timekeeping');
      const data = await res.json();
      return data.data || [];
    },
    enabled: canFetch
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await fetch('/api/departments-timekeeping');
      const data = await res.json();
      return data.data || [];
    },
    enabled: canFetch
  });

  const TABS_CONFIG = [
    { id: 'branches', label: 'Chi nhánh', icon: Building2, component: BranchTab, perm: 'timekeeping_branch_view' },
    { id: 'locations', label: 'Điểm chấm công', icon: MapPin, component: LocationTab, perm: 'timekeeping_location_view' },
    { id: 'dept_groups', label: 'Khối / Cụm', icon: Network, component: DeptGroupTab, perm: 'timekeeping_department_view' },
    { id: 'departments', label: 'Phòng ban', icon: Users, component: DepartmentTab, perm: 'timekeeping_department_view' },
  ];

  // Filter Tabs theo quyền view
  const visibleTabs = TABS_CONFIG.filter(tab => hasPermission(roleId, tab.perm));
  
  // Xử lý auto-select tab đầu tiên nếu tab hiện tại bị ẩn (do không có quyền)
  useEffect(() => {
    if (isPermissionLoaded && visibleTabs.length > 0) {
      if (!visibleTabs.find(t => t.id === activeTab)) {
        setActiveTab(visibleTabs[0].id);
      }
    }
  }, [isPermissionLoaded, visibleTabs, activeTab]);

  if (!isLoaded || !isPermissionLoaded) return null;

  if (realUser && !hasOrgAccess) {
    return <Unauthorized />;
  }

  // Thống kê hiển thị data thực tế
  const STATS = [
    { label: 'Tổng Chi nhánh', value: branches.length, icon: Building2 },
    { label: 'Điểm Chấm công', value: locations.length, icon: MapPin },
    { label: 'Khối & Cụm', value: groups.length, icon: Network },
    { label: 'Tổng Phòng ban', value: departments.length, icon: Users },
  ];

  const activeTabConfig = visibleTabs.find((t) => t.id === activeTab);
  const ActiveComponent = activeTabConfig?.component;

  const quickAddItems: MenuProps['items'] = [
    ...(hasPermission(roleId, 'timekeeping_organization_wizard') ? [{ key: 'wizard', label: 'Khởi tạo liên hoàn (Wizard)', icon: <Building2 className="w-4 h-4 text-orange-500" /> }, { type: 'divider' }] as any[] : []),
    ...(hasPermission(roleId, 'timekeeping_branch_create') ? [{ key: 'branches', label: 'Thêm Chi nhánh', icon: <Building2 className="w-4 h-4" /> }] : []),
    ...(hasPermission(roleId, 'timekeeping_location_create') ? [{ key: 'locations', label: 'Thêm Điểm chấm công', icon: <MapPin className="w-4 h-4" /> }] : []),
    ...(hasPermission(roleId, 'timekeeping_department_create') ? [
      { key: 'dept_groups', label: 'Thêm Khối / Cụm', icon: <Network className="w-4 h-4" /> },
      { key: 'departments', label: 'Thêm Phòng ban', icon: <Users className="w-4 h-4" /> }
    ] : []),
  ];

  const handleQuickAdd: MenuProps['onClick'] = (e) => {
    if (e.key === 'wizard') {
      setIsWizardOpen(true);
      return;
    }
    setActiveTab(e.key);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('open-org-modal', { detail: e.key }));
    }, 150);
  };

  return (
    <div className="space-y-5 max-w-[2840px] mx-auto pb-10">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 m-0 tracking-tight">Sơ đồ Tổ chức</h2>
          <p className="text-sm text-slate-500 mt-1">Quản lý toàn diện cấu trúc Công ty, Chi nhánh và Phòng ban</p>
        </div>

        {/* Quick Actions */}
        <div className="hidden sm:flex gap-3 shrink-0">
          <Dropdown menu={{ items: quickAddItems, onClick: handleQuickAdd }} placement="bottomRight" trigger={['click']}>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm active:scale-95">
              <Plus className="w-4 h-4" />
              <span>Thêm nhanh</span>
            </button>
          </Dropdown>
        </div>
      </div>

      {/* COMPACT STATS WIDGETS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {STATS.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx} 
              className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200/60 shadow-sm flex items-center gap-3 transition-shadow hover:shadow-md"
            >
              <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-100 shrink-0">
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wide truncate">{stat.label}</p>
                <h3 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight">{stat.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* MAIN CONTENT & SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Main Content (Tabs) */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col h-full w-full">
          {/* MODERN TABS & CONTENT SECTION */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[500px] w-full">
            
            {/* Tab Bar */}
            <div className="border-b border-slate-100 px-4 sm:px-6 pt-3 flex items-end">
              <div className="flex flex-wrap gap-6">
                {visibleTabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        relative flex items-center gap-2 pb-3 text-sm font-medium transition-colors
                        ${isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}
                      `}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="orgActiveTabUnderline"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"
                          transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                        />
                      )}
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 sm:p-5 flex-1 bg-white">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="h-full"
                >
                  {/* CONTENT SECTION */}
                  {ActiveComponent ? <ActiveComponent /> : (
                    <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                      Bạn không có quyền xem bất kỳ mục nào trong sơ đồ tổ chức.
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 xl:col-span-3 sticky top-4">
          <OrganizationSidebar 
            branches={branches} 
            locations={locations} 
            groups={groups} 
            departments={departments} 
          />
        </div>
      </div>

      <OrganizationWizard 
        open={isWizardOpen} 
        onCancel={() => setIsWizardOpen(false)} 
        onSuccess={() => {
          setIsWizardOpen(false);
          window.location.reload();
        }} 
      />
    </div>
  );
}
