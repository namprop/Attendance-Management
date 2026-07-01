'use client';

import { useState } from 'react';
import { Button } from 'antd';
import { SendHorizontal } from 'lucide-react';
import type { Employee, LeaveRequest } from '@/app/interface/timekeeping';

export type LeaveDraft = Pick<LeaveRequest, 'employeeId' | 'type' | 'startDate' | 'endDate' | 'reason'>;
type LeaveFormState = Omit<LeaveDraft, 'employeeId'>;

interface LeaveSimulationFormProps {
  employees: Employee[];
  selectedEmployeeId: string;
  today: string;
  onEmployeeChange: (employeeId: string) => void;
  onSubmit: (draft: LeaveDraft) => void;
}

const LEAVE_OPTIONS: { value: LeaveRequest['type']; label: string }[] = [
  { value: 'annual', label: 'Nghỉ phép năm' },
  { value: 'sick', label: 'Nghỉ ốm' },
  { value: 'personal', label: 'Việc riêng' },
  { value: 'unpaid', label: 'Nghỉ không lương' },
  { value: 'overtime', label: 'Tăng ca / OT' },
];

const getEmployeeValue = (employee: Employee) => employee.employeeCode || employee.id || employee._id || '';
const getEmployeeName = (employee: Employee) => employee.fullName || employee.name || getEmployeeValue(employee);

export default function LeaveSimulationForm({
  employees,
  selectedEmployeeId,
  today,
  onEmployeeChange,
  onSubmit,
}: LeaveSimulationFormProps) {
  const [form, setForm] = useState<LeaveFormState>({
    type: 'annual',
    startDate: today,
    endDate: today,
    reason: '',
  });

  const updateForm = <K extends keyof LeaveFormState>(key: K, value: LeaveFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleEmployeeChange = (employeeId: string) => {
    onEmployeeChange(employeeId);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.reason.trim()) return;
    onSubmit({ ...form, employeeId: selectedEmployeeId });
    setForm((prev) => ({
      ...prev,
      startDate: today,
      endDate: today,
      reason: '',
    }));
  };

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
      <div className="mb-4">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Giả lập xin nghỉ</p>
        <h3 className="mt-1 text-base font-bold text-slate-800">Tạo đơn cho nhân viên</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Nhân viên
          </label>
          <select
            value={selectedEmployeeId}
            onChange={(event) => handleEmployeeChange(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-emerald-500"
          >
            {employees.map((employee) => {
              const value = getEmployeeValue(employee);
              return (
                <option key={value} value={value}>
                  {getEmployeeName(employee)} - {value}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Loại nghỉ
          </label>
          <select
            value={form.type}
            onChange={(event) => updateForm('type', event.target.value as LeaveRequest['type'])}
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-emerald-500"
          >
            {LEAVE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Từ ngày
            </label>
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => updateForm('startDate', event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Đến ngày
            </label>
            <input
              type="date"
              value={form.endDate}
              onChange={(event) => updateForm('endDate', event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Lý do
          </label>
          <textarea
            required
            rows={4}
            value={form.reason}
            onChange={(event) => updateForm('reason', event.target.value)}
            placeholder="Nhập lý do xin nghỉ..."
            className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
          />
        </div>

        <Button
          type="primary"
          htmlType="submit"
          icon={<SendHorizontal className="h-4 w-4" />}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-xs font-bold"
        >
          Tạo đơn chờ duyệt
        </Button>
      </form>
    </section>
  );
}
