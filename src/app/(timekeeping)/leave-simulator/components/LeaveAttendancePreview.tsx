'use client';

import { useMemo } from 'react';
import { Tag } from 'antd';
import { CalendarDays, FileClock } from 'lucide-react';
import type { Employee, LeaveRequest } from '@/app/interface/timekeeping';

interface LeaveAttendancePreviewProps {
  employee?: Employee;
  leaveRequests: LeaveRequest[];
}

type PreviewStatus = 'leave_approved' | 'leave_pending' | 'leave_rejected' | 'absent_unexcused' | 'no_request';

interface PreviewItem {
  id: string;
  date: string;
  label: string;
  status: PreviewStatus;
  leave?: LeaveRequest;
}

const STATUS_META: Record<PreviewStatus, { label: string; color: string; description: string }> = {
  leave_approved: {
    label: 'Nghỉ có phép',
    color: 'success',
    description: 'Đơn đã được duyệt, khi thống kê ngày vắng sẽ hiển thị xanh lá.',
  },
  leave_pending: {
    label: 'Chờ duyệt',
    color: 'gold',
    description: 'Đơn đã gửi nhưng chưa duyệt, khi thống kê ngày vắng sẽ hiển thị vàng.',
  },
  leave_rejected: {
    label: 'Nghỉ không phép',
    color: 'error',
    description: 'Đơn bị từ chối, nếu không chấm công thì thống kê sẽ tính là nghỉ không phép.',
  },
  absent_unexcused: {
    label: 'Nghỉ không phép',
    color: 'error',
    description: 'Hôm nay không có đơn nghỉ cho nhân viên này.',
  },
  no_request: {
    label: 'Chưa có đơn',
    color: 'default',
    description: 'Chưa có yêu cầu nghỉ phép nào được gửi.',
  },
};

const formatDate = (date: string) => {
  const value = new Date(`${date}T00:00:00`);
  return value.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
};

const getEmployeeKeys = (employee?: Employee) => (
  [employee?.employeeCode, employee?.id, employee?._id].filter((value): value is string => Boolean(value))
);

const findLeaveForDate = (employeeKeys: string[], date: string, leaveRequests: LeaveRequest[]) => (
  leaveRequests.find((request) => (
    employeeKeys.includes(request.employeeId || '') &&
    request.startDate <= date &&
    request.endDate >= date
  ))
);

const getLeaveStatus = (leave?: LeaveRequest): PreviewStatus => {
  if (!leave) return 'absent_unexcused';
  if (leave.status === 'approved') return 'leave_approved';
  if (leave.status === 'pending') return 'leave_pending';
  return 'leave_rejected';
};

export default function LeaveAttendancePreview({ employee, leaveRequests }: LeaveAttendancePreviewProps) {
  const employeeKeys = useMemo(() => getEmployeeKeys(employee), [employee]);
  const employeeKey = employeeKeys[0] || '';
  const employeeName = employee?.fullName || employee?.name || employeeKey || 'Nhân viên';
  const today = new Date().toISOString().split('T')[0];

  const previewItems = useMemo<PreviewItem[]>(() => {
    const employeeLeaves = leaveRequests.filter((request) => employeeKeys.includes(request.employeeId || ''));
    const todayLeave = findLeaveForDate(employeeKeys, today, employeeLeaves);
    const items: PreviewItem[] = [
      {
        id: `today-${today}`,
        date: today,
        label: `Hôm nay, ${formatDate(today)}`,
        status: getLeaveStatus(todayLeave),
        leave: todayLeave,
      },
    ];

    employeeLeaves
      .filter((request) => request.id !== todayLeave?.id)
      .slice(0, 8)
      .forEach((request) => {
        items.push({
          id: request.id || (request as any)._id || '',
          date: request.startDate === request.endDate ? request.startDate : `${request.startDate} - ${request.endDate}`,
          label: request.startDate === request.endDate
            ? formatDate(request.startDate)
            : `${formatDate(request.startDate)} đến ${formatDate(request.endDate)}`,
          status: getLeaveStatus(request),
          leave: request,
        });
      });

    if (items.length === 1 && !todayLeave) {
      items[0].status = 'no_request';
    }

    return items;
  }, [employeeKeys, leaveRequests, today]);

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Mô phỏng hiển thị công</p>
          <h3 className="mt-1 text-base font-bold text-slate-800">
            Cách ngày vắng được phân loại cho {employeeName}
          </h3>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
            Chỉ hiển thị trạng thái hiện tại và các yêu cầu đã gửi của nhân viên đang chọn.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
          <CalendarDays className="h-4 w-4 text-emerald-600" />
          {formatDate(today)}
        </div>
      </div>

      <div className="space-y-2">
        {previewItems.map((item) => {
          const meta = STATUS_META[item.status];

          return (
            <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-xs">
                    <FileClock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] font-bold text-slate-500">{item.date}</div>
                    <div className="mt-0.5 text-xs font-semibold text-slate-700">{item.label}</div>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">{meta.description}</p>
                    {item.leave && (
                      <div className="mt-2 rounded-lg bg-white px-2 py-1.5 text-[11px] text-slate-500">
                        Lý do: {item.leave.reason}
                      </div>
                    )}
                  </div>
                </div>
                <Tag color={meta.color}>{meta.label}</Tag>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
