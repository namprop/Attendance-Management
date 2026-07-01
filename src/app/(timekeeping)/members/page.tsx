'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Row, Col, Table, Tag, Button, Modal, Drawer, DatePicker, Form, Input, Select, message, Popconfirm, Space, Divider, Tabs, Upload, Spin, Dropdown, Popover, Checkbox, QRCode } from 'antd';
import type { MenuProps, TableColumnsType } from 'antd';
import { startRegistration } from '@simplewebauthn/browser';
import { Play, Plus, ScanFace, Camera, Check, Users, LayoutGrid, List, Pencil, Trash2, Eye, Calendar, CreditCard, MapPin, Mail, Phone, QrCode, ShieldCheck, Building2, Fingerprint, Shield, Activity, FileText, FilePlus2, Globe2, Heart, Palette, Coffee, Sparkles, UserCheck, UserPlus, FileEdit, Contact, ShieldAlert, MoreHorizontal, Settings2, Filter, Search, ChevronsRight, Printer, Minimize, Maximize, Monitor } from 'lucide-react';

import { cookieBase } from '@/app/utils/cookie';
import { useRightSidebarStore } from '@/app/store/rightSidebarStore';
import { EmployeeFilterSidebar, FilterState } from './components/EmployeeFilterSidebar';
import { hasPermission, getCachedRoles } from '@/app/service/permissions/permissions';
import Unauthorized from '@/app/ui/timekeeping/components/unauthorized/Unauthorized';
import type { User } from '@/app/data/dataUser';
import dayjs from 'dayjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const EmployeeFormDrawerDynamic = dynamic(() => import('./components/EmployeeFormDrawer').then(mod => mod.EmployeeFormDrawer), { ssr: false });
const EmployeeDetailDrawerDynamic = dynamic(() => import('./components/EmployeeDetailDrawer').then(mod => mod.EmployeeDetailDrawer), { ssr: false });
const FaceIdEnrollModal = dynamic(() => import('./components/FaceIdEnrollModal').then((mod) => mod.FaceIdEnrollModal), { ssr: false });
const QuickCreateModalsDynamic = dynamic(() => import('./components/QuickCreateModals').then(mod => mod.QuickCreateModals), { ssr: false });
const WebAuthnModalDynamic = dynamic(() => import('./components/WebAuthnModal').then(mod => mod.WebAuthnModal), { ssr: false });
const QrEmployeeCardModalDynamic = dynamic(() => import('@/app/(portal)/components/QrEmployeeCard').then(mod => mod.QrEmployeeCardModal), { ssr: false });
const ZktecoSyncModalDynamic = dynamic(() => import('./components/ZktecoSyncModal').then(mod => mod.ZktecoSyncModal), { ssr: false });
import { QRScannerModal } from './components/QRScannerModal';
import { ContractA4Preview, ContractTemplate } from './components/ContractA4Preview';
import { 
  Employee, LocationItem, BranchItem, DeptGroupItem, 
  DepartmentItem, IDuplicateDetails, WebAuthnCredentialItem, AuthUser 
} from './types';
import { useTablePreferenceStore } from '@/app/store/timekeeping/useTablePreferenceStore';

const AVATAR_OPTIONS = [
  { value: 'User', label: 'Mặc định (User)' },
  { value: 'Zap', label: 'Năng động (Zap)' },
  { value: 'Heart', label: 'Dịu dàng (Heart)' },
  { value: 'Palette', label: 'Sáng tạo (Palette)' },
  { value: 'Coffee', label: 'Phong cách (Coffee)' },
  { value: 'Sparkles', label: 'Công nghệ (Sparkles)' },
];

const FACE_GUIDES = [
  "Nhìn thẳng tự nhiên (Bắt buộc)",
  "Quay đầu sang TRÁI (Bắt buộc)",
  "Quay đầu sang PHẢI (Bắt buộc)",
  "Ngước đầu lên TRÊN (Bắt buộc)",
  "Cúi đầu xuống DƯỚI (Bắt buộc)",
  "Góc tự do (Không bắt buộc)",
  "Góc tự do (Không bắt buộc)",
  "Góc tự do (Không bắt buộc)",
  "Góc tự do (Không bắt buộc)",
  "Góc tự do (Không bắt buộc)"
];

const FACE_SLOT_LABELS = [
  "1. Mặt Chính (Thẳng) *",
  "2. Quay Trái *",
  "3. Quay Phải *",
  "4. Ngước Lên *",
  "5. Cúi Xuống *",
  "6. Tự Do",
  "7. Tự Do",
  "8. Tự Do",
  "9. Tự Do",
  "10. Tự Do"
];

const removeVietnameseTones = (str: string): string => {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|á|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "a");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "e");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "i");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "o");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "u");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "y");
  str = str.replace(/Đ/g, "d");
  str = str.replace(/\u0300|\u0301|\u0309|\u0303|\u0309/g, "");
  str = str.replace(/\u02C6|\u0306|\u031B/g, "");
  return str.toLowerCase();
};

const renderAvatarPreview = (avatarName?: string | null) => {
  if (avatarName && (avatarName.startsWith('data:image') || avatarName.startsWith('http'))) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarName} alt="Avatar" crossOrigin="anonymous" className="w-full h-full object-cover" />
      </div>
    );
  }

  switch (avatarName) {
    case 'Zap':
      return (
        <div className="w-full h-full bg-amber-50 flex items-center justify-center">
          <Plus className="absolute top-2 right-2 w-3.5 h-3.5 text-amber-400" />
          <Users className="w-16 h-16 text-amber-500 animate-pulse" />
        </div>
      );
    case 'Heart':
      return (
        <div className="w-full h-full bg-rose-50 flex items-center justify-center">
          <Plus className="absolute top-2 right-2 w-3.5 h-3.5 text-rose-400" />
          <Users className="w-16 h-16 text-rose-500" />
        </div>
      );
    case 'Palette':
      return (
        <div className="w-full h-full bg-purple-50 flex items-center justify-center">
          <Plus className="absolute top-2 right-2 w-3.5 h-3.5 text-purple-400" />
          <Users className="w-16 h-16 text-purple-500" />
        </div>
      );
    case 'Coffee':
      return (
        <div className="w-full h-full bg-orange-50/70 flex items-center justify-center">
          <Plus className="absolute top-2 right-2 w-3.5 h-3.5 text-amber-600" />
          <Users className="w-16 h-16 text-amber-700" />
        </div>
      );
    case 'Sparkles':
      return (
        <div className="w-full h-full bg-cyan-50 flex items-center justify-center">
          <Plus className="absolute top-2 right-2 w-3.5 h-3.5 text-cyan-400" />
          <Users className="w-16 h-16 text-cyan-500" />
        </div>
      );
    default:
      return (
        <div className="w-full h-full bg-slate-50 flex items-center justify-center">
          <Users className="w-16 h-16 text-slate-400" />
        </div>
      );
  }
};

export default function MembersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const ALL_OPTIONAL_COLUMNS = [
    { label: 'Số ĐT', value: 'phone' },
    { label: 'Giới tính', value: 'gender' },
    { label: 'Phòng ban', value: 'department' },
    { label: 'Chức vụ', value: 'role' },
    { label: 'Loại nhân sự', value: 'employeeType' },
    { label: 'Loại hợp đồng', value: 'contractTypeId' },
    { label: 'CCCD/CMND', value: 'identityCard' },
    { label: 'Ngày sinh', value: 'dateOfBirth' },
    { label: 'Ngày vào làm', value: 'joinDate' },
    { label: 'Cơ sở', value: 'locationName' },
    { label: 'STK Ngân hàng', value: 'bankAccount' },
    { label: 'Địa chỉ', value: 'address' },
    { label: 'Quê quán', value: 'nativePlace' },
    { label: 'Dân tộc', value: 'ethnicity' },
    { label: 'Quốc tịch', value: 'nationality' },
    { label: 'ID Chấm công', value: 'enrollNumber' },
    { label: 'Mã thẻ từ', value: 'cardNo' },
    { label: 'Trạng thái', value: 'status' },
    { label: 'FaceID', value: 'faceEnrolled' }
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(ALL_OPTIONAL_COLUMNS.map(c => c.value));
  useEffect(() => {
    try {
      const saved = localStorage.getItem('timekeeping_columns');
      if (saved) {
        Promise.resolve().then(() => setVisibleColumns(JSON.parse(saved)));
      }
    } catch(e) {}
  }, []);

  const handleColumnChange = (checkedValues: string[]) => {
    setVisibleColumns(checkedValues);
    localStorage.setItem('timekeeping_columns', JSON.stringify(checkedValues));
  };

  const [page, setPage] = useState(1);
  const { memberPageSize, setMemberPageSize, isMemberSidebarOpen, setIsMemberSidebarOpen, memberFilters, setMemberFilters, memberViewMode, setMemberViewMode } = useTablePreferenceStore();
  const [filterSearch, setFilterSearch] = useState('');

  // Queries using TanStack React Query
  const [debouncedSearch, setDebouncedSearch] = useState(filterSearch);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(filterSearch);
      setPage(1); // reset to page 1 on search
    }, 500);
    return () => clearTimeout(handler);
  }, [filterSearch]);

  const { data: employeesResponse, isLoading: isEmployeesLoading } = useQuery({
    queryKey: ['employees', page, memberPageSize, debouncedSearch, memberFilters],
    staleTime: 60000, // 1 minute
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: memberPageSize.toString(),
      });
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (memberFilters.branch) params.append('branchId', memberFilters.branch);
      if (memberFilters.location) params.append('locationId', memberFilters.location);
      if (memberFilters.deptGroup) params.append('deptGroupId', memberFilters.deptGroup);
      if (memberFilters.department) params.append('departmentId', memberFilters.department);
      if (memberFilters.status) params.append('status', memberFilters.status);
      if (memberFilters.employeeType) params.append('employeeType', memberFilters.employeeType);
      if (memberFilters.gender) params.append('gender', memberFilters.gender);
      if (memberFilters.face) params.append('faceStatus', memberFilters.face);

      const res = await fetch(`/api/v1/employees?${params.toString()}`);
      return await res.json();
    }
  });

  const employees: Employee[] = employeesResponse?.data || [];
  const totalEmployees: number = employeesResponse?.total || 0;

  const { data: locations = [], isLoading: isLocationsLoading } = useQuery<LocationItem[]>({
    queryKey: ['locations'],
    staleTime: 300000, // 5 minutes
    queryFn: async () => {
      const res = await fetch('/api/v1/kiosk/locations');
      const data = await res.json();
      return data.data || [];
    }
  });

  const { data: branches = [], isLoading: isBranchesLoading } = useQuery<BranchItem[]>({
    queryKey: ['branches'],
    staleTime: 300000, // 5 minutes
    queryFn: async () => {
      const res = await fetch('/api/branch-timekeeping');
      const data = await res.json();
      return data.data || [];
    }
  });

  const { data: groups = [], isLoading: isGroupsLoading } = useQuery<DeptGroupItem[]>({
    queryKey: ['groups'],
    staleTime: 300000,
    queryFn: async () => {
      const res = await fetch('/api/department-groups-timekeeping');
      const data = await res.json();
      return data.data || [];
    }
  });

  const { data: departments = [], isLoading: isDepartmentsLoading } = useQuery<DepartmentItem[]>({
    queryKey: ['departments'],
    staleTime: 300000,
    queryFn: async () => {
      const res = await fetch('/api/departments-timekeeping');
      const data = await res.json();
      return data.data || [];
    }
  });


  const { data: contractTypes = [], isLoading: isContractTypesLoading } = useQuery({
    queryKey: ['contractTypes'],
    staleTime: 300000,
    queryFn: async () => {
      const res = await fetch('/api/contract-types');
      const data = await res.json();
      return data.data || [];
    }
  });

  const { data: contractTemplates = [], isLoading: isContractTemplatesLoading } = useQuery({
    queryKey: ['contractTemplates'],
    staleTime: 300000,
    queryFn: async () => {
      const res = await fetch('/api/contract-templates?active=true');
      const data = await res.json();
      return data.data || [];
    }
  });

  const [isActionLoading, setIsActionLoading] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [webAuthnLoading, setWebAuthnLoading] = useState(false);

  // QR Scanner & Card
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrCardEmpId, setQrCardEmpId] = useState<string | null>(null);
  const qrCardEmp = employees.find(e => e.id === qrCardEmpId || e._id === qrCardEmpId) || null;



  // WebAuthn credential management modal
  const [isWebAuthnModalDynamicOpen, setIsWebAuthnModalDynamicOpen] = useState(false);
  const [webAuthnCredentials, setWebAuthnCredentials] = useState<WebAuthnCredentialItem[]>([]);
  const [isFetchingCredentials, setIsFetchingCredentials] = useState(false);
  const [webAuthnTargetEmpId, setWebAuthnTargetEmpId] = useState<string | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [realUser, setRealUser] = useState<User | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add Employee Form
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();

  const { data: authUsers = [], isLoading: isAuthUsersLoading } = useQuery({
    queryKey: ['authUsers'],
    staleTime: 60000,
    enabled: isAddingEmployee || !!editingEmployee, // Lười tải: Chỉ gọi API khi mở form
    queryFn: async () => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'read', limit: 1000 })
      });
      const data = await res.json();
      return Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
    }
  });

  const isLoading = isEmployeesLoading || isLocationsLoading || isBranchesLoading || isGroupsLoading || isDepartmentsLoading || isAuthUsersLoading || isActionLoading;

  // Detail Employee Drawer
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const selectedEmp = employees.find(e => e.id === selectedEmpId) || null;

  const handleOpenDetail = (emp: Employee) => {
    setSelectedEmpId(emp.id);
    setIsDetailOpen(true);
  };

  const modalBranchIdWatch = Form.useWatch('branchId', form);
  const modalLocationIdWatch = Form.useWatch('locationId', form);
  const modalGroupIdWatch = Form.useWatch('deptGroupId', form);
  const modalDepartmentIdWatch = Form.useWatch('departmentId', form);
  const formAvatarWatch = Form.useWatch('avatar', form);

  // Quick Create Org States
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);

  const [branchForm] = Form.useForm();
  const [locationForm] = Form.useForm();
  const [groupForm] = Form.useForm();
  const [deptForm] = Form.useForm();

  // FaceID Enrollment Modal
  const [isEnrollingFace, setIsEnrollingFace] = useState(false);
  const [faceEnrollStep, setFaceEnrollStep] = useState(1);
  const [faceEnrollTargetEmpId, setFaceEnrollTargetEmpId] = useState('');
  const targetEmp = employees.find(e => e.id === faceEnrollTargetEmpId);

  // Print Contract
  const [isPrintContractOpen, setIsPrintContractOpen] = useState(false);
  const [printContractEmp, setPrintContractEmp] = useState<Employee | null>(null);
  const [printContractTemplate, setPrintContractTemplate] = useState<ContractTemplate | null>(null);
  const [isFullscreenContract, setIsFullscreenContract] = useState(false);

  // Create Contract
  const [isCreateContractOpen, setIsCreateContractOpen] = useState(false);
  const [createContractEmp, setCreateContractEmp] = useState<Employee | null>(null);

  // Supplementary Contract (phụ lục hợp đồng)
  const [isSupplementaryContractOpen, setIsSupplementaryContractOpen] = useState(false);
  const [supplementaryContractEmp, setSupplementaryContractEmp] = useState<Employee | null>(null);

  // Sync ZKTeco
  const [isZktecoSyncOpen, setIsZktecoSyncOpen] = useState(false);
  const [syncEmpTarget, setSyncEmpTarget] = useState<Employee | null>(null);


  const { openSidebar } = useRightSidebarStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const userObj = cookieBase.get<User>('info_user');
    setTimeout(() => {
      if (userObj) {
        setRealUser(userObj);
      }
      setIsLoaded(true);
    }, 0);
  }, []);

  const fetchData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['employees'] }),
      queryClient.invalidateQueries({ queryKey: ['locations'] }),
      queryClient.invalidateQueries({ queryKey: ['branches'] }),
      queryClient.invalidateQueries({ queryKey: ['groups'] }),
      queryClient.invalidateQueries({ queryKey: ['departments'] })
    ]);
  }, [queryClient]);
  
  const generateNextEmployeeCode = useCallback((branchIdParam?: string, departmentIdParam?: string) => {
    let prefix = "NV";
    if (branchIdParam && departmentIdParam) {
      const branchObj = branches.find(b => b.id === branchIdParam || b._id === branchIdParam);
      const deptObj = departments.find(d => d._id === departmentIdParam);
      if (branchObj && deptObj) {
        const branchName = branchObj.name || "";
        const deptName = deptObj.name || "";
        const getInitials = (name: string) => {
          // Xử lý tiếng Việt trước khi lấy chữ cái đầu
          const cleanName = name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D");
          return cleanName
            .trim()
            .split(/\s+/)
            .map(word => word.charAt(0).toUpperCase())
            .join('');
        };
        const bLetter = getInitials(branchName);
        const dLetter = getInitials(deptName);
        if (bLetter && dLetter) {
          prefix = `${bLetter}${dLetter}`.substring(0, 4);
        }
      }
    }

    let maxNum = 0;
    employees.forEach(emp => {
      if (emp.employeeCode && emp.employeeCode.startsWith(prefix)) {
        const numStr = emp.employeeCode.slice(prefix.length);
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    const nextNumStr = (maxNum + 1).toString().padStart(4, '0');
    return `${prefix}${nextNumStr}`;
  }, [employees, branches, departments]);

  useEffect(() => {
    if (isAddingEmployee && !editingEmployee) {
      if (modalBranchIdWatch && modalDepartmentIdWatch) {
        const newCode = generateNextEmployeeCode(modalBranchIdWatch, modalDepartmentIdWatch);
        form.setFieldValue('employeeCode', newCode);
      }
    }
  }, [modalBranchIdWatch, modalDepartmentIdWatch, isAddingEmployee, editingEmployee, generateNextEmployeeCode, form]);

  // Re-sync linked user khi authUsers load xong sau khi drawer đã mở
  // (Fix race condition: authUsers đang loading khi handleOpenEdit được gọi)
  // ⚠️ Phải đặt TRƯỚC early return để không vi phạm Rules of Hooks
  useEffect(() => {
    if (!editingEmployee || !isAddingEmployee || isAuthUsersLoading) return;
    const linkedUser = authUsers?.find((u: AuthUser) => u.employeeCode === editingEmployee.employeeCode);
    if (linkedUser) {
      const currentAction = form.getFieldValue('accountAction');
      if (currentAction === 'none') {
        form.setFieldsValue({
          accountAction: 'link',
          accountId: linkedUser.id || linkedUser._id
        });
      }
    }
  }, [authUsers, isAuthUsersLoading, editingEmployee, isAddingEmployee, form]);

  if (!isLoaded) {
    return null;
  }

  const roleId = realUser?.role ?? -1;
  const roles = getCachedRoles();
  const userRole = roles.find(r => String(r.id) === String(roleId));
  const isSuperAdmin = hasPermission(roleId, '*');
  const hasAccess = isSuperAdmin || hasPermission(roleId, 'timekeeping_members');
  const hasCreateAccess = isSuperAdmin || hasPermission(roleId, 'timekeeping_member_create');
  const hasEditAccess = isSuperAdmin || hasPermission(roleId, 'timekeeping_member_edit');
  const hasDeleteAccess = isSuperAdmin || hasPermission(roleId, 'timekeeping_member_delete');
  const hasFaceIdAccess = isSuperAdmin || hasPermission(roleId, 'timekeeping_member_faceid');
  const hasFingerprintAccess = isSuperAdmin || hasPermission(roleId, 'timekeeping_member_fingerprint');
  const hasViewAccess = isSuperAdmin || hasPermission(roleId, 'timekeeping_member_view');

  if (realUser && !hasAccess) {
    return <Unauthorized />;
  }

  const handleOpenEdit = (emp: Employee) => {
    const locObj = locations.find(l => l.locationName === emp.locationName || l._id === emp.locationId);

    setEditingEmployee(emp);
    form.setFieldsValue({
      employeeCode: emp.employeeCode,
      fullName: emp.fullName,
      role: emp.role,
      employeeType: emp.employeeType && emp.employeeType !== 'none' ? emp.employeeType : undefined,
      hasContract: !!emp.contractTypeId,
      contractTypeId: emp.contractTypeId,
      branchId: emp.branchId || locObj?.branchId,
      locationId: locObj?._id || emp.locationId,
      deptGroupId: emp.deptGroupId,
      departmentId: emp.departmentId,
      email: emp.email,
      phone: emp.phone,
      gender: emp.gender || 'Nam',
      status: emp.status || 'ACTIVE',
      avatar: emp.avatar || 'User',
      identityCard: emp.identityCard || '',
      dateOfBirth: emp.dateOfBirth ? dayjs(emp.dateOfBirth) : null,
      joinDate: emp.joinDate ? dayjs(emp.joinDate) : null,
      bankAccount: emp.bankAccount || '',
      bankName: emp.bankName || '',
      taxCode: emp.taxCode || '',
      address: emp.address || '',


      enrollNumber: emp.enrollNumber || '',
      unaccentedName: emp.unaccentedName || '',
      cardNo: emp.cardNo || '',
      devicePassword: emp.devicePassword || '',
      devicePrivilege: emp.devicePrivilege || 'Nhân viên',
      isEnabled: emp.isEnabled !== undefined ? emp.isEnabled : true,
      linkedDevices: emp.linkedDevices || [],
      nativePlace: emp.nativePlace || '',
      ethnicity: emp.ethnicity || 'Kinh',
      nationality: emp.nationality || 'Việt Nam',
      
      accountAction: 'none',
      accountId: '',
      authRole: undefined,
    });
    
    // Auto detect linked user for edit (detect ngay nếu authUsers đã load xong)
    const linkedUser = authUsers?.find((u: AuthUser) => u.employeeCode === emp.employeeCode);
    if (linkedUser) {
      form.setFieldsValue({
        accountAction: 'link',
        accountId: linkedUser.id || linkedUser._id
      });
    }
    
    setIsAddingEmployee(true);
  };

  const handleAddEmployeeSubmit = async () => {

    try {
      const values = await form.validateFields();
      setIsSubmitting(true);

      const formattedValues = {
        ...values,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : '',
        joinDate: values.joinDate ? values.joinDate.format('YYYY-MM-DD') : '',
      };

      const url = editingEmployee
        ? `/api/v1/employees/${editingEmployee.id}`
        : '/api/v1/employees';
      const method = editingEmployee ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedValues),
      });
      const data = await res.json();

      if (res.ok) {
        setIsAddingEmployee(false);
        setEditingEmployee(null);
        form.resetFields();
        message.success(editingEmployee ? 'Đã cập nhật hồ sơ nhân sự thành công!' : 'Đã lưu hồ sơ nhân sự mới thành công!');
        fetchData();
      } else {
        message.error(data.message || 'Lỗi khi lưu thông tin nhân sự.');
      }
    } catch (err) {
      // Validate error or network error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedRowKeys.length) return;
    try {
      setIsActionLoading(true);
      const res = await fetch(`/api/v1/employees`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedRowKeys }),
      });
      const data = await res.json();
      if (res.ok) {
        message.success(`Đã xóa thành công ${selectedRowKeys.length} nhân sự!`);
        setSelectedRowKeys([]);
        fetchData();
      } else {
        message.error(data.message || 'Lỗi khi xóa hàng loạt.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi kết nối khi xóa hàng loạt.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      setIsActionLoading(true);
      const res = await fetch(`/api/v1/employees/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        message.success('Đã xóa hồ sơ nhân viên thành công!');
        fetchData();
      } else {
        message.error(data.message || 'Lỗi khi xóa nhân sự.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi kết nối khi xóa nhân sự.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleQuickCreateBranch = async () => {
    try {
      const values = await branchForm.validateFields();
      setIsSubmittingQuick(true);
      const res = await fetch('/api/branch-timekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        message.success('Thêm chi nhánh thành công');
        setIsBranchModalOpen(false);
        branchForm.resetFields();
        await fetchData();
        const insertedId = data.data._id || data.data.id;
        form.setFieldValue('branchId', insertedId);
        form.setFieldValue('locationId', undefined); // Reset location
      } else {
        message.error(data.message || 'Lỗi thêm chi nhánh');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  const handleQuickCreateLocation = async () => {
    try {
      if (!modalBranchIdWatch) {
        message.error('Vui lòng chọn Chi nhánh trước khi thêm Cơ sở');
        return;
      }
      const values = await locationForm.validateFields();
      setIsSubmittingQuick(true);

      const body = {
        locationName: values.locationName,
        branchId: modalBranchIdWatch,
        locationSlug: values.locationName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        status: 'ACTIVE',
        allowedRadiusMeters: 100
      };

      const res = await fetch('/api/v1/kiosk/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        message.success('Thêm cơ sở thành công');
        setIsLocationModalOpen(false);
        locationForm.resetFields();
        await fetchData();
        const insertedId = typeof data.data === 'string' ? data.data : (data.data._id || data.data.id);
        form.setFieldValue('locationId', insertedId);
      } else {
        message.error(data.message || 'Lỗi thêm cơ sở');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  const handleQuickCreateGroup = async () => {
    try {
      if (!modalLocationIdWatch) {
        message.error('Vui lòng chọn Cơ sở chấm công trước khi thêm Khối / Cụm');
        return;
      }
      const values = await groupForm.validateFields();
      setIsSubmittingQuick(true);
      const body = {
        action: 'add',
        name: values.name,
        code: values.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        locationId: modalLocationIdWatch,
        isActive: true
      };

      const res = await fetch('/api/department-groups-timekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        message.success('Thêm khối/cụm thành công');
        setIsGroupModalOpen(false);
        groupForm.resetFields();
        await fetchData();
        const insertedId = data.data._id || data.data.id;
        form.setFieldValue('deptGroupId', insertedId);
        form.setFieldValue('departmentId', undefined); // Reset department
      } else {
        message.error(data.message || 'Lỗi thêm khối/cụm');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  const handleQuickCreateDept = async () => {
    try {
      if (!modalGroupIdWatch) {
        message.error('Vui lòng chọn Khối / Cụm trước khi thêm Phòng ban');
        return;
      }
      const values = await deptForm.validateFields();
      setIsSubmittingQuick(true);

      const body = {
        action: 'add',
        name: values.name,
        code: values.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        departmentGroupTimekeepingId: modalGroupIdWatch,
        locationId: modalLocationIdWatch || ""
      };

      const res = await fetch('/api/departments-timekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        message.success('Thêm phòng ban thành công');
        setIsDeptModalOpen(false);
        deptForm.resetFields();
        await fetchData();
        const insertedId = data.data._id || data.data.id;
        form.setFieldValue('departmentId', insertedId);
      } else {
        message.error(data.message || 'Lỗi thêm phòng ban');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingQuick(false);
    }
  };


  const handleRegisterWebAuthn = async () => {
    if (!selectedEmp) return;
    setWebAuthnLoading(true);
    try {
      const empId = selectedEmp._id || selectedEmp.id;
      const resp = await fetch(`/api/webauthn/register/generate?employeeId=${empId}`);
      const data = await resp.json();
      if (!data.success) {
        message.error(data.message || 'Lỗi tạo mã đăng ký sinh trắc học');
        return;
      }

      const attResp = await startRegistration({ optionsJSON: data.data });

      const verifyResp = await fetch('/api/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmp._id || selectedEmp.id,
          registrationResponse: attResp,
        }),
      });

      const verifyData = await verifyResp.json();
      if (verifyData.success) {
        message.success('Đăng ký Vân tay / Sinh trắc học thành công!');
        fetchData();
      } else {
        message.error(verifyData.message || 'Xác thực sinh trắc học thất bại');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          message.error('Bạn đã huỷ đăng ký sinh trắc học.');
        } else if (error.name === 'InvalidStateError') {
          message.error('Thiết bị/vân tay này đã được đăng ký từ trước.');
        } else {
          message.error('Lỗi khi đăng ký sinh trắc học: ' + error.message);
        }
      } else {
        message.error('Lỗi không xác định khi đăng ký sinh trắc học');
      }
      console.error(error);
    } finally {
      setWebAuthnLoading(false);
    }
  };

  const fetchCredentials = async (empId: string) => {
    setIsFetchingCredentials(true);
    try {
      const res = await fetch(`/api/webauthn/credentials?employeeId=${empId}`);
      const data = await res.json();
      setWebAuthnCredentials(data.success ? data.data : []);
    } catch (err) {
      console.error(err);
      setWebAuthnCredentials([]);
    } finally {
      setIsFetchingCredentials(false);
    }
  };

  const openWebAuthnModalDynamic = (empId: string) => {
    setWebAuthnTargetEmpId(empId);
    setIsWebAuthnModalDynamicOpen(true);
    fetchCredentials(empId);
  };

  const handleDeleteCredential = async (credentialId: string) => {
    try {
      const res = await fetch(`/api/webauthn/credentials/${credentialId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        message.success('Đã xóa vân tay thành công!');
        if (webAuthnTargetEmpId) fetchCredentials(webAuthnTargetEmpId);
      } else {
        message.error(data.message || 'Xóa thất bại');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi kết nối khi xóa vân tay');
    }
  };

  const handleRegisterWebAuthnInModal = async () => {
    if (!webAuthnTargetEmpId) return;
    const emp = employees.find(e => e.id === webAuthnTargetEmpId || e._id === webAuthnTargetEmpId);
    if (!emp) return;
    setWebAuthnLoading(true);
    try {
      const empId = emp._id || emp.id;
      const resp = await fetch(`/api/webauthn/register/generate?employeeId=${empId}`);
      const data = await resp.json();
      if (!data.success) {
        message.error(data.message || 'Lỗi tạo mã đăng ký sinh trắc học');
        return;
      }
      const { startRegistration: startReg } = await import('@simplewebauthn/browser');
      const attResp = await startReg({ optionsJSON: data.data });
      const verifyResp = await fetch('/api/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: empId, registrationResponse: attResp }),
      });
      const verifyData = await verifyResp.json();
      if (verifyData.success) {
        message.success('Đăng ký vân tay thành công!');
        fetchCredentials(webAuthnTargetEmpId);
      } else {
        message.error(verifyData.message || 'Xác thực thất bại');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          message.error('Bạn đã huỷ đăng ký.');
        } else if (error.name === 'InvalidStateError') {
          message.error('Thiết bị này đã được đăng ký từ trước.');
        } else {
          message.error('Lỗi: ' + error.message);
        }
      } else {
        message.error('Lỗi không xác định');
      }
    } finally {
      setWebAuthnLoading(false);
    }
  };

  const startFaceEnroll = (empId: string) => {
    setFaceEnrollTargetEmpId(empId);
    setIsEnrollingFace(true);
  };

  const handlePrintContractClick = async (emp: Employee) => {
    if (!emp.contractTypeId || emp.contractTypeId === 'none') {
      message.warning('Nhân viên này chưa được thiết lập loại hợp đồng!');
      return;
    }
    
    const contractType = contractTypes.find((ct: { _id: string; templateId?: string; name?: string; [key: string]: unknown }) => ct._id === emp.contractTypeId);
    if (!contractType) {
      message.error('Không tìm thấy loại hợp đồng của nhân viên này.');
      return;
    }

    if (!contractType.templateId) {
      message.warning(`Loại hợp đồng "${contractType.name}" chưa được gắn với mẫu hợp đồng nào.`);
      return;
    }

    // Chuyển hướng sang trang điền hợp đồng
    router.push(`/contracts/fill/${contractType.templateId}?employeeId=${emp.id || emp._id}`);
  };

  const handleCreateContractClick = (emp: Employee) => {
    if (!contractTemplates || contractTemplates.length === 0) {
      message.error("Vui lòng cấu hình ít nhất 1 Mẫu hợp đồng trong phần Cài đặt trước khi thêm hợp đồng mới.");
      return;
    }
    setCreateContractEmp(emp);
    setIsCreateContractOpen(true);
  };

  const handleAddSupplementaryContractClick = (emp: Employee) => {
    if (!contractTemplates || contractTemplates.length === 0) {
      message.error("Vui lòng cấu hình ít nhất 1 Mẫu hợp đồng trong phần Cài đặt trước khi thêm hợp đồng bổ sung.");
      return;
    }
    setSupplementaryContractEmp(emp);
    setIsSupplementaryContractOpen(true);
  };

  
  const getActionMenuItems = (record: Employee, includeFaceId = true): MenuProps['items'] => {
    const items: MenuProps['items'] = [];
    
    if (includeFaceId && hasFaceIdAccess) {
      items.push({
        key: 'faceid',
        label: record.faceEnrolled ? "Cấu hình FaceID" : "Thiết lập FaceID",
        icon: <ScanFace className="w-4 h-4 text-blue-500" />,
      });
    }

    if (hasFingerprintAccess) {
      items.push({
        key: 'webauthn',
        label: 'Quản lý Vân tay',
        icon: <Fingerprint className="w-4 h-4 text-emerald-500" />,
      });
    }

    items.push({
      key: 'sync',
      label: 'Đồng bộ Máy CC',
      icon: <Monitor className="w-4 h-4 text-blue-500" />,
    });

    if (hasViewAccess) {
      items.push({
        key: 'qrcode',
        label: 'Mã QR / Định danh',
        icon: <QrCode className="w-4 h-4 text-purple-500" />,
      });
      items.push({
        key: 'view',
        label: 'Xem chi tiết',
        icon: <Eye className="w-4 h-4 text-slate-500" />,
      });
    }
    
    if (hasEditAccess) {
      items.push({
        key: 'edit',
        label: 'Sửa hồ sơ',
        icon: <Pencil className="w-4 h-4 text-orange-500" />,
      });
    }
    
    if (hasDeleteAccess) {
      items.push({ type: 'divider' });
      items.push({
        key: 'delete',
        label: <span className="text-red-500 font-medium">Xóa nhân sự</span>,
        icon: <Trash2 className="w-4 h-4 text-red-500" />,
      });
    }
    return items;
  };

  const handleMenuClick = (key: string, record: Employee) => {
    switch (key) {
      case 'sync': 
        setSyncEmpTarget(record);
        setIsZktecoSyncOpen(true);
        break;
      case 'faceid': startFaceEnroll(record.id); break;
      case 'webauthn': openWebAuthnModalDynamic(record._id || record.id); break;
      case 'qrcode': setQrCardEmpId(record.id || record._id!); break;
      case 'view': handleOpenDetail(record); break;
      case 'edit': handleOpenEdit(record); break;
      case 'delete': 
        Modal.confirm({
          title: 'Xóa nhân sự này?',
          content: 'Hồ sơ nhân sự và vân tay liên quan sẽ bị xóa vĩnh viễn.',
          okText: 'Xóa',
          cancelText: 'Hủy',
          okButtonProps: { danger: true },
          onOk: () => handleDeleteEmployee(record.id)
        });
        break;
    }
  };



  return (
    <div className="flex flex-col gap-5 items-start overflow-hidden">
      {/* Drawer Filter */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-700 text-sm">Bộ lọc nâng cao</span>
          </div>
        }
        placement="left"
        onClose={() => setIsMemberSidebarOpen(false)}
        open={isMemberSidebarOpen}
        size="default"
        styles={{ body: { padding: 0 } }}
      >
        <div className="h-full overflow-y-auto p-5 custom-scrollbar" style={{ width: 320 }}>
          <EmployeeFilterSidebar
            initialFilters={memberFilters}
            onApply={setMemberFilters}
            onClear={() => setMemberFilters({ branch: null, location: null, face: null, deptGroup: null, department: null, status: null, employeeType: null, gender: null })}
            branches={branches}
            locations={locations}
            groups={groups}
            departments={departments}
          />
        </div>
      </Drawer>

      {/* Main Content */}
      <div className="w-full flex-1 min-w-0 space-y-5">
        {/* All-in-One Control Panel */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm flex flex-col">
          <div className="p-4 sm:p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-slate-800 m-0 truncate">Cơ sở dữ liệu nhân viên</h2>
              <p className="text-sm text-slate-500 mt-0.5 truncate">Danh sách quản lý thông tin nhân sự và định danh FaceID.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-start lg:justify-end gap-3 w-full lg:w-auto shrink-0">
              {/* Search */}
              <Input
                placeholder="Tìm mã NV, họ tên, email..."
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
                allowClear
                prefix={<Search className="w-4 h-4 text-slate-400" />}
                className="w-full sm:w-[240px] xl:w-[280px]"
              />
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Button 
                    type={isMemberSidebarOpen || Object.values(memberFilters).some(v => v !== null && v !== '') ? "primary" : "default"}
                    className={isMemberSidebarOpen || Object.values(memberFilters).some(v => v !== null && v !== '') ? "bg-blue-600 border-blue-600" : "border-slate-300 text-slate-700"}
                    onClick={() => setIsMemberSidebarOpen(true)}
                    icon={<Filter className="w-4 h-4" />}
                  >
                    <span className="hidden sm:inline">
                      Lọc {Object.values(memberFilters).filter(v => v !== null && v !== '').length > 0 ? `(${Object.values(memberFilters).filter(v => v !== null && v !== '').length})` : ''}
                    </span>
                  </Button>
                  {Object.values(memberFilters).some(v => v !== null && v !== '') && (
                    <Button 
                      type="default"
                      danger
                      onClick={() => setMemberFilters({ branch: null, location: null, face: null, deptGroup: null, department: null, status: null, employeeType: null, gender: null })}
                    >
                      Xóa lọc
                    </Button>
                  )}
                </div>

                {/* Layout Toggle */}
                <div className="bg-slate-100 p-1 rounded-lg flex gap-1 hidden sm:flex">
                  <button
                    className={`p-1.5 rounded-md transition-colors ${memberViewMode === 'grid' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setMemberViewMode('grid')}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    className={`p-1.5 rounded-md transition-colors ${memberViewMode === 'list' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setMemberViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Scan QR Button */}
                <Button
                  type="default"
                  icon={<QrCode className="w-4 h-4" />}
                  onClick={() => setShowQRScanner(true)}
                  className="bg-white border-slate-300 text-slate-700 hover:text-blue-600 hover:border-blue-600 transition-colors"
                >
                  <span className="hidden sm:inline">Quét QR</span>
                </Button>

                {/* Add Button */}
                {hasCreateAccess && (
                  <Button
                    type="primary"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => {
                      form.resetFields();
                      const nextCode = generateNextEmployeeCode();
                      form.setFieldsValue({
                        employeeCode: nextCode,
                        status: 'ACTIVE',
                        gender: 'Nam',
                        employeeType: undefined,
                        hasContract: false,
                        avatar: 'User',
                        accountAction: 'create'
                      });
                      setIsAddingEmployee(true);
                    }}
                  >
                    <span className="hidden sm:inline">Thêm nhân sự</span>
                    <span className="sm:hidden">Thêm</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-5 py-3 border-t border-slate-100/60 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4 rounded-b-xl">
            <div className="text-sm text-slate-500 flex items-center gap-4">
              <span>Tổng cộng: <span className="font-bold text-slate-800">{totalEmployees}</span> nhân sự</span>
              {selectedRowKeys.length > 0 && hasDeleteAccess && (
                <Popconfirm
                  title={`Xoá ${selectedRowKeys.length} nhân sự`}
                  description="Bạn có chắc chắn muốn xoá các nhân sự đã chọn? Hành động này không thể hoàn tác."
                  onConfirm={handleBulkDelete}
                  okText="Xoá"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                  placement="top"
                >
                  <Button size="small" danger type="primary" icon={<Trash2 className="w-3 h-3" />}>
                    Xoá {selectedRowKeys.length} bản ghi
                  </Button>
                </Popconfirm>
              )}
            </div>
            
            {memberViewMode === 'list' && (
              <Popover
                placement="bottomLeft"
                title={<span className="text-sm font-semibold">Tùy chỉnh cột hiển thị</span>}
                content={
                  <div className="w-[280px] sm:w-[400px]">
                    <Checkbox.Group 
                      value={visibleColumns} 
                      onChange={handleColumnChange}
                      className="w-full max-h-[300px] overflow-y-auto custom-scrollbar pr-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                        {ALL_OPTIONAL_COLUMNS.map(col => (
                          <Checkbox 
                            key={col.value} 
                            value={col.value}
                            className="m-0 text-sm text-slate-700 hover:text-blue-600 transition-colors"
                          >
                            {col.label}
                          </Checkbox>
                        ))}
                      </div>
                    </Checkbox.Group>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                       <span className="text-[11px] text-slate-400 font-medium">
                         Đã chọn {visibleColumns.length}/{ALL_OPTIONAL_COLUMNS.length} cột
                       </span>
                       <div className="space-x-3">
                         <button 
                           onClick={() => handleColumnChange([])}
                           className="text-[11px] text-slate-500 hover:text-slate-700 transition-colors bg-transparent border-none cursor-pointer p-0"
                         >
                           Bỏ chọn
                         </button>
                         <button 
                           onClick={() => handleColumnChange(ALL_OPTIONAL_COLUMNS.map(c => c.value))}
                           className="text-[11px] text-blue-600 hover:text-blue-700 font-medium transition-colors bg-transparent border-none cursor-pointer p-0"
                         >
                           Chọn tất cả
                         </button>
                       </div>
                    </div>
                  </div>
                }
                trigger="click"
              >
                <Button size="small" type="dashed" icon={<Settings2 className="w-3 h-3" />}>Cột hiển thị</Button>
              </Popover>
            )}
          </div>
        </div>

      {/* Employee List/Grid View */}
      {hasViewAccess ? (
      <>
      {isLoading && memberViewMode === 'grid' ? (
        <div className="text-center py-10 text-slate-400">Đang tải dữ liệu...</div>
      ) : memberViewMode === 'list' ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden relative member-table-wrapper">
          <Table
            dataSource={employees}
            rowKey="id"
            rowClassName="cursor-pointer"
            onRow={(record) => ({
              onClick: () => handleOpenDetail(record),
            })}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            loading={isLoading}
            pagination={{
              current: page,
              total: totalEmployees,
              defaultPageSize: memberPageSize,
              pageSize: memberPageSize,
              onChange: (page, pageSize) => {
                setPage(page);
                setMemberPageSize(pageSize);
              },
              showSizeChanger: true,
              pageSizeOptions: ['10', '15', '20', '50', '100', '200'],
              size: isMobile ? "small" : undefined,
              showTotal: (total, range) => isMobile ? `${range[0]}-${range[1]} / ${total}` : `Hiển thị ${range[0]} - ${range[1]} trên tổng số ${total} nhân sự`
            }}
            scroll={{ x: 1250 }}
            columns={(
              [
              {
                title: 'Mã NV',
                dataIndex: 'employeeCode',
                key: 'employeeCode',
                fixed: isMobile ? undefined : 'left',
                width: 110,
                render: (text) => <span className="font-mono bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap">{text}</span>
              },
              {
                title: 'Họ và tên',
                dataIndex: 'fullName',
                key: 'fullName',
                fixed: isMobile ? undefined : 'left',
                width: 220,
                render: (text, record) => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="truncate max-w-[160px]">
                      <div className="font-bold text-slate-800 text-sm truncate">{text}</div>
                      <div className="text-xs text-slate-400 truncate">{record.email || '---'}</div>
                    </div>
                  </div>
                )
              },
              {
                title: 'Số ĐT',
                dataIndex: 'phone',
                key: 'phone',
                width: 120,
                render: (text) => <span className="text-slate-600 text-xs font-mono">{text || '—'}</span>
              },
              {
                title: 'Giới tính',
                dataIndex: 'gender',
                key: 'gender',
                width: 110,
                render: (text) => <span className="text-slate-600 text-xs">{text || '—'}</span>
              },
              {
                title: 'Phòng ban',
                key: 'department',
                width: 180,
                render: (_, record) => {
                  const deptObj = departments.find(d => d._id === record.departmentId);
                  const grpObj = groups.find(g => g._id === record.deptGroupId || g._id === deptObj?.groupId);
                  return (
                    <div className="flex flex-col truncate">
                      <span className="text-slate-800 text-sm font-medium truncate">{deptObj?.name || '—'}</span>
                      {grpObj && <span className="text-[10px] text-slate-400 truncate">Khối: {grpObj.name}</span>}
                    </div>
                  );
                }
              },
              {
                title: 'Chức vụ',
                dataIndex: 'role',
                key: 'role',
                width: 140,
                render: (text) => {
                  const matchedRole = roles.find(r => String(r.id) === String(text) || ('_id' in r && String(r['_id']) === String(text)));
                  return <span className="text-slate-600 font-medium text-sm truncate block">{matchedRole ? matchedRole.name : text}</span>;
                }
              },
              {
                title: 'Cơ sở',
                dataIndex: 'locationName',
                key: 'locationName',
                width: 180,
                render: (text, record) => {
                  const locObj = locations.find(l => l.locationName === text || l._id === record.locationId);
                  const branchObj = branches.find(b => b._id === locObj?.branchId || b.id === locObj?.branchId);
                  return (
                    <div className="flex flex-col truncate">
                      <span className="text-slate-800 font-medium text-sm truncate">{text || '---'}</span>
                      {branchObj && <span className="text-[10px] text-slate-400 truncate">CN: {branchObj.name}</span>}
                    </div>
                  );
                }
              },
              {
                title: 'Loại nhân sự',
                dataIndex: 'employeeType',
                key: 'employeeType',
                width: 130,
                render: (text) => {
                  if (text === 'full_time') return <span className="inline-block text-blue-600 text-xs font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-200">Toàn thời gian</span>;
                  if (text === 'part_time') return <span className="inline-block text-purple-600 text-xs font-medium bg-purple-50 px-2 py-0.5 rounded border border-purple-200">Bán thời gian</span>;
                  return <span className="text-slate-400 text-xs italic">Không xác định</span>;
                }
              },
              {
                title: 'Loại hợp đồng',
                dataIndex: 'contractTypeId',
                key: 'contractTypeId',
                width: 140,
                render: (text) => {
                  if (!text || text === 'none') return <span className="text-slate-400 text-xs italic">Chưa ký hợp đồng</span>;
                  const matched = contractTypes.find((ct: { _id: string; name?: string; [key: string]: unknown }) => ct._id === text);
                  return <span className="inline-block text-slate-600 text-xs font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{matched?.name || 'Không xác định'}</span>;
                }
              },
              {
                title: 'CCCD/CMND',
                dataIndex: 'identityCard',
                key: 'identityCard',
                width: 130,
                render: (text) => <span className="text-slate-600 text-xs font-mono">{text || '—'}</span>
              },
              {
                title: 'Ngày sinh',
                dataIndex: 'dateOfBirth',
                key: 'dateOfBirth',
                width: 110,
                render: (text) => <span className="text-slate-600 text-xs">{text ? dayjs(text).format('DD/MM/YYYY') : '—'}</span>
              },
              {
                title: 'Ngày vào làm',
                dataIndex: 'joinDate',
                key: 'joinDate',
                width: 110,
                render: (text) => <span className="text-slate-600 text-xs">{text ? dayjs(text).format('DD/MM/YYYY') : '—'}</span>
              },
              {
                title: 'Số tài khoản',
                dataIndex: 'bankAccount',
                key: 'bankAccount',
                width: 140,
                render: (text) => <span className="text-slate-600 text-xs font-mono">{text || '—'}</span>
              },
              {
                title: 'Địa chỉ',
                dataIndex: 'address',
                key: 'address',
                width: 200,
                render: (text) => <span className="text-slate-600 text-xs truncate block max-w-[180px]" title={text}>{text || '—'}</span>
              },
              {
                title: 'Quê quán',
                dataIndex: 'nativePlace',
                key: 'nativePlace',
                width: 160,
                render: (text) => <span className="text-slate-600 text-xs truncate block max-w-[140px]" title={text}>{text || '—'}</span>
              },
              {
                title: 'Dân tộc',
                dataIndex: 'ethnicity',
                key: 'ethnicity',
                width: 90,
                render: (text) => <span className="text-slate-600 text-xs">{text || '—'}</span>
              },
              {
                title: 'Quốc tịch',
                dataIndex: 'nationality',
                key: 'nationality',
                width: 100,
                render: (text) => <span className="text-slate-600 text-xs">{text || '—'}</span>
              },
              {
                title: 'ID Chấm công (Máy)',
                dataIndex: 'enrollNumber',
                key: 'enrollNumber',
                width: 150,
                render: (text) => <span className="text-slate-600 text-xs font-mono">{text || '—'}</span>
              },
              {
                title: 'Mã thẻ từ',
                dataIndex: 'cardNo',
                key: 'cardNo',
                width: 120,
                render: (text) => <span className="text-slate-600 text-xs font-mono">{text || '—'}</span>
              },
              {
                title: 'Trạng thái',
                dataIndex: 'status',
                key: 'status',
                width: 110,
                render: (status) => (
                  <Tag color={status === 'INACTIVE' ? 'default' : 'green'} className="font-semibold text-[10px] m-0">
                    {status === 'INACTIVE' ? 'Tạm khóa' : 'Hoạt động'}
                  </Tag>
                )
              },
              {
                title: 'FaceID',
                dataIndex: 'faceEnrolled',
                key: 'faceEnrolled',
                width: 120,
                render: (enrolled) => enrolled ? (
                  <Tag color="success" className="m-0">Đã kích hoạt</Tag>
                ) : (
                  <Tag color="warning" className="m-0">Chưa quét</Tag>
                )
              },
              {
                title: 'Thao tác',
                key: 'action',
                align: 'right' as const,
                fixed: isMobile ? undefined : 'right',
                width: 120,
                render: (_, record) => (
                  <Space size="small">
                    <Button 
                      type={record.faceEnrolled ? "default" : "primary"}
                      size="small" 
                      className={record.faceEnrolled ? "text-blue-600 border-blue-200 bg-blue-50" : "bg-blue-500 text-white border-blue-500"}
                      icon={<ScanFace className="w-4 h-4" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        startFaceEnroll(record.id);
                      }}
                      title={record.faceEnrolled ? "Cấu hình FaceID" : "Thiết lập FaceID"}
                    />
                    <div onClick={(e) => e.stopPropagation()}>
                      <Dropdown 
                        menu={{ 
                          items: getActionMenuItems(record, false), 
                          onClick: (e) => handleMenuClick(e.key, record) 
                        }} 
                        trigger={['click']} 
                        placement="bottomRight"
                      >
                        <Button type="text" size="small" icon={<MoreHorizontal className="w-5 h-5 text-slate-500" />} />
                      </Dropdown>
                    </div>
                  </Space>
                )
              }
              ] as TableColumnsType<Employee>
            ).filter(col => {
              if (['employeeCode', 'fullName', 'action'].includes(col.key as string)) return true;
              return visibleColumns.includes(col.key as string);
            })}
          />
          {isMobile && (
            <div className="absolute right-3 top-3 z-50">
              <Button
                type="primary"
                shape="circle"
                className="shadow-lg opacity-80 hover:opacity-100 flex items-center justify-center w-8 h-8 transition-opacity duration-300"
                onClick={() => {
                  const scrollContainer = document.querySelector('.member-table-wrapper .ant-table-content');
                  if (scrollContainer) scrollContainer.scrollTo({ left: scrollContainer.scrollWidth, behavior: 'smooth' });
                }}
                title="Cuộn sang phải"
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {employees.map((emp) => (
            <Col xs={24} sm={12} md={8} xl={6} key={emp.id}>
              <div className="bg-white p-6 rounded-2xl border border-slate-200/60 relative shadow-xs flex flex-col justify-between h-full hover:shadow-md transition-shadow">
                <div className="cursor-pointer group" onClick={() => handleOpenDetail(emp)}>
                  <span className="absolute top-3 right-3 text-[10px] font-mono font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded group-hover:bg-blue-100 transition-colors">
                    {emp.employeeCode}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm m-0 leading-tight">{emp.fullName}</h3>
                      <span className="text-xs text-slate-400">{emp.role}</span>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100 my-4" />

                  <div className="space-y-2 text-[11px] text-slate-500">
                    <div className="flex justify-between">
                      <span>Cơ sở làm việc:</span>
                      <span className="font-semibold text-slate-700">
                        {(() => {
                          const locObj = locations.find(l => l.locationName === emp.locationName || l._id === emp.locationId);
                          const branchObj = branches.find(b => b._id === locObj?.branchId || b.id === locObj?.branchId);
                          return branchObj ? `${branchObj.name} - ${emp.locationName}` : emp.locationName || '---';
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Phòng ban:</span>
                      <span className="font-semibold text-slate-700">
                        {(() => {
                          const deptObj = departments.find(d => d._id === emp.departmentId);
                          const grpObj = groups.find(g => g._id === emp.deptGroupId || g._id === deptObj?.groupId);
                          return deptObj ? (grpObj ? `${grpObj.name} / ${deptObj.name}` : deptObj.name) : '---';
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Email:</span>
                      <span className="font-mono text-slate-700 font-semibold truncate max-w-[120px]">{emp.email || '---'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Số điện thoại:</span>
                      <span className="font-semibold text-slate-700">{emp.phone || '---'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Giới tính:</span>
                      <span className="font-semibold text-slate-700">{emp.gender || 'Nam'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Trạng thái:</span>
                      <Tag color={emp.status === 'INACTIVE' ? 'default' : 'green'} className="font-semibold text-[10px] m-0">
                        {emp.status === 'INACTIVE' ? 'Tạm khóa' : 'Hoạt động'}
                      </Tag>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>FaceID:</span>
                      {emp.faceEnrolled ? (
                        <Tag color="success" className="m-0">Đã kích hoạt</Tag>
                      ) : (
                        <Tag color="warning" className="m-0">Chưa quét</Tag>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2 flex gap-2">
                  <Button 
                    type={emp.faceEnrolled ? "default" : "primary"}
                    className={emp.faceEnrolled ? "flex-1 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100" : "flex-1 bg-blue-500 text-white hover:bg-blue-600 border-blue-500"}
                    icon={<ScanFace className="w-4 h-4" />}
                    onClick={() => startFaceEnroll(emp.id)}
                  >
                    {emp.faceEnrolled ? "Cấu hình FaceID" : "Thiết lập FaceID"}
                  </Button>
                  <Dropdown 
                    menu={{ 
                      items: getActionMenuItems(emp, false), 
                      onClick: (e) => handleMenuClick(e.key, emp) 
                    }} 
                    trigger={['click']} 
                    placement="bottomRight"
                  >
                    <Button icon={<MoreHorizontal className="w-5 h-5 text-slate-500" />} />
                  </Dropdown>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      )}
      </>
      ) : (
        <div className="mt-8 p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
          <ShieldAlert className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Không có quyền xem danh sách</h3>
          <p className="max-w-md">Bạn chưa được cấp quyền xem danh sách nhân sự. Vui lòng liên hệ Quản trị viên để được cấp quyền <code>timekeeping_member_view</code>.</p>
        </div>
      )}

      <EmployeeFormDrawerDynamic
        isOpen={isAddingEmployee}
        onClose={() => {
          setIsAddingEmployee(false);
          setEditingEmployee(null);
          form.resetFields();
        }}
        form={form}
        isSubmitting={isSubmitting}
        editingEmployee={editingEmployee}
        onSubmit={handleAddEmployeeSubmit}
        isTablet={isMobile}
        branches={branches}
        locations={locations}
        departments={departments}
        groups={groups}
        authUsers={authUsers}
        authRoles={roles}
        avatarOptions={AVATAR_OPTIONS}
        renderAvatarPreview={renderAvatarPreview}
        formAvatarWatch={formAvatarWatch}
        modalBranchIdWatch={modalBranchIdWatch}
        modalLocationIdWatch={modalLocationIdWatch}
        modalGroupIdWatch={modalGroupIdWatch}
        setIsBranchModalOpen={setIsBranchModalOpen}
        setIsLocationModalOpen={setIsLocationModalOpen}
        setIsGroupModalOpen={setIsGroupModalOpen}
        setIsDeptModalOpen={setIsDeptModalOpen}
        removeVietnameseTones={removeVietnameseTones}
        contractTypes={contractTypes}
        contractTemplates={contractTemplates}
      />

      <EmployeeDetailDrawerDynamic
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedEmpId(null);
        }}
        selectedEmp={selectedEmp}
        isTablet={isMobile}
        branches={branches}
        locations={locations}
        departments={departments}
        groups={groups}
        renderAvatarPreview={renderAvatarPreview}
        onEdit={handleOpenEdit}
        onDelete={(emp) => handleDeleteEmployee(emp.id)}
        onFaceId={(emp) => startFaceEnroll(emp.id)}
        onWebAuthn={(emp) => {
          setWebAuthnTargetEmpId(emp._id || emp.id);
          setSyncEmpTarget(emp);
          setIsWebAuthnModalDynamicOpen(true);
          fetchCredentials(emp._id || emp.id);
        }}
        onPrintContract={handlePrintContractClick}
        onCreateContract={handleCreateContractClick}
        onAddSupplementaryContract={handleAddSupplementaryContractClick}
        hasEditAccess={hasEditAccess}
        hasDeleteAccess={hasDeleteAccess}
        hasFaceIdAccess={hasFaceIdAccess}
        hasFingerprintAccess={hasFingerprintAccess}
        onSyncZkteco={(emp) => {
          setSyncEmpTarget(emp);
          setIsZktecoSyncOpen(true);
        }}
      />

      {syncEmpTarget && (
        <ZktecoSyncModalDynamic
          isOpen={isZktecoSyncOpen}
          onClose={() => {
            setIsZktecoSyncOpen(false);
            setSyncEmpTarget(null);
          }}
          employeeId={syncEmpTarget.id || syncEmpTarget._id!}
          employeeCode={String(syncEmpTarget.employeeCode || syncEmpTarget.enrollNumber || '')}
          employeeName={syncEmpTarget.fullName}
          linkedDevices={syncEmpTarget.linkedDevices}
          zktecoSyncDetails={syncEmpTarget.zktecoSyncDetails}
          onSuccess={fetchData}
        />
      )}

      <FaceIdEnrollModal
        isOpen={isEnrollingFace}
        onClose={() => setIsEnrollingFace(false)}
        targetEmp={employees.find(e => e.id === faceEnrollTargetEmpId) || null}
        onSuccess={fetchData}
      />

      <QuickCreateModalsDynamic
        isBranchModalOpen={isBranchModalOpen}
        setIsBranchModalOpen={setIsBranchModalOpen}
        isLocationModalOpen={isLocationModalOpen}
        setIsLocationModalOpen={setIsLocationModalOpen}
        isGroupModalOpen={isGroupModalOpen}
        setIsGroupModalOpen={setIsGroupModalOpen}
        isDeptModalOpen={isDeptModalOpen}
        setIsDeptModalOpen={setIsDeptModalOpen}
        modalBranchIdWatch={modalBranchIdWatch}
        modalLocationIdWatch={modalLocationIdWatch}
        modalGroupIdWatch={modalGroupIdWatch}
        onSuccess={(type, insertedId) => {
          if (type === 'branch') form.setFieldValue('branchId', insertedId);
          if (type === 'location') form.setFieldValue('locationId', insertedId);
          if (type === 'group') form.setFieldValue('deptGroupId', insertedId);
          if (type === 'dept') form.setFieldValue('departmentId', insertedId);
          fetchData();
        }}
      />

      <WebAuthnModalDynamic
        isOpen={isWebAuthnModalDynamicOpen}
        onClose={() => {
          setIsWebAuthnModalDynamicOpen(false);
          setWebAuthnTargetEmpId(null);
        }}
        empId={webAuthnTargetEmpId}
        empName={employees.find(e => e.id === webAuthnTargetEmpId)?.fullName || ''}
        linkedDevices={employees.find(e => e.id === webAuthnTargetEmpId)?.zktecoLinkedDevices || employees.find(e => e.id === webAuthnTargetEmpId)?.linkedDevices || []}
        zktecoSyncDetails={employees.find(e => e.id === webAuthnTargetEmpId)?.zktecoSyncDetails || {}}
        onSuccess={fetchData}
      />

      {/* QR Scanner Modal */}
      <QRScannerModal
        open={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScanSuccess={(decodedText) => {
          if (decodedText.startsWith('ABC_EMP_ID:')) {
            const empId = decodedText.split('ABC_EMP_ID:')[1];
            const emp = employees.find(e => e.id === empId || e._id === empId);
            if (emp) {
              handleOpenDetail(emp);
              message.success(`Đã nhận diện thành công: ${emp.fullName}`);
            } else {
              message.error('Không tìm thấy nhân viên ứng với mã QR này.');
            }
          } else {
            message.warning('Mã QR không hợp lệ hoặc không thuộc hệ thống.');
          }
        }}
      />

      <QrEmployeeCardModalDynamic
        open={!!qrCardEmpId}
        onClose={() => setQrCardEmpId(null)}
        employee={qrCardEmp}
        displayName={qrCardEmp?.fullName || ''}
        departments={departments}
        branches={branches}
      />

      <Modal
        title={
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-emerald-600" />
              <span>In Hợp đồng — {printContractTemplate?.templateName}</span>
            </div>
            <Button 
              type="text" 
              icon={isFullscreenContract ? <Minimize size={16} /> : <Maximize size={16} />} 
              onClick={() => setIsFullscreenContract(!isFullscreenContract)} 
              title={isFullscreenContract ? "Thu nhỏ" : "Phóng to toàn màn hình"}
            />
          </div>
        }
        open={isPrintContractOpen}
        onCancel={() => { setIsPrintContractOpen(false); setIsFullscreenContract(false); }}
        footer={[
          <Button key="close" onClick={() => { setIsPrintContractOpen(false); setIsFullscreenContract(false); }}>Đóng</Button>,
          <Button key="print" type="primary" icon={<Printer size={14} />}
            className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
            onClick={() => {
              const el = document.getElementById('employee-contract-preview');
              if (!el) return;
              const win = window.open('', '_blank');
              if (!win) return;
              win.document.write(`<!DOCTYPE html><html><head><title>Hợp đồng ${printContractEmp?.fullName || ''}</title><style>
                * { box-sizing: border-box; }
                body { margin: 0; font-family: 'Times New Roman', serif; }
                @page { size: A4 portrait; margin: 0; }
                @media print { body { margin: 0; } }
              </style></head><body>${el.outerHTML}</body></html>`);
              win.document.close();
              win.focus();
              setTimeout(() => win.print(), 400);
            }}>
            In / Xuất PDF
          </Button>,
        ]}
        width={isFullscreenContract ? '100vw' : 800}
        style={isFullscreenContract ? { top: 0, margin: 0, padding: 0, maxWidth: '100vw' } : undefined}
        centered={!isFullscreenContract}
        styles={{ body: { padding: 0, maxHeight: isFullscreenContract ? 'calc(100vh - 110px)' : '80vh', overflowY: 'auto' } }}
      >
        {printContractTemplate && <ContractA4Preview template={printContractTemplate} id="employee-contract-preview" employee={printContractEmp || undefined} />}
      </Modal>

      <Modal
        title="Chọn Mẫu Hợp Đồng"
        open={isCreateContractOpen}
        onCancel={() => { setIsCreateContractOpen(false); setCreateContractEmp(null); }}
        footer={null}
      >
        <p className="text-slate-500 mb-4">Vui lòng chọn một mẫu hợp đồng để tạo cho nhân viên <strong>{createContractEmp?.fullName}</strong>:</p>
        <div className="grid grid-cols-1 gap-3">
          {contractTemplates?.map((template: ContractTemplate) => (
            <div 
              key={template._id} 
              className="border border-slate-200 hover:border-blue-500 hover:shadow-sm p-4 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
              onClick={() => {
                setIsCreateContractOpen(false);
                router.push(`/contracts/fill/${template._id}?employeeId=${createContractEmp?.id}`);
              }}
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 text-blue-600 p-2 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 m-0">{template.templateName}</h4>
                </div>
              </div>
              <Button size="small" type="primary" className="opacity-0 group-hover:opacity-100 transition-opacity">Tạo ngay</Button>
            </div>
          ))}
        </div>
      </Modal>

      {/* Modal chọn mẫu Hợp đồng bổ sung / Phụ lục */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <FilePlus2 className="w-5 h-5 text-violet-600" />
            <span>Chọn Mẫu Hợp đồng Bổ sung</span>
          </div>
        }
        open={isSupplementaryContractOpen}
        onCancel={() => { setIsSupplementaryContractOpen(false); setSupplementaryContractEmp(null); }}
        footer={null}
      >
        <div className="mb-3 p-3 bg-violet-50 border border-violet-100 rounded-lg text-xs text-violet-700">
          📄 Hợp đồng bổ sung (phụ lục) sẽ được thêm vào lịch sử mà <strong>không kết thúc</strong> hợp đồng đang hiệu lực của{' '}<strong>{supplementaryContractEmp?.fullName}</strong>.
        </div>
        <p className="text-slate-500 mb-4 text-sm">Chọn mẫu hợp đồng bổ sung:</p>
        <div className="grid grid-cols-1 gap-3">
          {contractTemplates?.map((template: ContractTemplate) => (
            <div
              key={template._id}
              className="border border-slate-200 hover:border-violet-500 hover:shadow-sm p-4 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
              onClick={() => {
                setIsSupplementaryContractOpen(false);
                router.push(`/contracts/fill/${template._id}?employeeId=${supplementaryContractEmp?.id}&supplementary=true`);
              }}
            >
              <div className="flex items-center gap-3">
                <div className="bg-violet-50 text-violet-600 p-2 rounded-lg group-hover:bg-violet-500 group-hover:text-white transition-colors">
                  <FilePlus2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 m-0">{template.templateName}</h4>
                  <span className="text-xs text-slate-400">Phụ lục / Bổ sung</span>
                </div>
              </div>
              <Button size="small" type="primary" className="opacity-0 group-hover:opacity-100 transition-opacity bg-violet-600 border-violet-600">Chọn</Button>
            </div>
          ))}
        </div>
      </Modal>

      </div>
    </div>
  );
}

