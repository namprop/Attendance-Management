'use client';

import { useMemo, useState } from 'react';
import { TableBase, type Column } from '@/app/ui/base/table';
import { SelectBase } from '@/app/ui/base/select';
import type { AttendanceRequest, Employee, LeaveRequest, OvertimeRequest, ShiftConfig } from '@/app/interface/timekeeping';
import {
  buildEmployeeStatsRows,
  type EmployeeStat,
  type EmployeeStatsTableRow,
  type DateRange,
  type StatisticsPeriod,
} from '@/app/lib/timekeeping/statisticsService';

interface EmployeeStatsTableProps {
  employeesStats: EmployeeStat[];
  periodLabel: string;
  statsPeriod: StatisticsPeriod;
  selectedStatsMonth: string;
  expectedDays: number;
  isLoading: boolean;
  leaveRequests: LeaveRequest[];
  attendanceRequests: AttendanceRequest[];
  employees: Employee[];
  shifts: ShiftConfig[];
  dateRange?: DateRange | null;
  overtimeRequests?: OvertimeRequest[];
}

type AttendanceDayFilter = 'all' | 'worked' | 'absent' | 'missing_checkout' | 'missing_checkin';

const ATTENDANCE_DAY_FILTER_OPTIONS = [
  { value: 'worked', label: 'Ngày đi làm' },
  { value: 'absent', label: 'Ngày không đi làm' },
  { value: 'missing_checkout', label: 'Quên không kết công' },
  { value: 'missing_checkin', label: 'Quên không chấm công' },
];

const LEAVE_DAY_STATUS_CLASS: Record<NonNullable<EmployeeStatsTableRow['leaveDayStatus']>, string> = {
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  unexcused: 'border-red-200 bg-red-50 text-red-700',
};

const LEAVE_DAY_ROW_CLASS: Record<NonNullable<EmployeeStatsTableRow['leaveDayStatus']>, string> = {
  approved: '!bg-emerald-50/70 hover:!bg-emerald-50',
  pending: '!bg-amber-50/70 hover:!bg-amber-50',
  unexcused: '!bg-red-50/70 hover:!bg-red-50',
};

const ATTENDANCE_REQUEST_STATUS_CLASS: Record<NonNullable<EmployeeStatsTableRow['attendanceRequestStatus']>, string> = {
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  rejected: 'border-red-200 bg-red-50 text-red-700',
  expired: 'border-slate-200 bg-slate-50 text-slate-600',
};

const ATTENDANCE_REQUEST_ROW_CLASS: Record<NonNullable<EmployeeStatsTableRow['attendanceRequestStatus']>, string> = {
  approved: '!bg-emerald-50/70 hover:!bg-emerald-50',
  pending: '!bg-amber-50/70 hover:!bg-amber-50',
  rejected: '!bg-red-50/70 hover:!bg-red-50',
  expired: '!bg-slate-100 hover:!bg-slate-100',
};

const formatHoursAsTime = (value: unknown) => {
  const totalHours = Number(value);
  if (!Number.isFinite(totalHours) || totalHours <= 0) return '0';

  const totalMinutes = Math.round(totalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes > 0 ? `${hours}h${String(minutes).padStart(2, '0')}` : `${hours}h`;
};

const formatMinutesAsTime = (value: unknown) => {
  const totalMinutes = Number(value);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '0';

  const roundedMinutes = Math.round(totalMinutes);
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  return minutes > 0 ? `${hours}h${String(minutes).padStart(2, '0')}` : `${hours}h`;
};

const formatOvertimeDuration = (start: string, end: string) => {
  if (!start || !end) return '';
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  let totalMins = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (totalMins < 0) totalMins += 24 * 60; // cross midnight

  if (totalMins <= 0) return '';
  
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;

  if (hours === 0) return `${mins} phút`;
  if (mins === 0) return `${hours} giờ`;
  return `${hours} giờ ${mins} phút`;
};

export default function EmployeeStatsTable({
  employeesStats,
  periodLabel,
  statsPeriod,
  selectedStatsMonth,
  expectedDays,
  isLoading,
  leaveRequests,
  attendanceRequests,
  employees,
  shifts,
  dateRange,
  overtimeRequests = [],
}: EmployeeStatsTableProps) {
  const [attendanceDayFilter, setAttendanceDayFilter] = useState<AttendanceDayFilter[]>([]);
  const tableRows = useMemo(
    () => buildEmployeeStatsRows(employeesStats, shifts, dateRange, leaveRequests, attendanceRequests, overtimeRequests),
    [attendanceRequests, dateRange, employeesStats, leaveRequests, shifts, overtimeRequests],
  );
  const filteredRows = useMemo(() => {
    if (attendanceDayFilter.length === 0) return tableRows;
    return tableRows.filter((row) => {
      const hasAttendance = Boolean(row.checkIn || row.checkOut || Number(row.workDay) > 0 || row.actualHours > 0);
      if (attendanceDayFilter.includes('worked') && hasAttendance) return true;
      if (attendanceDayFilter.includes('absent') && row.isAbsent) return true;
      if (attendanceDayFilter.includes('missing_checkout') && row.attendanceRequestType === 'forgot_checkout') return true;
      if (attendanceDayFilter.includes('missing_checkin') && row.attendanceRequestType === 'forgot_checkin') return true;
      return false;
    });
  }, [attendanceDayFilter, tableRows]);
  const totalLogs = filteredRows.length;
  const periodText = statsPeriod === 'month' ? selectedStatsMonth : periodLabel;

  const columns: Column<EmployeeStatsTableRow>[] = [
    {
      title: 'Mã NV',
      dataIndex: 'empCode',
      width: 80,
      render: (value) => <span className="font-semibold text-slate-700">{String(value ?? '')}</span>,
    },
    {
      title: 'Tên nhân viên',
      dataIndex: 'empName',
      width: 160,
      render: (value) => <span className="block leading-5">{String(value ?? '')}</span>,
    },
    { title: 'Ngày', dataIndex: 'date', width: 90 },
    { title: 'Thứ', dataIndex: 'dayOfWeek', width: 50 },
    {
      title: 'Trạng thái',
      dataIndex: 'leaveDayLabel',
      width: 110,
      render: (value, record) => {
        if (record.attendanceRequestStatus) {
          return (
            <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold ${ATTENDANCE_REQUEST_STATUS_CLASS[record.attendanceRequestStatus]}`}>
              {record.attendanceRequestLabel}
            </span>
          );
        }

        if (!record.leaveDayStatus) {
          return <span className="text-slate-300">---</span>;
        }

        return (
          <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold ${LEAVE_DAY_STATUS_CLASS[record.leaveDayStatus]}`}>
            {String(value ?? '')}
          </span>
        );
      },
    },
    {
      title: 'Vào',
      dataIndex: 'checkIn',
      width: 50,
      render: (value, record) => (
        <span className={record.late > 0 ? 'font-bold text-red-600' : ''}>
          {String(value ?? '')}
        </span>
      ),
    },
    {
      title: 'Ra',
      dataIndex: 'checkOut',
      width: 50,
      render: (value, record) => (
        <span className={record.early > 0 ? 'font-bold text-red-600' : ''}>
          {String(value ?? '')}
        </span>
      ),
    },
    { title: 'Ca', dataIndex: 'shift', width: 50 },
    { title: 'Trễ', dataIndex: 'late', width: 40 },
    { title: 'Sớm', dataIndex: 'early', width: 40 },
    {
      title: 'Tổng giờ',
      dataIndex: 'actualHours',
      width: 70,
      render: (value) => formatHoursAsTime(value),
    },
    {
      title: 'Giờ tính công',
      dataIndex: 'hours',
      width: 70,
      render: (value, record) => (
        record.isFullTime ? formatHoursAsTime(value) : formatMinutesAsTime(record.workMinutes)
      ),
    },
    {
      title: 'Công',
      dataIndex: 'workDay',
      width: 40,
      render: (value, record) => (
        record.isFullTime ? String(value ?? '') : formatMinutesAsTime(record.workMinutes)
      ),
    },
    { title: 'KH', dataIndex: 'kh', width: 40 },
    { title: 'Giờ+', dataIndex: 'hoursPlus', width: 50 },
    { title: 'Công+', dataIndex: 'workDayPlus', width: 50 },
    { title: 'KH+', dataIndex: 'khPlus', width: 40 },
    {
      title: 'TC',
      dataIndex: 'overtimeStart',
      width: 110,
      className: 'text-xs whitespace-nowrap text-gray-600 font-medium',
      render: (_, record) => {
        if (!record.overtimeStart || !record.overtimeEnd) return '';
        const duration = formatOvertimeDuration(record.overtimeStart, record.overtimeEnd);
        const typeLabels: Record<string, string> = {
          '1': 'TC1',
          '2': 'TC2',
          '3': 'TC3',
        };
        const typeText = record.overtimeType ? typeLabels[record.overtimeType] : '';
        const modeText = record.overtimeWorkMode === 'online' ? 'Onl' : record.overtimeWorkMode === 'offline' ? 'Off' : '';

        return (
          <div className="flex flex-col gap-1 py-1">
            <span className="font-bold text-slate-700">{duration}</span>
            <div className="flex items-center gap-1">
              {typeText && (
                <span className="text-[9px] font-extrabold px-1 py-0 bg-violet-50 text-violet-600 border border-violet-150 rounded">
                  {typeText}
                </span>
              )}
              {modeText && (
                <span className={`text-[9px] font-extrabold px-1 py-0 rounded border ${
                  modeText === 'Onl'
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    : 'bg-orange-50 text-orange-600 border-orange-100'
                }`}>
                  {modeText}
                </span>
              )}
            </div>
          </div>
        );
      }
    },
    { title: 'TC1', dataIndex: 'tc1', width: 40 },
    { title: 'TC2', dataIndex: 'tc2', width: 40 },
    { title: 'TC3', dataIndex: 'tc3', width: 40 },
    {
      title: 'Tổng',
      dataIndex: 'total',
      width: 50,
      render: (value, record) => (
        record.isFullTime ? String(value ?? '') : formatMinutesAsTime(record.workMinutes)
      ),
    },
  ];

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Bảng thống kê
            </span>
            <span className="block text-[11px] font-medium text-slate-500">
              {periodText} · Chuẩn {expectedDays} ngày · {leaveRequests.length} đơn phép
            </span>
          </div>

          <div className="h-8 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2 text-xs">
            <label className="shrink-0 font-bold text-slate-500" htmlFor="employee-stats-attendance-day">
              Trạng thái ngày
            </label>
            <div className="w-[180px] shrink-0">
              <SelectBase
                id="employee-stats-attendance-day"
                mode="multiple"
                maxTagCount="responsive"
                value={attendanceDayFilter}
                isSort={false}
                placeholder="Tất cả"
                options={ATTENDANCE_DAY_FILTER_OPTIONS}
                className="text-xs bg-white"
                onChange={(value) => setAttendanceDayFilter(Array.isArray(value) ? value : [])}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-[11px] font-bold text-slate-500 shadow-xs">
            {employees.length} nhân sự
          </span>
          <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-[11px] font-bold text-slate-500 shadow-xs">
            {totalLogs} kết quả
          </span>
        </div>
      </div>

      <div className="bg-slate-50 p-1.5 sm:p-2.5">
        <TableBase<EmployeeStatsTableRow>
          rowKey="id"
          data={filteredRows}
          loading={isLoading}
          columns={columns}
          className="max-h-[calc(100vh-260px)] w-full rounded-2xl border border-slate-300 bg-white shadow-sm overscroll-contain"
          classNameHead="!bg-slate-200 !text-slate-700 [&_th]:!py-1 [&_th]:!px-1 text-[10px] sticky top-0 z-10 shadow-sm [&_th]:!border-b-slate-300 [&_th]:!border-r-slate-300"
          classNameBody="text-[11px] [&_tr]:!border-b-slate-300 [&_td]:h-12 [&_td]:!border-r-slate-300 [&_td]:!py-1 [&_td]:!px-2 [&_td]:align-middle"
          classNameRow={(record) => {
            if (record.isSunday) return '!bg-slate-100 !text-slate-500 hover:!bg-slate-100';
            if (record.attendanceRequestStatus) return ATTENDANCE_REQUEST_ROW_CLASS[record.attendanceRequestStatus];
            if (record.leaveDayStatus) return LEAVE_DAY_ROW_CLASS[record.leaveDayStatus];
            return '';
          }}
        />
      </div>
    </div>
  );
}
