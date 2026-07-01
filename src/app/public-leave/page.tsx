'use client';

import React, { useState, useCallback } from 'react';
import { CheckCircle2, Loader2, Search, AlertCircle } from 'lucide-react';
import dayjs from 'dayjs';
import { DateRangePicker } from '@/app/ui/base/date-range-picker';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
import { LeaveType, LeaveConfig } from '@/app/interface/timekeeping';

const TODAY = new Date().toISOString().slice(0, 10);

function formatDateVN(dateStr: string): string {
  if (!dateStr) return '……';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function calcDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 0;
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

interface FieldLineProps {
  label: string;
  children: React.ReactNode;
}
function FieldLine({ label, children }: FieldLineProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2 py-1.5 sm:py-1">
      <span className="text-sm text-gray-700 shrink-0 font-medium">{label}:</span>
      <div className="flex-1 w-full">{children}</div>
    </div>
  );
}

interface InlineInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}
function InlineInput({ error, ...props }: InlineInputProps) {
  return (
    <input
      {...props}
      className={[
        'w-full border-b-[1.5px] border-dotted bg-transparent outline-none text-sm py-0.5 px-1',
        'text-gray-800 placeholder:text-gray-300',
        'focus:border-blue-500 transition-colors duration-200',
        error ? 'border-red-400' : 'border-gray-400 hover:border-gray-600',
        props.className ?? '',
      ].join(' ')}
    />
  );
}

interface InlineTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}
function InlineTextarea({ error, ...props }: InlineTextareaProps) {
  return (
    <textarea
      {...props}
      className={[
        'w-full border-b-[1.5px] border-dotted bg-transparent outline-none text-sm py-0.5 px-1 resize-none',
        'text-gray-800 placeholder:text-gray-300',
        'focus:border-blue-500 transition-colors duration-200',
        error ? 'border-red-400' : 'border-gray-400 hover:border-gray-600',
        props.className ?? '',
      ].join(' ')}
    />
  );
}

interface SectionTitleProps {
  children: React.ReactNode;
}
function SectionTitle({ children }: SectionTitleProps) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="h-px flex-1 bg-blue-100" />
      <span className="text-[11px] font-bold uppercase tracking-widest text-blue-400 bg-blue-50 px-3 py-1 rounded-full">
        {children}
      </span>
      <div className="h-px flex-1 bg-blue-100" />
    </div>
  );
}

// ─────────────────────────────────────────────
// Success Screen
// ─────────────────────────────────────────────
interface SuccessScreenProps {
  employeeName: string;
  employeeCode: string;
  onReset: () => void;
}
function SuccessScreen({ employeeName, employeeCode, onReset }: SuccessScreenProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 overflow-hidden" style={{ background: 'linear-gradient(160deg, #e8eeff 0%, #f0f7ff 40%, #e8f4f8 100%)' }}>
      <div 
        className="relative w-full max-w-md bg-white/80 backdrop-blur-xl border border-white rounded-4xl8 sm:p-10 text-center space-y-8 animate-in fade-in zoom-in duration-500"
        style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.5) inset' }}
      >
        <div className="flex justify-center relative">
          <div className="absolute inset-0 bg-blue-400 blur-3xl opacity-20 rounded-full animate-pulse" />
          <div className="w-24 h-24 rounded-full bg-linear-to-trrom-blue-50 to-blue-100 border border-blue-200 flex items-center justify-center shadow-sm relative z-10">
            <CheckCircle2 size={48} className="text-blue-600" strokeWidth={2.5} />
          </div>
        </div>
        
        <div className="space-y-3">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-linear-to-rrom-blue-700 to-blue-500">
            Thành Công!
          </h2>
          <p className="text-base text-slate-600 leading-relaxed px-2">
            Đơn xin nghỉ phép của <br />
            <strong className="text-slate-800 text-lg block mt-1 mb-1">{employeeName}</strong>
            <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
              {employeeCode.toUpperCase()}
            </span>
            <br />
            <span className="block mt-2">đã được gửi đến Quản lý.</span>
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={onReset}
            className="w-full py-4 bg-linear-to-rrom-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold rounded-2xl transition-all duration-300 shadow-[0_8px_20px_-8px_rgba(59,130,246,0.6)] hover:shadow-[0_12px_25px_-8px_rgba(59,130,246,0.8)] hover:-translate-y-0.5 cursor-pointer text-[15px]"
          >
            Tạo đơn mới
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function PublicLeavePage() {
  // ── Employee lookup ──
  const [employeeCode, setEmployeeCode] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [branch, setBranch] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupDone, setLookupDone] = useState(false);
  const [matchedEmpId, setMatchedEmpId] = useState('');
  const [matchedEmpCode, setMatchedEmpCode] = useState('');
  const [empOrgIds, setEmpOrgIds] = useState<{ branchId?: string, locationId?: string, deptGroupId?: string, departmentId?: string }>({});

  // ── Leave config & types ──
  const [allLeaveTypes, setAllLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveConfig, setLeaveConfig] = useState<LeaveConfig | null>(null);

  // ── Leave detail ──
  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState(TODAY);
  const [endDate, setEndDate] = useState(TODAY);
  const [requestedMinutes, setRequestedMinutes] = useState('');
  const [reason, setReason] = useState('');

  // ── Handover ──
  const [handoverTo, setHandoverTo] = useState('');
  const [handoverDept, setHandoverDept] = useState('');
  const [handoverTasks, setHandoverTasks] = useState('');

  // ── Date / Submit ──
  const [submitDate] = useState(new Date());
  const [location, setLocation] = useState('Hà Nội');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isLateOrEarly = type === 'arrive_late' || type === 'leave_early';
  const numDays = calcDays(startDate, endDate);

  React.useEffect(() => {
    // Fetch configs and types
    Promise.all([
      fetch('/api/leave-configs').then(r => r.json()),
      fetch('/api/leave-types?active=true').then(r => r.json())
    ]).then(([configRes, typesRes]) => {
      if (configRes.data) setLeaveConfig(configRes.data);
      if (typesRes.data) {
        setAllLeaveTypes(typesRes.data);
        if (typesRes.data.length > 0) setType(typesRes.data[0].code);
      }
    }).catch(err => console.error(err));
  }, []);

  const applicableLeaveTypes = React.useMemo(() => {
    if (!lookupDone) return allLeaveTypes; // Show all by default or empty?
    return allLeaveTypes.filter(t => {
      if (t.applicableBranches?.length && empOrgIds.branchId && !t.applicableBranches.includes(empOrgIds.branchId)) return false;
      if (t.applicableLocations?.length && empOrgIds.locationId && !t.applicableLocations.includes(empOrgIds.locationId)) return false;
      if (t.applicableGroups?.length && empOrgIds.deptGroupId && !t.applicableGroups.includes(empOrgIds.deptGroupId)) return false;
      if (t.applicableDepartments?.length && empOrgIds.departmentId && !t.applicableDepartments.includes(empOrgIds.departmentId)) return false;
      return true;
    });
  }, [allLeaveTypes, lookupDone, empOrgIds]);

  // Handle default selection when applicable types change
  React.useEffect(() => {
    const updateDefaultType = async () => {
      if (applicableLeaveTypes.length > 0 && !applicableLeaveTypes.find(t => t.code === type)) {
        setType(applicableLeaveTypes[0].code);
      }
    };
    updateDefaultType();
  }, [applicableLeaveTypes, type]);

  // ── Auto lookup employee khi nhập xong mã ──
  const handleLookup = useCallback(async (overrideCode?: string) => {
    const code = (overrideCode || employeeCode).trim().toUpperCase();
    if (!code) return;
    setLookupLoading(true);
    setLookupError('');
    setLookupDone(false);
    try {
      const res = await fetch(`/api/v1/employees?employeeCodes=${encodeURIComponent(code)}`);
      if (!res.ok) throw new Error('Không thể kiểm tra thông tin nhân viên.');
      const json = await res.json();
      const employees: {
        id: string;
        employeeCode?: string;
        fullName?: string;
        name?: string;
        role?: string;
        departmentName?: string;
        deptGroupName?: string;
        phone?: string;
        address?: string;
        branchId?: string;
        locationId?: string;
        deptGroupId?: string;
        departmentId?: string;
        branchName?: string;
      }[] = json.data || [];
      if (employees.length === 0) {
        throw new Error(`Không tìm thấy mã "${code}" trên hệ thống.`);
      }
      const emp = employees[0];
      setMatchedEmpId(emp.id);
      setMatchedEmpCode(emp.employeeCode ?? code);
      setEmployeeName(emp.fullName ?? emp.name ?? '');
      setPosition(emp.role ?? '');
      setDepartment(emp.departmentName ?? emp.deptGroupName ?? '');
      setBranch(emp.branchName ?? '');
      setPhone(emp.phone ?? '');
      setAddress(emp.address ?? '');
      setEmpOrgIds({
        branchId: emp.branchId,
        locationId: emp.locationId,
        deptGroupId: emp.deptGroupId,
        departmentId: emp.departmentId,
      });
      setLookupDone(true);
    } catch (err: unknown) {
      setLookupError(err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    } finally {
      setLookupLoading(false);
    }
  }, [employeeCode]);

  // ── Tự động điền mã NV từ URL (nếu có) ──
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('code');
    if (codeFromUrl) {
      const timer = setTimeout(() => {
        setEmployeeCode(codeFromUrl);
        handleLookup(codeFromUrl);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [handleLookup]);

  // Reset lookup khi mã NV thay đổi
  const handleEmployeeCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmployeeCode(e.target.value.toUpperCase());
    if (lookupDone || lookupError || employeeName) {
      setLookupDone(false);
      setLookupError('');
      setEmployeeName('');
      setPosition('');
      setDepartment('');
      setBranch('');
      setPhone('');
      setAddress('');
      setMatchedEmpId('');
      setMatchedEmpCode('');
      setEmpOrgIds({});
    }
  };

  const validationError = React.useMemo(() => {
    if (!startDate || !endDate) return null;
    if (new Date(startDate) > new Date(endDate)) {
      return 'Ngày bắt đầu không được lớn hơn ngày kết thúc.';
    }
    
    const selectedLeaveType = allLeaveTypes.find((t) => t.code === type);
    
    if (isLateOrEarly) {
      if (startDate !== endDate) {
        return 'Đi muộn/Về sớm chỉ được chọn trong 1 ngày (Ngày bắt đầu và kết thúc phải giống nhau).';
      }
      const mins = Number(requestedMinutes);
      if (requestedMinutes && leaveConfig?.limitLateEarlyMinutes && mins > leaveConfig.limitLateEarlyMinutes) {
        return `Số phút xin phép vượt quá giới hạn cho phép (${leaveConfig.limitLateEarlyMinutes} phút).`;
      }
    }

    if (selectedLeaveType) {
      if (selectedLeaveType.maxConsecutiveDays && numDays > selectedLeaveType.maxConsecutiveDays) {
        return `Hình thức "${selectedLeaveType.name}" chỉ cho phép nghỉ tối đa ${selectedLeaveType.maxConsecutiveDays} ngày liên tiếp (bạn đang chọn ${numDays} ngày).`;
      }
      
      if (selectedLeaveType.noticePeriodDays) {
        const diffDays = dayjs(startDate).startOf('day').diff(dayjs().startOf('day'), 'day');
        if (diffDays < selectedLeaveType.noticePeriodDays) {
          return `Hình thức "${selectedLeaveType.name}" yêu cầu phải nộp đơn báo trước tối thiểu ${selectedLeaveType.noticePeriodDays} ngày.`;
        }
      }
    }
    return null;
  }, [startDate, endDate, type, requestedMinutes, allLeaveTypes, isLateOrEarly, numDays, leaveConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!lookupDone || !matchedEmpId) {
      setErrorMsg('Vui lòng tra cứu mã nhân viên trước khi gửi đơn.');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('Vui lòng nhập lý do xin nghỉ phép.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setErrorMsg('Thời gian không hợp lệ: Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }
    const selectedLeaveType = allLeaveTypes.find((t) => t.code === type);

    if (isLateOrEarly) {
      if (startDate !== endDate) {
        setErrorMsg('Đi muộn/Về sớm chỉ được chọn trong 1 ngày (Ngày bắt đầu và kết thúc phải giống nhau).');
        return;
      }
      const mins = Number(requestedMinutes);
      if (!requestedMinutes || isNaN(mins) || mins <= 0) {
        setErrorMsg('Vui lòng chọn hoặc nhập số phút xin phép hợp lệ.');
        return;
      }
      if (leaveConfig?.limitLateEarlyMinutes && mins > leaveConfig.limitLateEarlyMinutes) {
        setErrorMsg(`Số phút xin phép vượt quá giới hạn cho phép (${leaveConfig.limitLateEarlyMinutes} phút).`);
        return;
      }
    } else {
      if (numDays <= 0) {
        setErrorMsg('Số ngày nghỉ không hợp lệ.');
        return;
      }
    }

    if (selectedLeaveType) {
      if (selectedLeaveType.maxConsecutiveDays && numDays > selectedLeaveType.maxConsecutiveDays) {
        setErrorMsg(`Hình thức "${selectedLeaveType.name}" chỉ cho phép nghỉ tối đa ${selectedLeaveType.maxConsecutiveDays} ngày liên tiếp.`);
        return;
      }
      
      if (selectedLeaveType.noticePeriodDays) {
        const diffDays = dayjs(startDate).startOf('day').diff(dayjs().startOf('day'), 'day');
        if (diffDays < selectedLeaveType.noticePeriodDays) {
          setErrorMsg(`Hình thức "${selectedLeaveType.name}" yêu cầu phải báo trước tối thiểu ${selectedLeaveType.noticePeriodDays} ngày.`);
          return;
        }
      }
    }
    // Đã bỏ validate bàn giao công việc (không bắt buộc nhập)

    setLoading(true);
    try {
      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: matchedEmpId,
          employeeCode: matchedEmpCode,
          employeeName,
          employeeRole: position,
          department,
          departmentId: empOrgIds.departmentId,
          branch,
          branchId: empOrgIds.branchId,
          locationId: empOrgIds.locationId,
          deptGroupId: empOrgIds.deptGroupId,
          phone,
          address,
          type,
          startDate,
          endDate,
          requestedMinutes: isLateOrEarly ? Number(requestedMinutes) : undefined,
          reason,
          handoverTo,
          handoverDept,
          handoverTasks,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'Gửi đơn thất bại.');
      setSubmitted(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi hệ thống khi gửi đơn.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setEmployeeCode('');
    setEmployeeName('');
    setPosition('');
    setDepartment('');
    setBranch('');
    setPhone('');
    setAddress('');
    setLookupDone(false);
    setLookupError('');
    setMatchedEmpId('');
    setMatchedEmpCode('');
    setEmpOrgIds({});
    if (applicableLeaveTypes.length > 0) setType(applicableLeaveTypes[0].code);
    setStartDate(TODAY);
    setEndDate(TODAY);
    setRequestedMinutes('');
    setReason('');
    setHandoverTo('');
    setHandoverDept('');
    setHandoverTasks('');
    setLocation('Hà Nội');
    setSubmitted(false);
    setErrorMsg('');
  };

  if (submitted) {
    return (
      <SuccessScreen
        employeeName={employeeName}
        employeeCode={matchedEmpCode}
        onReset={handleReset}
      />
    );
  }

  return (
    <div
      className="min-h-full py-0 px-0 sm:py-4 sm:px-4 flex items-start justify-center"
      style={{
        background: 'linear-gradient(160deg, #e8eeff 0%, #f0f7ff 40%, #e8f4f8 100%)',
      }}
    >
      {/* A4 Paper */}
      <div
        className="w-full bg-white rounded-sm relative px-5 py-8 sm:px-12 sm:py-12 md:px-14 md:py-14"
        style={{
          maxWidth: '740px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 20px 60px rgba(0,0,0,0.12)',
        }}
      >
        {/* ── HEADER ── */}
        <div className="text-center mb-6 space-y-0.5">
          <p className="text-[13px] font-bold tracking-wide text-gray-800 uppercase">
            Cộng hòa xã hội chủ nghĩa Việt Nam
          </p>
          <p className="text-[12px] text-gray-600 italic tracking-wider">
            Độc lập – Tự do – Hạnh phúc
          </p>
          <div className="flex justify-center mt-1">
            <div className="w-28 h-px bg-gray-600" />
          </div>
        </div>

        {/* ── TIÊU ĐỀ ── */}
        <div className="text-center mb-7">
          <h1 className="text-xl font-bold tracking-widest text-gray-900 uppercase">
            Đơn Xin Nghỉ Phép
          </h1>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* ── KÍNH GỬI ── */}
          <div className="mb-5 space-y-1 text-sm text-gray-700">
            <div className="flex gap-4">
              <span className="font-semibold shrink-0">Kính gửi:</span>
              <div className="space-y-0.5">
                <p>– Ban Giám Đốc Công Ty</p>
                <p>– Phòng Hành chính – Nhân sự</p>
              </div>
            </div>
          </div>

          {/* ─── SECTION: Thông tin nhân viên ─── */}
          <SectionTitle>Thông tin người làm đơn</SectionTitle>

          {/* Mã NV + lookup */}
          <div className="mb-3">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1">
              <span className="text-sm text-gray-700 shrink-0 font-medium">Mã nhân viên:</span>
              <div className="flex gap-2 flex-1 items-center w-full">
                <input
                  type="text"
                  placeholder="Ví dụ: NV109002"
                  value={employeeCode}
                  onChange={handleEmployeeCodeChange}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleLookup())}
                  className={[
                    'flex-1 border-b-[1.5px] border-dotted bg-transparent outline-none text-sm py-0.5 px-1',
                    'text-gray-800 placeholder:text-gray-300 font-mono uppercase',
                    'focus:border-blue-500 transition-colors duration-200',
                    lookupError ? 'border-red-400' : 'border-gray-400 hover:border-gray-600',
                  ].join(' ')}
                />
                <button
                  type="button"
                  onClick={() => handleLookup()}
                  disabled={lookupLoading || !employeeCode.trim()}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 sm:py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap',
                    lookupDone
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed',
                  ].join(' ')}
                >
                  {lookupLoading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : lookupDone ? (
                    <CheckCircle2 size={12} />
                  ) : (
                    <Search size={12} />
                  )}
                  {lookupLoading ? 'Đang tra...' : lookupDone ? 'Đã xác nhận' : 'Tra cứu'}
                </button>
              </div>
            </div>
            {lookupError && (
              <div className="flex items-center gap-1.5 mt-1 ml-[108px] text-xs text-red-500">
                <AlertCircle size={12} />
                {lookupError}
              </div>
            )}
          </div>

          <FieldLine label="Tôi tên là">
            <InlineInput
              placeholder="Họ và tên đầy đủ"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              required
            />
          </FieldLine>

          <FieldLine label="Chức vụ">
            <InlineInput
              placeholder="Chức vụ / Vị trí công việc"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
          </FieldLine>

          <FieldLine label="Chi nhánh">
            <InlineInput
              placeholder="Chi nhánh làm việc"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
          </FieldLine>

          <FieldLine label="Phòng ban">
            <InlineInput
              placeholder="Phòng / Ban / Bộ phận"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </FieldLine>

          <FieldLine label="Địa chỉ">
            <InlineInput
              placeholder="Địa chỉ liên hệ"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </FieldLine>

          <FieldLine label="Điện thoại">
            <InlineInput
              type="tel"
              placeholder="Số điện thoại liên hệ"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </FieldLine>

          {/* ─── SECTION: Chi tiết nghỉ phép ─── */}
          <SectionTitle>Chi tiết xin nghỉ</SectionTitle>

          {/* Loại nghỉ */}
          <div className="flex items-baseline gap-2 py-1 mb-2">
            <span className="text-sm text-gray-700 shrink-0 font-medium">Hình thức:</span>
            <div className="flex-1 flex flex-wrap gap-2">
              {applicableLeaveTypes.length === 0 && <span className="text-xs text-gray-400 italic">Không có hình thức phù hợp</span>}
              {applicableLeaveTypes.map((opt) => (
                <label
                  key={opt.code}
                  className={[
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs cursor-pointer transition-all border',
                    type === opt.code
                      ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="leaveType"
                    value={opt.code}
                    checked={type === opt.code}
                    onChange={() => setType(opt.code)}
                    className="sr-only"
                  />
                  {opt.name}
                </label>
              ))}
            </div>
          </div>

          {/* Câu văn tường thuật về thời gian nghỉ */}
          <div className="bg-blue-50 rounded-xl p-4 mb-3 space-y-3">
            <p className="text-sm text-gray-700 leading-relaxed">
              Nay tôi trình đơn này kính xin Ban Giám Đốc chấp thuận cho tôi được nghỉ phép trong
              thời gian{' '}
              <span className="font-bold text-blue-700">
                {isLateOrEarly
                  ? requestedMinutes
                    ? `${requestedMinutes} phút`
                    : '…… phút'
                  : `${numDays} ngày`}
              </span>{' '}
              (Kể từ ngày{' '}
              <span className="font-bold text-blue-700">{formatDateVN(startDate)}</span> đến hết
              ngày <span className="font-bold text-blue-700">{formatDateVN(endDate)}</span>)
            </p>

            {/* Ngày bắt đầu – Ngày kết thúc */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Thời gian nghỉ (Từ ngày - Đến ngày)
              </p>
              <DateRangePicker
                value={[dayjs(startDate), dayjs(endDate)]}
                onRangeChanges={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setStartDate(dates[0].format('YYYY-MM-DD'));
                    setEndDate(dates[1].format('YYYY-MM-DD'));
                  }
                }}
                disabledDate={(current: dayjs.Dayjs) => {
                  if (!leaveConfig) return false;
                  const diffDays = current.startOf('day').diff(dayjs().startOf('day'), 'day');
                  if (!leaveConfig.allowPastDates && diffDays < 0) return true;
                  if (!leaveConfig.allowFutureDates && diffDays > 0) return true;
                  if (leaveConfig.allowPastDates && diffDays < -leaveConfig.maxPastDays) return true;
                  if (leaveConfig.allowFutureDates && diffDays > leaveConfig.maxFutureDays) return true;
                  return false;
                }}
                className="h-[38px] rounded-md border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                allowClear={false}
              />
            </div>

            {/* Số phút (nếu đi muộn/về sớm) */}
            {isLateOrEarly && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                  {type === 'arrive_late' ? 'Số phút đi muộn' : 'Số phút về sớm'}
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {['30', '60', '90', '120'].map((mins) => {
                    let label = mins + ' phút';
                    if (mins === '60') label = '1 tiếng';
                    if (mins === '90') label = '1.5 tiếng';
                    if (mins === '120') label = '2 tiếng';
                    const isSelected = requestedMinutes === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setRequestedMinutes(mins)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-50'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="number"
                  min={1}
                  value={requestedMinutes}
                  onChange={(e) => setRequestedMinutes(e.target.value)}
                  placeholder="Hoặc nhập số phút tùy chỉnh..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            )}
          </div>

          {/* Lý do */}
          <div className="mb-1">
            <p className="text-sm text-gray-700 font-medium mb-1">Lý do xin nghỉ phép:</p>
            <InlineTextarea
              rows={3}
              placeholder="Nhập lý do chi tiết..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              error={!reason.trim() && !!errorMsg}
              required
            />
          </div>

          {/* ─── SECTION: Bàn giao công việc ─── */}
          <SectionTitle>Bàn giao công việc</SectionTitle>

          <FieldLine label="Tôi đã bàn giao công việc cho">
            <InlineInput
              placeholder="Họ tên người nhận bàn giao"
              value={handoverTo}
              onChange={(e) => setHandoverTo(e.target.value)}
            />
          </FieldLine>

          <FieldLine label="Bộ phận">
            <InlineInput
              placeholder="Bộ phận của người nhận bàn giao"
              value={handoverDept}
              onChange={(e) => setHandoverDept(e.target.value)}
            />
          </FieldLine>

          <div className="mt-2 mb-1">
            <p className="text-sm text-gray-700 font-medium mb-1">Các công việc được bàn giao:</p>
            <InlineTextarea
              rows={2}
              placeholder="Liệt kê các công việc bàn giao..."
              value={handoverTasks}
              onChange={(e) => setHandoverTasks(e.target.value)}
            />
          </div>

          {/* Cam kết */}
          <div className="mt-5 space-y-1 text-sm text-gray-600 italic">
            <p>Tôi xin hứa sẽ cập nhật đầy đủ nội dung công tác trong thời gian vắng.</p>
            <p>Kính mong Ban Giám Đốc xem xét và chấp thuận.</p>
          </div>

          {/* Ngày tháng */}
          <div className="mt-4 flex justify-end items-baseline text-sm text-gray-700 font-medium">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Nơi viết đơn..."
              className="w-24 border-b-[1.5px] border-dotted border-gray-400 hover:border-gray-600 focus:border-blue-500 bg-transparent outline-none text-center px-1 transition-colors mr-1"
            />
            <span>
              , ngày <span className="font-bold">{String(submitDate.getDate()).padStart(2, '0')}</span> tháng{' '}
              <span className="font-bold">{String(submitDate.getMonth() + 1).padStart(2, '0')}</span>{' '}
              năm{' '}
              <span className="font-bold">{submitDate.getFullYear()}</span>
            </span>
          </div>

          {/* Chữ ký */}
          <div className="mt-4 grid grid-cols-2 gap-4 text-center text-sm">
            <div className="space-y-1">
              <p className="font-bold text-gray-800">Trưởng Bộ phận</p>
              <p className="text-xs text-gray-400 italic">(Ký, ghi rõ họ tên)</p>
              <div className="h-16 border border-dashed border-gray-200 rounded-lg mt-2 bg-gray-50 flex items-end justify-center pb-2">
                <span className="text-[11px] text-gray-300">Xác nhận bởi quản lý</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-gray-800">Người làm đơn</p>
              <p className="text-xs text-gray-400 italic">(Ký, ghi rõ họ tên)</p>
              <div className="h-16 border border-dashed border-blue-200 rounded-lg mt-2 bg-blue-50 flex items-end justify-center pb-2">
                <span className="text-[11px] text-blue-300 font-medium">
                  {employeeName || 'Chưa xác nhận danh tính'}
                </span>
              </div>
            </div>
          </div>

          {/* Real-time validation warning */}
          {validationError && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Error message */}
          {errorMsg && !validationError && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ── Submit Button ── */}
          <div className="mt-6">
            <button
              type="submit"
              disabled={loading || !!validationError || !lookupDone}
              className={[
                'w-full py-3.5 rounded-2xl text-sm font-bold transition-all cursor-pointer',
                'flex items-center justify-center gap-2',
                loading || !lookupDone || !!validationError
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 active:translate-y-0',
              ].join(' ')}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang gửi đơn...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  {!lookupDone ? 'Tra cứu mã nhân viên trước' : 'Gửi Đơn Xin Nghỉ Phép'}
                </>
              )}
            </button>
            {!lookupDone && (
              <p className="text-center text-[11px] text-gray-400 mt-2">
                Nhập mã nhân viên và bấm{' '}
                <span className="font-semibold text-blue-500">Tra cứu</span> để kích hoạt nút gửi
                đơn.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
