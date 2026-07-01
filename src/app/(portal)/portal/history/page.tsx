"use client";

import React, { useState, useEffect } from "react";
import { Calendar, AlertCircle, ChevronRight, Filter } from "lucide-react";
import { Tag, Pagination, Select } from "antd";
import type { Dayjs } from "dayjs";
import isoWeek from 'dayjs/plugin/isoWeek';
import { TableBase, type Column } from "@/app/ui/base/table";
import { usePortalUser } from "../../portal-context";
import type { TimeRecordTimekeeping } from "@/app/interface/timekeeping";
import dayjs from "dayjs";
import { DateRangePicker } from "@/app/ui/base/date-range-picker";
dayjs.extend(isoWeek);

export default function PortalHistory() {
  const { employee, displayName, employeeCode, isLoading: isUserLoading } = usePortalUser();
  const [history, setHistory] = useState<TimeRecordTimekeeping[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [dateRange, setDateRange] = useState<[string | null, string | null]>([null, null]);
  const [statusFilter, setStatusFilter] = useState("");

  const dayjsDateRange = React.useMemo<[Dayjs | null, Dayjs | null]>(() => {
    const [start, end] = dateRange;
    return [start ? dayjs(start) : null, end ? dayjs(end) : null];
  }, [dateRange]);

  useEffect(() => {
    const employeeLookupIds = Array.from(new Set([
      employee?.id,
      employeeCode,
      employee?.employeeCode,
    ].filter((value): value is string => Boolean(value))));

    if (employeeLookupIds.length === 0) return;

    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const startDate = dateRange[0] || "";
        const endDate = dateRange[1] || "";

        const params = new URLSearchParams({
          page: String(page),
          limit: String(pageSize),
          startDate,
          endDate,
        });

        if (statusFilter) {
          params.append("status", statusFilter);
        }

        employeeLookupIds.forEach((id) => params.append("employeeIds", id));

        const res = await fetch(`/api/time-records-timekeeping?${params.toString()}`);
        const json = await res.json();
        if (json.data) {
          setHistory(json.data);
          setTotal(json.total || 0);
        }
      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [employee?.id, employeeCode, employee?.employeeCode, page, pageSize, dateRange, statusFilter]);

  const getLogStatusTag = (record: TimeRecordTimekeeping) => {
    const renderStatus = (text: string) => (
      <span className="text-xs text-slate-700">{text}</span>
    );

    if (!record.clockIn) return renderStatus('Chưa vào');
    if (!record.clockOut) return renderStatus('Chưa ra');

    const lateMin = record.lateMinutes || 0;
    const earlyMin = record.earlyMinutes || 0;
    const isLateExcused = (record.lateReasonApproved || record.reasonApproved) && (!record.lateRequestedMinutes || lateMin <= record.lateRequestedMinutes);
    const isEarlyExcused = (record.earlyReasonApproved || record.reasonApproved) && (!record.earlyRequestedMinutes || earlyMin <= record.earlyRequestedMinutes);
    const lateReqMin = record.lateRequestedMinutes ? ` ${record.lateRequestedMinutes}p` : '';
    const earlyReqMin = record.earlyRequestedMinutes ? ` ${record.earlyRequestedMinutes}p` : '';

    if (lateMin > 0 || earlyMin > 0) {
      if (lateMin > 0 && earlyMin > 0) {
        if (isLateExcused && isEarlyExcused) return renderStatus('Có phép');
        if (isLateExcused) return renderStatus(`Trễ (có phép${lateReqMin}) · Sớm ${earlyMin}p`);
        if (isEarlyExcused) return renderStatus(`Trễ ${lateMin}p · Sớm (có phép${earlyReqMin})`);
        return renderStatus(`Trễ ${lateMin}p · Sớm ${earlyMin}p`);
      }
      if (lateMin > 0) {
        if (isLateExcused) return renderStatus(`Có phép${lateReqMin}`);
        return renderStatus(`Đi trễ ${lateMin}p`);
      }
      if (earlyMin > 0) {
        if (isEarlyExcused) return renderStatus(`Có phép${earlyReqMin}`);
        return renderStatus(`Về sớm ${earlyMin}p`);
      }
    }
    return renderStatus('Đúng giờ');
  };

  const columns: Column<TimeRecordTimekeeping>[] = [
    {
      title: "Ngày",
      dataIndex: "date",
      className: "text-center justify-center",
      render: (val) => {
        const date = typeof val === 'string' ? dayjs(val) : null;
        const displayDate = date?.isValid() ? date.format('DD/MM/YYYY') : String(val ?? '');
        return <span className="font-semibold text-slate-800">{displayDate}</span>;
      },
    },
    {
      title: "Ca làm việc",
      dataIndex: "shiftId",
      className: "text-center justify-center",
      render: (_, record) => {
        if (!record.clockIn && !record.clockOut) return <span className="text-slate-300 font-mono text-[10px]">---</span>;
        return <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">Hành chính VP</span>;
      },
    },
    {
      title: "Giờ vào",
      className: "text-center justify-center",
      render: (_, record) => {
        const isCompleted = Boolean(record.clockIn && record.clockOut);
        const lateMin = isCompleted ? record.lateMinutes || 0 : 0;
        const isLateExcused = (record.lateReasonApproved || record.reasonApproved) && (!record.lateRequestedMinutes || lateMin <= record.lateRequestedMinutes);
        return (
          <div className="flex flex-col items-center gap-0.5">
            {lateMin > 0 && !isLateExcused && (
              <span className="text-[9px] font-bold text-red-500 leading-none">đi muộn</span>
            )}
            {lateMin > 0 && isLateExcused && (
              <span className="text-[9px] font-bold text-emerald-500 leading-none">có phép{record.lateRequestedMinutes ? ` ${record.lateRequestedMinutes}p` : ''}</span>
            )}
            {record.clockIn ? (
              <span className="font-mono bg-slate-100 px-2 py-1 rounded-md text-xs text-slate-700">
                {record.clockIn.substring(0, 5)}
              </span>
            ) : (
              <span className="text-slate-400 font-mono text-xs">--:--</span>
            )}
          </div>
        );
      },
    },
    {
      title: "Giờ ra",
      className: "text-center justify-center",
      render: (_, record) => {
        const isCompleted = Boolean(record.clockIn && record.clockOut);
        const earlyMin = isCompleted ? record.earlyMinutes || 0 : 0;
        const isEarlyExcused = (record.earlyReasonApproved || record.reasonApproved) && (!record.earlyRequestedMinutes || earlyMin <= record.earlyRequestedMinutes);
        return (
          <div className="flex flex-col items-center gap-0.5">
            {earlyMin > 0 && !isEarlyExcused && (
              <span className="text-[9px] font-bold text-orange-500 leading-none">về sớm</span>
            )}
            {earlyMin > 0 && isEarlyExcused && (
              <span className="text-[9px] font-bold text-emerald-500 leading-none">có phép{record.earlyRequestedMinutes ? ` ${record.earlyRequestedMinutes}p` : ''}</span>
            )}
            {record.clockOut ? (
              <span className="font-mono bg-slate-100 px-2 py-1 rounded-md text-xs text-slate-700">
                {record.clockOut.substring(0, 5)}
              </span>
            ) : (
              <span className="text-slate-400 font-mono text-xs">--:--</span>
            )}
          </div>
        );
      },
    },
    {
      title: "Trạng thái",
      className: "text-center justify-center",
      render: (_, record) => getLogStatusTag(record),
    },

  ];

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const avatarUrl = employee?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix";

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Lịch sử chấm công</h2>
          <p className="text-sm text-slate-500 mt-1">Theo dõi giờ giấc làm việc chi tiết của bạn</p>
        </div>

        <div className="flex items-center gap-3 bg-white/70 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/50 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all">
          <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-tight">{displayName}</p>
            <p className="text-xs text-slate-500 font-medium">Mã NV: <span className="font-mono text-blue-600">{employeeCode}</span></p>
          </div>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden flex flex-col">
        {/* Filters */}
        <div className="p-5 border-b border-white/40 flex flex-col sm:flex-row sm:items-center gap-4 bg-white/30">
          <div className="flex flex-col gap-1.5 flex-1 sm:max-w-xs relative">
            <style dangerouslySetInnerHTML={{
              __html: `
              @media (max-width: 640px) {
                .mobile-range-picker {
                  max-width: 100vw !important;
                  left: 0 !important;
                  padding: 10px;
                }
                .mobile-range-picker .ant-picker-panel-container {
                  max-width: 100%;
                  overflow-x: auto;
                }
                .mobile-range-picker .ant-picker-panel-layout {
                  flex-direction: column;
                }
                .mobile-range-picker .ant-picker-panels {
                  flex-direction: column;
                  align-items: center;
                }
                .mobile-range-picker .ant-picker-presets {
                  max-width: 100%;
                  border-right: none;
                  border-bottom: 1px solid rgba(5, 5, 5, 0.06);
                  padding-bottom: 8px;
                  margin-bottom: 8px;
                }
                .mobile-range-picker .ant-picker-presets ul {
                  display: flex;
                  flex-wrap: wrap;
                  gap: 8px;
                }
                .mobile-range-picker .ant-picker-presets ul li {
                  flex: 1 0 calc(33.333% - 8px);
                  text-align: center;
                }
              }
            `}} />
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
              className="w-full text-sm rounded-xl py-2 px-4 border border-white/60 bg-white/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-blue-200 focus:border-blue-500 font-semibold text-slate-700 h-[42px] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 bg-white/80 px-4 rounded-xl border border-white/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex-1 sm:max-w-xs transition-colors hover:border-blue-200 h-[42px]">
            <Filter className="text-blue-500" size={18} />
            <Select
              value={statusFilter}
              onChange={(value) => { setStatusFilter(value); setPage(1); }}
              variant="borderless"
              className="w-full text-sm font-semibold text-slate-700"
              popupMatchSelectWidth={false}
              options={[
                { value: "", label: "Tất cả trạng thái" },
                { value: "late_early", label: "Đi muộn / Về sớm" },
                { value: "on_time", label: "Đúng giờ" },
                { value: "absent", label: "Vắng mặt" },
              ]}
            />
          </div>
        </div>

        {/* Mobile View (List Cards) */}
        <div className="md:hidden p-4 space-y-4 flex-1 bg-slate-50/30">
          {isLoadingHistory ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm font-medium">Chưa có dữ liệu chấm công</div>
          ) : history.map((record) => {
            const lateMin = record.lateMinutes || 0;
            const earlyMin = record.earlyMinutes || 0;
            const isLateExcused = (record.lateReasonApproved || record.reasonApproved) && (!record.lateRequestedMinutes || lateMin <= record.lateRequestedMinutes);
            const isEarlyExcused = (record.earlyReasonApproved || record.reasonApproved) && (!record.earlyRequestedMinutes || earlyMin <= record.earlyRequestedMinutes);
            const lateReqMin = record.lateRequestedMinutes ? ` ${record.lateRequestedMinutes}p` : '';
            const earlyReqMin = record.earlyRequestedMinutes ? ` ${record.earlyRequestedMinutes}p` : '';

            return (
              <div key={record._id || record.date} className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-[0_4px_15px_rgba(0,0,0,0.02)] hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-50/50 to-transparent rounded-bl-full -z-10 group-hover:scale-125 transition-transform duration-500"></div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="font-extrabold text-slate-800 text-base tracking-tight">{dayjs(record.date).format("DD/MM/YYYY")}</span>
                    <span className="block text-[11px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">Hành chính VP</span>
                  </div>
                  {!record.clockIn && !record.clockOut ? (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">Vắng mặt</span>
                  ) : lateMin > 0 && earlyMin > 0 ? (
                    isLateExcused && isEarlyExcused ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-600 text-xs font-bold border border-emerald-200">Có phép</span>
                    ) : isLateExcused ? (
                      <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-600 text-xs font-bold border border-orange-200">Trễ (có phép{lateReqMin}) · Sớm {earlyMin}p</span>
                    ) : isEarlyExcused ? (
                      <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-600 text-xs font-bold border border-orange-200">Trễ {lateMin}p · Sớm (có phép{earlyReqMin})</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-600 text-xs font-bold border border-orange-200">Trễ {lateMin}p · Sớm {earlyMin}p</span>
                    )
                  ) : lateMin > 0 ? (
                    isLateExcused ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-600 text-xs font-bold border border-emerald-200">Có phép{lateReqMin}</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-600 text-xs font-bold border border-orange-200">Đi trễ {lateMin}p</span>
                    )
                  ) : earlyMin > 0 ? (
                    isEarlyExcused ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-600 text-xs font-bold border border-emerald-200">Có phép{earlyReqMin}</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-600 text-xs font-bold border border-orange-200">Về sớm {earlyMin}p</span>
                    )
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-600 text-xs font-bold border border-emerald-200">Đúng giờ</span>
                  )}
                </div>

                <div className="flex items-center gap-4 bg-slate-50/80 rounded-xl p-3 border border-slate-100/80">
                  <div className="flex-1 text-center">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Giờ vào</span>
                    <span className="font-mono font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm block">{record.clockIn || "--:--"}</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 shrink-0" />
                  <div className="flex-1 text-center">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Giờ ra</span>
                    <span className="font-mono font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm block">{record.clockOut || "--:--"}</span>
                  </div>
                </div>

                {(lateMin > 0 && !isLateExcused) || (earlyMin > 0 && !isEarlyExcused) ? (
                  <div className="mt-4 p-2.5 bg-red-50/80 rounded-xl flex items-center gap-2 text-[13px] font-bold text-red-600 border border-red-100">
                    <AlertCircle size={16} />
                    {lateMin > 0 && !isLateExcused && <span>Muộn: {lateMin}p</span>}
                    {lateMin > 0 && !isLateExcused && earlyMin > 0 && !isEarlyExcused && <span className="text-red-300">•</span>}
                    {earlyMin > 0 && !isEarlyExcused && <span>Sớm: {earlyMin}p</span>}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:block flex-1">
          <TableBase
            data={history}
            rowKey="_id"
            columns={columns}
            bordered
            className="w-full"
            loading={isLoadingHistory}
          />
        </div>

        {/* Pagination Section */}
        {total > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-center sm:justify-end bg-white">
            <Pagination
              current={page}
              pageSize={pageSize}
              total={total}
              onChange={(p, ps) => {
                setPage(p);
                setPageSize(ps);
              }}
              showSizeChanger
              pageSizeOptions={['10', '20', '50']}
              size="small"
              className="!text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}
