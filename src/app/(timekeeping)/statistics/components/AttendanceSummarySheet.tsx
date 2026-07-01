import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Download, FileCheck2, Maximize2, X, History } from 'lucide-react';
import { message } from 'antd';
import { Box } from '@/app/ui/base/box';
import { TitleBase } from '@/app/ui/base/tittle';
import { ModalBase } from '@/app/ui/base/modal';
import { InputNumberBase } from '@/app/ui/base/input-number';
import { InputAreaBase } from '@/app/ui/base/textarea';
import { ButtonBase } from '@/app/ui/base/button';
import { TableBase, type Column } from '@/app/ui/base/table';
import type { AttendanceRequest, Employee, OvertimeRequest, ShiftConfig } from '@/app/interface/timekeeping';
import {
  buildEmployeeStatsRows,
  getEmployeeCode,
  type DateRange,
  type EmployeeStat,
  type EmployeeStatsTableRow,
} from '@/app/lib/timekeeping/statisticsService';
import { cookieBase } from '@/app/utils/cookie';
import type { User } from '@/app/data/dataUser';

type AttendanceCellValue = number | string;

type MetricLabel = 'Công' | 'Giờ';
type OverrideField = 'work' | 'online' | 'overtime';

interface AttendanceSummaryOverride {
  _id?: string;
  employeeCode: string;
  employeeName?: string;
  departmentName?: string;
  date: string;
  periodFrom?: string;
  periodTo?: string;
  field: OverrideField | 'note';
  value: AttendanceCellValue;
  originalValue: AttendanceCellValue;
  reason?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface AttendanceSummaryOverrideLog {
  _id: string;
  overrideId?: string;
  employeeCode: string;
  employeeName?: string;
  departmentName?: string;
  date: string;
  periodFrom?: string;
  periodTo?: string;
  field: OverrideField | 'note';
  oldValue: AttendanceCellValue;
  newValue: AttendanceCellValue;
  originalValue: AttendanceCellValue;
  reason?: string;
  updatedBy?: string;
  updatedAt?: string;
}

interface SummaryDay {
  date: string;
  day: number;
  weekday: string;
  isWeekend: boolean;
}

interface EditingCell {
  employee: AttendanceSummaryEmployee;
  departmentName: string;
  day: SummaryDay;
  field: OverrideField;
  currentValue: AttendanceCellValue;
  originalValue: AttendanceCellValue;
}

interface EditingNote {
  employee: AttendanceSummaryEmployee;
  departmentName: string;
  day: SummaryDay;
  originalValue: string;
}

interface EmployeeDateValues {
  work: AttendanceCellValue;
  online: AttendanceCellValue;
  overtime: AttendanceCellValue;
  overtimeStart?: string;
  overtimeEnd?: string;
  overtimeType?: string;
  overtimeWorkMode?: string;
  inTime?: string;
  outTime?: string;
  shift?: string;
  workingHours?: number | string;
  workingHoursRaw?: number;
  workingHoursOnlineRaw?: number;
  workingHoursOfflineRaw?: number;
}

interface AttendanceSummaryEmployee {
  stt: number;
  empCode: string;
  name: string;
  isFullTime: boolean;
  metricLabel: MetricLabel;
  workValues: AttendanceCellValue[];
  onlineValues: AttendanceCellValue[];
  overtimeValues: AttendanceCellValue[];
  overtimeStartValues: (string | undefined)[];
  overtimeEndValues: (string | undefined)[];
  overtimeTypeValues: (string | undefined)[];
  overtimeWorkModeValues: (string | undefined)[];
  inTimeValues: (string | undefined)[];
  outTimeValues: (string | undefined)[];
  shiftValues: (string | undefined)[];
  workingHoursValues: (number | string | undefined)[];
  workOriginalValues: AttendanceCellValue[];
  onlineOriginalValues: AttendanceCellValue[];
  overtimeOriginalValues: AttendanceCellValue[];
  workTotal: AttendanceCellValue;
  onlineTotal: AttendanceCellValue;
  overtimeTotal: AttendanceCellValue;
  totalCalculatedHours: string;
  totalCalculatedOnlineHours: string;
  totalCalculatedOfflineHours: string;
  note?: string;
}

interface AttendanceSummaryDepartment {
  name: string;
  employees: AttendanceSummaryEmployee[];
}

export interface AttendanceSummarySheetProps {
  employeesStats: EmployeeStat[];
  shifts: ShiftConfig[];
  dateRange?: DateRange | null;
  periodLabel: string;
  selectedYear: string;
  isLoading?: boolean;
  attendanceRequests?: AttendanceRequest[];
  overtimeRequests?: OvertimeRequest[];
}

const WEEKDAY_LABELS = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const cellClass = 'border border-slate-300 px-1 py-1 text-center align-middle leading-tight transition-colors';

const parseDateValue = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const enumerateDateRange = (range: DateRange) => {
  const dates: string[] = [];
  const current = parseDateValue(range.from);
  const end = parseDateValue(range.to);

  while (current <= end) {
    dates.push(formatDateValue(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

const isFullTimeEmployee = (employee: Employee) => {
  const employeeType = String(employee.employeeType || '').toLowerCase();
  const role = String(employee.role || '').toLowerCase();
  return employeeType === 'full_time' || employeeType === 'full time' || role === 'fulltime' || role === 'full time';
};

const toNumber = (value: number | string) => {
  if (typeof value === 'number') return value;
  const normalized = String(value).trim().replace(',', '.');
  const timeMatch = normalized.match(/^(\d+(?:\.\d+)?)h(?:(\d{1,2}))?$/i);
  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2] || 0);
    return (Number.isFinite(hours) ? hours : 0) + ((Number.isFinite(minutes) ? minutes : 0) / 60);
  }
  const parsed = Number(normalized.replace('h', ''));
  return Number.isFinite(parsed) ? parsed : 0;
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

const isOnlineRecord = (row: EmployeeStatsTableRow) => (
  String(row.deviceType || '').toLowerCase().includes('online')
);

const formatCellValue = (value: number): AttendanceCellValue => {
  if (Number.isInteger(value)) return value;
  return String(value).replace('.', ',');
};

const formatHoursAsTime = (value: number): AttendanceCellValue => {
  if (!Number.isFinite(value) || value <= 0) return 0;

  const totalMinutes = Math.round(value * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes > 0 ? `${hours}h${String(minutes).padStart(2, '0')}` : `${hours}h`;
};

const formatSummaryValue = (value: number, isFullTime: boolean): AttendanceCellValue => (
  isFullTime ? formatCellValue(value) : formatHoursAsTime(value)
);

const sumRowValue = (rows: EmployeeStatsTableRow[], isFullTime: boolean) => {
  const total = rows.reduce((sum, row) => {
    return sum + (isFullTime ? toNumber(row.total) : row.workMinutes / 60);
  }, 0);

  return formatSummaryValue(total, isFullTime);
};

const sumOvertimeValue = (rows: EmployeeStatsTableRow[]) => {
  const total = rows.reduce((sum, row) => sum + row.hoursPlus, 0);
  return formatCellValue(total);
};

const getOverrideKey = (employeeCode: string, date: string, field: string) => (
  `${employeeCode}__${date}__${field}`
);

const getSummaryDays = (dateRange: DateRange | null | undefined, rows: EmployeeStatsTableRow[]): SummaryDay[] => {
  const dates = dateRange
    ? enumerateDateRange(dateRange)
    : Array.from(new Set(rows.map((row) => row.rawDate))).sort();

  return dates.map((date) => {
    const parsed = parseDateValue(date);
    return {
      date,
      day: parsed.getDate(),
      weekday: WEEKDAY_LABELS[parsed.getDay()],
      isWeekend: parsed.getDay() === 0,
    };
  });
};

const sanitizeFileName = (value: string) => (
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
);

interface EditSummaryCellModalProps {
  editingCell: EditingCell | null;
  saving: boolean;
  onCancel: () => void;
  onSave: (value: number, reason: string) => void;
}

function EditSummaryCellModal({
  editingCell,
  saving,
  onCancel,
  onSave,
}: EditSummaryCellModalProps) {
  const [step, setStep] = useState<'value' | 'reason'>('value');
  const [value, setValue] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  if (!editingCell) return null;

  const handleNext = () => {
    if (value === null || !Number.isFinite(value) || value < 0) {
      message.warning('Giá trị sửa tay không hợp lệ');
      return;
    }
    setStep('reason');
  };

  const handleSave = () => {
    if (value === null || !Number.isFinite(value) || value < 0) {
      message.warning('Giá trị sửa tay không hợp lệ');
      return;
    }
    onSave(value, reason.trim());
  };

  return (
    <ModalBase
      contentBtn={null}
      isOpen
      title={step === 'value' ? 'Nhập giá trị sửa tay' : 'Lý do sửa tay'}
      width={360}
      zIndex={10050}
      onCancel={onCancel}
      footer={(
        <div className="flex justify-end gap-2">
          <ButtonBase
            className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            onClick={onCancel}
            disabled={saving}
          >
            Hủy
          </ButtonBase>
          {step === 'value' ? (
            <ButtonBase
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={handleNext}
              disabled={saving}
            >
              Tiếp
            </ButtonBase>
          ) : (
            <ButtonBase
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={handleSave}
              disabled={saving}
            >
              Lưu
            </ButtonBase>
          )}
        </div>
      )}
    >
      <div className="space-y-3 text-sm text-slate-700">
        {step === 'value' ? (
          <InputNumberBase
            value={value}
            min={0}
            step={0.25}
            onChange={setValue}
            className="!w-full justify-start rounded-xl border border-slate-200 px-3 py-2"
          />
        ) : (
          <InputAreaBase
            value={reason}
            rows={3}
            placeholder="Nhập lý do sửa tay"
            className="rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100"
            onChange={(event) => setReason(event.target.value)}
          />
        )}
      </div>
    </ModalBase>
  );
}

interface SummaryEmployeeRowsProps {
  employee: AttendanceSummaryEmployee;
  departmentName: string;
  summaryDays: SummaryDay[];
  overrideMap: Map<string, AttendanceSummaryOverride>;
  savingOverrideKey: string | null;
  onEditCell: (
    employee: AttendanceSummaryEmployee,
    departmentName: string,
    day: SummaryDay,
    field: OverrideField,
    currentValue: AttendanceCellValue,
    originalValue: AttendanceCellValue,
  ) => void;
  onEditNote: (
    employee: AttendanceSummaryEmployee,
    departmentName: string,
  ) => void;
}

const SummaryEmployeeRows = memo(function SummaryEmployeeRows({
  employee,
  departmentName,
  summaryDays,
  overrideMap,
  savingOverrideKey,
  onEditCell,
  onEditNote,
}: SummaryEmployeeRowsProps) {
  const noteDay = summaryDays[0];
  const noteOverrideKey = noteDay ? getOverrideKey(employee.empCode, noteDay.date, 'note') : '';
  const noteOverride = noteOverrideKey ? overrideMap.get(noteOverrideKey) : undefined;
  const isNoteOverridden = String(noteOverride?.value ?? '').trim().length > 0;

  const renderMetricCells = (
    values: AttendanceCellValue[],
    originalValues: AttendanceCellValue[],
    field: OverrideField,
    activeClassName: string,
  ) => values.map((value, index) => {
    const day = summaryDays[index];
    const overrideKey = getOverrideKey(employee.empCode, day.date, field);
    const isOverridden = overrideMap.has(overrideKey);

    return (
      <td
        key={`${employee.empCode}-${field}-${day.date}`}
        title="Bấm để sửa tay"
        onClick={() => onEditCell(employee, departmentName, day, field, value, originalValues[index] ?? 0)}
        className={`${cellClass} h-6 cursor-pointer ${day.isWeekend ? 'bg-gray-50/50' : ''} ${isOverridden ? '!bg-yellow-50 ring-1 ring-inset ring-yellow-300' : ''} ${savingOverrideKey === overrideKey ? 'opacity-60' : ''} ${toNumber(value) ? activeClassName : 'text-gray-300'}`}
      >
        {value}
      </td>
    );
  });

  return (
    <Fragment>
      <tr className="bg-white hover:bg-gray-50/80 group">
        <td className={`${cellClass} font-medium text-gray-600`} rowSpan={3}>
          {employee.stt}
        </td>
        <td className={`${cellClass} text-left font-semibold text-gray-800`} rowSpan={3}>
          {employee.name}
        </td>
        <td className={`${cellClass} font-medium text-gray-500`}>{employee.metricLabel}</td>
        {renderMetricCells(employee.workValues, employee.workOriginalValues, 'work', 'text-green-600 font-medium')}
        <td className={`${cellClass} font-bold bg-green-50 text-green-700`}>{employee.workTotal}</td>
        <td
          title="Bấm để nhập ghi chú"
          rowSpan={3}
          onClick={() => onEditNote(employee, departmentName)}
          className={`${cellClass} min-w-[120px] cursor-pointer whitespace-pre-wrap text-left text-gray-500 ${isNoteOverridden ? '!bg-yellow-50 ring-1 ring-inset ring-yellow-300' : ''} ${savingOverrideKey === noteOverrideKey ? 'opacity-60' : ''}`}
        >
          {employee.note || ''}
        </td>
      </tr>
      <tr className="bg-white hover:bg-gray-50/80 group">
        <td className={`${cellClass} font-medium text-gray-500`}>Online</td>
        {renderMetricCells(employee.onlineValues, employee.onlineOriginalValues, 'online', 'text-blue-600 font-medium')}
        <td className={`${cellClass} font-bold bg-blue-50 text-blue-700`}>{employee.onlineTotal}</td>
      </tr>
      <tr className="bg-white hover:bg-gray-50/80 group">
        <td className={`${cellClass} font-medium text-gray-500`}>Tăng ca</td>
        {renderMetricCells(employee.overtimeValues, employee.overtimeOriginalValues, 'overtime', 'text-orange-600 font-medium')}
        <td className={`${cellClass} font-bold bg-orange-50 text-orange-700`}>{employee.overtimeTotal}</td>
      </tr>
    </Fragment>
  );
});

export default function AttendanceSummarySheet({
  employeesStats,
  shifts,
  dateRange,
  periodLabel,
  selectedYear,
  isLoading = false,
  attendanceRequests = [],
  overtimeRequests = [],
}: AttendanceSummarySheetProps) {
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [placeholderHeight, setPlaceholderHeight] = useState<number | null>(null);
  const [overrides, setOverrides] = useState<AttendanceSummaryOverride[]>([]);
  const [savingOverrideKey, setSavingOverrideKey] = useState<string | null>(null);
  const [isExportingPayroll, setIsExportingPayroll] = useState(false);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editingNote, setEditingNote] = useState<EditingNote | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollYBeforeFullScreenRef = useRef(0);
  const shouldRestoreScrollRef = useRef(false);
  const tableRows = useMemo(
    () => buildEmployeeStatsRows(employeesStats, shifts, dateRange, [], attendanceRequests, overtimeRequests),
    [attendanceRequests, overtimeRequests, dateRange, employeesStats, shifts],
  );

  const summaryDays = useMemo(
    () => getSummaryDays(dateRange, tableRows),
    [dateRange, tableRows],
  );

  const rowsByEmployeeDate = useMemo(() => {
    const map = new Map<string, EmployeeStatsTableRow[]>();
    tableRows.forEach((row) => {
      const key = `${row.empCode}-${row.rawDate}`;
      const rows = map.get(key) || [];
      rows.push(row);
      map.set(key, rows);
    });
    return map;
  }, [tableRows]);

  const overrideMap = useMemo(() => {
    const map = new Map<string, AttendanceSummaryOverride>();
    overrides.forEach((override) => {
      map.set(getOverrideKey(override.employeeCode, override.date, override.field), override);
    });
    return map;
  }, [overrides]);

  const employeeCodes = useMemo(
    () => employeesStats.map((stat) => getEmployeeCode(stat.employee)).filter(Boolean),
    [employeesStats],
  );

  useEffect(() => {
    if (!dateRange || employeeCodes.length === 0) {
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      periodFrom: dateRange.from,
      periodTo: dateRange.to,
      employeeCodes: employeeCodes.join(','),
    });

    fetch(`/api/attendance-summary-overrides?${params.toString()}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : { data: [] })
      .then((json: { data?: AttendanceSummaryOverride[] }) => setOverrides(json.data || []))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        setOverrides([]);
      });

    return () => controller.abort();
  }, [dateRange, employeeCodes]);

  const departments = useMemo<AttendanceSummaryDepartment[]>(() => {
    let stt = 1;
    const departmentMap = new Map<string, AttendanceSummaryEmployee[]>();
    const withOverride = (
      empCode: string,
      date: string,
      field: OverrideField,
      baseValue: AttendanceCellValue,
    ) => overrideMap.get(getOverrideKey(empCode, date, field))?.value ?? baseValue;
    const noteDate = summaryDays[0]?.date;

    employeesStats.forEach((stat) => {
      const empCode = getEmployeeCode(stat.employee);
      const isFullTime = isFullTimeEmployee(stat.employee);
      const metricLabel: MetricLabel = isFullTime ? 'Công' : 'Giờ';

      const dayValues = summaryDays.map((day): EmployeeDateValues => {
        const rowsInDay = rowsByEmployeeDate.get(`${empCode}-${day.date}`) || [];
        const overtimeRow = rowsInDay.find(r => r.overtimeStart || r.overtimeEnd);
        const primaryRow = rowsInDay.find(r => r.checkIn || r.checkOut) || rowsInDay[0];
        const onlineRows = rowsInDay.filter(isOnlineRecord);
        const offlineRows = rowsInDay.filter((r) => !isOnlineRecord(r));

        return {
          work: sumRowValue(offlineRows, isFullTime),
          online: sumRowValue(onlineRows, isFullTime),
          overtime: sumOvertimeValue(rowsInDay),
          overtimeStart: overtimeRow?.overtimeStart,
          overtimeEnd: overtimeRow?.overtimeEnd,
          overtimeType: overtimeRow?.overtimeType,
          overtimeWorkMode: overtimeRow?.overtimeWorkMode,
          inTime: primaryRow?.checkIn,
          outTime: primaryRow?.checkOut,
          shift: primaryRow?.shift,
          workingHours: primaryRow ? formatHoursAsTime(isFullTime ? Number(primaryRow.hours || 0) : (Number(primaryRow.workMinutes || 0) / 60)) : undefined,
        };
      });

      const workOriginalValues = dayValues.map((value) => value.work);
      const onlineOriginalValues = dayValues.map((value) => value.online);
      const overtimeOriginalValues = dayValues.map((value) => value.overtime);
      const overtimeStartValues = dayValues.map((value) => value.overtimeStart);
      const overtimeEndValues = dayValues.map((value) => value.overtimeEnd);
      const overtimeTypeValues = dayValues.map((value) => value.overtimeType);
      const overtimeWorkModeValues = dayValues.map((value) => value.overtimeWorkMode);
      const inTimeValues = dayValues.map((value) => value.inTime);
      const outTimeValues = dayValues.map((value) => value.outTime);
      const shiftValues = dayValues.map((value) => value.shift);
      const workingHoursValues = dayValues.map((value) => value.workingHours);
      
      const workValues = summaryDays.map((day, index) => withOverride(empCode, day.date, 'work', workOriginalValues[index]));
      const onlineValues = summaryDays.map((day, index) => withOverride(empCode, day.date, 'online', onlineOriginalValues[index]));
      const overtimeValues = summaryDays.map((day, index) => withOverride(empCode, day.date, 'overtime', overtimeOriginalValues[index]));

      const workingHoursOfflineRawValues = summaryDays.map((day, index) => {
        const offlineVal = workValues[index];
        const originalVal = workOriginalValues[index];
        if (offlineVal === originalVal) {
          const rowsInDay = rowsByEmployeeDate.get(`${empCode}-${day.date}`) || [];
          return rowsInDay.filter((r) => !isOnlineRecord(r)).reduce((sum, r) => sum + (isFullTime ? Number(r.hours || 0) : (Number(r.workMinutes || 0) / 60)), 0);
        }
        return isFullTime ? toNumber(offlineVal) * 8 : toNumber(offlineVal);
      });

      const workingHoursOnlineRawValues = summaryDays.map((day, index) => {
        const onlineVal = onlineValues[index];
        const originalVal = onlineOriginalValues[index];
        if (onlineVal === originalVal) {
          const rowsInDay = rowsByEmployeeDate.get(`${empCode}-${day.date}`) || [];
          return rowsInDay.filter(isOnlineRecord).reduce((sum, r) => sum + (isFullTime ? Number(r.hours || 0) : (Number(r.workMinutes || 0) / 60)), 0);
        }
        return isFullTime ? toNumber(onlineVal) * 8 : toNumber(onlineVal);
      });

      const workingHoursRawValues = workingHoursOfflineRawValues.map((offline, index) => offline + workingHoursOnlineRawValues[index]);

      const note = noteDate
        ? String(overrideMap.get(getOverrideKey(empCode, noteDate, 'note'))?.value ?? '')
        : '';

      const departmentName = getDisplayText(stat.employee.departmentName)
        || getDisplayText(stat.employee.departmentId)
        || 'Chung';
      const list = departmentMap.get(departmentName) || [];
      list.push({
        stt,
        empCode,
        name: stat.employee.fullName || stat.employee.name,
        isFullTime,
        metricLabel,
        workValues,
        onlineValues,
        overtimeValues,
        overtimeStartValues,
        overtimeEndValues,
        overtimeTypeValues,
        overtimeWorkModeValues,
        inTimeValues,
        outTimeValues,
        shiftValues,
        workingHoursValues,
        workOriginalValues,
        onlineOriginalValues,
        overtimeOriginalValues,
        workTotal: formatSummaryValue(workValues.reduce<number>((sum, value) => sum + toNumber(value), 0), isFullTime),
        onlineTotal: formatSummaryValue(onlineValues.reduce<number>((sum, value) => sum + toNumber(value), 0), isFullTime),
        overtimeTotal: formatCellValue(overtimeValues.reduce<number>((sum, value) => sum + toNumber(value), 0)),
        totalCalculatedHours: String(formatHoursAsTime(Number(workingHoursRawValues.reduce((sum, val) => sum + val, 0).toFixed(2)))),
        totalCalculatedOnlineHours: String(formatHoursAsTime(Number(workingHoursOnlineRawValues.reduce((sum, val) => sum + val, 0).toFixed(2)))),
        totalCalculatedOfflineHours: String(formatHoursAsTime(Number(workingHoursOfflineRawValues.reduce((sum, val) => sum + val, 0).toFixed(2)))),
        note,
      });
      stt += 1;
      departmentMap.set(departmentName, list);
    });

    stt = 1;
    return Array.from(departmentMap.entries()).map(([name, employees]) => ({
      name,
      employees: employees
        .sort((a, b) => Number(a.isFullTime) - Number(b.isFullTime))
        .map((employee) => ({ ...employee, stt: stt++ })),
    }));
  }, [employeesStats, overrideMap, rowsByEmployeeDate, summaryDays]);

  const totalColumns = 3 + summaryDays.length + 2;
  const fixedColumnsWidth = 48 + 220 + 72 + 86 + 120;
  const minWidth = fixedColumnsWidth + summaryDays.length * 46;

  useEffect(() => {
    if (isFullScreenOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }

    if (shouldRestoreScrollRef.current) {
      shouldRestoreScrollRef.current = false;
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollYBeforeFullScreenRef.current, behavior: 'auto' });
        setPlaceholderHeight(null);
      });
    }

    return undefined;
  }, [isFullScreenOpen]);

  const handleToggleFullScreen = () => {
    if (!isFullScreenOpen) {
      scrollYBeforeFullScreenRef.current = window.scrollY;
      setPlaceholderHeight(containerRef.current?.offsetHeight || null);
      setIsFullScreenOpen(true);
      return;
    }

    shouldRestoreScrollRef.current = true;
    setIsFullScreenOpen(false);
  };

  const handleEditCell = useCallback((
    employee: AttendanceSummaryEmployee,
    departmentName: string,
    day: SummaryDay,
    field: OverrideField,
    currentValue: AttendanceCellValue,
    originalValue: AttendanceCellValue,
  ) => {
    setEditingCell({ employee, departmentName, day, field, currentValue, originalValue });
  }, []);

  const handleCloseEditForm = useCallback(() => {
    setEditingCell(null);
  }, []);

  const handleEditNote = useCallback((
    employee: AttendanceSummaryEmployee,
    departmentName: string,
  ) => {
    const day = summaryDays[0];
    if (!day) {
      message.warning('Vui lòng chọn khoảng ngày để nhập ghi chú');
      return;
    }

    const originalValue = employee.note || '';
    setEditingNote({ employee, departmentName, day, originalValue });
    setNoteDraft(originalValue);
  }, [summaryDays]);

  const handleCloseNoteForm = useCallback(() => {
    setEditingNote(null);
    setNoteDraft('');
  }, []);

  const handleSaveEditForm = async (editValue: number, editReason: string) => {
    if (!editingCell) return;
    if (!Number.isFinite(editValue) || editValue < 0) {
      message.warning('Giá trị sửa tay không hợp lệ');
      return;
    }

    const { employee, departmentName, day, field, originalValue } = editingCell;
    const overrideKey = getOverrideKey(employee.empCode, day.date, field);

    try {
      const userObj = cookieBase.get<User>('info_user');
      const currentUserName = userObj?.name || userObj?.username || 'system';

      setSavingOverrideKey(overrideKey);
      const response = await fetch('/api/attendance-summary-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeCode: employee.empCode,
          employeeName: employee.name,
          departmentName,
          date: day.date,
          periodFrom: dateRange?.from || summaryDays[0]?.date || day.date,
          periodTo: dateRange?.to || summaryDays[summaryDays.length - 1]?.date || day.date,
          field,
          value: editValue,
          originalValue,
          reason: editReason,
          updatedBy: currentUserName,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || 'Lưu sửa tay thất bại');
      }

      const savedOverride = json.data as AttendanceSummaryOverride | null;
      setOverrides((prev) => {
        const filtered = prev.filter((item) => getOverrideKey(item.employeeCode, item.date, item.field) !== overrideKey);
        return savedOverride ? [...filtered, savedOverride] : filtered;
      });
      message.success('Đã lưu sửa tay');
      handleCloseEditForm();
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : 'Lưu sửa tay thất bại');
    } finally {
      setSavingOverrideKey(null);
    }
  };

  const handleSaveNoteForm = async () => {
    if (!editingNote) return;

    const { employee, departmentName, day, originalValue } = editingNote;
    const overrideKey = getOverrideKey(employee.empCode, day.date, 'note');
    const value = noteDraft.trim();

    try {
      setSavingOverrideKey(overrideKey);
      const response = await fetch('/api/attendance-summary-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeCode: employee.empCode,
          employeeName: employee.name,
          departmentName,
          date: day.date,
          periodFrom: dateRange?.from || summaryDays[0]?.date || day.date,
          periodTo: dateRange?.to || summaryDays[summaryDays.length - 1]?.date || day.date,
          field: 'note',
          value,
          originalValue,
          reason: 'Ghi chú bảng chấm công',
          updatedBy: 'system',
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || 'Lưu ghi chú thất bại');
      }

      const savedOverride = json.data as AttendanceSummaryOverride | null;
      setOverrides((prev) => {
        const filtered = prev.filter((item) => getOverrideKey(item.employeeCode, item.date, item.field) !== overrideKey);
        return savedOverride ? [...filtered, savedOverride] : filtered;
      });
      message.success('Đã lưu ghi chú');
      handleCloseNoteForm();
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : 'Lưu ghi chú thất bại');
    } finally {
      setSavingOverrideKey(null);
    }
  };

  const handleExportPayroll = async () => {
    if (isLoading || isExportingPayroll) return;
    if (departments.length === 0 || summaryDays.length === 0) {
      message.warning('Không có dữ liệu để xuất công');
      return;
    }

    const periodFrom = dateRange?.from || summaryDays[0]?.date;
    const periodTo = dateRange?.to || summaryDays[summaryDays.length - 1]?.date;
    if (!periodFrom || !periodTo) {
      message.warning('Vui lòng chọn khoảng ngày để xuất công');
      return;
    }

    const summaryDateSet = new Set(summaryDays.map((day) => day.date));
    const summaries = departments.flatMap((department) => (
      department.employees.map((employee) => {
        const manualAdjustmentCount = overrides.filter((override) => (
          override.employeeCode === employee.empCode
          && summaryDateSet.has(override.date)
          && ['work', 'online', 'overtime'].includes(override.field)
        )).length;

        const days = summaryDays.map((day, index) => {
          const work = toNumber(employee.workValues[index] ?? 0);
          const online = toNumber(employee.onlineValues[index] ?? 0);
          return {
            date: day.date,
            day: day.day,
            weekday: day.weekday,
            work,
            online,
            offline: Math.max(0, work - online),
            overtime: toNumber(employee.overtimeValues[index] ?? 0),
            overtimeStart: employee.overtimeStartValues[index],
            overtimeEnd: employee.overtimeEndValues[index],
            overtimeType: employee.overtimeTypeValues[index],
            overtimeWorkMode: employee.overtimeWorkModeValues[index],
            inTime: employee.inTimeValues[index],
            outTime: employee.outTimeValues[index],
            shift: employee.shiftValues[index],
            workingHours: employee.workingHoursValues[index],
          };
        });

        const workTotal = toNumber(employee.workTotal);
        const onlineTotal = toNumber(employee.onlineTotal);

        return {
          employeeCode: employee.empCode,
          employeeName: employee.name,
          departmentName: department.name,
          employeeType: employee.isFullTime ? 'full_time' : 'part_time',
          salaryUnit: employee.isFullTime ? 'workday' : 'hour',
          periodFrom,
          periodTo,
          periodLabel,
          workTotal,
          onlineTotal,
          offlineTotal: Math.max(0, workTotal - onlineTotal),
          overtimeTotal: toNumber(employee.overtimeTotal),
          totalCalculatedHours: employee.totalCalculatedHours,
          totalCalculatedOnlineHours: employee.totalCalculatedOnlineHours,
          totalCalculatedOfflineHours: employee.totalCalculatedOfflineHours,
          manualAdjusted: manualAdjustmentCount > 0,
          manualAdjustmentCount,
          days,
        };
      })
    ));

    try {
      setIsExportingPayroll(true);
      const response = await fetch('/api/attendance-payroll-summaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodFrom,
          periodTo,
          periodLabel,
          exportedBy: 'system',
          summaries,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || 'Xuất công thất bại');
      }

      message.success(`Đã xuất công ${json?.data?.exportedCount || summaries.length} nhân viên`);
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : 'Xuất công thất bại');
    } finally {
      setIsExportingPayroll(false);
    }
  };

  const handleExportExcel = async () => {
    if (isLoading) return;
    if (departments.length === 0 || summaryDays.length === 0) {
      message.warning('Không có dữ liệu để xuất Excel');
      return;
    }

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bang cham cong', {
      views: [{ state: 'frozen', xSplit: 3, ySplit: 5 }],
    });

    const year = dateRange?.from.slice(0, 4) || selectedYear;
    const totalSheetColumns = totalColumns;

    const titleRow = worksheet.addRow(['Bảng chấm công tổng hợp']);
    worksheet.mergeCells(titleRow.number, 1, titleRow.number, totalSheetColumns);
    const periodRow = worksheet.addRow([periodLabel]);
    worksheet.mergeCells(periodRow.number, 1, periodRow.number, totalSheetColumns);
    const spacerRow = worksheet.addRow([]);
    worksheet.mergeCells(spacerRow.number, 1, spacerRow.number, totalSheetColumns);

    const yearRow = worksheet.addRow(['Năm', year]);
    worksheet.mergeCells(yearRow.number, 2, yearRow.number, totalSheetColumns);

    const dayHeaderRow = worksheet.addRow(['HUPUNA GROUP', '', '', ...summaryDays.map((day) => day.day), 'Tổng cộng', 'Ghi chú']);
    worksheet.mergeCells(dayHeaderRow.number, 1, dayHeaderRow.number, 3);

    worksheet.addRow(['STT', 'Họ và tên', 'Loại', ...summaryDays.map((day) => day.weekday), '', '']);

    departments.forEach((department) => {
      const departmentRow = worksheet.addRow([department.name]);
      worksheet.mergeCells(departmentRow.number, 1, departmentRow.number, totalSheetColumns);

      department.employees.forEach((employee) => {
        const workRow = worksheet.addRow([
          employee.stt,
          employee.name,
          employee.metricLabel,
          ...employee.workValues,
          employee.workTotal,
          employee.note || '',
        ]);
        worksheet.addRow([
          '',
          '',
          'Online',
          ...employee.onlineValues,
          employee.onlineTotal,
          '',
        ]);
        const overtimeRow = worksheet.addRow([
          '',
          '',
          'Tăng ca',
          ...employee.overtimeValues,
          employee.overtimeTotal,
          '',
        ]);
        worksheet.mergeCells(workRow.number, 1, overtimeRow.number, 1);
        worksheet.mergeCells(workRow.number, 2, overtimeRow.number, 2);
      });
    });

    worksheet.columns = [
      { width: 8 },
      { width: 28 },
      { width: 10 },
      ...summaryDays.map(() => ({ width: 8 })),
      { width: 12 },
      { width: 24 },
    ];

    worksheet.eachRow((row, rowNumber) => {
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 2 || colNumber === totalSheetColumns ? 'left' : 'center',
          wrapText: colNumber === totalSheetColumns,
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'CBD5E1' } },
          left: { style: 'thin', color: { argb: 'CBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
          right: { style: 'thin', color: { argb: 'CBD5E1' } },
        };

        if (rowNumber <= 6) {
          cell.font = { bold: true, color: { argb: rowNumber === 1 ? '1E293B' : '334155' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowNumber <= 3 ? 'FFFFFF' : 'F8FAFC' } };
        }

        const dayIndex = colNumber - 4;
        if (dayIndex >= 0 && dayIndex < summaryDays.length && summaryDays[dayIndex].isWeekend) {
          cell.font = { ...(cell.font || {}), color: { argb: 'FF0000' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
        }

        if (rowNumber > 6 && colNumber >= 4 && colNumber < totalSheetColumns && toNumber(String(cell.value ?? '')) > 0) {
          cell.font = { ...(cell.font || {}), color: { argb: row.getCell(3).value === 'Online' ? '2563EB' : '059669' }, bold: true };
        }
      });
    });

    worksheet.getRow(1).font = { bold: true, size: 16, color: { argb: '1E293B' } };
    worksheet.getRow(2).font = { color: { argb: '475569' } };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getRow(2).alignment = { vertical: 'middle', horizontal: 'left' };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Bang_Cham_Cong_Tong_Hop_${sanitizeFileName(periodLabel || year)}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div ref={containerRef} style={isFullScreenOpen && placeholderHeight ? { height: placeholderHeight } : undefined}>
      <Box
        className={`!p-0 !border-gray-200 bg-white shadow-sm ${isFullScreenOpen
          ? '!fixed !inset-0 !z-[9999] !rounded-none'
          : '!rounded-2xl overflow-visible'
          }`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              Bảng tổng hợp cuối kỳ
            </p>
            <TitleBase className="!text-lg">Bảng chấm công</TitleBase>
            <p className="mt-1 text-[11px] font-medium text-slate-500">{periodLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportPayroll}
              disabled={isLoading || isExportingPayroll}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileCheck2 className="h-4 w-4" />
              {isExportingPayroll ? 'Đang xuất...' : 'Xuất công'}
            </button>
            <Link
              href="/attendance-logs"
              target="_blank"
              className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-bold text-orange-700 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <History className="h-4 w-4" />
              Lịch sử chỉnh sửa
            </Link>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Xuất Excel
            </button>
            <button
              type="button"
              onClick={handleToggleFullScreen}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            >
              {isFullScreenOpen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              {isFullScreenOpen ? 'Đóng' : 'Xem full'}
            </button>
          </div>
        </div>

        <div className={`min-h-0 bg-slate-50 p-2 ${isFullScreenOpen ? 'h-[calc(100vh-73px)]' : 'max-h-[calc(100vh-220px)] overflow-visible'}`}>
          <div className={`${isFullScreenOpen ? 'h-full max-h-none rounded-lg' : 'max-h-[calc(100vh-240px)] min-h-[360px] rounded-lg'} w-full overflow-auto border border-gray-200 bg-white pb-8 pr-8 shadow-sm custom-scrollbar overscroll-contain`}>
            <table
              className="relative table-fixed border-separate border-spacing-0 font-['Segoe_UI',Tahoma,sans-serif] text-[12px] text-gray-800"
              style={{ width: minWidth, minWidth: minWidth, maxWidth: minWidth }}
            >
              <colgroup>
                <col className="w-12" />
                <col className="w-[220px]" />
                <col className="w-[72px]" />
                {summaryDays.map((day) => (
                  <col key={`col-${day.date}`} className="w-[46px]" />
                ))}
                <col className="w-[86px]" />
                <col className="w-[120px]" />
              </colgroup>
              <thead className="sticky top-0 z-30 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] [&_th]:relative [&_th]:z-30">
                <tr className="bg-white">
                  <th className={`${cellClass} bg-white text-left font-bold italic text-gray-500`} colSpan={totalColumns}>
                    Năm <span className="ml-2 text-blue-600">{dateRange?.from.slice(0, 4) || selectedYear}</span>
                  </th>
                </tr>
                <tr className="bg-gray-50 text-gray-700">
                  <th className={`${cellClass} bg-gray-50 text-left font-bold uppercase tracking-wide`} colSpan={3}>
                    HUPUNA GROUP
                  </th>
                  {summaryDays.map((day) => (
                    <th
                      key={`day-${day.date}`}
                      className={`${cellClass} font-bold ${day.isWeekend ? 'bg-gray-100 text-red-500' : 'bg-gray-50'}`}
                    >
                      {day.day}
                    </th>
                  ))}
                  <th className={`${cellClass} bg-gray-50 font-bold uppercase tracking-wide`} rowSpan={2}>
                    Tổng cộng
                  </th>
                  <th className={`${cellClass} bg-gray-50 font-bold uppercase tracking-wide`} rowSpan={2}>
                    Ghi chú
                  </th>
                </tr>
                <tr className="bg-gray-50 text-gray-700">
                  <th className={`${cellClass} bg-gray-50 font-bold`}>STT</th>
                  <th className={`${cellClass} bg-gray-50 text-left font-bold uppercase`}>Họ và tên</th>
                  <th className={`${cellClass} bg-gray-50 font-bold uppercase`}>Loại</th>
                  {summaryDays.map((day) => (
                    <th
                      key={`weekday-${day.date}`}
                      className={`${cellClass} text-[11px] font-bold ${day.isWeekend ? 'bg-gray-100 text-red-500' : 'bg-gray-50'}`}
                    >
                      {day.weekday}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="relative z-0">
                {isLoading ? (
                  <tr>
                    <td className={`${cellClass} text-slate-500`} colSpan={totalColumns}>
                      Đang tải dữ liệu chấm công...
                    </td>
                  </tr>
                ) : departments.length === 0 || summaryDays.length === 0 ? (
                  <tr>
                    <td className={`${cellClass} text-slate-500`} colSpan={totalColumns}>
                      Chọn nhân viên, khoảng ngày và bấm Xem công để lấy dữ liệu tổng hợp.
                    </td>
                  </tr>
                ) : (
                  departments.map((department) => (
                    <Fragment key={department.name}>
                      <tr key={`${department.name}-header`} className="bg-blue-50/50">
                        <td className={`${cellClass} font-bold text-blue-700`} colSpan={totalColumns}>
                          {department.name}
                        </td>
                      </tr>
                      {department.employees.map((employee) => (
                        <SummaryEmployeeRows
                          key={`${department.name}-${employee.empCode}`}
                          employee={employee}
                          departmentName={department.name}
                          summaryDays={summaryDays}
                          overrideMap={overrideMap}
                          savingOverrideKey={savingOverrideKey}
                          onEditCell={handleEditCell}
                          onEditNote={handleEditNote}
                        />
                      ))}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
      </div>
      </Box>
      <EditSummaryCellModal
        key={editingCell ? `${editingCell.employee.empCode}-${editingCell.day.date}-${editingCell.field}` : 'empty-modal'}
        editingCell={editingCell}
        saving={Boolean(savingOverrideKey)}
        onCancel={handleCloseEditForm}
        onSave={handleSaveEditForm}
      />
      <ModalBase
        contentBtn={null}
        isOpen={Boolean(editingNote)}
        title="Ghi chú"
        width={420}
        zIndex={10050}
        onCancel={handleCloseNoteForm}
        footer={(
          <div className="flex justify-end gap-2">
            <ButtonBase
              className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              onClick={handleCloseNoteForm}
              disabled={Boolean(savingOverrideKey)}
            >
              Hủy
            </ButtonBase>
            <ButtonBase
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={handleSaveNoteForm}
              disabled={Boolean(savingOverrideKey)}
            >
              Lưu
            </ButtonBase>
          </div>
        )}
      >
        <InputAreaBase
          value={noteDraft}
          rows={4}
          placeholder="Nhập ghi chú"
          className="rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100"
          onChange={(event) => setNoteDraft(event.target.value)}
        />
      </ModalBase>
    </div>
  );
}
