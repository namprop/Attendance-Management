'use client';

import { useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import { useTimekeepingStore } from '@/app/store/timekeeping/useTimekeepingStore';
import type { Employee, LeaveRequest } from '@/app/interface/timekeeping';
import LeaveSimulationForm, { type LeaveDraft } from './components/LeaveSimulationForm';
import LeaveAttendancePreview from './components/LeaveAttendancePreview';

const today = new Date().toISOString().split('T')[0];

interface EmployeesApiResponse {
  data?: Employee[];
  total?: number;
  message?: string;
}

interface LeaveRequestsApiResponse {
  data?: LeaveRequest[] | LeaveRequest;
  message?: string;
}

const normalizeEmployee = (employee: Employee): Employee => ({
  ...employee,
  id: employee.id || employee._id || employee.employeeCode || '',
  employeeCode: employee.employeeCode || employee.enrollNumber || employee.id || employee._id || '',
  name: employee.fullName || employee.name || employee.employeeCode || 'Nhân viên',
  fullName: employee.fullName || employee.name,
  email: employee.email || '',
  role: employee.role || employee.devicePrivilege || 'Nhân viên',
  status: employee.status || 'Active',
  avatar: employee.avatar || '',
  joinDate: employee.joinDate || '',
});

export default function LeaveSimulatorPage() {
  const {
    leaveRequests: storeLeaveRequests,
    setLeaveRequests,
    activeEmployeeId,
  } = useTimekeepingStore();

  const [apiEmployees, setApiEmployees] = useState<Employee[]>([]);
  const [apiLeaveRequests, setApiLeaveRequests] = useState<LeaveRequest[]>(storeLeaveRequests);
  const [isFetchingEmployees, setIsFetchingEmployees] = useState(true);
  const [employeeSourceLabel, setEmployeeSourceLabel] = useState('Đang tải danh sách nhân viên...');
  const employees = apiEmployees;
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(activeEmployeeId || '');

  useEffect(() => {
    let isMounted = true;

    void Promise.resolve().then(async () => {
      try {
        setIsFetchingEmployees(true);
        const response = await fetch('/api/v1/employees?limit=2000');
        const json = await response.json() as EmployeesApiResponse;
        const nextEmployees = Array.isArray(json.data) ? json.data.map(normalizeEmployee) : [];

        if (!isMounted) return;
        setApiEmployees(nextEmployees);
        setSelectedEmployeeId((current) => (
          nextEmployees.some((employee) => employee.id === current || employee.employeeCode === current)
            ? current
            : nextEmployees[0]?.employeeCode || nextEmployees[0]?.id || ''
        ));
        setEmployeeSourceLabel(nextEmployees.length > 0
          ? `Đã lấy ${nextEmployees.length} nhân viên từ API`
          : 'API chưa có nhân viên');
      } catch (error) {
        console.error('Failed to fetch employees for leave simulator', error);
        if (!isMounted) return;
        setEmployeeSourceLabel('Không gọi được API nhân viên');
      } finally {
        if (isMounted) setIsFetchingEmployees(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    void Promise.resolve().then(async () => {
      try {
        const response = await fetch('/api/leave-requests');
        const json = await response.json() as LeaveRequestsApiResponse;
        const nextLeaveRequests = Array.isArray(json.data) ? json.data : [];
        if (!isMounted) return;
        setApiLeaveRequests(nextLeaveRequests);
        setLeaveRequests(nextLeaveRequests);
      } catch (error) {
        console.error('Failed to fetch leave requests for leave simulator', error);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [setLeaveRequests]);

  const activeEmployee = useMemo(() => (
    employees.find((employee) => (
      employee.id === selectedEmployeeId ||
      employee.employeeCode === selectedEmployeeId ||
      employee._id === selectedEmployeeId
    )) || employees[0]
  ), [employees, selectedEmployeeId]);

  const selectedEmployeeKey = activeEmployee?.employeeCode || activeEmployee?.id || selectedEmployeeId;

  const handleCreateLeave = async (draft: LeaveDraft) => {
    if (!draft.employeeId) {
      message.warning('Chưa có nhân viên để tạo đơn.');
      return;
    }

    if (draft.endDate < draft.startDate) {
      message.warning('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.');
      return;
    }

    try {
      const employee = employees.find((item) => (
        item.id === draft.employeeId ||
        item.employeeCode === draft.employeeId ||
        item._id === draft.employeeId
      ));

      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          employeeCode: employee?.employeeCode || draft.employeeId,
          employeeName: employee?.fullName || employee?.name || '',
        }),
      });
      const json = await response.json() as LeaveRequestsApiResponse;

      if (!response.ok || !json.data || Array.isArray(json.data)) {
        message.error(json.message || 'Không lưu được đơn nghỉ phép.');
        return;
      }

      const nextLeaveRequests = [json.data, ...apiLeaveRequests];
      setApiLeaveRequests(nextLeaveRequests);
      setLeaveRequests(nextLeaveRequests);
      message.success('Đã lưu đơn nghỉ phép. Vào Yêu cầu nghỉ phép để duyệt hoặc từ chối.');
    } catch (error) {
      console.error('Failed to create leave request', error);
      message.error('Lỗi kết nối khi lưu đơn nghỉ phép.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="m-0 text-lg font-bold text-slate-800">Giả lập xin nghỉ phép</h2>
        <p className="mt-1 text-xs text-slate-400">
          Tạo đơn nghỉ thử và xem cách hệ thống phân loại nghỉ có phép, chờ duyệt hoặc nghỉ không phép.
        </p>
        <p className="mt-2 text-[11px] font-semibold text-emerald-600">
          {isFetchingEmployees ? 'Đang gọi API danh sách nhân viên...' : employeeSourceLabel}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <LeaveSimulationForm
          employees={employees}
          selectedEmployeeId={selectedEmployeeKey}
          today={today}
          onEmployeeChange={setSelectedEmployeeId}
          onSubmit={handleCreateLeave}
        />

        <LeaveAttendancePreview
          employee={activeEmployee}
          leaveRequests={apiLeaveRequests}
        />
      </div>
    </div>
  );
}
