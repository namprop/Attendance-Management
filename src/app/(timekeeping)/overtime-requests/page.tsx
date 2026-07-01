'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button, DatePicker, Form, Input, Modal, Popconfirm,
  Select, Tag, Tooltip, notification, AutoComplete
} from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
  Check, Clock, Plus, RefreshCw, Search, Trash2, X, AlarmClock,
} from 'lucide-react';
import { TableBase, type Column } from '@/app/ui/base/table';
import { InputBase } from '@/app/ui/base/input';
import { DateRangePicker } from '@/app/ui/base/date-range-picker';
import { useTimekeepingStore } from '@/app/store/timekeeping/useTimekeepingStore';
import type { OvertimeRequest } from '@/app/interface/timekeeping';
import { cookieBase } from '@/app/utils/cookie';
import type { User } from '@/app/data/dataUser';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIME_OPTIONS = Array.from({ length: 48 }).map((_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0');
  const m = (i % 2 === 0) ? '00' : '30';
  return { value: `${h}:${m}` };
});

const STATUS_META: Record<OvertimeRequest['status'], { label: string; color: string }> = {
  pending: { label: 'Chờ duyệt', color: 'gold' },
  approved: { label: 'Đã duyệt', color: 'success' },
  rejected: { label: 'Từ chối', color: 'error' },
};

function fmtDate(d: string) {
  if (!d) return '---';
  const [y, m, day] = d.split('-');
  return y && m && day ? `${day}/${m}/${y}` : d;
}

const formatTimeInput = (val: string, prevVal: string) => {
  if (val.length < prevVal.length) return val;
  let v = val.replace(/[^\d:]/g, '');
  if (v.length === 1 && /[3-9]/.test(v)) v = `0${v}:`;
  else if (v.length === 2 && !v.includes(':')) v = `${v}:`;
  return v.substring(0, 5);
};

function fmtMins(mins: number) {
  if (!mins || mins <= 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? `${m}m` : ''}` : `${m}m`;
}

function calcMins(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OvertimeRequestsPage() {
  const { employees } = useTimekeepingStore();

  const [api, ctx] = notification.useNotification();
  const [records, setRecords] = useState<OvertimeRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Filters
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [search, setSearch] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (dateRange) {
        params.set('fromDate', dateRange[0].format('YYYY-MM-DD'));
        params.set('toDate', dateRange[1].format('YYYY-MM-DD'));
      }
      const res = await fetch(`/api/overtime-requests?${params}`);
      const json = await res.json();
      if (json.success) {
        setRecords(json.data ?? []);
        setTotal(json.total ?? 0);
      }
    } catch {
      api.error({ message: 'Không tải được danh sách tăng ca' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, dateRange, api]);

  useEffect(() => { void fetchRecords(); }, [fetchRecords]);

  // ── Create ─────────────────────────────────────────────────────────────────
  function openCreate() {
    createForm.resetFields();
    setCreateOpen(true);
  }

  async function handleCreate() {
    const vals = await createForm.validateFields();
    const startStr = String(vals.overtimeStart || '').padStart(5, '0');
    const endStr = String(vals.overtimeEnd || '').padStart(5, '0');
    const minutes = calcMins(startStr, endStr);

    if (minutes <= 0) {
      api.warning({ message: 'Giờ kết thúc phải sau giờ bắt đầu' });
      return;
    }

    const emp = employees.find(e => (e._id ?? e.id) === vals.employeeId || e.id === vals.employeeId);
    setCreating(true);
    try {
      const user = cookieBase.get<User>('info_user');
      const res = await fetch('/api/overtime-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: vals.employeeId,
          employeeCode: emp?.employeeCode ?? vals.employeeId,
          employeeName: emp?.fullName ?? emp?.name ?? '',
          departmentId: emp?.departmentId ?? '',
          department: emp?.departmentName ?? '',
          branchId: emp?.branchId ?? '',
          locationId: emp?.locationId ?? '',
          date: (vals.date as Dayjs).format('YYYY-MM-DD'),
          overtimeStart: startStr,
          overtimeEnd: endStr,
          overtimeType: vals.overtimeType ?? '1',
          workMode: vals.workMode ?? 'offline',
          reason: vals.reason,
          status: vals.status ?? 'pending',
          requestedBy: user?.username ?? 'admin',
        }),
      });
      const json = await res.json();
      if (json.success) {
        api.success({ message: 'Đã tạo đơn tăng ca' });
        setCreateOpen(false);
        void fetchRecords();
      } else {
        api.error({ message: json.message ?? 'Lỗi tạo đơn' });
      }
    } finally {
      setCreating(false);
    }
  }

  // ── Resolve ────────────────────────────────────────────────────────────────
  async function handleResolve(id: string, status: 'approved' | 'rejected') {
    setUpdatingId(id);
    try {
      const user = cookieBase.get<User>('info_user');
      const res = await fetch(`/api/overtime-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolvedBy: user?.username ?? 'admin' }),
      });
      const json = await res.json();
      if (json.success) {
        api.success({ message: status === 'approved' ? 'Đã phê duyệt tăng ca' : 'Đã từ chối tăng ca' });
        void fetchRecords();
      } else {
        api.error({ message: json.message });
      }
    } finally {
      setUpdatingId(null);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/overtime-requests/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        api.success({ message: 'Đã xóa đơn tăng ca' });
        void fetchRecords();
      } else {
        api.error({ message: json.message });
      }
    } finally {
      setUpdatingId(null);
    }
  }

  // ── Employee options ───────────────────────────────────────────────────────
  const empOptions = useMemo(() =>
    employees
      .filter(e => e.status === 'Active' || e.status === 'ACTIVE')
      .map(e => ({
        value: e._id ?? e.id,
        label: `${e.fullName ?? e.name} — ${e.employeeCode ?? ''}`,
      })),
    [employees]);

  // ── Summary counts ─────────────────────────────────────────────────────────
  const pendingCount = records.filter(r => r.status === 'pending').length;
  const approvedCount = records.filter(r => r.status === 'approved').length;
  const rejectedCount = records.filter(r => r.status === 'rejected').length;

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns: Column<OvertimeRequest>[] = [
    {
      title: 'STT',
      width: 50,
      className: 'text-center justify-center',
      render: (_, __, idx) => <div className="text-center text-[11px] text-slate-400">{(page - 1) * pageSize + idx + 1}</div>,
    },
    {
      title: 'Nhân viên',
      width: 200,
      render: (_, r) => (
        <div>
          <div className="font-bold text-xs text-slate-800">{r.employeeName || r.employeeCode || r.employeeId}</div>
          <div className="font-mono text-[10px] text-slate-400 uppercase font-semibold mt-0.5">{r.employeeCode || r.employeeId}</div>
        </div>
      ),
    },
    {
      title: 'Ngày',
      dataIndex: 'date',
      width: 100,
      className: 'text-center justify-center',
      render: (v) => <div className="text-center font-mono text-[11px] font-semibold text-slate-700">{fmtDate(String(v || ''))}</div>,
    },
    {
      title: 'Giờ tăng ca',
      width: 140,
      className: 'text-center justify-center',
      render: (_, r) => (
        <div className="text-center font-mono text-[12px] font-bold text-violet-700">
          {r.overtimeStart} → {r.overtimeEnd}
        </div>
      ),
    },
    {
      title: 'Số giờ',
      width: 80,
      className: 'text-center justify-center',
      render: (_, r) => (
        <div className="text-center">
          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-100">
            {fmtMins(r.plannedMinutes)}
          </span>
        </div>
      ),
    },
    {
      title: 'Loại',
      width: 90,
      className: 'text-center justify-center',
      render: (_, r) => {
        const type = r.overtimeType ?? '1';
        let label = 'TC1';
        let color = 'blue';
        let desc = 'Tăng ca ngày thường';
        if (type === '2') {
          label = 'TC2';
          color = 'orange';
          desc = 'Chủ nhật';
        } else if (type === '3') {
          label = 'TC3';
          color = 'magenta';
          desc = 'Ngày lễ, Tết';
        }
        return (
          <Tooltip title={desc}>
            <Tag color={color} className="font-semibold text-[10px]">{label}</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Hình thức',
      width: 90,
      className: 'text-center justify-center',
      render: (_, r) => {
        const isOnline = r.workMode === 'online';
        return (
          <Tag color={isOnline ? 'cyan' : 'default'} className="uppercase font-semibold text-[10px]">
            {isOnline ? 'Online' : 'Offline'}
          </Tag>
        );
      },
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      width: 200,
      render: (v) => <div className="text-xs text-slate-600 truncate max-w-[200px]">{String(v || '—')}</div>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 110,
      className: 'text-center justify-center',
      render: (v, r) => {
        const s = v as OvertimeRequest['status'];
        const isExpired = s === 'pending' && dayjs(r.date).isBefore(dayjs(), 'day');
        if (isExpired) {
          return <div className="text-center"><Tag color="default">Hết hạn</Tag></div>;
        }
        const meta = STATUS_META[s] ?? STATUS_META.pending;
        return <div className="text-center"><Tag color={meta.color}>{meta.label}</Tag></div>;
      },
    },
    {
      title: 'Xử lý',
      width: 160,
      className: 'text-center justify-center',
      render: (_, r) => {
        const isExpired = r.status === 'pending' && dayjs(r.date).isBefore(dayjs(), 'day');
        if (isExpired) {
          return <span className="text-[11px] italic text-slate-400">Hết hạn</span>;
        }
        if (r.status !== 'pending') {
          return <span className="text-[11px] italic text-slate-400">Đã xử lý</span>;
        }
        const busy = updatingId === (r._id ?? r.id);
        return (
          <div className="flex items-center justify-center gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleResolve(String(r._id ?? r.id), 'approved')}
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all ${busy ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Check className="w-2.5 h-2.5" strokeWidth={3} />
              Duyệt
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleResolve(String(r._id ?? r.id), 'rejected')}
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all ${busy ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <X className="w-2.5 h-2.5" strokeWidth={3} />
              Từ chối
            </button>
          </div>
        );
      },
    },
    {
      title: '',
      width: 50,
      className: 'text-center justify-center',
      render: (_, r) => {
        const id = String(r._id ?? r.id);
        const busy = updatingId === id;
        return (
          <Popconfirm
            title="Xóa đơn tăng ca?"
            description="Hành động không thể hoàn tác."
            onConfirm={() => void handleDelete(id)}
            okText="Xóa" cancelText="Hủy"
            okButtonProps={{ danger: true }}
            disabled={busy}
          >
            <Tooltip title="Xóa">
              <button type="button" disabled={busy} className="p-1 text-rose-400 hover:bg-rose-50 rounded transition-colors disabled:opacity-40">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </Popconfirm>
        );
      },
    },
  ];

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {ctx}

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="m-0 text-lg font-bold text-slate-800 flex items-center gap-2">
            <AlarmClock className="w-5 h-5 text-violet-600" />
            Quản lý tăng ca
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Tạo, phê duyệt và theo dõi đơn xin tăng ca của nhân viên.
          </p>
        </div>
        <Button
          type="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={openCreate}
          className="bg-violet-600 hover:!bg-violet-700 font-semibold shadow-sm"
        >
          Tạo đơn tăng ca
        </Button>
      </div>

      {/* ── Filters ── */}
      <section className="bg-white py-4 px-0 sm:p-5 rounded-none sm:rounded-2xl border border-slate-100 shadow-xs -mx-4 sm:mx-0">
        <div className="px-4 sm:px-0 mb-4 flex flex-wrap items-center gap-3">

          <div className="w-56">
            <DateRangePicker
              value={dateRange || undefined}
              onRangeChanges={(dates) => {
                setDateRange(dates ? [dates[0].startOf('day'), dates[1].endOf('day')] : null);
                setPage(1);
              }}
              className="w-full h-8 rounded-lg border-slate-200 text-xs"
            />
          </div>

          <Select
            placeholder="Trạng thái"
            allowClear
            style={{ width: 140 }}
            value={statusFilter || undefined}
            onChange={(v) => { setStatusFilter(v ?? ''); setPage(1); }}
            options={[
              { label: 'Chờ duyệt', value: 'pending' },
              { label: 'Đã duyệt', value: 'approved' },
              { label: 'Từ chối', value: 'rejected' },
            ]}
            className="h-8 text-xs"
          />

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <InputBase
              placeholder="Tìm nhân viên..."
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                if (searchRef.current) clearTimeout(searchRef.current);
                searchRef.current = setTimeout(() => { setSearch(e.target.value); setPage(1); }, 400);
              }}
              className="pl-8! h-8 w-52 rounded-lg border-slate-200 text-sm"
            />
          </div>

          <Button
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => void fetchRecords()}
            className="border-slate-200 h-8 text-xs"
          >
            Làm mới
          </Button>

          <div className="ml-auto flex flex-wrap gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 text-[10px] font-semibold border border-amber-100">
              Chờ duyệt {pendingCount}
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-semibold border border-emerald-100">
              Đã duyệt {approvedCount}
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 text-[10px] font-semibold border border-rose-100">
              Từ chối {rejectedCount}
            </span>
          </div>
        </div>

        <TableBase<OvertimeRequest>
          rowKey="_id"
          loading={loading}
          columns={columns}
          data={records}
          bordered
          isSTT={false}
          showHorizontalScroll
          className="whitespace-nowrap [&_th]:!px-2 [&_th]:!py-1.5 [&_td]:!px-2 [&_td]:!py-1.5"
          pagination={{
            current: page,
            pageSize,
            total,
            onPageChange: (p) => setPage(p),
          }}
          classNameRow={(r) => {
            const isExpired = r.status === 'pending' && dayjs(r.date).isBefore(dayjs(), 'day');
            if (isExpired) return 'bg-slate-100/50 opacity-80';
            if (r.status === 'pending') return 'bg-amber-50/30';
            if (r.status === 'approved') return 'bg-emerald-50/20';
            if (r.status === 'rejected') return 'bg-rose-50/20';
            return '';
          }}
        />
      </section>

      {/* ══ Modal tạo đơn ══ */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800">
            <Clock className="w-4 h-4 text-violet-600" />
            <span>Tạo Đơn Tăng Ca</span>
          </div>
        }
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        confirmLoading={creating}
        okText="Tạo đơn"
        cancelText="Hủy"
        width={540}
        destroyOnClose
        centered
        okButtonProps={{ className: 'bg-violet-600 hover:!bg-violet-700' }}
      >
        <Form form={createForm} layout="vertical" className="mt-4 space-y-0">
          <Form.Item
            label="Nhân viên"
            name="employeeId"
            rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}
          >
            <Select
              showSearch
              placeholder="Tìm và chọn nhân viên..."
              options={empOptions}
              filterOption={(input, opt) =>
                ((opt?.label as string) ?? '').toLowerCase().includes(input.toLowerCase())
              }
              size="large"
              className="w-full"
            />
          </Form.Item>

          <Form.Item
            label="Ngày tăng ca"
            name="date"
            rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
          >
            <DatePicker
              format="DD/MM/YYYY"
              size="large"
              className="w-full"
              placeholder="Chọn ngày..."
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="Giờ bắt đầu OT"
              name="overtimeStart"
              rules={[{ required: true, message: 'Bắt buộc' }]}
              normalize={(val, prevVal) => formatTimeInput(val || '', prevVal || '')}
            >
              <AutoComplete
                options={TIME_OPTIONS}
                size="large"
                className="w-full [&_.ant-select-selector]:!rounded-lg"
                placeholder="Ví dụ: 17:30"
                filterOption={(inputValue, option) =>
                  option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                }
              />
            </Form.Item>

            <Form.Item
              label="Giờ kết thúc OT"
              name="overtimeEnd"
              rules={[{ required: true, message: 'Bắt buộc' }]}
              normalize={(val, prevVal) => formatTimeInput(val || '', prevVal || '')}
            >
              <AutoComplete
                options={TIME_OPTIONS}
                size="large"
                className="w-full [&_.ant-select-selector]:!rounded-lg"
                placeholder="Ví dụ: 19:30"
                filterOption={(inputValue, option) =>
                  option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                }
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="Loại tăng ca" name="overtimeType" initialValue="1">
              <Select
                size="large"
                options={[
                  { label: 'TC1: Tăng ca ngày thường', value: '1' },
                  { label: 'TC2: Chủ nhật', value: '2' },
                  { label: 'TC3: Ngày lễ, Tết', value: '3' },
                ]}
              />
            </Form.Item>
            <Form.Item label="Hình thức làm việc" name="workMode" initialValue="offline">
              <Select
                size="large"
                options={[
                  { label: 'Offline', value: 'offline' },
                  { label: 'Online', value: 'online' },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item
            label="Lý do tăng ca"
            name="reason"
            rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="VD: Hoàn thành báo cáo tháng, deadline dự án X..."
              size="large"
              maxLength={300}
              showCount
            />
          </Form.Item>

          <Form.Item label="Trạng thái ban đầu" name="status" initialValue="pending">
            <Select
              size="large"
              options={[
                { label: '🕐 Chờ duyệt (để Admin xem xét)', value: 'pending' },
                { label: '✅ Duyệt luôn', value: 'approved' },
              ]}
            />
          </Form.Item>
        </Form>

        {/* Preview số giờ */}
        {(() => {
          const start = createForm.getFieldValue('overtimeStart') as Dayjs | undefined;
          const end = createForm.getFieldValue('overtimeEnd') as Dayjs | undefined;
          if (!start || !end) return null;
          const mins = calcMins(start.format('HH:mm'), end.format('HH:mm'));
          if (mins <= 0) return null;
          return (
            <div className="mt-2 p-3 bg-violet-50 border border-violet-100 rounded-xl text-sm text-violet-700 font-semibold flex items-center gap-2">
              <AlarmClock className="w-4 h-4" />
              Tổng: <span className="text-base">{fmtMins(mins)}</span> tăng ca
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
