'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCcw, History, Search, X, Calendar } from 'lucide-react';

interface LogEntry {
  userId: string;
  userName: string;
  timestamp: string;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function ZktecoLogsView({ connectorUrl, deviceIp, devicePort }: {
  connectorUrl: string;
  deviceIp: string;
  devicePort?: number;
}) {
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const fetchLogs = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const params = new URLSearchParams({
        connectorUrl,
        ip: deviceIp,
        port: String(devicePort || ''),
        page: '1',
        limit: '999999',
      });
      const res = await fetch(`/api/v1/zkteco-devices/logs?${params}`);
      const result = await res.json();
      if (result.success) {
        setAllLogs(result.logs || []);
        setLastFetched(new Date());
        setPage(1);
      } else {
        setFetchError(result.message || 'Lỗi khi kéo log chấm công');
      }
    } catch {
      setFetchError('Lỗi kết nối tới Connector');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchLogs(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectorUrl, deviceIp, devicePort]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allLogs.filter(l => {
      const matchSearch = !q || l.userId.toLowerCase().includes(q) || l.userName.toLowerCase().includes(q);
      const matchDate = !dateFilter || l.timestamp.slice(0, 10) === dateFilter;
      return matchSearch && matchDate;
    });
  }, [allLogs, search, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const todayCount = useMemo(() => {
    const today = todayStr();
    return allLogs.filter(l => l.timestamp.slice(0, 10) === today).length;
  }, [allLogs]);

  const setDateAndReset = (d: string) => { setDateFilter(d); setPage(1); };
  const setSearchAndReset = (s: string) => { setSearch(s); setPage(1); };

  return (
    <div className="space-y-4">
      {/* ─── Stats bar ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Hôm nay', value: todayCount, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40' },
          { label: 'Tổng (máy)', value: allLogs.length, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40' },
          { label: 'Đang lọc', value: filtered.length, color: 'text-slate-700 dark:text-slate-300', bg: 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 ${s.bg}`}>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{s.label}</p>
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ─── Bảng log ──────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 shrink-0">
            <History className="w-4 h-4 text-blue-500" />
            Lịch sử chấm công
          </h3>
          <button
            onClick={fetchLogs} disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 font-bold rounded-xl text-xs transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Đang kéo...' : 'Làm mới'}
          </button>
        </div>

        {/* Filter row */}
        <div className="flex flex-col sm:flex-row gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text" placeholder="Tìm theo tên, mã NV..." value={search}
              onChange={e => setSearchAndReset(e.target.value)}
              className="w-full h-9 pl-9 pr-8 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-colors"
            />
            {search && (
              <button onClick={() => setSearchAndReset('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                type="date" value={dateFilter}
                onChange={e => setDateAndReset(e.target.value)}
                className="h-9 pl-9 pr-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-colors"
              />
            </div>
            <button
              onClick={() => setDateAndReset(todayStr())}
              className={`h-9 px-3 text-xs font-bold rounded-xl border transition-colors whitespace-nowrap ${dateFilter === todayStr() ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'}`}
            >
              Hôm nay
            </button>
            {dateFilter && (
              <button onClick={() => setDateAndReset('')} className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-slate-600 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {fetchError && (
          <div className="px-4 py-3 bg-rose-50 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 text-xs font-semibold">
            {fetchError}
          </div>
        )}

        {loading && allLogs.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Đang kéo dữ liệu từ máy chấm công...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500">
            <History className="mx-auto w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">{allLogs.length === 0 ? 'Chưa có dữ liệu chấm công' : 'Không có kết quả phù hợp'}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/30">
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-32">Mã NV</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Họ & Tên</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-48">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map((log, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-mono">{log.userId}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100 max-w-[220px] truncate">{log.userName}</td>
                      <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                        {new Date(log.timestamp).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {paginated.map((log, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">{log.userId}</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{log.userName}</span>
                    </div>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{new Date(log.timestamp).toLocaleString('vi-VN')}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Phân trang client-side */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors">← Trước</button>
            <span className="text-xs font-bold text-slate-500">Trang {page} / {totalPages} ({filtered.length} bản ghi)</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors">Sau →</button>
          </div>
        )}
      </div>

      {lastFetched && (
        <p className="text-[11px] text-slate-400 text-right font-medium">
          Lần kéo gần nhất: {lastFetched.toLocaleString('vi-VN')}
        </p>
      )}
    </div>
  );
}
