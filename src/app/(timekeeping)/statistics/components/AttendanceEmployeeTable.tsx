'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type Key } from 'react';
import { RefreshCcw, Search, UserRound, FileText, Filter } from 'lucide-react';
import { Drawer, Button } from 'antd';
import { ButtonBase } from '@/app/ui/base/button';
import { InputBase } from '@/app/ui/base/input';
import { SelectBase } from '@/app/ui/base/select';
import { TableBase, type Column } from '@/app/ui/base/table';
import DateSinglePicker from '@/app/ui/base/date-picker';
import DepartmentTreeSelect from './DepartmentTreeSelect';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { DateRange } from '@/app/lib/timekeeping/statisticsService';
import { fetchEmployeesWithFilters } from '@/app/lib/timekeeping/statisticsService';
import type { DepartmentTimekeeping, DepartmentGroupTimekeeping } from '@/app/interface/timekeeping';

export interface EmployeeAttendance {
  id?: string;
  _id?: string;
  employeeCode: string;
  employeeName: string;
  attendanceCode: string;
  branchId?: string;
  branchTimekeeping: string;
  schedule: 'Full time' | 'Part time';
  position: string;
  departmentId?: string;
  department: string;
  startDate: string;
  locationId?: string;
}

interface BranchTimekeeping {
  _id: string;
  id: string;
  code: string;
  name: string;
  status: 'Active' | 'Inactive';
}

interface LocationTimekeeping {
  _id: string;
  locationName: string;
  locationSlug: string;
  branchId?: string;
}

interface DepartmentRow {
  _id?: unknown;
  id?: unknown;
  name?: string;
  departmentName?: string;
}

interface EmployeeApiRow {
  id?: string;
  employeeCode?: string;
  fullName?: string;
  name?: string;
  attendanceCode?: string;
  enrollNumber?: string;
  branchId?: unknown;
  locationName?: string;
  employeeType?: string;
  role?: string;
  devicePrivilege?: string;
  deptGroupId?: string | DepartmentRow | null;
  departmentGroupName?: string;
  deptGroupName?: string;
  departmentId?: string | DepartmentRow | null;
  department?: string | DepartmentRow | null;
  departmentName?: string;
  joinDate?: string;
  createdAt?: string;
  locationId?: unknown;
}

interface AttendanceEmployeeTableProps {
  activeEmployeeCode: string;
  checkedEmployeeCodes: string[];
  employees: EmployeeAttendance[];
  onActiveEmployeeChange: (employeeCode: string) => void;
  onCheckedEmployeesChange: (employeeCodes: string[]) => void;
  onEmployeesLoaded?: (employees: EmployeeAttendance[]) => void;
  initialDateRange?: DateRange | null;
  onViewAttendance?: (fromDate?: string, toDate?: string) => void;
  searchMode: string;
  searchValue: string;
  appliedSearch: string;
  onSearchModeChange: (val: string) => void;
  onSearchValueChange: (val: string) => void;
  onAppliedSearchChange: (val: string) => void;
}

const SEARCH_OPTIONS = [
  { value: 'all', label: 'Tất cả trường' },
  { value: 'employeeCode', label: 'Theo mã nhân viên' },
  { value: 'fullName', label: 'Theo tên nhân viên' }
];
const FILTERS_STORAGE_KEY = 'timekeeping.statistics.filters';
const DATE_RANGE_STORAGE_KEY = 'timekeeping.statistics.dateRange';

interface StoredFilters {
  selectedBranches?: string[];
  selectedDepartments?: string[];
  selectedLocations?: string[];
  searchMode?: string;
  searchValue?: string;
  appliedSearch?: string;
}

const readStoredFilters = (): StoredFilters => {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FILTERS_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const readStoredDateRange = (): DateRange | null => {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DATE_RANGE_STORAGE_KEY) || 'null');
    if (parsed && typeof parsed.from === 'string' && typeof parsed.to === 'string') {
      return { from: parsed.from, to: parsed.to };
    }
  } catch {
    return null;
  }
  return null;
};

const parseStoredDate = (date?: string) => {
  if (!date) return null;
  const parsed = dayjs(date);
  return parsed.isValid() ? parsed : null;
};

const toSafeText = (value: unknown) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object' && 'toString' in value) {
    const text = String(value);
    return text === '[object Object]' ? '' : text;
  }
  return '';
};

const getObjectFieldText = (value: unknown, keys: string[]) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of keys) {
      const text = toSafeText(record[key]);
      if (text) return text;
    }
  }
  return toSafeText(value);
};

const getObjectIdText = (value: unknown) => getObjectFieldText(value, ['_id', 'id', 'code', 'name']);

const getDepartmentText = (value: unknown) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const department = value as DepartmentRow & { code?: string; shortName?: string };
    return department.name
      || department.departmentName
      || department.shortName
      || department.code
      || toSafeText(department._id)
      || toSafeText(department.id)
      || '';
  }
  return String(value);
};

const getDepartmentIdText = (value: unknown) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const department = value as DepartmentRow;
    return toSafeText(department._id) || toSafeText(department.id) || department.name || department.departmentName || '';
  }
  return String(value);
};

const columns: Column<EmployeeAttendance>[] = [
  {
    title: 'Nhân viên',
    dataIndex: 'employeeName',
    width: 340,
    render: (_, record) => (
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-xs">
          <UserRound className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <span className="block truncate text-sm font-medium text-slate-800">{record.employeeName}</span>
          <span className="block font-mono text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Mã NV: {record.employeeCode}
          </span>
        </div>
      </div>
    ),
  },
  {
    title: 'Mã chấm công',
    dataIndex: 'attendanceCode',
    width: 150,
    render: (value) => (
      <span className="inline-flex min-w-11 justify-center rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-extrabold text-slate-700">
        {String(value ?? '')}
      </span>
    ),
  },
  {
    title: 'Lịch trình',
    dataIndex: 'schedule',
    width: 150,
    render: (value) => {
      const isFullTime = value === 'Full time';
      return (
        <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-extrabold ${isFullTime ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
          }`}>
          {String(value ?? '')}
        </span>
      );
    },
  },
  {
    title: 'Khối / Cụm',
    dataIndex: 'position',
    width: 150,
    render: (value) => (
      <span className="text-xs font-bold text-slate-600">{String(value ?? '')}</span>
    ),
  },
  {
    title: 'Phòng ban',
    dataIndex: 'department',
    width: 150,
    render: (value) => (
      <span className="inline-flex rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] font-extrabold text-slate-600 shadow-xs">
        {String(value ?? '')}
      </span>
    ),
  },
  {
    title: 'Ngày vào làm',
    dataIndex: 'startDate',
    width: 160,
    render: (value) => (
      <span className="font-mono text-xs font-semibold text-slate-600">{String(value ?? '')}</span>
    ),
  },
];

export const MOCK_EMPLOYEES: EmployeeAttendance[] = [];

export default function AttendanceEmployeeTable({
  activeEmployeeCode,
  checkedEmployeeCodes,
  employees,
  onActiveEmployeeChange,
  onCheckedEmployeesChange,
  onEmployeesLoaded,
  initialDateRange,
  onViewAttendance,
  searchMode,
  searchValue,
  appliedSearch,
  onSearchModeChange,
  onSearchValueChange,
  onAppliedSearchChange,
}: AttendanceEmployeeTableProps) {
  const [branchRows, setBranchRows] = useState<BranchTimekeeping[]>([]);
  const [locationRows, setLocationRows] = useState<LocationTimekeeping[]>([]);
  // deptRows và groupRows được fetch 1 lần tại đây, rồi truyền xuống DepartmentTreeSelect
  const [deptRows, setDeptRows] = useState<DepartmentTimekeeping[]>([]);
  const [groupRows, setGroupRows] = useState<DepartmentGroupTimekeeping[]>([]);
  const [apiEmployees, setApiEmployees] = useState<EmployeeAttendance[]>([]);
  const [storedFilters] = useState(readStoredFilters);
  const [selectedBranches, setSelectedBranches] = useState<string[]>(storedFilters.selectedBranches || []);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(storedFilters.selectedDepartments || []);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(storedFilters.selectedLocations || []);
  const [storedDateRange] = useState(readStoredDateRange);
  const initialRange = initialDateRange || storedDateRange;
  const [fromDate, setFromDate] = useState<Dayjs | null>(() => parseStoredDate(initialRange?.from));
  const [toDate, setToDate] = useState<Dayjs | null>(() => parseStoredDate(initialRange?.to));
  const [hasFetched, setHasFetched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMetadataLoaded, setIsMetadataLoaded] = useState(false);
  const [isMobileFilterVisible, setIsMobileFilterVisible] = useState(false);

  const [prevAppliedSearch, setPrevAppliedSearch] = useState(appliedSearch);
  const [prevSearchMode, setPrevSearchMode] = useState(searchMode);

  if (appliedSearch !== prevAppliedSearch) {
    setPrevAppliedSearch(appliedSearch);
    setCurrentPage(1);
  }
  if (searchMode !== prevSearchMode) {
    setPrevSearchMode(searchMode);
    setCurrentPage(1);
  }

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/branch-timekeeping').then(r => r.ok ? r.json() : { data: [] }),
      fetch('/api/departments-timekeeping').then(r => r.ok ? r.json() : { data: [] }),
      fetch('/api/v1/kiosk/locations').then(r => r.ok ? r.json() : { data: [] }),
      fetch('/api/department-groups-timekeeping').then(r => r.ok ? r.json() : { data: [] }),
    ]).then(([branchesRes, deptsRes, locsRes, groupsRes]) => {
      const branches = (branchesRes.data || []) as BranchTimekeeping[];
      const locs = (locsRes.data || []) as LocationTimekeeping[];
      const groups = (groupsRes.data || []) as DepartmentGroupTimekeeping[];

      const activeBranches = branches.filter((branch) => branch.status === 'Active');
      setBranchRows(activeBranches);
      setLocationRows(locs);
      setDeptRows(deptsRes.data || []);
      setGroupRows(groups);
      setIsMetadataLoaded(true);
    }).catch((err) => {
      console.error('[DEBUG] Fetch metadata error:', err);
      setIsMetadataLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!isMetadataLoaded) return;
    let isMounted = true;
    queueMicrotask(() => {
      if (isMounted) setIsLoading(true);
    });

    fetchEmployeesWithFilters({
      selectedBranches,
      selectedDepartments,
      selectedLocations,
      searchMode,
      appliedSearch,
      page: currentPage,
      limit: pageSize,
    }).then((res: { data?: EmployeeApiRow[]; total?: number } | EmployeeApiRow[]) => {
      if (!isMounted) return;
      setHasFetched(true);
      setIsLoading(false);

      const emps = Array.isArray(res) ? res : (res?.data || []);
      const totalCount = Array.isArray(res) ? res.length : (res?.total || 0);
      setTotalEmployees(totalCount);

      const list = emps.map((e: EmployeeApiRow) => {
        const branchId = getObjectIdText(e.branchId);
        const locationId = getObjectIdText(e.locationId);
        const branch = branchRows.find((b) => b.id === branchId || b._id === branchId || b.code === branchId);
        const departmentId = getDepartmentIdText(e.departmentId || e.department);
        const dept = deptRows.find((d) => d._id === departmentId || d.name === departmentId || d.code === departmentId);
        const deptGroupId = getDepartmentIdText(e.deptGroupId);
        const group = groupRows.find((g) => (
          g._id === deptGroupId
          || g._id === dept?.departmentGroupTimekeepingId
          || g.name === getDepartmentText(e.departmentGroupName)
          || g.name === getDepartmentText(e.deptGroupName)
        ));
        const groupName = group?.name
          || getDepartmentText(e.departmentGroupName)
          || getDepartmentText(e.deptGroupName)
          || 'Chung';
        const departmentName = dept?.name
          || getDepartmentText(e.departmentName)
          || getDepartmentText(e.department)
          || departmentId
          || 'Chung';
        const branchName = branch?.code
          || e.locationName
          || getObjectFieldText(e.branchId, ['code', 'name'])
          || 'Chung';

        return {
          id: e.id,
          _id: e.id,
          employeeCode: e.employeeCode || e.id || '',
          employeeName: e.fullName || e.name || '',
          attendanceCode: e.attendanceCode || e.enrollNumber || e.employeeCode || e.id || '',
          branchId: branch?._id || branch?.id || branchId,
          branchTimekeeping: branchName,
          schedule: (e.employeeType === 'full_time' ? 'Full time' : 'Part time') as 'Full time' | 'Part time',
          position: groupName,
          departmentId,
          department: departmentName,
          startDate: (e.joinDate || e.createdAt || '').substring(0, 10),
          locationId,
        };
      });
      setApiEmployees(list);
      onEmployeesLoaded?.(list);
    }).catch((err) => {
      console.error('[DEBUG] Fetch employees error:', err);
      if (isMounted) setIsLoading(false);
    });

    return () => { isMounted = false; };
  }, [isMetadataLoaded, selectedBranches, selectedDepartments, selectedLocations, searchMode, appliedSearch, currentPage, pageSize, onEmployeesLoaded]);

  const branchOptions = useMemo(
    () => branchRows.map((b) => ({ value: b._id || b.id || b.code, label: b.name })),
    [branchRows],
  );

  const locationOptions = useMemo(() => {
    let filteredLocs = locationRows;
    if (selectedBranches.length > 0) {
      const branchIds = new Set(
        selectedBranches.flatMap((sel) => {
          const branch = branchRows.find((b) => b._id === sel || b.id === sel || b.code === sel);
          return branch ? [branch._id, branch.id].filter(Boolean) : [];
        })
      );
      filteredLocs = locationRows.filter(l => l.branchId && branchIds.has(l.branchId));
    }
    return filteredLocs.map((l) => ({ value: l._id, label: l.locationName }));
  }, [locationRows, selectedBranches, branchRows]);

  const handleSearchInput = useCallback((value: string) => {
    onSearchValueChange(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => onAppliedSearchChange(value), 1000);
  }, [onSearchValueChange, onAppliedSearchChange]);

  const handleRefresh = () => {
    setSelectedBranches([]);
    setSelectedDepartments([]);
    setSelectedLocations([]);
    onSearchModeChange('all');
    onSearchValueChange('');
    onAppliedSearchChange('');
    setCurrentPage(1);
  };

  useEffect(() => {
    window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({
      selectedBranches,
      selectedDepartments,
      selectedLocations,
      searchMode,
      searchValue,
      appliedSearch,
    }));
  }, [appliedSearch, searchMode, searchValue, selectedBranches, selectedDepartments, selectedLocations]);

  useEffect(() => {
    if (fromDate && toDate) {
      window.localStorage.setItem(DATE_RANGE_STORAGE_KEY, JSON.stringify({
        from: fromDate.format('YYYY-MM-DD'),
        to: toDate.format('YYYY-MM-DD'),
      }));
      return;
    }

    if (!fromDate && !toDate) {
      window.localStorage.removeItem(DATE_RANGE_STORAGE_KEY);
    }
  }, [fromDate, toDate]);

  const handleCheckedEmployeesChange = (selectedRowKeys: Key[]) => {
    const nextCodes = selectedRowKeys.map(String);
    onCheckedEmployeesChange(nextCodes);
  };

  const filteredEmployees = useMemo(() => {
    return hasFetched ? apiEmployees : employees;
  }, [apiEmployees, employees, hasFetched]);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* ── Filter bar ── */}
      <div className="hidden sm:flex items-center gap-2 overflow-x-auto border-b border-slate-200 bg-white p-3 text-xs whitespace-nowrap">
        <label className="shrink-0 font-bold text-slate-500" htmlFor="att-table-branch">
          Chi Nhánh Công
        </label>
        <div className="w-[200px] shrink-0">
          <SelectBase
            id="att-table-branch"
            value={selectedBranches}
            isSort={false}
            mode="multiple"
            options={branchOptions}
            className="!h-auto min-h-8 text-xs"
            allowClear
            placeholder="Tất cả chi nhánh"
            maxTagCount={2}
            maxTagPlaceholder={(omitted) => `+${omitted.length}`}
            onChange={(v) => {
              const vals = (Array.isArray(v) ? v : v ? [v] : []).map(String);
              setSelectedBranches(vals);
              setSelectedLocations([]);
              setCurrentPage(1);
            }}
          />
        </div>

        <label className="ml-2 shrink-0 font-bold text-slate-500" htmlFor="att-table-location">
          Địa điểm chấm công
        </label>
        <div className="w-[200px] shrink-0">
          <SelectBase
            id="att-table-location"
            value={selectedLocations}
            isSort={false}
            mode="multiple"
            options={locationOptions}
            className="!h-auto min-h-8 text-xs"
            allowClear
            placeholder="Tất cả địa điểm"
            maxTagCount={2}
            maxTagPlaceholder={(omitted) => `+${omitted.length}`}
            onChange={(v) => {
              const vals = (Array.isArray(v) ? v : v ? [v] : []).map(String);
              setSelectedLocations(vals);
              setCurrentPage(1);
            }}
          />
        </div>

        <label className="ml-2 shrink-0 font-bold text-slate-500" htmlFor="att-table-dept">
          Phòng ban
        </label>
        <div className="w-[240px] shrink-0">
          <DepartmentTreeSelect
            value={selectedDepartments}
            allowClear
            multiple
            onChange={(v) => {
              const vals = (Array.isArray(v) ? v : v ? [v] : []).map(String);
              setSelectedDepartments(vals);
              setCurrentPage(1);
            }}
            departmentRows={deptRows}
            groupRows={groupRows}
          />
        </div>

        <ButtonBase
          className="h-8 w-9 shrink-0 rounded-lg border border-slate-200 bg-white !p-0 text-slate-500 shadow-xs hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          onClick={handleRefresh}
          title="Làm mới"
        >
          <RefreshCcw className="h-4 w-4" strokeWidth={2.3} />
        </ButtonBase>
      </div>

      <div className="flex sm:hidden items-center p-3 border-b border-slate-200 bg-white">
        <Button 
          icon={<Filter className="w-4 h-4" />} 
          onClick={() => setIsMobileFilterVisible(true)}
          className="w-full h-10 bg-white border-slate-200 text-slate-600 font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs"
        >
          Lọc dữ liệu {(selectedBranches.length > 0 || selectedLocations.length > 0 || selectedDepartments.length > 0) ? '(Đang bật)' : ''}
        </Button>
      </div>

      <Drawer
        title={
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-700 text-sm">Bộ lọc hiển thị</span>
          </div>
        }
        placement="left"
        width={320}
        onClose={() => setIsMobileFilterVisible(false)}
        open={isMobileFilterVisible}
        className="[&_.ant-drawer-body]:p-5"
        extra={
          (selectedBranches.length > 0 || selectedLocations.length > 0 || selectedDepartments.length > 0) && (
            <Button type="text" danger onClick={handleRefresh} className="text-xs font-bold px-2">
              Đặt lại
            </Button>
          )
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chi nhánh công:</span>
            <div className="w-full">
              <SelectBase
                value={selectedBranches}
                isSort={false}
                mode="multiple"
                options={branchOptions}
                className="!h-auto min-h-10 text-sm"
                allowClear
                placeholder="Tất cả chi nhánh"
                maxTagCount="responsive"
                onChange={(v) => {
                  const vals = (Array.isArray(v) ? v : v ? [v] : []).map(String);
                  setSelectedBranches(vals);
                  setSelectedLocations([]);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Địa điểm:</span>
            <div className="w-full">
              <SelectBase
                value={selectedLocations}
                isSort={false}
                mode="multiple"
                options={locationOptions}
                className="!h-auto min-h-10 text-sm"
                allowClear
                placeholder="Tất cả địa điểm"
                maxTagCount="responsive"
                onChange={(v) => {
                  const vals = (Array.isArray(v) ? v : v ? [v] : []).map(String);
                  setSelectedLocations(vals);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phòng ban:</span>
            <div className="w-full">
              <DepartmentTreeSelect
                value={selectedDepartments}
                allowClear
                multiple
                onChange={(v) => {
                  const vals = (Array.isArray(v) ? v : v ? [v] : []).map(String);
                  setSelectedDepartments(vals);
                  setCurrentPage(1);
                }}
                departmentRows={deptRows}
                groupRows={groupRows}
              />
            </div>
          </div>
          
          <Button type="primary" className="mt-2 w-full h-10 rounded-xl font-bold" onClick={() => setIsMobileFilterVisible(false)}>
            Áp dụng
          </Button>
        </div>
      </Drawer>

      {/* ── Table ── */}
      <div className="bg-slate-50 p-3">
        <div className="mb-2 flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-xs">
          <div>
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Danh sách nhân viên
            </span>
            <span className="block text-xs font-semibold text-slate-600">
              {totalEmployees} nhân viên (theo bộ lọc)
            </span>
          </div>
          <div className="flex items-center gap-3">
            {checkedEmployeeCodes.length > 0 && (
              <button
                onClick={() => onCheckedEmployeesChange([])}
                className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 underline underline-offset-2 transition-colors cursor-pointer"
              >
                Bỏ chọn tất cả
              </button>
            )}
            <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
              Đã chọn {checkedEmployeeCodes.length}
            </div>
          </div>
        </div>

        <TableBase<EmployeeAttendance>
          columns={columns}
          data={filteredEmployees}
          rowKey="employeeCode"
          isSTT
          loading={isLoading}
          rowSelection={{
            selectedRowKeys: checkedEmployeeCodes,
            onChange: handleCheckedEmployeesChange,
            onSelectAll: async (selected) => {
              if (selected) {
                try {
                  const codes = await fetchEmployeesWithFilters({
                    selectedBranches,
                    selectedDepartments,
                    selectedLocations,
                    searchMode,
                    appliedSearch,
                    fetchCodes: true,
                  });
                  onCheckedEmployeesChange(codes as string[]);
                } catch (error) {
                  console.error('Failed to select all codes', error);
                }
              } else {
                onCheckedEmployeesChange([]);
              }
            },
          }}
          onRow={(record) => ({
            onClick: () => onActiveEmployeeChange(record.employeeCode),
          })}
          pagination={{
            current: currentPage,
            pageSize,
            total: totalEmployees,
            showSizeChanger: true,
            onPageChange: (page, size) => {
              setCurrentPage(page);
              if (size) setPageSize(size);
            },
          }}
          className="w-full rounded-2xl border-slate-100 bg-white shadow-sm min-h-[520px]"
          classNameHead="!bg-slate-100 !text-slate-500"
          classNameBody="text-xs"
          classNameRow={(record) => (
            record.employeeCode === activeEmployeeCode
              ? 'bg-blue-50 hover:bg-blue-50'
              : ''
          )}
        />
      </div>

      {/* ── Toolbar Bottom ── */}
      <div className="flex items-center justify-between p-3 border-t border-slate-100 bg-white rounded-b-2xl flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-600">Từ ngày:</span>
            <div className="w-[130px]">
              <DateSinglePicker
                values={fromDate}
                onDateChange={setFromDate}
                onPresetRangeSelect={(start, end) => {
                  setFromDate(start);
                  setToDate(end);
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-600">Đến ngày:</span>
            <div className="w-[130px]">
              <DateSinglePicker
                values={toDate}
                onDateChange={setToDate}
                isEndDate={true}
                onPresetRangeSelect={(start, end) => {
                  setFromDate(start);
                  setToDate(end);
                }}
              />
            </div>
          </div>
          <ButtonBase
            onClick={() => onViewAttendance?.(fromDate?.format('YYYY-MM-DD'), toDate?.format('YYYY-MM-DD'))}
            className="flex items-center gap-1.5 h-8 px-4 border border-blue-200 bg-white text-blue-600 hover:bg-blue-50 rounded-lg shadow-xs font-semibold text-xs"
          >
            <FileText className="w-3.5 h-3.5" />
            Xem công
          </ButtonBase>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-slate-600">Ngày đầu tháng tính công</span>
          <div className="w-[60px]">
            <SelectBase
              options={[{ value: '1', label: '1' }]}
              value="1"
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
