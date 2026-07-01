'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import { Search } from 'lucide-react';
import { InputBase } from '@/app/ui/base/input';
import { useTimekeepingStore } from '@/app/store/timekeeping/useTimekeepingStore';
import type { AttendanceRequest, Employee, LeaveRequest, OvertimeRequest, ShiftConfig, TimeRecordTimekeeping } from '@/app/interface/timekeeping';
import type { User } from '@/app/data/dataUser';
import { cookieBase } from '@/app/utils/cookie';
import { getCachedRoles, hasPermission } from '@/app/service/permissions/permissions';
import Unauthorized from '@/app/ui/timekeeping/components/unauthorized/Unauthorized';
import TabBase from '@/app/ui/base/tab';
import AttendanceEmployeeTable from './components/AttendanceEmployeeTable';
import type { EmployeeAttendance } from './components/AttendanceEmployeeTable';
import AttendanceSummarySheet from './components/AttendanceSummarySheet';
import EmployeeStatsTable from './components/EmployeeStatsTable';
import {
  buildEmployeeStats,
  formatDisplayDate,
  getEmployeeCode,
  mapTimeRecordsToCheckInLogs,
  type DateRange,
} from '@/app/lib/timekeeping/statisticsService';

interface TimeRecordsApiResponse {
  success?: boolean;
  data?: TimeRecordTimekeeping[];
  total?: number;
  page?: number;
  pageSize?: number;
}

interface ShiftConfigApiResponse {
  success?: boolean;
  data?: ShiftConfig[];
}

interface LeaveRequestsApiResponse {
  data?: LeaveRequest[];
}

interface AttendanceRequestsApiResponse {
  data?: AttendanceRequest[];
  total?: number;
  pageSize?: number;
}

interface OvertimeRequestsApiResponse {
  data?: OvertimeRequest[];
  total?: number;
}

interface EmployeeApiItem {
  id?: string;
  _id?: string;
  employeeCode?: string;
  fullName?: string;
  name?: string;
  attendanceCode?: string;
  enrollNumber?: string;
  branchId?: string | { id?: string; _id?: string; name?: string };
  locationName?: string;
  employeeType?: string;
  role?: string;
  devicePrivilege?: string;
  departmentId?: string | { id?: string; _id?: string; name?: string };
  departmentName?: string;
  joinDate?: string;
  createdAt?: string;
  locationId?: string | { _id?: string; locationName?: string };
}

const getDefaultDateRange = (): DateRange => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
  };
};

const SELECTED_EMPLOYEES_STORAGE_KEY = 'timekeeping.statistics.selectedEmployeeCodes';
const ACTIVE_EMPLOYEE_STORAGE_KEY = 'timekeeping.statistics.activeEmployeeCode';
const DATE_RANGE_STORAGE_KEY = 'timekeeping.statistics.dateRange';

const readStoredString = (key: string) => {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(key) || '';
  } catch {
    return '';
  }
};

const readStoredStringArray = (key: string) => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

const readStoredDateRange = (key: string): DateRange | null => {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || 'null');
    if (
      parsed
      && typeof parsed.from === 'string'
      && typeof parsed.to === 'string'
    ) {
      return { from: parsed.from, to: parsed.to };
    }
  } catch {
    return null;
  }
  return null;
};

const countInclusiveDays = (range: DateRange | null) => {
  if (!range) return 22;

  const from = new Date(range.from);
  const to = new Date(range.to);
  const diff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diff);
};

const getDisplayText = (value: unknown) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const row = value as { _id?: string; id?: string; name?: string; departmentName?: string; code?: string; shortName?: string };
    return row.name || row.departmentName || row.shortName || row.code || row._id || row.id || '';
  }
  return String(value);
};

const toEmployee = (employee: EmployeeAttendance): Employee => ({
  id: employee.attendanceCode || employee.employeeCode,
  _id: employee.id || employee._id,
  employeeCode: employee.employeeCode,
  name: employee.employeeName,
  fullName: employee.employeeName,
  role: employee.position,
  employeeType: employee.schedule === 'Full time' ? 'full_time' : 'part_time',
  email: '',
  status: 'Active',
  avatar: '',
  joinDate: employee.startDate,
  departmentId: getDisplayText(employee.department),
  departmentName: getDisplayText(employee.department),
});

const canOpenStatistics = (user: User | null) => {
  if (!user) return true;

  const roleId = user.role ?? '';
  const roles = getCachedRoles();
  const userRole = roles.find((role) => role.id === roleId);
  const userRoleName = userRole ? userRole.name.toLowerCase().trim() : '';
  const usernameLower = String(user.username || '').toLowerCase();
  const nameLower = String(user.name || '').toLowerCase();
  const emailLower = String(user.email || '').toLowerCase();

  const isSystemAdmin =
    roleId === 1 ||
    usernameLower.includes('admin') ||
    nameLower.includes('admin') ||
    emailLower.includes('admin');

  const isSystemHR =
    roleId === 2 ||
    usernameLower.includes('hr') ||
    nameLower.includes('hr') ||
    nameLower.includes('quản lý') ||
    nameLower.includes('quan ly') ||
    nameLower.includes('giám đốc') ||
    nameLower.includes('giam doc') ||
    emailLower.includes('hr') ||
    emailLower.includes('manager');

  const isSuperAdmin = isSystemAdmin || userRoleName.includes('admin') || hasPermission(roleId, '*');
  const isHRorManager =
    isSystemHR ||
    userRoleName.includes('hr') ||
    userRoleName.includes('quản lý') ||
    userRoleName.includes('quan ly') ||
    userRoleName.includes('giám đốc') ||
    userRoleName.includes('giam doc') ||
    userRoleName.includes('director') ||
    hasPermission(roleId, 'timekeeping_admin') ||
    hasPermission(roleId, 'timekeeping_statistics');

  return isSuperAdmin || isHRorManager;
};

export default function StatisticsPage() {
  const { employees, logs: storeLogs, leaveRequests, isLoading } = useTimekeepingStore();
  const [isLoaded, setIsLoaded] = useState(false);
  const [realUser, setRealUser] = useState<User | null>(null);
  const [activeAttendanceCode, setActiveAttendanceCode] = useState(() => readStoredString(ACTIVE_EMPLOYEE_STORAGE_KEY));
  const [checkedAttendanceCodes, setCheckedAttendanceCodes] = useState<string[]>(() => (
    readStoredStringArray(SELECTED_EMPLOYEES_STORAGE_KEY)
  ));
  const [attendanceEmployees, setAttendanceEmployees] = useState<EmployeeAttendance[]>([]);
  const [attendanceEmployeeCache, setAttendanceEmployeeCache] = useState<Record<string, EmployeeAttendance>>({});
  const [fetchedLogs, setFetchedLogs] = useState(storeLogs);
  const [customDateRange, setCustomDateRange] = useState<DateRange | null>(() => readStoredDateRange(DATE_RANGE_STORAGE_KEY));
  const [hasFetched, setHasFetched] = useState(false);
  const [isFetchingRecords, setIsFetchingRecords] = useState(false);
  const [shifts, setShifts] = useState<ShiftConfig[]>([]);
  const [displayLeaveRequests, setDisplayLeaveRequests] = useState<LeaveRequest[]>(leaveRequests);
  const [displayAttendanceRequests, setDisplayAttendanceRequests] = useState<AttendanceRequest[]>([]);
  const [displayOvertimeRequests, setDisplayOvertimeRequests] = useState<OvertimeRequest[]>([]);

  const [storedFilters] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(window.localStorage.getItem('timekeeping.statistics.filters') || '{}');
    } catch { return {}; }
  });
  const [searchMode, setSearchMode] = useState(storedFilters.searchMode || 'all');
  const [searchValue, setSearchValue] = useState(storedFilters.searchValue || '');
  const [appliedSearch, setAppliedSearch] = useState(storedFilters.appliedSearch || storedFilters.searchValue || '');

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = (val: string) => {
    setSearchValue(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setAppliedSearch(val);
    }, 500);
  };

  useEffect(() => {
    const userObj = cookieBase.get<User>('info_user');
    setTimeout(() => {
      if (userObj) setRealUser(userObj);
      setIsLoaded(true);
    }, 0);
  }, []);

  useEffect(() => {
    fetch('/api/shift-configs')
      .then((response) => response.ok ? response.json() : { data: [] })
      .then((json: ShiftConfigApiResponse) => setShifts(json.data || []))
      .catch(() => setShifts([]));
  }, []);

  useEffect(() => {
    let isMounted = true;

    void Promise.resolve().then(async () => {
      try {
        const response = await fetch('/api/leave-requests');
        const json = await response.json() as LeaveRequestsApiResponse;
        if (isMounted) setDisplayLeaveRequests(Array.isArray(json.data) ? json.data : []);
      } catch (error) {
        console.error('Failed to fetch leave requests for statistics', error);
        if (isMounted) setDisplayLeaveRequests(leaveRequests);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [leaveRequests]);

  useEffect(() => {
    window.localStorage.setItem(SELECTED_EMPLOYEES_STORAGE_KEY, JSON.stringify(checkedAttendanceCodes));
  }, [checkedAttendanceCodes]);

  useEffect(() => {
    if (activeAttendanceCode) {
      window.localStorage.setItem(ACTIVE_EMPLOYEE_STORAGE_KEY, activeAttendanceCode);
      return;
    }

    window.localStorage.removeItem(ACTIVE_EMPLOYEE_STORAGE_KEY);
  }, [activeAttendanceCode]);

  useEffect(() => {
    if (customDateRange) {
      window.localStorage.setItem(DATE_RANGE_STORAGE_KEY, JSON.stringify(customDateRange));
      return;
    }

    window.localStorage.removeItem(DATE_RANGE_STORAGE_KEY);
  }, [customDateRange]);


  const handleAttendanceEmployeesLoaded = useCallback((loadedEmployees: EmployeeAttendance[]) => {
    setAttendanceEmployees(loadedEmployees);
    setAttendanceEmployeeCache((prev) => {
      const next = { ...prev };
      loadedEmployees.forEach((employee) => {
        if (employee.employeeCode) {
          next[employee.employeeCode] = employee;
        }
      });
      return next;
    });
  }, []);

  const handleCheckedAttendanceCodesChange = useCallback((employeeCodes: string[]) => {
    setCheckedAttendanceCodes(employeeCodes);
    setHasFetched(false);
    setFetchedLogs([]);
    setDisplayAttendanceRequests([]);
  }, []);


  const handleViewAttendance = async (fromDate?: string, toDate?: string) => {
    if (checkedAttendanceCodes.length === 0) {
      message.warning('Bạn phải chọn nhân viên để xem công');
      return;
    }

    try {
      setIsFetchingRecords(true);

      const missingCodes = checkedAttendanceCodes.filter(
        (code) =>
          !attendanceEmployees.some((emp) => emp.employeeCode === code) &&
          !attendanceEmployeeCache[code]
      );

      if (missingCodes.length > 0) {
        try {
          const query = new URLSearchParams();
          missingCodes.forEach((code) => query.append('employeeCodes', code));
          const res = await fetch(`/api/v1/employees?limit=999999&${query.toString()}`);
          if (res.ok) {
            const json = await res.json() as EmployeeApiItem[] | { data?: EmployeeApiItem[] };
            const emps = Array.isArray(json) ? json : json.data || [];
            const newCachedEmployees: EmployeeAttendance[] = emps.filter((e) => missingCodes.includes(e.employeeCode || e.id || '')).map((e) => ({
              id: e.id,
              _id: e.id,
              employeeCode: e.employeeCode || e.id || '',
              employeeName: e.fullName || e.name || '',
              attendanceCode: e.attendanceCode || e.enrollNumber || e.employeeCode || e.id || '',
              branchId: typeof e.branchId === 'object'
                ? e.branchId.id || e.branchId._id || ''
                : e.branchId,
              branchTimekeeping: typeof e.branchId === 'object'
                ? e.branchId.name || e.locationName || 'Chung'
                : e.locationName || 'Chung',
              schedule: (e.employeeType === 'full_time' ? 'Full time' : 'Part time') as 'Full time' | 'Part time',
              position: e.role || e.devicePrivilege || 'Nhân viên',
              departmentId: typeof e.departmentId === 'object'
                ? e.departmentId.name || e.departmentId._id || e.departmentId.id
                : e.departmentId,
              department: typeof e.departmentId === 'object'
                ? e.departmentId.name || e.departmentName || 'Chung'
                : e.departmentName || 'Chung',
              startDate: (e.joinDate || e.createdAt || '').substring(0, 10),
              locationId: typeof e.locationId === 'object'
                ? e.locationId.locationName || e.locationId._id
                : e.locationId,
            }));

            if (newCachedEmployees.length > 0) {
              setAttendanceEmployeeCache((prev) => {
                const next = { ...prev };
                newCachedEmployees.forEach((emp) => {
                  if (emp.employeeCode) next[emp.employeeCode] = emp;
                });
                return next;
              });
              
              // Tạm thời thêm vào cache local để dùng trong hàm này
              newCachedEmployees.forEach((emp) => {
                attendanceEmployeeCache[emp.employeeCode] = emp;
              });
            }
          }
        } catch (error) {
          console.error('Failed to fetch missing employees', error);
        }
      }

      const selectedRecordEmployeeIds = Array.from(new Set(
        checkedAttendanceCodes.flatMap((employeeCode) => {
          const employee = attendanceEmployees.find((item) => item.employeeCode === employeeCode)
            || attendanceEmployeeCache[employeeCode];
          return [employeeCode, employee?.attendanceCode].filter((value): value is string => Boolean(value));
        }),
      ));

      const nextRange = fromDate && toDate ? { from: fromDate, to: toDate } : null;
      const filters: Record<string, unknown> = {
        employeeId: { $in: selectedRecordEmployeeIds },
      };

      if (fromDate || toDate) {
        filters.date = {
          ...(fromDate ? { $gte: fromDate } : {}),
          ...(toDate ? { $lte: toDate } : {}),
        };
      }

      setCustomDateRange(nextRange);
      setHasFetched(true);

      const pageSize = 200;
      const sort = [
        { field: 'date', order: 'desc' },
        { field: 'clockIn', order: 'desc' },
        { field: 'createdAt', order: 'desc' },
        { field: '_id', order: 'desc' },
      ];
      const records: TimeRecordTimekeeping[] = [];
      let page = 1;
      let total = 0;

      do {
        const response = await fetch('/api/time-records-timekeeping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'list',
            filters,
            sort,
            page,
            pageSize,
          }),
        });

        const json = await response.json() as TimeRecordsApiResponse;
        const pageData = json.data || [];
        records.push(...pageData);
        total = Number(json.total || records.length);

        if (pageData.length < pageSize) break;
        page += 1;
      } while (records.length < total);

      setFetchedLogs(mapTimeRecordsToCheckInLogs(records));

      try {
        const attendanceRequestRange = nextRange || customDateRange || getDefaultDateRange();
        const attendanceRequests: AttendanceRequest[] = [];
        const attendanceRequestPageSize = 100;
        let attendanceRequestPage = 1;
        let attendanceRequestTotal = 0;
        do {
          const query = new URLSearchParams({
            page: String(attendanceRequestPage),
            pageSize: String(attendanceRequestPageSize),
            startDate: attendanceRequestRange.from,
            endDate: attendanceRequestRange.to,
          });
          const response = await fetch(`/api/attendance-requests?${query.toString()}`);
          const json = await response.json() as AttendanceRequestsApiResponse;
          const pageData = json.data || [];
          attendanceRequests.push(...pageData);
          attendanceRequestTotal = Number(json.total || attendanceRequests.length);

          if (pageData.length < attendanceRequestPageSize) break;
          attendanceRequestPage += 1;
        } while (attendanceRequests.length < attendanceRequestTotal);
        setDisplayAttendanceRequests(attendanceRequests);
      } catch (error) {
        console.error('Failed to fetch attendance requests for statistics', error);
        setDisplayAttendanceRequests([]);
      }

      // Fetch approved overtime requests for OT column
      try {
        const otRange = nextRange || customDateRange || getDefaultDateRange();
        const otParams = new URLSearchParams({
          status: 'approved',
          fromDate: otRange.from,
          toDate: otRange.to,
          pageSize: '500',
        });
        const otRes  = await fetch(`/api/overtime-requests?${otParams.toString()}`);
        const otJson = await otRes.json() as OvertimeRequestsApiResponse;
        setDisplayOvertimeRequests(otJson.data ?? []);
      } catch {
        setDisplayOvertimeRequests([]);
      }

      setTimeout(() => {
        document.getElementById('stats-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      console.error(error);
    } finally {
      setIsFetchingRecords(false);
    }
  };

  const activeLogs = useMemo(() => (hasFetched ? fetchedLogs : []), [fetchedLogs, hasFetched]);
  const displayDateRange = useMemo(
    () => customDateRange || getDefaultDateRange(),
    [customDateRange],
  );
  const expectedDays = countInclusiveDays(displayDateRange);

  const activeEmployees = useMemo(() => {
    const currentPageEmployees = attendanceEmployees.map(toEmployee);
    const cachedEmployees = Object.values(attendanceEmployeeCache).map(toEmployee);

    if (!hasFetched) return [];

    return checkedAttendanceCodes.map((employeeCode) => {
      return currentPageEmployees.find((employee) => getEmployeeCode(employee) === employeeCode || employee.id === employeeCode)
        || cachedEmployees.find((employee) => getEmployeeCode(employee) === employeeCode || employee.id === employeeCode)
        || employees.find((employee) => getEmployeeCode(employee) === employeeCode || employee.id === employeeCode);
    }).filter((employee): employee is Employee => Boolean(employee));
  }, [attendanceEmployeeCache, attendanceEmployees, checkedAttendanceCodes, employees, hasFetched]);

  const employeesStats = useMemo(() => (
    buildEmployeeStats({
      employees: activeEmployees,
      logs: activeLogs,
      leaveRequests: displayLeaveRequests,
      expectedDays,
      period: 'month',
      selectedMonth: displayDateRange.from.substring(0, 7),
      selectedYear: displayDateRange.from.substring(0, 4),
      activeWeek: { id: 'W01', label: '', from: displayDateRange.from, to: displayDateRange.to },
      customDateRange: displayDateRange,
      onlyEmployeesWithLogs: false,
    })
  ), [
    activeEmployees,
    activeLogs,
    displayDateRange,
    expectedDays,
    displayLeaveRequests,
  ]);

  const periodLabel = `Từ ${formatDisplayDate(displayDateRange.from)} đến ${formatDisplayDate(displayDateRange.to)}`;
  const attendanceSummarySheetProps = {
    employeesStats,
    shifts,
    dateRange: displayDateRange,
    periodLabel,
    selectedYear: displayDateRange.from.substring(0, 4),
    isLoading: isLoading || isFetchingRecords,
    attendanceRequests: displayAttendanceRequests,
    overtimeRequests: displayOvertimeRequests,
  };

  if (!isLoaded) return null;
  if (realUser && !canOpenStatistics(realUser)) return <Unauthorized />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 m-0">Thống kê chấm công</h2>
          <p className="text-xs text-slate-400 mt-0.5">Báo cáo tổng hợp số liệu chấm công, đi trễ, về sớm của toàn bộ nhân viên.</p>
        </div>
        
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:w-72 lg:w-80 relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
            <InputBase
              placeholder="Tìm theo tên, mã NV..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9! w-full rounded-xl border-slate-200 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500/20 h-10 transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      <AttendanceEmployeeTable
        activeEmployeeCode={activeAttendanceCode}
        checkedEmployeeCodes={checkedAttendanceCodes}
        employees={attendanceEmployees}
        onActiveEmployeeChange={setActiveAttendanceCode}
        onCheckedEmployeesChange={handleCheckedAttendanceCodesChange}
        onEmployeesLoaded={handleAttendanceEmployeesLoaded}
        initialDateRange={customDateRange}
        onViewAttendance={handleViewAttendance}
        searchMode={searchMode}
        searchValue={searchValue}
        appliedSearch={appliedSearch}
        onSearchModeChange={setSearchMode}
        onSearchValueChange={setSearchValue}
        onAppliedSearchChange={setAppliedSearch}
      />

      <div id="stats-table" className="scroll-mt-6 bg-white p-2 sm:p-3 rounded-2xl border border-gray-200 shadow-sm mt-6">
        <TabBase
          tabs={[
            {
              label: 'Bảng thống kê chi tiết',
              component: (
                <div className="pt-4">
                  <EmployeeStatsTable
                    employeesStats={employeesStats}
                    periodLabel={periodLabel}
                    statsPeriod="month"
                    selectedStatsMonth={displayDateRange.from.substring(0, 7)}
                    expectedDays={expectedDays}
                    isLoading={isLoading || isFetchingRecords}
                    leaveRequests={displayLeaveRequests}
                    attendanceRequests={displayAttendanceRequests}
                    employees={activeEmployees}
                    shifts={shifts}
                    dateRange={displayDateRange}
                    overtimeRequests={displayOvertimeRequests}
                  />
                </div>
              ),
            },
            {
              label: 'Bảng chấm công tổng hợp',
              component: (
                <div className="pt-4">
                  <AttendanceSummarySheet {...attendanceSummarySheetProps} />
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
