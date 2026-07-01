'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, message } from 'antd';


import ShiftListTable, { type ShiftIconType, type ShiftItem } from '@/app/(timekeeping)/shifts/components/ShiftListTable';
import ShiftConfigForm, { type ShiftConfigFormValues } from '@/app/(timekeeping)/shifts/components/ShiftConfigForm';
import type { DepartmentGroupTimekeeping, Employee, ShiftConfig } from '@/app/interface/timekeeping';

interface ShiftConfigApiResponse {
  success?: boolean;
  data?: ShiftConfig[] | ShiftConfig;
  total?: number;
  message?: string;
  error?: string;
}

interface DepartmentGroupApiResponse {
  data?: DepartmentGroupTimekeeping[];
  total?: number;
  success?: boolean;
  message?: string;
  error?: string;
}

interface EmployeesApiResponse {
  data?: Employee[];
}

const API_URL = '/api/shift-configs';
const NEW_SHIFT_KEY = '__new_shift__';

function parseNumber(value?: string | number, fallback = 0) {
  const numberValue = Number(value ?? fallback);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeVietnamese(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function toFormValues(shift?: Partial<ShiftConfig>): ShiftConfigFormValues {
  return {
    code: shift?.code || '',
    name: shift?.name || '',
    branchIds: shift?.branchIds || [],
    locationIds: shift?.locationIds || [],
    departmentGroupIds: shift?.departmentGroupIds || [],
    departmentIds: shift?.departmentIds || [],
    assignedEmployeeCodes: shift?.assignedEmployeeCodes || [],
    startTime: shift?.startTime || '',
    endTime: shift?.endTime || '',
    crossDayCount: shift?.crossDayCount || '',
    breakStartTime: shift?.breakStartTime || '',
    breakEndTime: shift?.breakEndTime || '',
    totalMinutes: shift?.totalMinutes || '',
    workUnit: shift?.workUnit || '',
    validCheckInStart: shift?.validCheckInStart || '',
    validCheckInEnd: shift?.validCheckInEnd || '',
    validCheckOutStart: shift?.validCheckOutStart || '',
    validCheckOutEnd: shift?.validCheckOutEnd || '',
    noCheckOutMinutes: shift?.noCheckOutMinutes || '',
    noCheckInMinutes: shift?.noCheckInMinutes || '',
    displayOrder: shift?.displayOrder || '1',
    isActive: shift?.isActive ?? true,
  };
}

function toApiPayload(values: ShiftConfigFormValues): Omit<ShiftConfig, '_id' | 'createdAt' | 'updatedAt'> {
  const safeTrim = (str?: string) => (str || '').trim();
  
  return {
    id: '',
    code: safeTrim(values.code),
    name: safeTrim(values.name),
    branchIds: values.branchIds || [],
    locationIds: values.locationIds || [],
    departmentGroupIds: values.departmentGroupIds || [],
    departmentIds: values.departmentIds || [],
    assignedEmployeeCodes: values.assignedEmployeeCodes || [],
    startTime: safeTrim(values.startTime),
    endTime: safeTrim(values.endTime),
    crossDayCount: safeTrim(values.crossDayCount) || '0',
    breakStartTime: safeTrim(values.breakStartTime),
    breakEndTime: safeTrim(values.breakEndTime),
    totalMinutes: safeTrim(values.totalMinutes) || '0',
    workUnit: safeTrim(values.workUnit) || '1',
    validCheckInStart: safeTrim(values.validCheckInStart),
    validCheckInEnd: safeTrim(values.validCheckInEnd),
    validCheckOutStart: safeTrim(values.validCheckOutStart),
    validCheckOutEnd: safeTrim(values.validCheckOutEnd),
    noCheckOutMinutes: safeTrim(values.noCheckOutMinutes) || '0',
    noCheckInMinutes: safeTrim(values.noCheckInMinutes) || '0',
    displayOrder: safeTrim(values.displayOrder) || '1',
    isActive: values.isActive,
  };
}

function getIconType(shift: ShiftConfig): ShiftIconType {
  const code = normalizeVietnamese(shift.code);
  const name = normalizeVietnamese(shift.name);
  const startHour = Number(shift.startTime.split(':')[0] || 0);

  if (code.includes('sa') || name.includes('sang')) return 'sun-cyan';
  if (code.includes('ch') || name.includes('chieu')) return 'sun-orange';
  if (code.includes('toi') || code.includes('ct') || name.includes('toi') || startHour >= 18) return 'moon-blue';
  if (code.includes('hc')) return 'dot-gray';
  return shift.isActive ? 'dot-green' : 'dot-orange';
}

function normalizeResponseData(data: ShiftConfigApiResponse['data']): ShiftConfig[] {
  if (Array.isArray(data)) return data;
  if (data) return [data];
  return [];
}

import { hasPermission, getCachedRoles } from '@/app/service/permissions/permissions';
import Unauthorized from '@/app/ui/timekeeping/components/unauthorized/Unauthorized';
import { cookieBase } from '@/app/utils/cookie';
import type { User } from '@/app/data/dataUser';

export default function ShiftsPage() {
  const [form] = Form.useForm<ShiftConfigFormValues>();
  const [shifts, setShifts] = useState<ShiftConfig[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [departmentGroups, setDepartmentGroups] = useState<DepartmentGroupTimekeeping[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [realUser, setRealUser] = useState<User | null>(null);

  useEffect(() => {
    const userObj = cookieBase.get<User>('info_user');
    setTimeout(() => {
      if (userObj) setRealUser(userObj);
      setIsLoaded(true);
    }, 0);
  }, []);

  const findShiftByKey = useCallback(
    (key: string) => shifts.find((shift) => (shift._id || shift.id || shift.code) === key),
    [shifts],
  );

  const selectedShift = findShiftByKey(selectedShiftId);

  const loadShifts = useCallback(async (preferredSelectedId?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(API_URL, { method: 'GET' });
      const json = await response.json() as ShiftConfigApiResponse;

      if (!response.ok || json.success === false) {
        throw new Error(json.message || json.error || 'Không tải được danh sách ca');
      }

      const nextShifts = normalizeResponseData(json.data).sort((a, b) => {
        const orderDiff = parseNumber(a.displayOrder) - parseNumber(b.displayOrder);
        return orderDiff || a.code.localeCompare(b.code);
      });

      setShifts(nextShifts);
      setSelectedShiftId((currentSelectedId) => {
        const requestedId = preferredSelectedId || currentSelectedId;
        const finalId = nextShifts.some((shift) => (shift._id || shift.id || shift.code) === requestedId)
          ? requestedId
          : nextShifts[0]?._id || nextShifts[0]?.id || nextShifts[0]?.code || '';
          
        setTimeout(() => {
          const loadedShift = nextShifts.find((s) => (s._id || s.id || s.code) === finalId);
          if (loadedShift) {
            form.setFieldsValue(toFormValues(loadedShift));
          }
        }, 0);
        
        return finalId;
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Không tải được danh sách ca';
      message.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [form]);

  const loadDepartmentGroups = useCallback(async () => {
    try {
      const response = await fetch('/api/department-groups-timekeeping');
      const json = await response.json() as DepartmentGroupApiResponse;

      if (!response.ok || json.success === false) {
        throw new Error(json.message || json.error || 'Không tải được danh sách khối / cụm');
      }

      setDepartmentGroups(json.data || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Không tải được danh sách khối / cụm';
      message.error(errorMessage);
    }
  }, []);



  const loadOtherOptions = useCallback(async () => {
    try {
      const [branchRes, locRes, deptRes] = await Promise.all([
        fetch('/api/branch-timekeeping').then(r => r.json()),
        fetch('/api/v1/kiosk/locations').then(r => r.json()),
        fetch('/api/departments-timekeeping').then(r => r.json())
      ]);
      if (branchRes?.data) setBranches(branchRes.data);
      if (locRes?.data) setLocations(locRes.data);
      if (deptRes?.data) setDepartments(deptRes.data);
    } catch (error) {
      console.error('Failed to load options', error);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadShifts();
      void loadDepartmentGroups();
      void loadOtherOptions();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDepartmentGroups, loadShifts, loadOtherOptions]);

  useEffect(() => {
    if (selectedShiftId === NEW_SHIFT_KEY) {
      form.setFieldsValue(toFormValues());
      return;
    }

    const currentSelectedShift = shifts.find(
      (shift) => (shift._id || shift.id || shift.code) === selectedShiftId
    );

    if (currentSelectedShift) {
      form.setFieldsValue(toFormValues(currentSelectedShift));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, selectedShiftId]);

  const tableData = useMemo<ShiftItem[]>(
    () => shifts.map((shift) => ({
      key: shift._id || shift.id || shift.code,
      code: shift.code,
      name: shift.name,
      in: shift.startTime || '',
      out: shift.endTime || '',
      isActive: shift.isActive,
      iconType: getIconType(shift),
    })),
    [shifts],
  );

  const selectedBranchIds = Form.useWatch('branchIds', form) || [];
  const selectedLocationIds = Form.useWatch('locationIds', form) || [];
  const selectedDepartmentGroupIds = Form.useWatch('departmentGroupIds', form) || [];
  const selectedDepartmentIds = Form.useWatch('departmentIds', form) || [];

  const branchOptions = useMemo(() => branches.map(b => ({
    label: b.name || b.branchName,
    value: String(b._id || b.id)
  })), [branches]);

  const locationOptions = useMemo(() => {
    let filtered = locations;
    if (selectedBranchIds.length > 0) {
      filtered = filtered.filter(l => selectedBranchIds.includes(String(l.branchId)));
    }
    return filtered.map(l => ({
      label: l.locationName,
      value: String(l._id || l.id)
    }));
  }, [locations, selectedBranchIds]);

  const departmentGroupOptions = useMemo(() => {
    let filtered = departmentGroups.filter((group) => group.isActive !== false);
    if (selectedLocationIds.length > 0) {
      filtered = filtered.filter(g => selectedLocationIds.includes(String(g.locationId)));
    }
    return filtered.map((group) => {
      const locationName = group.locationName && group.locationName !== 'Chưa phân bổ'
        ? ` - ${group.locationName}`
        : '';
      return {
        label: `${group.name}${locationName}`,
        value: String(group._id || group.code),
      };
    });
  }, [departmentGroups, selectedLocationIds]);

  const departmentOptions = useMemo(() => {
    let filtered = departments;
    if (selectedDepartmentGroupIds.length > 0) {
      filtered = filtered.filter(d => selectedDepartmentGroupIds.includes(String(d.departmentGroupTimekeepingId)));
    } else if (selectedLocationIds.length > 0) {
      filtered = filtered.filter(d => selectedLocationIds.includes(String(d.locationId)));
    }
    return filtered.map(d => ({
      label: `${d.name} ${d.departmentGroupName && d.departmentGroupName !== 'Chưa phân bổ' ? `- ${d.departmentGroupName}` : ''}`,
      value: String(d._id || d.id)
    }));
  }, [departments, selectedDepartmentGroupIds, selectedLocationIds]);



  const handleSelectShift = (key: string) => {
    setSelectedShiftId(key);
    const nextShift = findShiftByKey(key);
    if (nextShift) {
      form.setFieldsValue(toFormValues(nextShift));
    }
  };

  const handleInlineEdit = (key: string, field: 'code' | 'name' | 'in' | 'out', value: string) => {
    if (key !== selectedShiftId) {
      handleSelectShift(key);
    }

    form.setFieldsValue({
      ...(field === 'code' && { code: value }),
      ...(field === 'name' && { name: value }),
      ...(field === 'in' && { startTime: value }),
      ...(field === 'out' && { endTime: value }),
    });

    setShifts((prev) =>
      prev.map((shift) => {
        const shiftKey = shift._id || shift.id || shift.code;
        if (shiftKey === key) {
          return {
            ...shift,
            ...(field === 'code' && { code: value }),
            ...(field === 'name' && { name: value }),
            ...(field === 'in' && { startTime: value }),
            ...(field === 'out' && { endTime: value }),
          };
        }
        return shift;
      }),
    );
  };



  const handleCreate = () => {
    setSelectedShiftId(NEW_SHIFT_KEY);
    
    setShifts((prev) => {
      const filtered = prev.filter((s) => (s._id || s.id || s.code) !== NEW_SHIFT_KEY);
      return [
        {
          _id: NEW_SHIFT_KEY,
          id: '',
          code: '',
          name: '',
          branchIds: [],
          locationIds: [],
          departmentGroupIds: [],
          departmentIds: [],
          startTime: '',
          endTime: '',
          crossDayCount: '',
          breakStartTime: '',
          breakEndTime: '',
          totalMinutes: '',
          workUnit: '',
          validCheckInStart: '',
          validCheckInEnd: '',
          validCheckOutStart: '',
          validCheckOutEnd: '',
          noCheckOutMinutes: '',
          noCheckInMinutes: '',
          isActive: true,
          displayOrder: String(prev.length + 1),
        },
        ...filtered,
      ];
    });

    form.setFieldsValue(toFormValues({
      code: '',
      name: '',
      branchIds: [],
      locationIds: [],
      departmentGroupIds: [],
      departmentIds: [],
      startTime: '',
      endTime: '',
      crossDayCount: '',
      breakStartTime: '',
      breakEndTime: '',
      totalMinutes: '',
      workUnit: '',
      validCheckInStart: '',
      validCheckInEnd: '',
      validCheckOutStart: '',
      validCheckOutEnd: '',
      noCheckOutMinutes: '',
      noCheckInMinutes: '',
      displayOrder: String(shifts.length + 1),
      isActive: true,
    }));
  };

  const handleSave = () => {
    form.submit();
  };

  const handleDelete = async () => {
    if (!selectedShift?._id) {
      message.warning('Chọn ca cần xóa');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}?_id=${encodeURIComponent(selectedShift._id)}`, {
        method: 'DELETE',
      });
      const json = await response.json() as ShiftConfigApiResponse;

      if (!response.ok || json.success === false) {
        throw new Error(json.message || json.error || 'Không xóa được ca');
      }

      message.success('Đã xóa ca làm việc');
      setSelectedShiftId('');
      await loadShifts();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Không xóa được ca';
      message.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}?deleteAll=true`, {
        method: 'DELETE',
      });
      const json = await response.json() as { success: boolean; message?: string; error?: string };

      if (!response.ok || json.success === false) {
        throw new Error(json.message || json.error || 'Không xóa được dữ liệu');
      }

      message.success('Đã xóa tất cả ca làm việc');
      setSelectedShiftId('');
      await loadShifts();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Không xóa được dữ liệu';
      message.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = async (values: ShiftConfigFormValues) => {
    const isEditing = Boolean(selectedShift?._id && selectedShiftId !== NEW_SHIFT_KEY);
    
    // Remove flawed merge logic since form now receives inline edits directly
    if (isEditing) {
      // Intentionally left blank, payload will use `values` directly.
    }

    const payload = toApiPayload(values);
    setIsLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? { _id: selectedShift?._id, ...payload } : payload),
      });
      const json = await response.json() as ShiftConfigApiResponse;

      if (!response.ok || json.success === false) {
        throw new Error(json.message || json.error || 'Không lưu được ca');
      }

      const saved = normalizeResponseData(json.data)[0];
      message.success(isEditing ? 'Đã cập nhật ca làm việc' : 'Đã thêm ca làm việc');
      await loadShifts(saved?._id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Không lưu được ca';
      message.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) return null;

  const roleId = realUser?.role ?? -1;
  const isSuperAdmin = hasPermission(roleId, '*');
  const hasAccess = isSuperAdmin || hasPermission(roleId, 'timekeeping_shifts');
  const hasViewAccess = isSuperAdmin || hasPermission(roleId, 'timekeeping_shift_view');
  const hasCreateAccess = isSuperAdmin || hasPermission(roleId, 'timekeeping_shift_create');
  const hasEditAccess = isSuperAdmin || hasPermission(roleId, 'timekeeping_shift_edit');
  const hasDeleteAccess = isSuperAdmin || hasPermission(roleId, 'timekeeping_shift_delete');

  if (realUser && !hasAccess) {
    return <Unauthorized />;
  }

  return (
    <div className="flex flex-col xl:flex-row h-full w-full gap-4 bg-slate-50 p-2 sm:p-4 overflow-y-auto xl:overflow-hidden">
      {/* Cột Trái / Dưới (Form) */}
      <div className="flex flex-1 flex-col order-2 xl:order-1 overflow-visible xl:overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm relative min-h-[800px] xl:min-h-0">
        {hasViewAccess ? (
          <ShiftConfigForm
            key={selectedShiftId || 'empty-shift-form'}
            form={form}
            onFinish={handleFinish}
            initialValues={toFormValues(selectedShift)}
            branchOptions={branchOptions}
            locationOptions={locationOptions}
            departmentGroupOptions={departmentGroupOptions}
            departmentOptions={departmentOptions}
            selectedBranchIds={selectedBranchIds}
            selectedLocationIds={selectedLocationIds}
            selectedDepartmentGroupIds={selectedDepartmentGroupIds}
            selectedDepartmentIds={selectedDepartmentIds}
            disabled={!hasEditAccess && !hasCreateAccess}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center bg-slate-50/50">
            <span className="bg-slate-100 p-4 rounded-full mb-4">🔒</span>
            <h3 className="font-semibold text-slate-700">Không có quyền xem chi tiết ca</h3>
            <p className="text-sm">Vui lòng liên hệ quản trị viên.</p>
          </div>
        )}
      </div>

      {/* Cột Phải / Trên (Danh sách) */}
      <div className="w-full xl:w-[380px] shrink-0 order-1 xl:order-2 flex flex-col h-[450px] xl:h-[calc(100vh-100px)] xl:sticky xl:top-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {hasViewAccess ? (
          <ShiftListTable
            data={tableData}
            selectedKey={selectedShiftId}
            isLoading={isLoading}
            onSelect={handleSelectShift}
            onCreate={handleCreate}
            onSave={handleSave}
            onDelete={handleDelete}
            onRefresh={() => loadShifts()}
            onDeleteAll={handleDeleteAll}
            onInlineEdit={handleInlineEdit}
            hasCreateAccess={hasCreateAccess}
            hasEditAccess={hasEditAccess}
            hasDeleteAccess={hasDeleteAccess}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center">
            <span className="bg-slate-100 p-4 rounded-full mb-4">🔒</span>
            <p className="text-sm">Không có quyền xem danh sách ca làm việc.</p>
          </div>
        )}
      </div>
    </div>
  );
}
