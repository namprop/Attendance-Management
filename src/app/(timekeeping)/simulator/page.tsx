'use client';

import React, { useState, useEffect } from 'react';
import { Select, Button, message, Tag } from 'antd';
import dayjs from 'dayjs';
import { CheckCircle, LogIn, LogOut, Clock, History, User } from 'lucide-react';
import type { TimeRecordTimekeeping, ShiftConfig } from '@/app/interface/timekeeping';
import Link from 'next/link';
import {
  getEmployeeGroup,
  getEmployeeDepartmentGroupId,
  getEmployeeWorkType,
  buildCheckInPayload,
  buildCheckOutPayload,
} from '@/app/lib/timekeeping/attendanceService';

type EmployeeOption = {
  id: string;
  employeeCode?: string;
  fullName?: string;
  name?: string;
  role?: string;
  employeeType?: string;
  branchId?: string;
  locationId?: string;
  departmentId?: string;
  deptGroupId?: string;
  departmentGroupId?: string;
  departmentGroupTimekeepingId?: string;
  departmentName?: string;
  departmentGroupName?: string;
  deptGroupName?: string;
  locationName?: string;
};

type EmployeeListResponse = { data?: EmployeeOption[] };
type ShiftListResponse = { data?: ShiftConfig[] };
type TimeRecordsResponse = { data?: TimeRecordTimekeeping[] };
type MutationResponse = { success?: boolean; message?: string };
type TimeRecordPayload = ReturnType<typeof buildCheckInPayload> | ReturnType<typeof buildCheckOutPayload>;

export default function SimulatorPage() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [shifts, setShifts] = useState<ShiftConfig[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [todayRecord, setTodayRecord] = useState<TimeRecordTimekeeping | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isFetchingStatus, setIsFetchingStatus] = useState(false);

  // Fetch nhân viên + ca làm việc song song
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, shiftRes] = await Promise.all([
          fetch('/api/v1/employees'),
          fetch('/api/shift-configs'),
        ]);
        const [empData, shiftData] = await Promise.all([
          empRes.json() as Promise<EmployeeListResponse>,
          shiftRes.json() as Promise<ShiftListResponse>,
        ]);
        if (empData?.data) setEmployees(empData.data);
        if (shiftData?.data) setShifts(shiftData.data);
      } catch (err) {
        console.error('Lỗi lấy dữ liệu:', err);
      } finally {
        setIsLoadingEmployees(false);
      }
    };
    fetchData();
  }, []);

  // Lấy trạng thái chấm công hôm nay của nhân viên
  const fetchTodayStatus = async (empCode: string) => {
    setIsFetchingStatus(true);
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const res = await fetch(
        `/api/time-records-timekeeping?employeeId=${empCode}&startDate=${today}&endDate=${today}`
      );
      const data = await res.json() as TimeRecordsResponse;
      const records = data.data || [];
      records.sort((a, b) => {
        const timeA = a.clockIn || a.clockOut || '00:00';
        const timeB = b.clockIn || b.clockOut || '00:00';
        return timeB.localeCompare(timeA);
      });
      setTodayRecord(records.length > 0 ? records[0] : null);
    } catch (err) {
      console.error(err);
      message.error('Không thể lấy dữ liệu chấm công hôm nay.');
    } finally {
      setIsFetchingStatus(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (selectedEmployeeId) {
        const emp = employees.find(e => e.id === selectedEmployeeId);
        const code = emp?.employeeCode || selectedEmployeeId;
        fetchTodayStatus(code);
      } else {
        setTodayRecord(null);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [selectedEmployeeId, employees]);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const selectedEmployeeCode = selectedEmployee?.employeeCode || selectedEmployeeId || '';
  const employeeGroup = selectedEmployee ? getEmployeeGroup(selectedEmployee) : 'OTHER';
  const employeeDepartmentGroupId = selectedEmployee ? getEmployeeDepartmentGroupId(selectedEmployee) : '';
  const employeeWorkType = selectedEmployee ? getEmployeeWorkType(selectedEmployee) : 'FULL_TIME';

  const handleToggle = async () => {
    if (!selectedEmployeeId) {
      message.warning('Vui lòng chọn nhân viên trước!');
      return;
    }

    const isCheckOut = todayRecord && todayRecord.clockIn && !todayRecord.clockOut;
    const actionType = isCheckOut ? 'check-out' : 'check-in';

    setIsChecking(true);
    const now = dayjs();
    const dateStr = now.format('YYYY-MM-DD');
    const timeStr = now.format('HH:mm:ss');

    try {
      const endpoint = '/api/time-records-timekeeping';
      let payload: TimeRecordPayload;

      if (actionType === 'check-in') {
        // Luôn tạo record mới cho mỗi lần check-in (hỗ trợ nhiều ca 1 ngày)
        payload = buildCheckInPayload({
          employeeId: selectedEmployeeCode || selectedEmployeeId,
          date: dateStr,
          timeStr,
          deviceType: 'Web Simulator',
          shifts,
          employeeGroup,
          employeeDepartmentGroupId,
          employeeWorkType,
          employeeBranchId: selectedEmployee?.branchId,
          employeeLocationId: selectedEmployee?.locationId,
          employeeDepartmentId: selectedEmployee?.departmentId,
        });
      } else {
        // Check-out (cập nhật todayRecord)
        payload = buildCheckOutPayload({
          recordId: todayRecord!._id as string,
          timeStr,
          clockInTime: todayRecord!.clockIn,
          existingShiftId: todayRecord!.shiftId,
          shifts,
          employeeGroup,
          employeeDepartmentGroupId,
          employeeWorkType,
          employeeId: selectedEmployeeCode || selectedEmployeeId,
          employeeBranchId: selectedEmployee?.branchId,
          employeeLocationId: selectedEmployee?.locationId,
          employeeDepartmentId: selectedEmployee?.departmentId,
        });
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as MutationResponse;

      if (data.success) {
        message.success(`${actionType === 'check-in' ? 'Chấm công' : 'Kết công'} thành công lúc ${timeStr}`);
        fetchTodayStatus(selectedEmployeeCode);
      } else {
        message.error(data.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi kết nối máy chủ!');
    } finally {
      setIsChecking(false);
    }
  };

  const groupLabel = employeeGroup === 'SX'
    ? { text: 'Sản xuất', color: 'purple' }
    : { text: 'Văn phòng / Thương mại', color: 'blue' };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-800 m-0">Trình Giả lập Chấm công</h2>
        <p className="text-sm text-slate-500 mt-1">
          Công cụ Admin tạo dữ liệu chấm công. Hệ thống tự động khớp ca theo nhóm nhân viên.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="space-y-6">

          {/* Chọn nhân viên */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 block">Chọn Nhân viên</label>
            <Select
              showSearch
              placeholder="Tìm và chọn nhân viên..."
              loading={isLoadingEmployees}
              className="w-full h-12"
              value={selectedEmployeeId}
              onChange={setSelectedEmployeeId}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={employees.map(emp => ({
                value: emp.id,
                label: `${emp.fullName || emp.name} (${emp.employeeCode || emp.id})`,
              }))}
            />
          </div>

          {/* Thông tin nhân viên đã chọn */}
          {selectedEmployee && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 m-0 truncate">
                  {selectedEmployee.fullName || selectedEmployee.name}
                </p>
                <p className="text-[11px] text-slate-400 m-0">{selectedEmployee.employeeCode} · {selectedEmployee.role}</p>
              </div>
              <Tag color={groupLabel.color} className="shrink-0 font-medium">{groupLabel.text}</Tag>
            </div>
          )}

          {/* Trạng thái hôm nay */}
          {selectedEmployeeId && (
            <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900 m-0 text-sm">
                  Trạng thái hôm nay ({dayjs().format('DD/MM/YYYY')})
                </h3>
              </div>

              {isFetchingStatus ? (
                <div className="text-sm text-slate-500 animate-pulse">Đang kiểm tra...</div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex flex-col gap-1">
                    <span className="text-xs text-slate-400 font-medium">GIỜ VÀO (CHECK-IN)</span>
                    {todayRecord?.clockIn ? (
                      <span className="text-lg font-bold text-emerald-600 font-mono flex items-center gap-2">
                        {todayRecord.clockIn} <CheckCircle className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="text-lg font-bold text-slate-300 font-mono">--:--:--</span>
                    )}
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex flex-col gap-1">
                    <span className="text-xs text-slate-400 font-medium">GIỜ RA (CHECK-OUT)</span>
                    {todayRecord?.clockOut ? (
                      <span className="text-lg font-bold text-blue-600 font-mono flex items-center gap-2">
                        {todayRecord.clockOut} <CheckCircle className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="text-lg font-bold text-slate-300 font-mono">--:--:--</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nút chấm công */}
          <div className="flex gap-4 pt-4 border-t border-slate-100">
            {(() => {
              const isCheckOut = todayRecord && todayRecord.clockIn && !todayRecord.clockOut;
              if (isCheckOut) {
                return (
                  <Button
                    type="primary"
                    size="large"
                    icon={<LogOut className="w-5 h-5" />}
                    className="flex-1 h-14 text-base font-bold flex items-center justify-center bg-indigo-500 hover:!bg-indigo-600 border-none"
                    disabled={!selectedEmployeeId}
                    loading={isChecking}
                    onClick={handleToggle}
                  >
                    Kết Công (Check-Out)
                  </Button>
                );
              }
              return (
                <Button
                  type="primary"
                  size="large"
                  icon={<LogIn className="w-5 h-5" />}
                  className="flex-1 h-14 text-base font-bold flex items-center justify-center bg-emerald-500 hover:!bg-emerald-600 border-none"
                  disabled={!selectedEmployeeId}
                  loading={isChecking}
                  onClick={handleToggle}
                >
                  Chấm Công (Check-In)
                </Button>
              );
            })()}
          </div>

          <div className="flex justify-center pt-2">
            <Link href="/time-records">
              <Button type="link" icon={<History className="w-4 h-4" />} className="text-slate-500 hover:text-blue-600">
                Xem Lịch sử chấm công
              </Button>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
