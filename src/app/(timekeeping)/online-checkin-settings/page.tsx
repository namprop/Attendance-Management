'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Select, Button, message, Tag, Switch, DatePicker, Tooltip, Popconfirm } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  Plus, Trash2, Edit3, Users, Calendar, ToggleLeft, ToggleRight,
  Globe, UserCheck, Settings2, Info, CheckCircle2,
} from 'lucide-react';
import { hasPermission } from '@/app/service/permissions/permissions';
import { cookieBase } from '@/app/utils/cookie';
import type { User } from '@/app/data/dataUser';
import Unauthorized from '@/app/ui/timekeeping/components/unauthorized/Unauthorized';

const { RangePicker } = DatePicker;

type DateMode = 'always' | 'range' | 'dates';
type Scope = 'all' | 'specific';

interface OnlineCheckinSetting {
  _id?: string;
  enabled: boolean;
  scope: Scope;
  employeeCodes: string[];
  dateMode: DateMode;
  dateFrom: string;
  dateTo: string;
  dates: string[];
  label: string;
  createdAt?: string;
  updatedAt?: string;
}

type EmployeeOption = {
  id: string;
  employeeCode?: string;
  fullName?: string;
  name?: string;
};

const SCOPE_OPTIONS: { value: Scope; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    value: 'all',
    label: 'Tất cả nhân viên',
    icon: <Globe className="w-4 h-4" />,
    desc: 'Áp dụng cho toàn bộ nhân viên trong hệ thống',
  },
  {
    value: 'specific',
    label: 'Nhân viên cụ thể',
    icon: <UserCheck className="w-4 h-4" />,
    desc: 'Chỉ áp dụng cho các nhân viên được chọn',
  },
];

const DATE_MODE_OPTIONS: { value: DateMode; label: string; desc: string }[] = [
  { value: 'always', label: 'Luôn luôn', desc: 'Không giới hạn ngày, bật/tắt vĩnh viễn' },
  { value: 'range', label: 'Khoảng ngày', desc: 'Áp dụng từ ngày A đến ngày B' },
  { value: 'dates', label: 'Chọn ngày cụ thể', desc: 'Áp dụng cho các ngày lẻ được chọn' },
];

const defaultForm = (): OnlineCheckinSetting => ({
  enabled: true,
  scope: 'all',
  employeeCodes: [],
  dateMode: 'always',
  dateFrom: '',
  dateTo: '',
  dates: [],
  label: '',
});

function SettingCard({
  setting,
  employees,
  onToggle,
  onEdit,
  onDelete,
  hasEditAccess = true,
  hasDeleteAccess = true,
  hasToggleAccess = true,
}: {
  setting: OnlineCheckinSetting;
  employees: EmployeeOption[];
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (setting: OnlineCheckinSetting) => void;
  onDelete: (id: string) => void;
  hasEditAccess?: boolean;
  hasDeleteAccess?: boolean;
  hasToggleAccess?: boolean;
}) {
  const employeeMap = new Map(employees.map((e) => [e.employeeCode || e.id, e]));
  const empNames = setting.employeeCodes.map((code) => {
    const e = employeeMap.get(code);
    return e ? (e.fullName || e.name || code) : code;
  });

  const formatDateRange = () => {
    if (setting.dateMode === 'always') return 'Luôn luôn';
    if (setting.dateMode === 'range') {
      return `${setting.dateFrom || '...'} → ${setting.dateTo || '...'}`;
    }
    if (setting.dateMode === 'dates') {
      return setting.dates.length > 0
        ? setting.dates.slice(0, 3).join(', ') + (setting.dates.length > 3 ? ` (+${setting.dates.length - 3})` : '')
        : 'Chưa chọn ngày';
    }
    return '';
  };

  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${
        setting.enabled
          ? 'border-emerald-200 bg-white shadow-sm'
          : 'border-slate-200 bg-slate-50 opacity-75'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              setting.enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {setting.enabled
              ? <ToggleRight className="w-5 h-5" />
              : <ToggleLeft className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 text-sm truncate">
              {setting.label || 'Cấu hình chấm công Online'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tạo lúc {setting.createdAt ? dayjs(setting.createdAt).format('DD/MM/YYYY HH:mm') : '--'}
            </p>
          </div>
        </div>
        <Switch
          checked={setting.enabled}
          onChange={(checked) => onToggle(setting._id!, checked)}
          className="shrink-0"
          disabled={!hasToggleAccess}
        />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {setting.scope === 'all' ? (
            <span>Tất cả nhân viên</span>
          ) : (
            <div className="flex flex-wrap gap-1 min-w-0">
              {empNames.length > 0 ? (
                empNames.slice(0, 3).map((n, i) => (
                  <Tag key={i} color="blue" className="text-[11px] m-0">{n}</Tag>
                ))
              ) : (
                <span className="text-slate-400">Chưa chọn nhân viên</span>
              )}
              {empNames.length > 3 && (
                <Tooltip title={empNames.slice(3).join(', ')}>
                  <Tag color="default" className="text-[11px] m-0 cursor-pointer">+{empNames.length - 3}</Tag>
                </Tooltip>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{formatDateRange()}</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${setting.enabled ? 'text-emerald-500' : 'text-slate-300'}`} />
          <span className={setting.enabled ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
            {setting.enabled ? 'Đang kích hoạt' : 'Đã tắt'}
          </span>
        </div>
      </div>

      {(hasEditAccess || hasDeleteAccess) && (
        <div className="mt-4 flex gap-2 pt-3 border-t border-slate-100">
          {hasEditAccess && (
            <Button
              size="small"
              icon={<Edit3 className="w-3.5 h-3.5" />}
              onClick={() => onEdit(setting)}
              className="flex-1 flex items-center justify-center gap-1 text-xs"
            >
              Chỉnh sửa
            </Button>
          )}
          {hasDeleteAccess && (
            <Popconfirm
              title="Xác nhận xóa"
              description="Bạn có chắc muốn xóa cấu hình này?"
              onConfirm={() => onDelete(setting._id!)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button
                size="small"
                danger
                icon={<Trash2 className="w-3.5 h-3.5" />}
                className="flex items-center justify-center gap-1 text-xs"
              >
                Xóa
              </Button>
            </Popconfirm>
          )}
        </div>
      )}
    </div>
  );
}

function SettingForm({
  form,
  employees,
  isLoadingEmployees,
  onChangeForm,
}: {
  form: OnlineCheckinSetting;
  employees: EmployeeOption[];
  isLoadingEmployees: boolean;
  onChangeForm: (patch: Partial<OnlineCheckinSetting>) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Tên cấu hình */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700 block">Tên cấu hình</label>
        <input
          type="text"
          value={form.label || ''}
          onChange={(e) => onChangeForm({ label: e.target.value })}
          placeholder="VD: Mở chấm công online tháng 6"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition"
        />
      </div>

      {/* Trạng thái */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
        <div>
          <p className="text-sm font-semibold text-slate-700">Kích hoạt</p>
          <p className="text-[11px] text-slate-400">Bật để cho phép nhân viên chấm công online</p>
        </div>
        <Switch
          checked={form.enabled}
          onChange={(checked) => onChangeForm({ enabled: checked })}
        />
      </div>

      {/* Phạm vi nhân viên */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700 block flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> Phạm vi nhân viên
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SCOPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChangeForm({ scope: opt.value })}
              className={`p-3 rounded-xl border text-left transition-all ${
                form.scope === opt.value
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-xs mb-1">
                {opt.icon} {opt.label}
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Chọn nhân viên cụ thể */}
      {form.scope === 'specific' && (
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700 block">Chọn nhân viên</label>
          <Select
            mode="multiple"
            showSearch
            placeholder="Tìm và chọn nhân viên..."
            loading={isLoadingEmployees}
            className="w-full"
            value={form.employeeCodes}
            onChange={(val) => onChangeForm({ employeeCodes: val })}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={employees.map((emp) => ({
              value: emp.employeeCode || emp.id,
              label: `${emp.fullName || emp.name} (${emp.employeeCode || emp.id})`,
            }))}
          />
        </div>
      )}

      {/* Chế độ ngày */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700 block flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" /> Thời gian áp dụng
        </label>
        <div className="space-y-2">
          {DATE_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChangeForm({ dateMode: opt.value })}
              className={`w-full p-3 rounded-xl border text-left transition-all ${
                form.dateMode === opt.value
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    form.dateMode === opt.value ? 'border-emerald-500' : 'border-slate-300'
                  }`}
                >
                  {form.dateMode === opt.value && (
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">{opt.label}</p>
                  <p className="text-[10px] text-slate-400">{opt.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Khoảng ngày */}
      {form.dateMode === 'range' && (
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700 block">Chọn khoảng ngày</label>
          <RangePicker
            className="w-full h-10"
            value={
              form.dateFrom && form.dateTo
                ? [dayjs(form.dateFrom), dayjs(form.dateTo)]
                : null
            }
            onChange={(dates: [Dayjs | null, Dayjs | null] | null) => {
              onChangeForm({
                dateFrom: dates?.[0]?.format('YYYY-MM-DD') || '',
                dateTo: dates?.[1]?.format('YYYY-MM-DD') || '',
              });
            }}
            format="DD/MM/YYYY"
          />
        </div>
      )}

      {/* Chọn ngày cụ thể */}
      {form.dateMode === 'dates' && (
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700 block">Chọn các ngày cụ thể</label>
          <DatePicker
            className="w-full min-h-[40px]"
            multiple
            value={(form.dates || []).map((d) => dayjs(d))}
            onChange={(dates) => {
              const dayList = Array.isArray(dates) ? dates : (dates ? [dates] : []);
              onChangeForm({ dates: dayList.map((d: Dayjs) => d.format('YYYY-MM-DD')) });
            }}
            format="DD/MM/YYYY"
          />
        </div>
      )}

      <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex gap-2">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Nếu <b>không có cấu hình nào được bật</b>, tất cả nhân viên sẽ <b>không thể</b> chấm công online. Cần ít nhất 1 cấu hình đang Kích hoạt để cho phép chấm công.
        </p>
      </div>
    </div>
  );
}

export default function OnlineCheckinSettingsPage() {
  const [settings, setSettings] = useState<OnlineCheckinSetting[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Drawer/modal state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<OnlineCheckinSetting>(defaultForm());
  const [isLoaded, setIsLoaded] = useState(false);
  const [realUser, setRealUser] = useState<User | null>(null);

  useEffect(() => {
    const userObj = cookieBase.get<User>('info_user');
    setTimeout(() => {
      if (userObj) setRealUser(userObj);
      setIsLoaded(true);
    }, 0);
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/online-checkin-settings');
      const json = await res.json();
      setSettings(json.data || []);
    } catch {
      message.error('Không thể tải danh sách cấu hình');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    // Fetch employees
    fetch('/api/v1/employees?limit=2000')
      .then((r) => r.json())
      .then((json) => setEmployees(json.data || []))
      .catch(() => {})
      .finally(() => setIsLoadingEmployees(false));
  }, [fetchSettings]);

  const handleChangeForm = (patch: Partial<OnlineCheckinSetting>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(defaultForm());
    setShowForm(true);
  };

  const handleOpenEdit = (setting: OnlineCheckinSetting) => {
    setEditingId(setting._id || null);
    setForm({ ...defaultForm(), ...setting });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!(form.label || '').trim()) {
      message.warning('Vui lòng nhập tên cấu hình');
      return;
    }
    if (form.scope === 'specific' && (!form.employeeCodes || form.employeeCodes.length === 0)) {
      message.warning('Vui lòng chọn ít nhất một nhân viên');
      return;
    }
    if (form.dateMode === 'range' && (!form.dateFrom || !form.dateTo)) {
      message.warning('Vui lòng chọn khoảng ngày');
      return;
    }
    if (form.dateMode === 'dates' && (!form.dates || form.dates.length === 0)) {
      message.warning('Vui lòng chọn ít nhất một ngày');
      return;
    }

    setIsSaving(true);
    try {
      const payload = { ...form };
      const res = await fetch('/api/online-checkin-settings', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...payload, _id: editingId } : payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Lỗi lưu cấu hình');
      message.success(editingId ? 'Đã cập nhật cấu hình' : 'Đã tạo cấu hình mới');
      setShowForm(false);
      fetchSettings();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Lỗi lưu cấu hình');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      const setting = settings.find((s) => s._id === id);
      if (!setting) return;
      const res = await fetch('/api/online-checkin-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: id, enabled }),
      });
      if (!res.ok) throw new Error();
      setSettings((prev) =>
        prev.map((s) => (s._id === id ? { ...s, enabled } : s)),
      );
      message.success(enabled ? 'Đã bật chấm công online' : 'Đã tắt chấm công online');
    } catch {
      message.error('Không thể cập nhật trạng thái');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/online-checkin-settings?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setSettings((prev) => prev.filter((s) => s._id !== id));
      message.success('Đã xóa cấu hình');
    } catch {
      message.error('Không thể xóa cấu hình');
    }
  };

  const activeCount = settings.filter((s) => s.enabled).length;

  if (!isLoaded) return null;

  const roleId = realUser?.role ?? -1;
  const isSuperAdmin = hasPermission(roleId, '*');
  const hasAccess = isSuperAdmin || hasPermission(roleId, 'timekeeping_online_checkin_settings');
  const hasViewAccess = isSuperAdmin || hasPermission(roleId, 'timekeeping_online_setting_view');
  const hasCreateAccess = isSuperAdmin || hasPermission(roleId, 'timekeeping_online_setting_create');
  const hasEditAccess = isSuperAdmin || hasPermission(roleId, 'timekeeping_online_setting_edit');
  const hasDeleteAccess = isSuperAdmin || hasPermission(roleId, 'timekeeping_online_setting_delete');
  const hasToggleAccess = isSuperAdmin || hasPermission(roleId, 'timekeeping_online_setting_toggle');

  if (realUser && (!hasAccess || !hasViewAccess)) {
    return <Unauthorized />;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 m-0 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-emerald-600" />
            Cài đặt công làm Online
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý quyền chấm công làm từ xa (tính vào công online). Cấu hình bật/tắt theo nhân viên và ngày cụ thể.
          </p>
        </div>
        {hasCreateAccess && (
          <Button
            type="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 bg-emerald-600 hover:!bg-emerald-700 border-none h-10"
          >
            Tạo cấu hình mới
          </Button>
        )}
      </div>

      {/* Status bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Tổng cấu hình</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{settings.length}</p>
        </div>
        <div className={`rounded-2xl border shadow-sm p-4 ${activeCount > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'}`}>
          <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider">Đang kích hoạt</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Trạng thái hệ thống</p>
          <div className="flex items-center gap-1.5 mt-2">
            <div className={`w-2.5 h-2.5 rounded-full ${activeCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <p className={`text-sm font-semibold ${activeCount > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
              {activeCount > 0 ? 'Đang cho phép chấm công' : 'Đang tắt toàn bộ'}
            </p>
          </div>
        </div>
      </div>

      {/* Settings list */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-5 animate-pulse h-48" />
          ))}
        </div>
      ) : settings.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <Settings2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Chưa có cấu hình nào</p>
          <p className="text-slate-400 text-sm mt-1">Bấm "Tạo cấu hình mới" để bắt đầu</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {settings.map((setting) => (
            <SettingCard
              key={setting._id}
              setting={setting}
              employees={employees}
              onToggle={handleToggle}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              hasEditAccess={hasEditAccess}
              hasDeleteAccess={hasDeleteAccess}
              hasToggleAccess={hasToggleAccess}
            />
          ))}
        </div>
      )}

      {/* Form drawer */}
      {showForm && (
        <div className="fixed inset-0 z-[1000] flex">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          {/* Panel */}
          <div className="relative ml-auto w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">
                {editingId ? 'Chỉnh sửa cấu hình' : 'Tạo cấu hình mới'}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <SettingForm
                form={form}
                employees={employees}
                isLoadingEmployees={isLoadingEmployees}
                onChangeForm={handleChangeForm}
              />
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <Button
                className="flex-1 h-10"
                onClick={() => setShowForm(false)}
                disabled={isSaving}
              >
                Hủy
              </Button>
              <Button
                type="primary"
                className="flex-1 h-10 bg-emerald-600 hover:!bg-emerald-700 border-none"
                loading={isSaving}
                onClick={handleSave}
              >
                {editingId ? 'Lưu thay đổi' : 'Tạo cấu hình'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
