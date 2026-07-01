'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { message, Alert } from 'antd';
import dayjs from 'dayjs';
import {
  LogIn, LogOut, Clock, CheckCircle, ShieldOff, Wifi,
  RefreshCw, History,
} from 'lucide-react';
import Link from 'next/link';
import type { TimeRecordTimekeeping, ShiftConfig } from '@/app/interface/timekeeping';
import { usePortalUser } from '../../portal-context';
import {
  getEmployeeGroup,
  getEmployeeDepartmentGroupId,
  getEmployeeWorkType,
  buildCheckInPayload,
  buildCheckOutPayload,
} from '@/app/lib/timekeeping/attendanceService';

type CheckPermResponse = { allowed: boolean; reason?: string; label?: string };
type ShiftListResponse = { data?: ShiftConfig[] };
type TimeRecordsResponse = { data?: TimeRecordTimekeeping[] };
type MutationResponse = { success?: boolean; message?: string };
type TimeRecordPayload = ReturnType<typeof buildCheckInPayload> | ReturnType<typeof buildCheckOutPayload>;

// ─── Clock ────────────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState<Date | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setTime(new Date());
    }, 0);
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(t);
    };
  }, []);

  return (
    <div className="text-center">
      <div className="text-5xl font-black font-mono text-white tracking-tight tabular-nums drop-shadow-sm">
        {time
          ? time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
          : '--:--:--'}
      </div>
      <div className="text-blue-100 text-sm font-semibold mt-1 uppercase tracking-widest">
        {time
          ? time.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
          : '--'}
      </div>
    </div>
  );
}

export default function PortalOnlineCheckinPage() {
  const { employee, employeeCode, isLoading: isUserLoading } = usePortalUser();

  const [shifts, setShifts] = useState<ShiftConfig[]>([]);
  const [todayRecord, setTodayRecord] = useState<TimeRecordTimekeeping | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [permission, setPermission] = useState<CheckPermResponse | null>(null);
  const [isCheckingPerm, setIsCheckingPerm] = useState(false);
  const [lastCheckedTime, setLastCheckedTime] = useState<string>('');

  // Load ca làm việc 1 lần
  useEffect(() => {
    fetch('/api/shift-configs')
      .then((r) => r.json())
      .then((json: ShiftListResponse) => setShifts(json.data || []))
      .catch(() => {});
  }, []);

  // Kiểm tra quyền
  const checkPermission = useCallback(async () => {
    if (!employeeCode) return;
    setIsCheckingPerm(true);
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const res = await fetch(
        `/api/online-checkin-settings/check?employeeCode=${encodeURIComponent(employeeCode)}&date=${today}`
      );
      const data = await res.json() as CheckPermResponse;
      setPermission(data);
    } catch {
      setPermission({ allowed: false, reason: 'Không thể kiểm tra quyền' });
    } finally {
      setIsCheckingPerm(false);
    }
  }, [employeeCode]);

  // Lấy trạng thái chấm công hôm nay
  const fetchTodayStatus = useCallback(async () => {
    if (!employeeCode) return;
    setIsFetching(true);
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const res = await fetch(
        `/api/time-records-timekeeping?employeeId=${encodeURIComponent(employeeCode)}&startDate=${today}&endDate=${today}`
      );
      const data = await res.json() as TimeRecordsResponse;
      const records = (data.data || []).sort((a, b) => {
        const ta = a.clockIn || a.clockOut || '00:00';
        const tb = b.clockIn || b.clockOut || '00:00';
        return tb.localeCompare(ta);
      });
      setTodayRecord(records[0] ?? null);
      setLastCheckedTime(dayjs().format('HH:mm:ss'));
    } catch {
      message.error('Không thể lấy trạng thái chấm công');
    } finally {
      setIsFetching(false);
    }
  }, [employeeCode]);

  useEffect(() => {
    if (!employeeCode) return;
    const timer = setTimeout(() => {
      void fetchTodayStatus();
      void checkPermission();
    }, 0);
    return () => clearTimeout(timer);
  }, [employeeCode, fetchTodayStatus, checkPermission]);

  const handleCheckin = async () => {
    if (!employeeCode || !employee) {
      message.warning('Không tìm thấy thông tin nhân viên');
      return;
    }
    if (!permission?.allowed) {
      message.error(permission?.reason || 'Bạn không có quyền chấm công online hôm nay');
      return;
    }

    const isCheckOut = todayRecord?.clockIn && !todayRecord?.clockOut;
    setIsChecking(true);

    const now = dayjs();
    const dateStr = now.format('YYYY-MM-DD');
    const timeStr = now.format('HH:mm:ss');

    try {
      const empGroup = getEmployeeGroup(employee);
      const deptGroupId = getEmployeeDepartmentGroupId(employee);
      const workType = getEmployeeWorkType(employee);

      let payload: TimeRecordPayload;
      if (!isCheckOut) {
        payload = buildCheckInPayload({
          employeeId: employeeCode,
          date: dateStr,
          timeStr,
          deviceType: 'Web Online',
          shifts,
          employeeGroup: empGroup,
          employeeDepartmentGroupId: deptGroupId,
          employeeWorkType: workType,
          employeeBranchId: employee.branchId?.toString(),
          employeeLocationId: employee.locationId?.toString(),
          employeeDepartmentId: employee.departmentId?.toString(),
        });
      } else {
        payload = buildCheckOutPayload({
          recordId: todayRecord!._id as string,
          timeStr,
          clockInTime: todayRecord!.clockIn,
          existingShiftId: todayRecord!.shiftId,
          shifts,
          employeeGroup: empGroup,
          employeeDepartmentGroupId: deptGroupId,
          employeeWorkType: workType,
          employeeId: employeeCode,
          employeeBranchId: employee.branchId?.toString(),
          employeeLocationId: employee.locationId?.toString(),
          employeeDepartmentId: employee.departmentId?.toString(),
        });
      }

      const res = await fetch('/api/time-records-timekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json() as MutationResponse;

      if (json.success) {
        message.success(
          isCheckOut
            ? `Kết công online thành công lúc ${timeStr}`
            : `Chấm công online thành công lúc ${timeStr}`
        );
        fetchTodayStatus();
      } else {
        message.error(json.message || 'Có lỗi xảy ra');
      }
    } catch {
      message.error('Lỗi kết nối máy chủ');
    } finally {
      setIsChecking(false);
    }
  };

  const isCheckOut = !!(todayRecord?.clockIn && !todayRecord?.clockOut);
  const canCheckin = permission?.allowed === true;

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 m-0 flex items-center gap-2">
          <Wifi className="w-6 h-6 text-blue-600" />
          Chấm công làm Online
        </h2>
        <p className="text-sm text-slate-500 mt-1.5">
          Chấm công từ xa, tính vào công làm online. Dữ liệu được ghi nhận ngay lập tức trên hệ thống.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
        {/* Cột trái: Đồng hồ và Nút chấm công */}
        <div className="space-y-6 flex flex-col h-full">
          {/* Clock card */}
          <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-8 text-center shadow-[0_8px_30px_rgba(37,99,235,0.2)] relative overflow-hidden flex-1 flex flex-col justify-center min-h-[200px]">
            {/* decoration */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
            <div className="relative z-10">
              <LiveClock />
              <div className="mt-4 inline-flex items-center gap-1.5 bg-blue-500/40 px-3 py-1.5 rounded-full shadow-inner border border-blue-400/20">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-blue-50 text-xs font-semibold tracking-wide">
                  {employee?.fullName || employee?.name || 'Nhân viên'}
                </span>
              </div>
            </div>
          </div>

          {/* Action button */}
          <button
            type="button"
            onClick={handleCheckin}
            disabled={isChecking || !canCheckin || isCheckingPerm}
            className={`
              w-full py-5 rounded-2xl text-white font-black text-lg flex items-center justify-center gap-3
              shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-all duration-300 active:scale-95
              ${isChecking ? 'opacity-70 cursor-wait' : ''}
              ${!canCheckin || isCheckingPerm
                ? 'bg-slate-300 cursor-not-allowed shadow-none text-slate-500'
                : isCheckOut
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-[0_8px_25px_rgba(37,99,235,0.3)]'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-[0_8px_25px_rgba(16,185,129,0.3)]'
              }
            `}
          >
            {isChecking ? (
              <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : isCheckOut ? (
              <LogOut className="w-6 h-6" />
            ) : (
              <LogIn className="w-6 h-6" />
            )}
            {isChecking
              ? 'Đang xử lý...'
              : !canCheckin
                ? 'Không có quyền chấm công làm online'
                : isCheckOut
                  ? 'Kết công (Check-Out)'
                  : 'Chấm công vào (Check-In)'}
          </button>
        </div>

        {/* Cột phải: Trạng thái và Cảnh báo */}
        <div className="space-y-6">
          {/* Permission status */}
          {isCheckingPerm ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-medium text-slate-500 animate-pulse flex items-center gap-3 shadow-sm">
              <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
              Đang kiểm tra quyền chấm công online...
            </div>
          ) : permission && !permission.allowed ? (
            <Alert
              type="warning"
              showIcon
              icon={<ShieldOff className="w-5 h-5 mt-0.5" />}
              message={
                <div>
                  <p className="font-bold text-amber-800 m-0 text-sm">Chưa được phép chấm công làm online</p>
                  <p className="text-xs font-medium text-amber-600 m-0 mt-1">{permission.reason || 'Vui lòng liên hệ Quản lý hoặc Nhân sự để được cấp quyền.'}</p>
                </div>
              }
              className="rounded-2xl border-amber-200 bg-amber-50 shadow-sm"
            />
          ) : permission?.allowed ? (
            <Alert
              type="success"
              showIcon
              message={
                <span className="text-sm font-bold text-emerald-700">
                  Đã được phép chấm công làm online hôm nay
                  {permission.label ? ` — ${permission.label}` : ''}
                </span>
              }
              className="rounded-2xl border-emerald-200 bg-emerald-50 shadow-sm"
            />
          ) : null}

          {/* Trạng thái hôm nay */}
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 transition-all">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-base m-0 tracking-tight">
                  Trạng thái hôm nay — {dayjs().format('DD/MM/YYYY')}
                </h3>
              </div>
              <button
                type="button"
                onClick={fetchTodayStatus}
                disabled={isFetching}
                className="text-slate-400 hover:text-blue-600 transition p-2 rounded-xl hover:bg-blue-50 shadow-sm border border-transparent hover:border-blue-100"
                title="Làm mới"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {isFetching ? (
              <div className="grid grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-[90px] rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/80 text-center flex flex-col justify-center transition-colors hover:bg-slate-50">
                  <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-widest mb-2">
                    Giờ vào (Check-in)
                  </p>
                  {todayRecord?.clockIn ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl font-black text-emerald-600 font-mono tracking-tight drop-shadow-sm">
                        {todayRecord.clockIn.slice(0, 5)}
                      </span>
                      <CheckCircle className="w-5 h-5 text-emerald-500 shadow-sm rounded-full" />
                    </div>
                  ) : (
                    <span className="text-2xl font-black text-slate-300 font-mono tracking-tight">--:--</span>
                  )}
                </div>
                <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/80 text-center flex flex-col justify-center transition-colors hover:bg-slate-50">
                  <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-widest mb-2">
                    Giờ ra (Check-out)
                  </p>
                  {todayRecord?.clockOut ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl font-black text-blue-600 font-mono tracking-tight drop-shadow-sm">
                        {todayRecord.clockOut.slice(0, 5)}
                      </span>
                      <CheckCircle className="w-5 h-5 text-blue-500 shadow-sm rounded-full" />
                    </div>
                  ) : (
                    <span className="text-2xl font-black text-slate-300 font-mono tracking-tight">--:--</span>
                  )}
                </div>
              </div>
            )}

            {lastCheckedTime && (
              <p className="text-[11px] font-medium text-slate-400 text-right mt-4 flex justify-end items-center gap-1">
                Cập nhật lúc <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded-md text-slate-500">{lastCheckedTime}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* History link */}
      <div className="flex justify-center pt-4">
        <Link
          href="/portal/history"
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition font-bold bg-white/60 backdrop-blur-md px-6 py-3 rounded-full shadow-sm hover:shadow-md border border-white/60"
        >
          <History className="w-4 h-4" />
          Xem lịch sử chấm công chi tiết
        </Link>
      </div>
    </div>
  );
}
