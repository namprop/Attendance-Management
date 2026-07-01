'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Tag, Button, Select, message, Drawer, Popover, Checkbox, Form, Input, TimePicker, Popconfirm, DatePicker } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
dayjs.extend(isoWeek);
import { CheckCircle, Search, RotateCw, Fingerprint, Settings2, Filter } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';
import { TableBase, type Column } from '@/app/ui/base/table';
import { InputBase } from '@/app/ui/base/input';
import { DateRangePicker } from '@/app/ui/base/date-range-picker';
import { useTimeRecordsFilterStore } from '@/app/store/timekeeping/useTimeRecordsFilterStore';
import type {
  BranchTimekeeping,
  KioskLocation,
  DepartmentGroupTimekeeping,
  DepartmentTimekeeping,
} from '@/app/interface/timekeeping';
import type { TimeRecordsListRow } from '@/app/lib/timekeeping/timeRecordsService';

type AttendanceHistoryRow = TimeRecordsListRow;

type VisibleColumnKey =
  | 'stt'
  | 'logId'
  | 'employee'
  | 'employeeType'
  | 'group'
  | 'date'
  | 'shift'
  | 'clockIn'
  | 'clockOut'
  | 'status'
  | 'late'
  | 'early'
  | 'device'
  | 'lateReason'
  | 'reasonApproval'
  | 'action';

const VISIBLE_COLUMNS_STORAGE_KEY = 'time-records-visible-column-keys-v2';
const DEFAULT_VISIBLE_COLUMN_KEYS: VisibleColumnKey[] = [
  'stt',
  'employee',
  'employeeType',
  'group',
  'date',
  'shift',
  'clockIn',
  'clockOut',
  'device',
  'lateReason',
  'reasonApproval',
  'action',
];

const COLUMN_VISIBILITY_OPTIONS: { label: string; value: VisibleColumnKey }[] = [
  { label: 'STT', value: 'stt' },
  { label: 'Mã số LOG', value: 'logId' },
  { label: 'Thành viên', value: 'employee' },
  { label: 'Kiểu nhân viên', value: 'employeeType' },
  { label: 'Khối', value: 'group' },
  { label: 'Ngày trực', value: 'date' },
  { label: 'Ca làm việc', value: 'shift' },
  { label: 'Giờ vào', value: 'clockIn' },
  { label: 'Giờ ra', value: 'clockOut' },
  { label: 'Trạng thái', value: 'status' },
  { label: 'Đi muộn', value: 'late' },
  { label: 'Về sớm', value: 'early' },
  { label: 'Thiết bị', value: 'device' },
  { label: 'Giải trình đi trễ', value: 'lateReason' },
  { label: 'Duyệt lý do', value: 'reasonApproval' },
  { label: 'Thao tác', value: 'action' },
];

const normalizeId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const record = value as { _id?: unknown; id?: unknown; toHexString?: () => string; toString?: () => string };
    if (typeof record.toHexString === 'function') return record.toHexString();
    if (record._id) return normalizeId(record._id);
    if (record.id) return normalizeId(record.id);
    if (typeof record.toString === 'function') {
      const stringValue = record.toString();
      return stringValue === '[object Object]' ? '' : stringValue;
    }
  }
  return String(value);
};

const getInitialVisibleColumns = (): VisibleColumnKey[] => {
  if (typeof window === 'undefined') return DEFAULT_VISIBLE_COLUMN_KEYS;
  try {
    const stored = window.localStorage.getItem(VISIBLE_COLUMNS_STORAGE_KEY);
    if (!stored) return DEFAULT_VISIBLE_COLUMN_KEYS;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return DEFAULT_VISIBLE_COLUMN_KEYS;
    const allowed = new Set(COLUMN_VISIBILITY_OPTIONS.map((option) => option.value));
    return parsed.filter((value): value is VisibleColumnKey => allowed.has(value));
  } catch {
    return DEFAULT_VISIBLE_COLUMN_KEYS;
  }
};

export default function TimeRecordsPage() {
  const [apiLogs, setApiLogs] = useState<AttendanceHistoryRow[]>([]);

  // States danh mục
  const [branches, setBranches] = useState<BranchTimekeeping[]>([]);
  const [locations, setLocations] = useState<KioskLocation[]>([]);
  const [groups, setGroups] = useState<DepartmentGroupTimekeeping[]>([]);
  const [departments, setDepartments] = useState<DepartmentTimekeeping[]>([]);

  // Sử dụng Zustand Store lưu bộ lọc có persist localStorage
  const {
    selectedBranchIds,
    selectedLocationIds,
    selectedGroupIds,
    selectedDeptIds,
    searchKeyword,
    dateRange,
    setSelectedBranchIds,
    setSelectedLocationIds,
    setSelectedGroupIds,
    setSelectedDeptIds,
    setSearchKeyword,
    setDateRange,
  } = useTimeRecordsFilterStore();

  // Chuyển dateRange dạng String thành Dayjs để tương thích RangePicker Antd
  const dayjsDateRange = useMemo<[Dayjs | null, Dayjs | null]>(() => {
    const [start, end] = dateRange;
    return [start ? dayjs(start) : null, end ? dayjs(end) : null];
  }, [dateRange]);

  // State tích chọn hàng
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([]);

  const [isFetchingLogs, setIsFetchingLogs] = useState(false);
  const [isFetchingEmployees, setIsFetchingEmployees] = useState(true);
  const [reasonActionStatus, setReasonActionStatus] = React.useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [serverTotal, setServerTotal] = useState<number>(0);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<VisibleColumnKey[]>(getInitialVisibleColumns);
  const [isWebAuthnLoading, setIsWebAuthnLoading] = useState(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [localSearchKeyword, setLocalSearchKeyword] = useState(searchKeyword);

  const [isEditDrawerVisible, setIsEditDrawerVisible] = useState(false);
  const [isMobileFilterVisible, setIsMobileFilterVisible] = useState(false);
  const [editingLog, setEditingLog] = useState<AttendanceHistoryRow | null>(null);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [detailRecord, setDetailRecord] = useState<AttendanceHistoryRow | null>(null);
  const [form] = Form.useForm();

  const handleRowClick = (record: AttendanceHistoryRow) => {
    setDetailRecord(record);
    setIsDetailDrawerVisible(true);
  };

  const fetchLogs = React.useCallback(async (isManual = false) => {
    setIsFetchingLogs(true);
    try {
      const [startDate, endDate] = dateRange;

      const res = await fetch('/api/time-records-timekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list',
          page,
          pageSize,
          startDate,
          endDate,
          selectedBranchIds,
          selectedLocationIds,
          selectedGroupIds,
          selectedDeptIds,
          search: searchKeyword.trim() || undefined,
        })
      });
      const data = await res.json();
      if (data.success) {
        setApiLogs(Array.isArray(data.data) ? data.data : []);
        setServerTotal(typeof data.total === 'number' ? data.total : 0);
        if (isManual) {
          message.success("Đã làm mới dữ liệu chấm công mới nhất!");
        }
      }
    } catch (err) {
      console.error(err);
      if (isManual) {
        message.error("Lỗi kết nối khi làm mới dữ liệu.");
      }
    } finally {
      setIsFetchingLogs(false);
    }
  }, [
    selectedBranchIds,
    selectedLocationIds,
    selectedGroupIds,
    selectedDeptIds,
    searchKeyword,
    dateRange,
    page,
    pageSize,
  ]);

  React.useEffect(() => {
    const initData = async () => {
      try {
        setIsFetchingEmployees(true);
        const [branchRes, locRes, groupRes, deptRes] = await Promise.all([
          fetch('/api/branch-timekeeping'),
          fetch('/api/v1/kiosk/locations'),
          fetch('/api/department-groups-timekeeping'),
          fetch('/api/departments-timekeeping'),
        ]);
        const [branchData, locData, groupData, deptData] = await Promise.all([
          branchRes.json(),
          locRes.json(),
          groupRes.json(),
          deptRes.json(),
        ]);
        if (branchData?.data) setBranches(branchData.data);
        if (locData?.data) setLocations(locData.data);
        if (groupData?.data) setGroups(groupData.data);
        if (deptData?.data) setDepartments(deptData.data);
      } catch (err) {
        console.error('Lỗi lấy dữ liệu khởi tạo', err);
      } finally {
        setIsFetchingEmployees(false);
      }
    };
    initData();
  }, []);

  React.useEffect(() => {
    if (!isFetchingEmployees) {
      void Promise.resolve().then(() => fetchLogs());
    }
  }, [fetchLogs, isFetchingEmployees]);

  React.useEffect(() => {
    window.localStorage.setItem(VISIBLE_COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumnKeys));
  }, [visibleColumnKeys]);

  React.useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 3000; // Bắt đầu 3s, tăng dần
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      es = new EventSource('/api/time-records-timekeeping/stream');

      es.onmessage = (event) => {
        retryDelay = 3000; // Reset delay khi nhận được data
        try {
          const data = JSON.parse(event.data);
          const actionText = data.isCheckIn ? 'vào ca' : 'ra ca';
          message.success({
            content: `✅ ${data.employeeName} vừa chấm công ${actionText} lúc ${data.timeStr} (Thiết bị: ${data.deviceType || 'ZKTeco'})`,
            duration: 6,
            className: 'font-semibold',
            style: { marginTop: '10vh' },
          });
          fetchLogs(false);
        } catch (err) {
          console.error('Lỗi khi parse SSE data:', err);
        }
      };

      es.onerror = () => {
        es?.close();
        es = null;
        if (destroyed) return;
        // Auto-reconnect với exponential backoff (tối đa 30s)
        retryDelay = Math.min(retryDelay * 1.5, 30000);
        reconnectTimer = setTimeout(connect, retryDelay);
      };
    };

    connect();

    return () => {
      destroyed = true;
      es?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [fetchLogs]);

  const handleWebAuthnCheckIn = async () => {
    setIsWebAuthnLoading(true);
    try {
      // 1. Lấy challenge từ server
      const resp = await fetch('/api/webauthn/auth/generate');
      const data = await resp.json();
      if (!data.success) {
        message.error(data.message || 'Lỗi khởi tạo WebAuthn');
        return;
      }

      // 2. Gọi API trình duyệt bật popup quét khuôn mặt/vân tay (không cần nhập account vì dùng Discoverable Credentials)
      const authResp = await startAuthentication({ optionsJSON: data.data });

      // 3. Gửi lên server để verify và chấm công
      const verifyResp = await fetch('/api/webauthn/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authenticationResponse: authResp }),
      });

      const verifyData = await verifyResp.json();
      if (verifyData.success) {
        message.success(verifyData.message || 'Chấm công thành công!');
        fetchLogs(false);
      } else {
        message.error(verifyData.message || 'Chấm công thất bại!');
      }
    } catch (error: unknown) {
      const authError = error instanceof Error ? error : new Error('Không xác định');
      if (authError.name === 'NotAllowedError') {
        message.error('Bạn đã huỷ xác thực sinh trắc học.');
      } else {
        message.error('Lỗi sinh trắc học: ' + authError.message);
      }
      console.error(error);
    } finally {
      setIsWebAuthnLoading(false);
    }
  };

  const filteredLogs = apiLogs;

  // Lọc danh sách danh mục liên đới (Cascading)
  const filteredLocations = useMemo(() => {
    if (selectedBranchIds.length === 0) return locations;
    const branchIdSet = new Set(selectedBranchIds.map(normalizeId));
    return locations.filter(loc => branchIdSet.has(normalizeId(loc.branchId)));
  }, [locations, selectedBranchIds]);

  const filteredGroups = useMemo(() => {
    if (selectedLocationIds.length === 0) return groups;
    const locationIdSet = new Set(selectedLocationIds.map(normalizeId));
    return groups.filter(g => locationIdSet.has(normalizeId(g.locationId)));
  }, [groups, selectedLocationIds]);

  const filteredDepartments = useMemo(() => {
    let result = departments;
    if (selectedLocationIds.length > 0) {
      const locationIdSet = new Set(selectedLocationIds.map(normalizeId));
      result = result.filter(d => locationIdSet.has(normalizeId(d.locationId)));
    }
    if (selectedGroupIds.length > 0) {
      const groupIdSet = new Set(selectedGroupIds.map(normalizeId));
      result = result.filter(d => groupIdSet.has(normalizeId(d.departmentGroupTimekeepingId)));
    }
    return result;
  }, [departments, selectedLocationIds, selectedGroupIds]);

  // Các hàm xử lý đổi bộ lọc và reset các cấp con
  const handleBranchChange = (value: string[]) => {
    setSelectedBranchIds(value);
    setSelectedLocationIds([]);
    setSelectedGroupIds([]);
    setSelectedDeptIds([]);
    setPage(1);
  };

  const handleLocationChange = (value: string[]) => {
    setSelectedLocationIds(value);
    setSelectedGroupIds([]);
    setSelectedDeptIds([]);
    setPage(1);
  };

  const handleGroupChange = (value: string[]) => {
    setSelectedGroupIds(value);
    setSelectedDeptIds([]);
    setPage(1);
  };

  const handleDeptChange = (value: string[]) => {
    setSelectedDeptIds(value);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setLocalSearchKeyword(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchKeyword(value);
      setPage(1);
    }, 500);
  };

  const handleResetFilters = () => {
    const emptyDateRange: [string | null, string | null] = [null, null];
    setSelectedBranchIds([]);
    setSelectedLocationIds([]);
    setSelectedGroupIds([]);
    setSelectedDeptIds([]);
    setSearchKeyword('');
    setLocalSearchKeyword('');
    setDateRange(emptyDateRange);
    setPage(1);
  };

  const hasAnyFilterActive = !!(
    selectedBranchIds.length > 0 ||
    selectedLocationIds.length > 0 ||
    selectedGroupIds.length > 0 ||
    selectedDeptIds.length > 0 ||
    localSearchKeyword ||
    dateRange[0] ||
    dateRange[1]
  );

  const handleApproveLateReason = async (logId: string, approved: boolean) => {
    try {
      const res = await fetch(`/api/time-records-timekeeping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', _id: logId, reasonApproved: approved, approvedBy: 'EMP002' }),
      });
      if (res.ok) {
        setReasonActionStatus(`Đã cập nhật trạng thái lý do đi trễ của bản ghi LOG ${logId.substring(0, 8)}...`);
        fetchLogs();
        setTimeout(() => setReasonActionStatus(null), 3500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    try {
      const res = await fetch('/api/time-records-timekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', _id: logId }),
      });
      const data = await res.json();
      if (data.success) {
        message.success('Đã xóa bản ghi');
        fetchLogs();
      } else {
        message.error(data.message || 'Lỗi khi xóa bản ghi');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi kết nối khi xóa bản ghi');
    }
  };

  const handleSaveEdit = async (values: { clockIn?: Dayjs | null; clockOut?: Dayjs | null; date?: Dayjs | null; lateReason?: string }) => {
    if (!editingLog) return;
    try {
      const clockIn = values.clockIn ? values.clockIn.format('HH:mm') : null;
      const clockOut = values.clockOut ? values.clockOut.format('HH:mm') : null;
      const date = values.date ? values.date.format('YYYY-MM-DD') : editingLog.date;

      const res = await fetch('/api/time-records-timekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          _id: editingLog._id,
          clockIn,
          clockOut,
          date,
          lateReason: values.lateReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        message.success('Cập nhật thành công');
        setIsEditDrawerVisible(false);
        fetchLogs();
      } else {
        message.error(data.message || 'Lỗi khi cập nhật');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi kết nối khi cập nhật');
    }
  };

  const handleEditClick = (record: AttendanceHistoryRow) => {
    setEditingLog(record);
    form.setFieldsValue({
      clockIn: record.clockIn ? dayjs(record.clockIn, 'HH:mm') : null,
      clockOut: record.clockOut ? dayjs(record.clockOut, 'HH:mm') : null,
      date: record.date ? dayjs(record.date) : null,
      lateReason: record.lateReason,
    });
    setIsEditDrawerVisible(true);
  };

  const getStatusTag = (record: AttendanceHistoryRow) => {
    const rowStatus = record.rowStatus;
    if (rowStatus === 'pending_attendance') return <Tag color="default">Chưa chấm công</Tag>;
    if (rowStatus === 'pending_checkout') return <Tag color="warning">Chưa chấm ra</Tag>;
    if (rowStatus === 'missing_checkout') return <Tag color="red">Quên chấm ra</Tag>;
    if (rowStatus === 'missing_checkin') return <Tag color="red">Thiếu giờ vào</Tag>;
    if (rowStatus === 'leave_approved') return <Tag color="blue">Nghỉ đã xin phép</Tag>;
    if (rowStatus === 'absent_unexcused') return <Tag color="error">Nghỉ chưa xin phép</Tag>;
    if (rowStatus === 'no_shift') return <Tag color="default">Chưa cấu hình ca</Tag>;
    if (!record.clockIn) return <Tag color="default">Chưa vào</Tag>;
    if (!record.clockOut) return <Tag color="warning">Chưa ra</Tag>;

    if (!record.shiftName) {
      return <Tag color="success" icon={<CheckCircle className="w-3 h-3 inline mr-1" />}>Đủ công</Tag>;
    }

    const lateMin = record.lateMinutes || 0;
    const earlyMin = record.earlyMinutes || 0;

    if (lateMin > 0 && earlyMin > 0)
      return <Tag color="error">Trễ {lateMin}p · Sớm {earlyMin}p</Tag>;
    if (lateMin > 0)
      return <Tag color="orange">Đi trễ {lateMin}p</Tag>;
    if (earlyMin > 0)
      return <Tag color="volcano">Về sớm {earlyMin}p</Tag>;
    return <Tag color="success" icon={<CheckCircle className="w-3 h-3 inline mr-1" />}>Đúng giờ</Tag>;
  };

  const getLogStatusTag = (record: AttendanceHistoryRow) => {
    const renderStatus = (text: string) => (
      <span className="text-xs text-slate-700">{text}</span>
    );

    if (!record.clockIn) return renderStatus('Chưa vào');
    if (!record.clockOut) return renderStatus('Chưa ra');

    if (!record.shiftName) {
      return renderStatus('Đủ công');
    }

    const lateMin = record.lateMinutes || 0;
    const earlyMin = record.earlyMinutes || 0;

    if (lateMin > 0 && earlyMin > 0)
      return renderStatus(`Trễ ${lateMin}p · Sớm ${earlyMin}p`);
    if (lateMin > 0)
      return renderStatus(`Đi trễ ${lateMin}p`);
    if (earlyMin > 0)
      return renderStatus(`Về sớm ${earlyMin}p`);
    return renderStatus('Đúng giờ');
  };

  const visibleColumnSet = useMemo(() => new Set(visibleColumnKeys), [visibleColumnKeys]);

  const allColumns: { key: VisibleColumnKey; column: Column<AttendanceHistoryRow> }[] = [
    {
      key: 'logId',
      column: {
        title: 'Mã số LOG',
        dataIndex: '_id',
        className: 'text-center justify-center',
        render: (val) => {
          const logId = typeof val === 'string' ? val : '';
          if (!logId) return null;
          return <span className="font-mono text-xs font-bold text-slate-500 uppercase">#{logId.slice(-6)}</span>;
        },
      },
    },
    {
      key: 'employee',
      column: {
        title: 'Thành viên',
        dataIndex: 'employeeId',
        render: (_, record) => {
          const displayName = record.employeeName || 'Unknown User';

          return (
            <div>
              <span className="font-bold block text-sm text-slate-800 whitespace-nowrap">{displayName}</span>
              <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{record.employeeCode || record.employeeId}</span>
            </div>
          );
        },
      },
    },
    {
      key: 'employeeType',
      column: {
        title: 'Kiểu nhân viên',
        className: 'text-center justify-center',
        render: (_, record) => {
          return <span className="text-xs text-slate-700">{record.employeeTypeLabel || '---'}</span>;
        },
      },
    },
    {
      key: 'group',
      column: {
        title: 'Khối',
        className: 'text-center justify-center',
        render: (_, record) => {
          const groupText = record.groupName || (record.employeeGroup === 'SX' ? 'Sản xuất' : 'Thương mại');

          return <span className="text-xs text-slate-700">{groupText}</span>;
        },
      },
    },
    {
      key: 'date',
      column: {
        title: 'Ngày trực',
        dataIndex: 'date',
        className: 'text-center justify-center',
        render: (val) => {
          const date = typeof val === 'string' ? dayjs(val) : null;
          const displayDate = date?.isValid() ? date.format('DD/MM/YYYY') : String(val ?? '');
          return <span className="font-mono text-xs text-slate-600">{displayDate}</span>;
        },
      },
    },
    {
      key: 'shift',
      column: {
        title: 'Ca làm việc',
        dataIndex: 'shiftId',
        className: 'text-center justify-center',
        render: (_, record) => {
          if (!record.shiftName && (record.clockIn || record.clockOut)) {
            return <span className="text-slate-400 font-mono text-[10px] italic">Đang ghi nhận...</span>;
          }
          if (!record.shiftName) return <span className="text-slate-300 font-mono text-[10px]">---</span>;
          return <span className="text-xs text-slate-700">{record.shiftName}</span>;
        },
      },
    },
    {
      key: 'clockIn',
      column: {
        title: 'Giờ vào',
        className: 'text-center justify-center',
        render: (_, record) => {
          const isCompleted = Boolean(record.clockIn && record.clockOut);
          const lateMin = isCompleted ? record.lateMinutes || 0 : 0;
          const showLateWarning = lateMin > 0 && !record.lateReasonApproved;
          return (
            <div className="flex flex-col items-center gap-0.5">
              {showLateWarning && (
                <span className="text-[9px] font-bold text-red-500 leading-none">đi muộn</span>
              )}
              {record.clockIn ? (
                <span className="font-mono text-xs text-slate-700">
                  {record.clockIn.substring(0, 5)}
                </span>
              ) : (
                <span className="text-slate-400 font-mono text-xs">--:--</span>
              )}
            </div>
          );
        },
      },
    },
    {
      key: 'clockOut',
      column: {
        title: 'Giờ ra',
        className: 'text-center justify-center',
        render: (_, record) => {
          const isCompleted = Boolean(record.clockIn && record.clockOut);
          const earlyMin = isCompleted ? record.earlyMinutes || 0 : 0;
          const showEarlyWarning = earlyMin > 0 && !record.earlyReasonApproved;
          return (
            <div className="flex flex-col items-center gap-0.5">
              {showEarlyWarning && (
                <span className="text-[9px] font-bold text-orange-500 leading-none">về sớm</span>
              )}
              {record.clockOut ? (
                <span className="font-mono text-xs text-slate-700">
                  {record.clockOut.substring(0, 5)}
                </span>
              ) : (
                <span className="text-slate-400 font-mono text-xs">--:--</span>
              )}
            </div>
          );
        },
      },
    },
    {
      key: 'status',
      column: {
        title: 'Trạng thái',
        className: 'text-center justify-center',
        render: (_, record) => getLogStatusTag(record),
      },
    },
    {
      key: 'late',
      column: {
        title: 'Đi muộn',
        className: 'text-center justify-center',
        render: (_, record) => {
          const isCompleted = Boolean(record.clockIn && record.clockOut);
          const lateMin = isCompleted ? record.lateMinutes || 0 : 0;
          if (lateMin <= 0 || record.lateReasonApproved) return <span className="text-slate-300 font-mono text-xs">---</span>;
          return <span className="text-xs text-slate-700">{lateMin} phút</span>;
        },
      },
    },
    {
      key: 'early',
      column: {
        title: 'Về sớm',
        className: 'text-center justify-center',
        render: (_, record) => {
          const isCompleted = Boolean(record.clockIn && record.clockOut);
          const earlyMin = isCompleted ? record.earlyMinutes || 0 : 0;
          if (earlyMin <= 0 || record.earlyReasonApproved) return <span className="text-slate-300 font-mono text-xs">---</span>;
          return <span className="text-xs text-slate-700">{earlyMin} phút</span>;
        },
      },
    },
    {
      key: 'device',
      column: {
        title: 'Thiết bị',
        dataIndex: 'deviceType',
        className: 'text-center justify-center',
        render: (val) => {
          const deviceType = typeof val === 'string' ? val : '';
          return (
            <Tag color={deviceType === 'FaceID' ? 'purple' : deviceType === 'WiFi' ? 'blue' : 'default'}>{deviceType}</Tag>
          );
        },
      },
    },
    {
      key: 'lateReason',
      column: {
        title: 'Giải trình đi trễ',
        render: (_, record) => {
          if (!record.clockIn || !record.clockOut) return <span className="text-slate-300 font-mono text-[10px]">---</span>;

          if (record.lateReason) {
            return (
              <div className="p-2 bg-amber-50/70 text-amber-900 text-xs text-left max-w-xs leading-normal rounded-lg border border-amber-100">
                {record.lateReason}
              </div>
            );
          }
          if (record.lateMinutes > 0) {
            return <span className="text-red-500 italic text-[11px]">Chưa nộp lý do trễ ({record.lateMinutes}p)</span>;
          }
          return <span className="text-slate-400 font-mono text-[10px]">Đúng giờ</span>;
        },
      },
    },
    {
      key: 'reasonApproval',
      column: {
        title: 'Duyệt lý do',
        className: 'text-right justify-end',
        render: (_, record) => {
          if (!record.clockIn || !record.clockOut) return <span className="text-slate-300 font-mono text-[10px]">---</span>;

          if (record.lateReasonApproved) {
            return <Tag color="success">Xin phép</Tag>;
          }

          if (record.lateMinutes > 0 && record.lateReason) {
            if (record.reasonApproved === undefined) {
              return (
                <div className="flex items-center gap-1 justify-end">
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => handleApproveLateReason(record._id as string, true)}
                    style={{ background: '#10b981', borderColor: '#10b981' }}
                  >
                    Duyệt
                  </Button>
                  <Button size="small" danger onClick={() => handleApproveLateReason(record._id as string, false)}>
                    Từ chối
                  </Button>
                </div>
              );
            }
            return record.reasonApproved ? (
              <Tag color="success">Đã duyệt</Tag>
            ) : (
              <Tag color="error">Từ chối</Tag>
            );
          }
          return <span className="text-slate-300 font-mono">---</span>;
        },
      },
    },
    {
      key: 'action',
      column: {
        title: 'Thao tác',
        className: 'text-center justify-center',
        render: (_, record) => {
          if (record.isSynthetic) {
            return <span className="text-slate-300 font-mono text-[10px]">---</span>;
          }
          return (
            <div className="flex items-center gap-1 justify-center">
              {/* 
              <Button size="small" type="primary" onClick={() => handleEditClick(record)}>Sửa</Button>
              <Popconfirm
                title="Bạn có chắc chắn muốn xóa?"
                onConfirm={() => handleDeleteLog(record._id as string)}
                okText="Xóa"
                cancelText="Hủy"
              >
                <Button size="small" danger>Xóa</Button>
              </Popconfirm>
              */}
              <Button 
                size="small" 
                type="primary" 
                onClick={() => handleRowClick(record)}
              >
                Xem chi tiết
              </Button>
            </div>
          );
        },
      },
    },
  ];

  const columns: Column<AttendanceHistoryRow>[] = allColumns
    .filter((item) => visibleColumnSet.has(item.key))
    .map((item) => item.column);



  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 m-0">Lịch sử chấm công văn phòng</h2>
          <p className="text-xs text-slate-400 mt-0.5">Kho lưu trữ toàn bộ nhật ký ra vào văn phòng của thành viên.</p>
        </div>

        {/* Các nút bị comment theo yêu cầu */}
        {/*
        <div className="flex items-center gap-2">
          <Button
            type="primary"
            onClick={handleWebAuthnCheckIn}
            loading={isWebAuthnLoading}
            icon={<Fingerprint className="w-4 h-4" />}
            className="bg-purple-600 hover:bg-purple-700 border-none font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm text-xs transition-colors h-9 px-4"
          >
            Chấm công Vân tay / FaceID
          </Button>
          <Button
            type="primary"
            onClick={() => fetchLogs(true)}
            loading={isFetchingLogs}
            icon={<RotateCw className="w-3.5 h-3.5" />}
            className="bg-emerald-600 hover:bg-emerald-700 border-none font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm text-xs transition-colors h-9 px-4 self-start sm:self-auto"
          >
            Làm mới dữ liệu
          </Button>
        </div>
        */}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:w-72 lg:w-80 relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
            <InputBase
              placeholder="Tìm theo mã log, tên, mã NV..."
              value={localSearchKeyword}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9! w-full rounded-xl border-slate-200 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500/20 h-10 transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasAnyFilterActive && (
              <Button
                type="text"
                danger
                onClick={handleResetFilters}
                className="h-10 rounded-xl px-4 text-xs font-bold hover:bg-red-50 transition-colors"
              >
                Đặt lại
              </Button>
            )}
            <Popover
              trigger="click"
              placement="bottomRight"
              content={(
                <div className="min-w-[180px] space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Cột hiển thị
                  </div>
                  <Checkbox.Group
                    value={visibleColumnKeys}
                    onChange={(values) => setVisibleColumnKeys(values as VisibleColumnKey[])}
                    className="flex flex-col gap-2 text-xs [&_.ant-checkbox-checked_.ant-checkbox-inner]:border-emerald-500! [&_.ant-checkbox-checked_.ant-checkbox-inner]:bg-emerald-500!"
                    options={COLUMN_VISIBILITY_OPTIONS}
                  />
                </div>
              )}
            >
              <Button className="h-10 bg-white shadow-sm rounded-xl flex items-center justify-center gap-2 text-xs font-semibold border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-500 transition-colors px-4">
                <Settings2 className="w-3.5 h-3.5" />
                Cột hiển thị
              </Button>
            </Popover>
          </div>
        </div>
      </div>

      {reasonActionStatus && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-semibold">
          <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
          <span>{reasonActionStatus}</span>
        </div>
      )}

      <div className="flex flex-col sm:hidden gap-3 mb-4">
        <DateRangePicker
          value={dayjsDateRange[0] && dayjsDateRange[1] ? [dayjsDateRange[0], dayjsDateRange[1]] : undefined}
          onRangeChanges={(dates) => {
            if (dates) {
              const startStr = dates[0] ? dates[0].format('YYYY-MM-DD') : null;
              const endStr = dates[1] ? dates[1].format('YYYY-MM-DD') : null;
              setDateRange([startStr, endStr]);
            } else {
              setDateRange([null, null]);
            }
            setPage(1);
          }}
          className="w-full text-sm rounded-xl h-10"
        />
        <Button
          icon={<Filter className="w-4 h-4" />}
          onClick={() => setIsMobileFilterVisible(true)}
          className="w-full h-10 bg-white border-slate-200 text-slate-600 font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs"
        >
          Lọc dữ liệu {hasAnyFilterActive ? '(Đang bật)' : ''}
        </Button>
      </div>

      <div className="bg-white py-4 sm:p-5 rounded-none sm:rounded-2xl border border-slate-100 shadow-xs -mx-4 sm:mx-0">
        {/* Hàng 2: Bộ lọc (Grid 5 cột) */}
        <div className="hidden sm:grid px-4 sm:px-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chi nhánh:</span>
            <Select
              mode="multiple"
              allowClear
              maxTagCount="responsive"
              placeholder="Tất cả chi nhánh"
              value={selectedBranchIds}
              onChange={handleBranchChange}
              className="w-full text-sm [&_.ant-select-selector]:rounded-xl! [&_.ant-select-selector]:min-h-[40px]! [&_.ant-select-selection-item]:mt-1.5!"
              options={branches.map((b) => ({ value: normalizeId(b._id || b.id), label: b.name }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cơ sở:</span>
            <Select
              mode="multiple"
              allowClear
              maxTagCount="responsive"
              placeholder="Tất cả cơ sở"
              value={selectedLocationIds}
              onChange={handleLocationChange}
              className="w-full text-sm [&_.ant-select-selector]:rounded-xl! [&_.ant-select-selector]:min-h-[40px]! [&_.ant-select-selection-item]:mt-1.5!"
              options={filteredLocations.map((loc) => ({ value: normalizeId(loc._id), label: loc.locationName }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cụm khối:</span>
            <Select
              mode="multiple"
              allowClear
              maxTagCount="responsive"
              placeholder="Tất cả cụm khối"
              value={selectedGroupIds}
              onChange={handleGroupChange}
              className="w-full text-sm [&_.ant-select-selector]:rounded-xl! [&_.ant-select-selector]:min-h-[40px]! [&_.ant-select-selection-item]:mt-1.5!"
              options={filteredGroups.map((g) => ({ value: normalizeId(g._id), label: g.name }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phòng ban:</span>
            <Select
              mode="multiple"
              allowClear
              maxTagCount="responsive"
              placeholder="Tất cả phòng ban"
              value={selectedDeptIds}
              onChange={handleDeptChange}
              className="w-full text-sm [&_.ant-select-selector]:rounded-xl! [&_.ant-select-selector]:min-h-[40px]! [&_.ant-select-selection-item]:mt-1.5!"
              options={filteredDepartments.map((d) => ({ value: normalizeId(d._id), label: d.name }))}
            />
          </div>

          <div className="flex flex-col gap-1.5 mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thời gian:</span>
            <DateRangePicker
              value={dayjsDateRange[0] && dayjsDateRange[1] ? [dayjsDateRange[0], dayjsDateRange[1]] : undefined}
              onRangeChanges={(dates) => {
                if (dates) {
                  const startStr = dates[0] ? dates[0].format('YYYY-MM-DD') : null;
                  const endStr = dates[1] ? dates[1].format('YYYY-MM-DD') : null;
                  setDateRange([startStr, endStr]);
                } else {
                  setDateRange([null, null]);
                }
                setPage(1);
              }}
              className="w-full text-sm rounded-xl h-10"
            />
          </div>
        </div>

        <div className="mt-0 sm:mt-5 overflow-hidden">
          <TableBase<AttendanceHistoryRow>
            data={filteredLogs}
            rowKey="_id"
            loading={isFetchingLogs || isFetchingEmployees}
            columns={columns}
            isSTT={visibleColumnSet.has('stt')}
            bordered
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys)
            }}
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
              className: 'cursor-pointer hover:bg-slate-50 transition-colors',
            })}
            pagination={{
              current: page,
              pageSize: pageSize,
              total: serverTotal,
              onPageChange: (newPage, newPageSize) => {
                setPage(newPage);
                if (newPageSize !== pageSize) {
                  setPageSize(newPageSize);
                }
              }
            }}
          />

        </div>
      </div>

      <Drawer
        title="Chỉnh sửa bản ghi chấm công"
        open={isEditDrawerVisible}
        onClose={() => setIsEditDrawerVisible(false)}
        width={400}
        extra={
          <div className="flex gap-2">
            <Button onClick={() => setIsEditDrawerVisible(false)}>Hủy</Button>
            <Button type="primary" onClick={() => form.submit()}>Lưu</Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSaveEdit}>
          <Form.Item name="date" label="Ngày trực">
            <DatePicker format="DD/MM/YYYY" className="w-full" />
          </Form.Item>
          <Form.Item name="clockIn" label="Giờ vào">
            <TimePicker format="HH:mm" className="w-full" />
          </Form.Item>
          <Form.Item name="clockOut" label="Giờ ra">
            <TimePicker format="HH:mm" className="w-full" />
          </Form.Item>
          <Form.Item name="lateReason" label="Lý do đi trễ (nếu có)">
            <Input.TextArea rows={3} placeholder="Nhập lý do đi trễ" />
          </Form.Item>
        </Form>
      </Drawer>
      <Drawer
        title="Chi tiết lịch sử chấm công"
        open={isDetailDrawerVisible}
        onClose={() => setIsDetailDrawerVisible(false)}
        width={480}
        placement={typeof window !== 'undefined' && window.innerWidth < 640 ? 'bottom' : 'right'}
        height={typeof window !== 'undefined' && window.innerWidth < 640 ? '90vh' : '100%'}
        className="[&_.ant-drawer-body]:p-0 [&_.ant-drawer-body]:bg-slate-50"
      >
        {detailRecord && (
          <div className="flex flex-col">
            <div className="bg-white p-6 border-b border-slate-100 flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                <Fingerprint className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 m-0">{detailRecord.employeeName || detailRecord.employeeCode}</h3>
                <p className="text-sm text-slate-500 mt-1 font-medium">{detailRecord.employeeCode}</p>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Thông tin làm việc</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Cụm khối</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {detailRecord.groupName || (detailRecord.employeeGroup === 'SX' ? 'Sản xuất' : 'Thương mại')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Kiểu nhân viên</p>
                    <p className="text-sm font-semibold text-slate-800">{detailRecord.employeeTypeLabel || '--'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Thời gian chấm công</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <span className="text-sm text-slate-600">Ngày làm việc</span>
                    <span className="text-sm font-bold text-slate-800">
                      {detailRecord.date ? dayjs(detailRecord.date as string | Date).format('DD/MM/YYYY') : '--'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <span className="text-sm text-slate-600">Ca làm việc</span>
                    <span className="text-sm font-bold text-slate-800">
                      {detailRecord.shiftName || '--'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <span className="text-sm text-slate-600">Giờ vào (Clock In)</span>
                    <span className="text-sm font-bold text-emerald-600">
                      {detailRecord.clockIn ? detailRecord.clockIn : '--:--'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Giờ ra (Clock Out)</span>
                    <span className="text-sm font-bold text-orange-600">
                      {detailRecord.clockOut ? detailRecord.clockOut : '--:--'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Trạng thái</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-slate-600">Đi muộn</span>
                    <span className="text-sm font-semibold text-rose-600">
                      {detailRecord.lateMinutes ? `${detailRecord.lateMinutes} phút` : '--'}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-slate-600">Về sớm</span>
                    <span className="text-sm font-semibold text-rose-600">
                      {detailRecord.earlyMinutes ? `${detailRecord.earlyMinutes} phút` : '--'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    <span className="text-sm text-slate-600">Lý do giải trình:</span>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-700 min-h-[40px]">
                      {detailRecord.lateReason || <span className="text-slate-400 italic">Không có giải trình</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

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
          hasAnyFilterActive && (
            <Button type="text" danger onClick={handleResetFilters} className="text-xs font-bold px-2">
              Đặt lại
            </Button>
          )
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chi nhánh:</span>
            <Select
              mode="multiple"
              allowClear
              maxTagCount="responsive"
              placeholder="Tất cả chi nhánh"
              value={selectedBranchIds}
              onChange={handleBranchChange}
              className="w-full text-sm [&_.ant-select-selector]:rounded-xl! [&_.ant-select-selector]:min-h-[40px]! [&_.ant-select-selection-item]:mt-1.5!"
              options={branches.map((b) => ({ value: normalizeId(b._id || b.id), label: b.name }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cơ sở:</span>
            <Select
              mode="multiple"
              allowClear
              maxTagCount="responsive"
              placeholder="Tất cả cơ sở"
              value={selectedLocationIds}
              onChange={handleLocationChange}
              className="w-full text-sm [&_.ant-select-selector]:rounded-xl! [&_.ant-select-selector]:min-h-[40px]! [&_.ant-select-selection-item]:mt-1.5!"
              options={filteredLocations.map((loc) => ({ value: normalizeId(loc._id), label: loc.locationName }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cụm khối:</span>
            <Select
              mode="multiple"
              allowClear
              maxTagCount="responsive"
              placeholder="Tất cả cụm khối"
              value={selectedGroupIds}
              onChange={handleGroupChange}
              className="w-full text-sm [&_.ant-select-selector]:rounded-xl! [&_.ant-select-selector]:min-h-[40px]! [&_.ant-select-selection-item]:mt-1.5!"
              options={filteredGroups.map((g) => ({ value: normalizeId(g._id), label: g.name }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phòng ban:</span>
            <Select
              mode="multiple"
              allowClear
              maxTagCount="responsive"
              placeholder="Tất cả phòng ban"
              value={selectedDeptIds}
              onChange={handleDeptChange}
              className="w-full text-sm [&_.ant-select-selector]:rounded-xl! [&_.ant-select-selector]:min-h-[40px]! [&_.ant-select-selection-item]:mt-1.5!"
              options={filteredDepartments.map((d) => ({ value: normalizeId(d._id), label: d.name }))}
            />
          </div>


          <Button type="primary" className="mt-2 w-full h-10 rounded-xl font-bold" onClick={() => setIsMobileFilterVisible(false)}>
            Áp dụng
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
