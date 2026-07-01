'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Row, Col, Tag, Button, Spin, Modal, Input } from 'antd';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import {
  Users, UserCheck, UserX, Clock, TrendingUp, TrendingDown,
  AlertCircle, RefreshCw, ChevronRight, Timer, Search,
  Eye, CheckCircle2, XCircle, AlarmClockOff, Activity, ShieldCheck, Wifi, MapPin
} from 'lucide-react';
import type { DashboardStatsResponse } from '@/app/api/(timekeeping)/dashboard-stats/route';
import type { TodayAttendanceRow } from '@/app/lib/models/timeRecord.model';
import { DateRangePicker } from '@/app/ui/base/date-range-picker';

// ─── Màu biểu đồ ─────────────────────────────────────────────────────────────

const CHART_COLORS = {
  checkedIn: '#10b981',
  late: '#f59e0b',
  absent: '#ef4444',
  onTime: '#10b981',
};
const DONUT_COLORS = [CHART_COLORS.onTime, CHART_COLORS.late, CHART_COLORS.absent];

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  color: string;
  borderColor: string;
  icon: React.ReactNode;
  trendData?: { value: number; label: string; date?: string }[];
}

function StatCard({ title, value, suffix, color, borderColor, icon, trendData }: StatCardProps) {
  
  return (
    <div className="bg-white/80 backdrop-blur-xl p-5 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:-translate-y-1 hover:shadow-[0_8px_20px_-6px_rgba(6,81,237,0.1)] transition-all duration-300 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-20 -mr-8 -mt-8 pointer-events-none transition-transform duration-500 group-hover:scale-150" style={{ backgroundColor: color }} />
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">{title}</p>
          <p className="font-extrabold text-3xl tracking-tight" style={{ color }}>
            {value}
            {suffix && <span className="text-[11px] text-slate-400 font-medium ml-1.5 uppercase tracking-wide">{suffix}</span>}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border border-white/50 backdrop-blur-sm transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" style={{ backgroundColor: borderColor + '15' }}>
          {icon}
        </div>
      </div>
      {trendData && trendData.length > 0 && (
        <div className="h-10 mt-3 -mb-2 -mx-2 opacity-60 group-hover:opacity-100 transition-opacity">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <Tooltip 
                cursor={false}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    // Format date from YYYY-MM-DD to DD/MM if available
                    let dateStr = '';
                    if (data.date) {
                      const parts = data.date.split('-');
                      if (parts.length === 3) dateStr = ` (${parts[2]}/${parts[1]})`;
                    }
                    return (
                      <div className="bg-slate-900/90 backdrop-blur-sm text-white text-[10px] px-2 py-1.5 rounded-lg shadow-lg border border-slate-700/50 relative z-[9999]">
                        <p className="font-semibold text-slate-300 mb-0.5">{data.label}{dateStr}</p>
                        <p className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                          {title}: <span className="font-bold text-[11px] ml-0.5" style={{ color: color }}>{data.value}</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 1.5, fill: color, strokeWidth: 0 }} activeDot={{ r: 3, fill: color, strokeWidth: 0 }} isAnimationActive={true} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Custom Tooltip cho BarChart ──────────────────────────────────────────────

function CustomBarTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white text-xs px-3 py-2.5 rounded-xl shadow-lg border border-slate-700">
      <p className="font-semibold mb-1.5 text-slate-200">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Donut Label ─────────────────────────────────────────────────────────────

function DonutLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  const cxN = (cx as number) ?? 0;
  const cyN = (cy as number) ?? 0;
  const midN = (midAngle as number) ?? 0;
  const irN = (innerRadius as number) ?? 0;
  const orN = (outerRadius as number) ?? 0;
  const pct = (percent as number) ?? 0;
  if (pct < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = irN + (orN - irN) * 0.5;
  const x = cxN + radius * Math.cos(-midN * RADIAN);
  const y = cyN + radius * Math.sin(-midN * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(pct * 100).toFixed(0)}%`}
    </text>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TodayAttendanceRow['status'] }) {
  if (status === 'on_time') return <Tag color="success" className="text-[10px] m-0 font-semibold">Đúng giờ</Tag>;
  if (status === 'late') return <Tag color="warning" className="text-[10px] m-0 font-semibold">Đi muộn</Tag>;
  return <Tag color="error" className="text-[10px] m-0 font-semibold">Chưa check-in</Tag>;
}

// ─── Detail Modal: Not Checked In ─────────────────────────────────────────────

function NotCheckedInModal({ open, data, onClose }: { open: boolean; data: DashboardStatsResponse['notCheckedInToday']; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(
    () => data.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()) || e.role.toLowerCase().includes(search.toLowerCase())),
    [data, search],
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <div className="flex items-center gap-2">
          <UserX className="w-4 h-4 text-red-500" />
          <span className="font-bold text-slate-800">Chưa check-in hôm nay</span>
          <span className="text-[10px] bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded-full">{data.length}</span>
        </div>
      }
      width={520}
    >
      <div className="pt-2 space-y-3">
        <Input
          prefix={<Search className="w-3.5 h-3.5 text-slate-400" />}
          placeholder="Tìm theo tên, chức vụ..."
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-xs"
        />
        <div className="max-h-[420px] overflow-y-auto space-y-1.5 pr-1">
          {filtered.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-8">Không tìm thấy</div>
          ) : (
            filtered.map((emp, i) => (
              <div key={emp.employeeId} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50 transition-colors border border-slate-50">
                <span className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600 font-extrabold text-xs shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{emp.name}</p>
                  <p className="text-[10px] text-slate-400">{emp.role || '—'}</p>
                </div>
                <Tag color="error" className="text-[9px] m-0 shrink-0">Vắng</Tag>
              </div>
            ))
          )}
        </div>
        <p className="text-[10px] text-slate-400 text-center pt-1">
          Hiển thị {filtered.length}/{data.length} nhân viên
        </p>
      </div>
    </Modal>
  );
}

// ─── Detail Modal: Top Late ───────────────────────────────────────────────────

function TopLateModal({ open, data, onClose }: { open: boolean; data: DashboardStatsResponse['topLateEmployees']; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(
    () => data.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()) || e.role.toLowerCase().includes(search.toLowerCase())),
    [data, search],
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-amber-500" />
          <span className="font-bold text-slate-800">Chi tiết đi muộn tuần này</span>
        </div>
      }
      width={560}
    >
      <div className="pt-2 space-y-3">
        <Input
          prefix={<Search className="w-3.5 h-3.5 text-slate-400" />}
          placeholder="Tìm theo tên, chức vụ..."
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-xs"
        />
        <div className="max-h-[420px] overflow-y-auto space-y-1.5 pr-1">
          {filtered.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-8">
              <TrendingUp className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              Không có ai đi muộn tuần này 🎉
            </div>
          ) : (
            filtered.map((emp, i) => (
              <div key={emp.employeeId} className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-amber-50/50 transition-colors border border-slate-50">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${
                  i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-400'
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{emp.name}</p>
                  <p className="text-[10px] text-slate-400">{emp.role || '—'}</p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <div>
                    <Tag color="warning" className="text-[10px] font-mono font-bold m-0">{emp.lateCount}x</Tag>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">{emp.totalLateMinutes} phút</p>
                  <p className="text-[9px] text-slate-400">TB {Math.round(emp.totalLateMinutes / emp.lateCount)} ph/lần</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Live Clock & Greeting ──────────────────────────────────────────────────
function LiveGreeting() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hour = time.getHours();
  let greeting = 'Chào buổi sáng';
  if (hour >= 12 && hour < 18) greeting = 'Chào buổi chiều';
  else if (hour >= 18) greeting = 'Chào buổi tối';

  return (
    <div>
      <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
        {greeting}, Admin! 👋
      </h1>
      <p className="text-sm text-slate-500 mt-1 font-medium flex items-center gap-2">
        <Clock className="w-4 h-4 text-blue-500" />
        <span className="font-mono text-slate-700 font-bold">{time.toLocaleTimeString('vi-VN')}</span>
        <span className="text-slate-300">|</span>
        <span>{time.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </p>
    </div>
  );
}

// ─── Live Activity Feed ──────────────────────────────────────────────────────
function LiveActivityFeed({ attendance }: { attendance: TodayAttendanceRow[] }) {
  const activities = useMemo(() => {
    return [...attendance]
      .filter((a) => a.clockIn)
      .sort((a, b) => b.clockIn!.localeCompare(a.clockIn!))
      .slice(0, 8);
  }, [attendance]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 h-full flex flex-col relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-60 pointer-events-none" />
      <div className="flex items-center justify-between mb-4 relative">
        <span className="font-bold text-xs uppercase text-slate-500 tracking-wide flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          Hoạt động gần nhất
        </span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1 relative">
        {activities.length === 0 ? (
          <div className="text-center text-xs text-slate-400 py-10">Chưa có ai check-in</div>
        ) : (
          activities.map((a, i) => (
            <div key={i} className="flex gap-3 items-start group/item">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-[11px] shrink-0 group-hover/item:bg-blue-100 transition-colors">
                {a.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {a.name} <span className="text-[10px] font-normal text-slate-400 ml-1">vừa check-in</span>
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-1.5 rounded">{a.clockIn}</span>
                  <span className="text-[9px] text-slate-400 border border-slate-200 px-1.5 rounded-full flex items-center gap-0.5">
                    {a.deviceType === 'FaceID' ? <ShieldCheck className="w-2.5 h-2.5" /> : a.deviceType === 'GPS' ? <MapPin className="w-2.5 h-2.5" /> : <Wifi className="w-2.5 h-2.5" />}
                    {a.deviceType || 'WiFi'}
                  </span>
                  {a.status === 'late' && <span className="text-[9px] text-amber-500 font-semibold ml-auto">Đi muộn</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Device Analytics ────────────────────────────────────────────────────────
function DeviceAnalytics({ attendance }: { attendance: TodayAttendanceRow[] }) {
  const data = useMemo(() => {
    const counts = { FaceID: 0, WiFi: 0, GPS: 0 };
    attendance.forEach((a) => {
      if (a.clockIn) {
        if (a.deviceType === 'FaceID') counts.FaceID++;
        else if (a.deviceType === 'GPS') counts.GPS++;
        else counts.WiFi++;
      }
    });
    return [
      { name: 'FaceID', value: counts.FaceID, color: '#3b82f6' },
      { name: 'WiFi', value: counts.WiFi, color: '#10b981' },
      { name: 'GPS', value: counts.GPS, color: '#f59e0b' }
    ].filter(d => d.value > 0);
  }, [attendance]);

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs h-full flex flex-col">
      <span className="font-bold text-xs uppercase text-slate-500 tracking-wide block mb-3">Thiết bị chấm công</span>
      {data.length === 0 ? (
        <div className="text-center text-xs text-slate-400 m-auto">Chưa có dữ liệu</div>
      ) : (
        <div className="flex-1 flex items-center">
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={2} dataKey="value" labelLine={false}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Số lượng']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2 shrink-0 pr-4">
            {data.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span>{d.name} <span className="font-bold ml-1">({d.value})</span></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TableStatusFilter = 'all' | 'on_time' | 'late' | 'absent';
type ChartSeries = 'checkedIn' | 'late' | 'absent';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ── Date Range Filter ──────────────────────────────────────────────────────
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('week'),
    dayjs(),
  ]);

  // Capped end date for display
  const clampedEndDate = (dateRange[1] && dateRange[1].isAfter(dayjs(), 'day')) ? dayjs() : dateRange[1];

  // ── Chart filter state ──────────────────────────────────────────────────────
  const [chartSeries, setChartSeries] = useState<Set<ChartSeries>>(
    new Set(['checkedIn', 'late', 'absent']),
  );

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [showAbsentModal, setShowAbsentModal] = useState(false);
  const [showLateModal, setShowLateModal] = useState(false);

  // ── Table filter state ──────────────────────────────────────────────────────
  const [tableSearch, setTableSearch] = useState('');
  const [tableStatus, setTableStatus] = useState<TableStatusFilter>('all');

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (dateRange && dateRange[0] && dateRange[1]) {
        qs.append('startDate', dateRange[0].format('YYYY-MM-DD'));
        qs.append('endDate', dateRange[1].format('YYYY-MM-DD'));
      }
      const res = await fetch(`/api/dashboard-stats?${qs.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DashboardStatsResponse = await res.json();
      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  // Initial load & Re-fetch when dateRange changes
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (dateRange && dateRange[0] && dateRange[1]) {
          qs.append('startDate', dateRange[0].format('YYYY-MM-DD'));
          qs.append('endDate', dateRange[1].format('YYYY-MM-DD'));
        }
        const res = await fetch(`/api/dashboard-stats?${qs.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: DashboardStatsResponse = await res.json();
        if (!cancelled) {
          setStats(data);
          setLastUpdated(new Date());
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [dateRange]);

  // ── Toggle chart series ─────────────────────────────────────────────────────
  const toggleSeries = (key: ChartSeries) => {
    setChartSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  };

  // ── Donut data ──────────────────────────────────────────────────────────────
  const donutData = stats
    ? [
        { name: 'Đúng giờ', value: stats.monthlyOnTimeRate },
        { name: 'Đi muộn', value: stats.monthlyLateRate },
        { name: 'Vắng', value: stats.monthlyAbsentRate },
      ].filter((d) => d.value > 0)
    : [];

  // ── Table counts ───────────────────────────────────────────────────────────
  const tableCounts = useMemo(() => {
    if (!stats?.todayAttendance) return { all: 0, on_time: 0, late: 0, absent: 0 };
    return stats.todayAttendance.reduce(
      (acc, r) => {
        acc.all++;
        acc[r.status]++;
        return acc;
      },
      { all: 0, on_time: 0, late: 0, absent: 0 },
    );
  }, [stats]);

  // ── Backend Pagination state ────────────────────────────────────────────────
  const [tablePage, setTablePage] = useState(1);
  const [tableData, setTableData] = useState<TodayAttendanceRow[]>([]);
  const [tableTotal, setTableTotal] = useState(0);
  const [isFetchingTable, setIsFetchingTable] = useState(false);
  const [hasMoreTable, setHasMoreTable] = useState(true);
  const observerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchTable = async () => {
      try {
        setIsFetchingTable(true);
        const params = new URLSearchParams();
        if (dateRange && dateRange[1]) {
          params.set('date', dateRange[1].format('YYYY-MM-DD'));
        }
        params.set('page', tablePage.toString());
        params.set('pageSize', '20');
        if (tableSearch) params.set('search', tableSearch);
        if (tableStatus !== 'all') params.set('status', tableStatus);

        const res = await fetch(`/api/dashboard-attendance?${params.toString()}`);
        const json = await res.json();
        if (isMounted && json.success) {
          if (tablePage === 1) {
            setTableData(json.data || []);
          } else {
            setTableData(prev => {
              const existingIds = new Set(prev.map(p => p.employeeId));
              const newItems = (json.data || []).filter((d: any) => !existingIds.has(d.employeeId));
              return [...prev, ...newItems];
            });
          }
          setTableTotal(json.total || 0);
          setHasMoreTable((json.data || []).length === 20);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) setIsFetchingTable(false);
      }
    };
    
    const timer = setTimeout(fetchTable, tablePage === 1 ? 300 : 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [tablePage, tableSearch, tableStatus, dateRange]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingTable && hasMoreTable) {
          setTablePage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [isFetchingTable, hasMoreTable]);

  const TABLE_STATUS_TABS: { key: TableStatusFilter; label: string; color: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'Tất cả', color: '#1e293b', icon: <Users className="w-3 h-3" /> },
    { key: 'on_time', label: 'Đúng giờ', color: '#10b981', icon: <CheckCircle2 className="w-3 h-3" /> },
    { key: 'late', label: 'Đi muộn', color: '#f59e0b', icon: <AlarmClockOff className="w-3 h-3" /> },
    { key: 'absent', label: 'Chưa check-in', color: '#ef4444', icon: <XCircle className="w-3 h-3" /> },
  ];

  const SERIES_BUTTONS: { key: ChartSeries; label: string; color: string }[] = [
    { key: 'checkedIn', label: 'Có mặt', color: CHART_COLORS.checkedIn },
    { key: 'late', label: 'Đi muộn', color: CHART_COLORS.late },
    { key: 'absent', label: 'Vắng', color: CHART_COLORS.absent },
  ];

  return (
    <div className="space-y-5">
      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <NotCheckedInModal
        open={showAbsentModal}
        data={stats?.notCheckedInToday ?? []}
        onClose={() => setShowAbsentModal(false)}
      />
      <TopLateModal
        open={showLateModal}
        data={stats?.topLateEmployees ?? []}
        onClose={() => setShowLateModal(false)}
      />

      {/* ── Header / Refresh ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <LiveGreeting />
        <div className="flex items-center gap-2">
          <DateRangePicker
            value={dateRange}
            onRangeChanges={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0], dates[1]]);
                setTablePage(1);
              }
            }}
          />
          <Button
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={fetchStats}
            loading={isLoading}
            className="flex items-center"
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error} — Kiểm tra kết nối MongoDB hoặc thử làm mới lại.</span>
        </div>
      )}

      {/* ── 4 Stat Cards ──────────────────────────────────────────────────── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Tổng nhân sự" value={isLoading ? '—' : (stats?.totalEmployees ?? 0)} suffix="thành viên" color="#1e293b" borderColor="#94a3b8" icon={<Users className="w-4 h-4 text-slate-500" />} trendData={stats?.weeklyData?.map(d => ({ value: d.checkedIn + d.late + d.absent, label: d.label, date: d.date }))} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Đã có mặt" value={isLoading ? '—' : (stats?.todayCheckedIn ?? 0)} suffix={`/ ${stats?.totalEmployees ?? 0} hôm nay`} color="#10b981" borderColor="#10b981" icon={<UserCheck className="w-4 h-4 text-emerald-500" />} trendData={stats?.weeklyData?.map(d => ({ value: d.checkedIn, label: d.label, date: d.date }))} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Đi muộn / trễ ca" value={isLoading ? '—' : (stats?.todayLate ?? 0)} suffix="phát sinh" color="#f59e0b" borderColor="#f59e0b" icon={<Clock className="w-4 h-4 text-amber-500" />} trendData={stats?.weeklyData?.map(d => ({ value: d.late, label: d.label, date: d.date }))} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Đơn xin nghỉ" value={isLoading ? '—' : (stats?.pendingLeaves ?? 0)} suffix="chờ duyệt" color="#1677ff" borderColor="#1677ff" icon={<AlertCircle className="w-4 h-4 text-blue-500" />} trendData={stats?.weeklyData?.map(d => ({ value: d.absent, label: d.label, date: d.date }))} />
        </Col>
      </Row>

      {/* ── Main Analytics Row ────────────────────────────────────────────── */}
      <Row gutter={[24, 24]}>
        {/* ── LEFT ────────────────────────────────────────────────────────── */}
        <Col xs={24} xl={16}>
          <div className="space-y-5">
            {/* Bar chart 7 ngày & Live Feed */}
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={15}>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 h-full flex flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <span className="font-bold text-xs uppercase text-slate-500 tracking-wide block">
                        Biểu đồ chấm công trong kỳ
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {dateRange[0]?.format('DD/MM/YYYY')} - {dateRange[1]?.format('DD/MM/YYYY')}
                      </span>
                    </div>
                    {/* Series toggles */}
                    <div className="flex gap-1.5">
                      {SERIES_BUTTONS.map((s) => (
                        <button
                          key={s.key}
                          onClick={() => toggleSeries(s.key)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${
                            chartSeries.has(s.key)
                              ? 'text-white shadow-sm'
                              : 'bg-white text-slate-400 border-slate-200'
                          }`}
                          style={chartSeries.has(s.key) ? { backgroundColor: s.color, borderColor: s.color } : {}}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: chartSeries.has(s.key) ? 'white' : s.color }} />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {isLoading ? (
                    <div className="h-[250px] flex items-center justify-center"><Spin /></div>
                  ) : (
                    <div className="h-[250px] w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats?.weeklyData ?? []} barCategoryGap="30%" barGap={2} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
                          <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f8fafc' }} />
                          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} iconType="circle" iconSize={8} />
                          {chartSeries.has('checkedIn') && <Bar dataKey="checkedIn" name="Có mặt" fill={CHART_COLORS.checkedIn} radius={[4, 4, 0, 0]} />}
                          {chartSeries.has('late') && <Bar dataKey="late" name="Đi muộn" fill={CHART_COLORS.late} radius={[4, 4, 0, 0]} />}
                          {chartSeries.has('absent') && <Bar dataKey="absent" name="Vắng" fill={CHART_COLORS.absent} radius={[4, 4, 0, 0]} />}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </Col>
              <Col xs={24} lg={9}>
                <LiveActivityFeed attendance={stats?.todayAttendance ?? []} />
              </Col>
            </Row>

            {/* Bottom: Top Late + Not Checked In */}
            <Row gutter={[16, 16]}>
              {/* Top 5 muộn */}
              <Col xs={24} md={12}>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 h-[320px] flex flex-col">
                  <div className="flex items-center justify-between mb-4 shrink-0">
                    <span className="font-bold text-xs uppercase text-slate-500 tracking-wide flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
                      Top đi muộn trong kỳ
                    </span>
                    <button
                      onClick={() => setShowLateModal(true)}
                      className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      Xem chi tiết
                    </button>
                  </div>
                  {isLoading ? (
                    <div className="flex-1 flex items-center justify-center"><Spin size="small" /></div>
                  ) : (stats?.topLateEmployees?.length ?? 0) === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-xs text-slate-400">
                      <TrendingUp className="w-8 h-8 text-slate-200 mb-2" />
                      Không có ai đi muộn tuần này 🎉
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
                      <div className="space-y-3">
                        {stats!.topLateEmployees.map((emp, i) => (
                          <div key={emp.employeeId} className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${
                              i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">{emp.name}</p>
                              <p className="text-[10px] text-slate-400">{emp.role}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <Tag color="warning" className="text-[10px] font-mono font-bold m-0">{emp.lateCount}x</Tag>
                              <p className="text-[9px] text-slate-400 mt-0.5">{emp.totalLateMinutes}ph</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Col>

              {/* Chưa check-in hôm nay */}
              <Col xs={24} md={12}>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 h-[320px] flex flex-col">
                  <div className="flex items-center justify-between mb-4 shrink-0">
                    <span className="font-bold text-xs uppercase text-slate-500 tracking-wide flex items-center gap-1.5">
                      <UserX className="w-3.5 h-3.5 text-red-400" />
                      Chưa chấm công ({clampedEndDate?.format('DD/MM')})
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded-full">
                        {stats?.notCheckedInToday?.length ?? 0}
                      </span>
                      <button
                        onClick={() => setShowAbsentModal(true)}
                        className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                  {isLoading ? (
                    <div className="flex-1 flex items-center justify-center"><Spin size="small" /></div>
                  ) : (stats?.notCheckedInToday?.length ?? 0) === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-xs text-slate-400">
                      <UserCheck className="w-8 h-8 text-slate-200 mb-2" />
                      Tất cả đã check-in hôm nay ✅
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto min-h-0 pr-3 custom-scrollbar">
                      <div>
                        {stats!.notCheckedInToday.map((emp) => (
                          <div key={emp.employeeId} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                            <div className="w-7 h-7 rounded-md bg-red-50 flex items-center justify-center shrink-0 text-red-500 text-[11px] font-bold">
                              {emp.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">{emp.name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{emp.role || '—'}</p>
                            </div>
                            <Tag color="error" className="text-[10px] font-semibold m-0 shrink-0">Vắng</Tag>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Col>
            </Row>
          </div>
        </Col>

        {/* ── RIGHT ────────────────────────────────────────────────────────── */}
        <Col xs={24} xl={8}>
          <div className="space-y-5">
            {/* Donut chart kỳ */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
              <span className="font-bold text-xs uppercase text-slate-500 tracking-wide block mb-3">Tỉ lệ chấm công trong kỳ</span>
              {isLoading ? (
                <div className="h-48 flex items-center justify-center"><Spin /></div>
              ) : donutData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs text-slate-400">Chưa có dữ liệu tháng này</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" labelLine={false} label={DonutLabel}>
                        {donutData.map((_, index) => (
                          <Cell key={index} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value ?? 0}%`, '']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-1">
                    {donutData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-[10px] text-slate-600">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DONUT_COLORS[i] }} />
                        {d.name}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Giờ làm TB */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl -mr-16 -mt-16 opacity-10 pointer-events-none transition-transform duration-700 group-hover:scale-150" />
              <div className="flex items-center gap-2 mb-1 relative z-10">
                <Timer className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase text-slate-400 tracking-wide">Giờ làm TB trong kỳ</span>
              </div>
              <div className="flex items-end gap-2 mt-2 relative z-10">
                <span className="text-4xl font-extrabold text-white font-mono tracking-tight">
                  {isLoading ? '—' : (stats?.avgWorkHoursThisWeek ?? 0)}
                </span>
                <span className="text-slate-400 text-sm mb-1">giờ/người</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 relative z-10">Tính dựa trên bản ghi có cả giờ vào & ra</p>
            </div>

            {/* Device Analytics */}
            <DeviceAnalytics attendance={stats?.todayAttendance ?? []} />

            {/* FaceID promo card */}
            <div
              className="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 p-5 rounded-2xl border border-blue-100/60 cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-blue-200/80 transition-all duration-300"
              onClick={() => router.push('/members')}
            >
              <span className="text-[9px] uppercase font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full block w-fit mb-2">Sinh Trắc Học</span>
              <h4 className="font-extrabold text-sm text-slate-800 mb-1.5">Quét Khuôn Mặt FaceID 3D</h4>
              <p className="text-xs text-slate-500 leading-normal mb-3">Hệ thống hỗ trợ nhận diện 3D trực tiếp qua camera. Giải pháp hiện đại chống chấm công gian lận.</p>
              <div className="flex items-center gap-1 text-blue-600 text-xs font-semibold">
                Đăng ký & xem hồ sơ <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* ── Today Attendance Table ────────────────────────────────────────── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
          <div>
            <span className="font-bold text-xs uppercase text-slate-500 tracking-wide block">
              Dữ liệu chấm công ngày ({clampedEndDate?.format('DD/MM/YYYY')})
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Tổng {tableCounts.all} nhân viên · {tableCounts.on_time} đúng giờ · {tableCounts.late} muộn · {tableCounts.absent} vắng
            </p>
          </div>
          <Button type="link" onClick={() => router.push('/time-records')} className="p-0 text-xs flex items-center gap-1">
            Xem lịch sử đầy đủ <ChevronRight className="w-3 h-3" />
          </Button>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Status tabs */}
          <div className="flex gap-1 bg-slate-50 rounded-xl p-1 flex-wrap">
            {TABLE_STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setTableStatus(tab.key); setTablePage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                  tableStatus === tab.key
                    ? 'bg-white shadow-sm text-slate-800'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span style={{ color: tab.color }}>{tab.icon}</span>
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  tableStatus === tab.key ? 'bg-slate-100 text-slate-600' : 'bg-transparent'
                }`}>
                  {tableCounts[tab.key]}
                </span>
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="flex-1 min-w-[180px]">
            <Input
              prefix={<Search className="w-3.5 h-3.5 text-slate-400" />}
              placeholder="Tìm theo tên, chức vụ..."
              size="small"
              value={tableSearch}
              onChange={(e) => { setTableSearch(e.target.value); setTablePage(1); }}
              allowClear
              className="text-xs"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading && tablePage === 1 ? (
          <div className="h-40 flex items-center justify-center"><Spin /></div>
        ) : tableData.length === 0 ? (
          <div className="text-center text-xs text-slate-400 py-10">
            {tableSearch || tableStatus !== 'all' ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có dữ liệu chấm công hôm nay'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 text-slate-500 font-bold uppercase tracking-wide text-[10px] w-full">Nhân viên</th>
                  <th className="text-left py-3 px-4 text-slate-500 font-bold uppercase tracking-wide text-[10px] whitespace-nowrap">Giờ vào</th>
                  <th className="text-left py-3 px-4 text-slate-500 font-bold uppercase tracking-wide text-[10px] whitespace-nowrap">Giờ ra</th>
                  <th className="text-left py-3 px-4 text-slate-500 font-bold uppercase tracking-wide text-[10px] whitespace-nowrap">Muộn</th>
                  <th className="text-left py-3 px-4 text-slate-500 font-bold uppercase tracking-wide text-[10px] whitespace-nowrap">Thiết bị</th>
                  <th className="text-right py-3 px-4 text-slate-500 font-bold uppercase tracking-wide text-[10px] whitespace-nowrap">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row) => (
                  <tr key={row.employeeId} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <td className="py-2.5 px-4 w-full">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 transition-transform group-hover:scale-105 ${
                          row.status === 'on_time' ? 'bg-emerald-50 text-emerald-600'
                          : row.status === 'late' ? 'bg-amber-50 text-amber-600'
                          : 'bg-red-50 text-red-500'
                        }`}>
                          {row.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-xs">{row.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{row.role || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-left font-mono text-slate-700 font-semibold whitespace-nowrap">
                      {row.clockIn || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2.5 px-4 text-left font-mono text-slate-500 whitespace-nowrap">
                      {row.clockOut || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2.5 px-4 text-left whitespace-nowrap">
                      {row.lateMinutes > 0 ? (
                        <span className="text-amber-600 font-mono font-bold text-[11px] bg-amber-50 px-2 py-0.5 rounded-md">+{row.lateMinutes}p</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-left whitespace-nowrap">
                      {row.deviceType ? (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-mono">{row.deviceType}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hasMoreTable && (
              <div ref={observerRef} className="h-10 flex items-center justify-center mt-2">
                <Spin size="small" />
              </div>
            )}
            <p className="text-center text-[10px] text-slate-400 mt-3">
              Hiển thị {tableData.length}/{tableTotal || tableCounts.all} nhân viên
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
