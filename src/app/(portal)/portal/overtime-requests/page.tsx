"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Clock, Plus, AlarmClock } from "lucide-react";
import { Tag, message, Spin, Pagination, AutoComplete, Radio, Select } from "antd";
import { TableBase, type Column } from "@/app/ui/base/table";
import { ModalBase } from "@/app/ui/base/modal";
import { InputBase } from "@/app/ui/base/input";
import { InputAreaBase } from "@/app/ui/base/textarea";
import { ButtonBase } from "@/app/ui/base/button";
import { usePortalUser } from "../../portal-context";
import type { OvertimeRequest } from "@/app/interface/timekeeping";
import dayjs from "dayjs";

const today = new Date().toISOString().split('T')[0];

const TIME_OPTIONS = Array.from({ length: 48 }).map((_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0');
  const m = (i % 2 === 0) ? '00' : '30';
  return { value: `${h}:${m}` };
});

export default function PortalOvertimeRequests() {
  const { employee, employeeCode, displayName } = usePortalUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Form states
  const [date, setDate] = useState(today);
  const [overtimeStart, setOvertimeStart] = useState("");
  const [overtimeEnd, setOvertimeEnd] = useState("");
  const [overtimeType, setOvertimeType] = useState("1");
  const [workMode, setWorkMode] = useState<"online" | "offline">("offline");
  const [reason, setReason] = useState('');

  const formatTimeInput = (val: string, oldVal: string) => {
    if (val.length < oldVal.length) return val;
    let v = val.replace(/[^\d:]/g, '');
    if (v.length === 1 && /[3-9]/.test(v)) v = `0${v}:`;
    else if (v.length === 2 && !v.includes(':')) v = `${v}:`;
    return v.substring(0, 5);
  };

  const fetchRequests = useCallback(async () => {
    const searchId = employeeCode || employee?.employeeCode || employee?.id || "";
    if (!searchId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/overtime-requests?employeeId=${searchId}&page=${page}&pageSize=${pageSize}`);
      const json = await res.json();
      if (json.success) {
        setRequests(json.data || []);
        setTotal(json.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch overtime requests", error);
    } finally {
      setIsLoading(false);
    }
  }, [employee?.employeeCode, employee?.id, employeeCode, page, pageSize]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchRequests();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchRequests]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!date || !overtimeStart || !overtimeEnd || !reason.trim()) {
      message.warning('Vui lòng điền đầy đủ ngày, giờ bắt đầu, giờ kết thúc và lý do.');
      return;
    }
    if (overtimeStart >= overtimeEnd) {
      message.warning('Giờ kết thúc phải sau giờ bắt đầu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const employeeId = employee?.id || employeeCode || '';

      const res = await fetch('/api/overtime-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employeeId,
          employeeCode: employeeCode || employee?.employeeCode || employeeId,
          employeeName: displayName || employee?.name || employee?.fullName || '',
          departmentId: employee?.departmentId || '',
          department: employee?.departmentName || '',
          branchId: employee?.branchId || '',
          locationId: employee?.locationId || '',
          date,
          overtimeStart,
          overtimeEnd,
          overtimeType,
          workMode,
          reason,
          status: 'pending',
          requestedBy: displayName || employee?.name || 'portal',
        }),
      });

      const json = await res.json();
      if (!json.success) {
        message.error(json.message || 'Lỗi gửi yêu cầu tăng ca.');
        return;
      }

      message.success('Gửi yêu cầu tăng ca thành công!');
      setIsModalOpen(false);
      setDate(today);
      setOvertimeStart("");
      setOvertimeEnd("");
      setOvertimeType("1");
      setWorkMode("offline");
      setReason('');
      if (page === 1) {
        fetchRequests();
      } else {
        setPage(1);
      }
    } catch (error) {
      console.error('Failed to submit overtime request', error);
      message.error('Lỗi kết nối mạng khi gửi yêu cầu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<OvertimeRequest>[] = [
    {
      title: "Ngày tăng ca",
      dataIndex: "date",
      className: "text-center justify-center font-mono text-xs font-semibold",
      render: (val) => {
        const d = typeof val === 'string' ? dayjs(val) : null;
        return d?.isValid() ? d.format('DD/MM/YYYY') : String(val ?? '');
      },
    },
    {
      title: "Giờ tăng ca",
      width: 160,
      className: "text-center justify-center font-mono text-xs text-violet-700",
      render: (_, r) => {
        const typeLabels: Record<string, string> = {
          '1': 'TC1: Ngày thường',
          '2': 'TC2: Chủ nhật',
          '3': 'TC3: Lễ, Tết',
        };
        const typeText = r.overtimeType ? (typeLabels[r.overtimeType] || `TC${r.overtimeType}`) : '';
        const modeText = r.workMode === 'online' ? 'Online' : r.workMode === 'offline' ? 'Offline' : '';
        return (
          <div className="flex flex-col items-center gap-1 py-1">
            <span className="font-bold">{r.overtimeStart} → {r.overtimeEnd}</span>
            <div className="flex gap-1 flex-wrap justify-center">
              {typeText && <Tag color="purple" className="m-0 text-[10px] px-1.5 py-0">{typeText}</Tag>}
              {modeText && <Tag color={r.workMode === 'online' ? 'cyan' : 'orange'} className="m-0 text-[10px] px-1.5 py-0">{modeText}</Tag>}
            </div>
          </div>
        );
      },
    },
    {
      title: "Lý do chi tiết",
      dataIndex: "reason",
      className: "text-left max-w-[280px] text-xs text-slate-600 truncate",
      render: (val) => <span className="truncate block" title={String(val)}>{String(val)}</span>,
    },
    {
      title: "Thời gian gửi",
      dataIndex: "requestedAt",
      className: "text-center justify-center text-xs text-slate-500",
      render: (val) => {
        const d = typeof val === 'string' ? dayjs(val) : null;
        return d?.isValid() ? d.format('DD/MM/YYYY HH:mm') : String(val ?? '');
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      className: "text-center justify-center",
      render: (val) => {
        if (val === "approved") return <Tag color="success">Đã duyệt</Tag>;
        if (val === "pending") return <Tag color="warning">Chờ duyệt</Tag>;
        return <Tag color="error">Từ chối</Tag>;
      },
    },
    {
      title: "Người duyệt",
      dataIndex: "resolvedBy",
      className: "text-center justify-center text-xs text-slate-500",
      render: (val) => val ? String(val) : <span className="text-slate-300 font-mono text-[10px]">---</span>,
    },
  ];

  function calcMins(start: string, end: string): number {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  }

  function fmtMins(mins: number) {
    if (!mins || mins <= 0) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h${m > 0 ? `${m}m` : ''}` : `${m}m`;
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <AlarmClock className="w-6 h-6 text-violet-600" />
            Xin tăng ca
          </h2>
          <p className="text-sm text-slate-500 mt-1">Đăng ký làm thêm giờ và theo dõi trạng thái duyệt</p>
        </div>
        <ButtonBase
          onClick={() => setIsModalOpen(true)}
          className="bg-violet-600/90 backdrop-blur hover:bg-violet-600 text-white shadow-[0_4px_20px_rgba(124,58,237,0.2)] hover:shadow-[0_4px_20px_rgba(124,58,237,0.4)] py-2.5! px-5! flex items-center gap-2 self-start sm:self-auto rounded-2xl transition-all"
        >
          <Plus size={18} />
          Đăng ký tăng ca
        </ButtonBase>
      </div>

      {isLoading ? (
        <div className="p-12 flex justify-center items-center">
          <Spin size="large" />
        </div>
      ) : requests.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-100 shadow-sm">
          Chưa có đơn xin tăng ca nào được tạo.
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-white/40 bg-white/30 hidden md:block">
            <h3 className="font-bold text-slate-700 text-sm">Danh sách đơn đã gửi</h3>
          </div>

          {/* Mobile View */}
          <div className="md:hidden p-4 space-y-4 flex-1 bg-slate-50/30">
            {requests.map((req, index) => (
              <div key={req.id || req._id || index} className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-[0_4px_15px_rgba(0,0,0,0.02)] hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-bl from-violet-50/50 to-transparent rounded-bl-full -z-10 group-hover:scale-125 transition-transform duration-500"></div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="font-extrabold text-slate-800 text-base tracking-tight flex items-center gap-1">
                      <AlarmClock size={16} className="text-violet-600" />
                      Tăng ca
                    </span>
                    <span className="block text-[11px] font-mono text-slate-400 mt-1 tracking-wider uppercase">
                      ID: {(req.id || req._id || '').substring(0, 8)}
                    </span>
                  </div>
                  {req.status === "approved" ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-600 text-xs font-bold border border-emerald-200">Đã duyệt</span>
                  ) : req.status === "pending" ? (
                    <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-600 text-xs font-bold border border-orange-200">Chờ duyệt</span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-600 text-xs font-bold border border-red-200">Từ chối</span>
                  )}
                </div>
                
                 <div className="bg-violet-50/50 rounded-xl p-3 border border-violet-100/50 mb-3 flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="font-mono text-sm font-bold text-violet-700">
                      {req.overtimeStart} → {req.overtimeEnd}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {req.overtimeType && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0 bg-violet-100 text-violet-850 rounded">
                          {req.overtimeType === '1' ? 'TC1' : req.overtimeType === '2' ? 'TC2' : 'TC3'}
                        </span>
                      )}
                      {req.workMode && (
                        <span className={`text-[10px] font-extrabold px-1.5 py-0 rounded border ${
                          req.workMode === 'online'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-250'
                            : 'bg-orange-100 text-orange-850 border-orange-250'
                        }`}>
                          {req.workMode === 'online' ? 'Onl' : 'Off'}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 text-violet-800">
                    {fmtMins(req.plannedMinutes)}
                  </span>
                </div>

                <p className="text-[13px] text-slate-600 mb-4 leading-relaxed line-clamp-2 bg-slate-50/80 rounded-xl p-3 border border-slate-100/80">
                  {req.reason}
                </p>
                
                <div className="flex flex-col gap-2 text-[11px] text-slate-500 font-medium">
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                    <Clock size={14} className="text-violet-500 shrink-0" />
                    <span className="truncate">Ngày: <span className="font-bold text-slate-700">{dayjs(req.date).format("DD/MM/YYYY")}</span></span>
                  </div>
                  <div className="flex justify-between items-center px-1 mt-1">
                    <span>Gửi lúc: <span className="font-mono">{req.requestedAt ? (dayjs(req.requestedAt).isValid() ? dayjs(req.requestedAt).format('DD/MM/YYYY') : new Date(req.requestedAt).toLocaleDateString('vi-VN')) : '---'}</span></span>
                    {req.resolvedBy && <span>Duyệt bởi: <span className="font-bold text-slate-700">{req.resolvedBy}</span></span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block">
            <TableBase
              data={requests}
              rowKey="_id"
              bordered
              columns={columns}
              className="w-full [&_th]:!bg-slate-50/50"
              loading={isLoading}
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
                className="text-sm!"
              />
            </div>
          )}
        </div>
      )}

      {/* Request Modal */}
      <ModalBase
        isOpen={isModalOpen}
        contentBtn={null}
        onCancel={() => setIsModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-violet-600">
            <AlarmClock size={20} /> <span className="text-slate-800">Đăng Ký Làm Thêm Giờ</span>
          </div>
        }
        footer={
          <div className="flex justify-end gap-3 mt-4">
            <ButtonBase
              onClick={() => setIsModalOpen(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700! border border-slate-200"
              disabled={isSubmitting}
            >
              Hủy bỏ
            </ButtonBase>
            <ButtonBase
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-violet-600 hover:bg-violet-700 disabled:opacity-70 text-white!"
            >
              {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </ButtonBase>
          </div>
        }
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ngày tăng ca</label>
            <InputBase
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-sm font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Giờ bắt đầu OT</label>
              <AutoComplete
                options={TIME_OPTIONS}
                value={overtimeStart}
                onChange={(val) => setOvertimeStart(formatTimeInput(val, overtimeStart))}
                className="w-full text-sm font-medium h-10 [&_.ant-select-selector]:!rounded-xl [&_.ant-select-selector]:!border-slate-200"
                placeholder="Ví dụ: 17:30"
                filterOption={(inputValue, option) =>
                  option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                }
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Giờ kết thúc OT</label>
              <AutoComplete
                options={TIME_OPTIONS}
                value={overtimeEnd}
                onChange={(val) => setOvertimeEnd(formatTimeInput(val, overtimeEnd))}
                className="w-full text-sm font-medium h-10 [&_.ant-select-selector]:!rounded-xl [&_.ant-select-selector]:!border-slate-200"
                placeholder="Ví dụ: 19:30"
                filterOption={(inputValue, option) =>
                  option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                }
              />
            </div>
          </div>

          {/* Preview số giờ */}
          {(() => {
            if (!overtimeStart || !overtimeEnd) return null;
            const mins = calcMins(overtimeStart, overtimeEnd);
            if (mins <= 0) return null;
            return (
              <div className="mt-2 p-3 bg-violet-50 border border-violet-100 rounded-xl text-sm text-violet-700 font-semibold flex items-center gap-2">
                <AlarmClock className="w-4 h-4" />
                Tổng thời gian đăng ký: <span className="text-base">{fmtMins(mins)}</span>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Loại tăng ca</label>
              <Select
                value={overtimeType}
                onChange={(val) => setOvertimeType(val)}
                className="w-full text-sm font-medium h-10 [&_.ant-select-selector]:!rounded-xl [&_.ant-select-selector]:!border-slate-200 [&_.ant-select-selector]:!h-10 [&_.ant-select-selection-item]:!leading-[38px]"
                options={[
                  { value: '1', label: 'TC1: Tăng ca ngày thường' },
                  { value: '2', label: 'TC2: Chủ nhật' },
                  { value: '3', label: 'TC3: Ngày lễ, Tết' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Hình thức làm việc</label>
              <div className="h-10 flex items-center bg-slate-50 px-3 rounded-xl border border-slate-100">
                <Radio.Group value={workMode} onChange={(e) => setWorkMode(e.target.value)}>
                  <Radio value="offline">Offline</Radio>
                  <Radio value="online">Online</Radio>
                </Radio.Group>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Lý do tăng ca</label>
            <InputAreaBase
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Chạy deadline dự án X, hoàn thành báo cáo..."
              className="w-full text-sm font-medium resize-none"
            />
          </div>
        </div>
      </ModalBase>
    </div>
  );
}
