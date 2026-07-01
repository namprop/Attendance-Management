"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Clock, Plus, FilePlus } from "lucide-react";
import { Tag, message, Spin, Pagination } from "antd";
import { TableBase, type Column } from "@/app/ui/base/table";
import { ModalBase } from "@/app/ui/base/modal";
import { SelectBase } from "@/app/ui/base/select";
import { InputBase } from "@/app/ui/base/input";
import { InputAreaBase } from "@/app/ui/base/textarea";
import { ButtonBase } from "@/app/ui/base/button";
import { usePortalUser } from "../../portal-context";
import type { LeaveRequest } from "@/app/interface/timekeeping";
import dayjs from "dayjs";

const today = new Date().toISOString().split('T')[0];

export default function PortalRequests() {
  const { employee, employeeCode, displayName } = usePortalUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);

  // Filter states
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Form states
  const [type, setType] = useState<LeaveRequest['type'] | ''>('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [requestedMinutes, setRequestedMinutes] = useState<number | ''>('');
  const [reason, setReason] = useState('');

  const typeOptions = [
    { label: "Nghỉ phép năm", value: "annual" },
    { label: "Nghỉ ốm", value: "sick" },
    { label: "Nghỉ phép", value: "unpaid" },
    { label: "Xin đi muộn", value: "arrive_late" },
    { label: "Xin về sớm", value: "leave_early" },
    // { label: "Tăng ca / OT", value: "overtime" }
  ];

  const fetchRequests = useCallback(async () => {
    const searchId = employeeCode || employee?.employeeCode || employee?.id || "";
    if (!searchId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      let url = `/api/leave-requests?search=${searchId}&page=${page}&pageSize=${pageSize}`;
      if (filterStatus) url += `&status=${filterStatus}`;
      if (filterType) url += `&type=${filterType}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.data) {
        setRequests(Array.isArray(json.data) ? json.data : []);
        setTotal(json.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch requests", error);
    } finally {
      setIsLoading(false);
    }
  }, [employee?.employeeCode, employee?.id, employeeCode, page, pageSize, filterStatus, filterType]);

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

    if (!type || !startDate || !endDate || !reason.trim()) {
      message.warning('Vui lòng chọn loại yêu cầu, điền đầy đủ từ ngày, đến ngày và lý do.');
      return;
    }
    if ((type === 'arrive_late' || type === 'leave_early') && (!requestedMinutes || Number(requestedMinutes) <= 0)) {
      message.warning('Vui lòng nhập số phút xin đi muộn/về sớm.');
      return;
    }
    if (endDate < startDate) {
      message.warning('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const employeeId = employee?.id || employeeCode || '';

      const res = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employeeId,
          employeeCode: employeeCode || employee?.employeeCode || employeeId,
          employeeName: displayName || employee?.name || employee?.fullName || '',
          type,
          startDate,
          endDate,
          requestedMinutes: (type === 'arrive_late' || type === 'leave_early') ? Number(requestedMinutes) : undefined,
          reason,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        message.error(json.message || 'Lỗi lưu đơn nghỉ phép.');
        return;
      }

      message.success('Gửi yêu cầu thành công!');
      setIsModalOpen(false);
      setType('');
      setStartDate(today);
      setEndDate(today);
      setRequestedMinutes('');
      setReason('');
      if (page === 1) {
        fetchRequests();
      } else {
        setPage(1);
      }
    } catch (error) {
      console.error('Failed to submit leave request', error);
      message.error('Lỗi kết nối mạng khi gửi yêu cầu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeText = (t: string) => {
    const found = typeOptions.find(o => o.value === t);
    return found ? found.label : t;
  };

  const columns: Column<LeaveRequest>[] = [
    {
      title: "Loại yêu cầu",
      dataIndex: "type",
      className: "text-left font-semibold text-slate-800",
      render: (val, record) => {
        const typeText = getTypeText(String(val));
        if ((val === 'arrive_late' || val === 'leave_early') && record.requestedMinutes) {
          return `${typeText} (${record.requestedMinutes} phút)`;
        }
        return typeText;
      },
    },
    {
      title: "Từ ngày",
      dataIndex: "startDate",
      className: "text-center justify-center font-mono text-xs",
      render: (val) => {
        const date = typeof val === 'string' ? dayjs(val) : null;
        return date?.isValid() ? date.format('DD/MM/YYYY') : String(val ?? '');
      },
    },
    {
      title: "Đến ngày",
      dataIndex: "endDate",
      className: "text-center justify-center font-mono text-xs",
      render: (val) => {
        const date = typeof val === 'string' ? dayjs(val) : null;
        return date?.isValid() ? date.format('DD/MM/YYYY') : String(val ?? '');
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
        const date = typeof val === 'string' ? dayjs(val) : null;
        return date?.isValid() ? date.format('DD/MM/YYYY HH:mm') : String(val ?? '');
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

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Đơn từ & Yêu cầu</h2>
          <p className="text-sm text-slate-500 mt-1">Tạo và quản lý các yêu cầu nghỉ phép, tăng ca của bạn</p>
        </div>
        <ButtonBase
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600/90 backdrop-blur hover:bg-blue-600 text-white shadow-[0_4px_20px_rgba(37,99,235,0.2)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.4)] py-2.5! px-5! flex items-center gap-2 self-start sm:self-auto rounded-2xl transition-all"
        >
          <Plus size={18} />
          Tạo yêu cầu
        </ButtonBase>
      </div>

      {isLoading ? (
        <div className="p-12 flex justify-center items-center">
          <Spin size="large" />
        </div>
      ) : requests.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-100 shadow-sm">
          Chưa có đơn từ nào được tạo.
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/40 bg-white/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="font-bold text-slate-700 text-sm hidden md:block">Danh sách đơn từ đã gửi</h3>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <SelectBase
                value={filterType}
                onChange={setFilterType}
                options={[
                  { label: "Tất cả loại", value: "" },
                  ...typeOptions
                ]}
                className="w-full md:w-40 h-9! text-xs font-medium"
              />
              <SelectBase
                value={filterStatus}
                onChange={setFilterStatus}
                options={[
                  { label: "Tất cả trạng thái", value: "" },
                  { label: "Đã duyệt", value: "approved" },
                  { label: "Chờ duyệt", value: "pending" },
                  { label: "Từ chối", value: "rejected" }
                ]}
                className="w-full md:w-40 h-9! text-xs font-medium"
              />
            </div>
          </div>

          {/* Mobile View */}
          <div className="md:hidden p-4 space-y-4 flex-1 bg-slate-50/30">
            {requests.map((req, index) => (
              <div key={req.id || req._id || index} className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-[0_4px_15px_rgba(0,0,0,0.02)] hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-blrom-blue-50/50 to-transparent rounded-bl-full -z-10 group-hover:scale-125 transition-transform duration-500"></div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="font-extrabold text-slate-800 text-base tracking-tight">
                      {getTypeText(req.type)}
                      {(req.type === 'arrive_late' || req.type === 'leave_early') && req.requestedMinutes && ` (${req.requestedMinutes} phút)`}
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
                
                <p className="text-[13px] text-slate-600 mb-4 leading-relaxed line-clamp-2 bg-slate-50/80 rounded-xl p-3 border border-slate-100/80">
                  {req.reason}
                </p>
                
                <div className="flex flex-col gap-2 text-[11px] text-slate-500 font-medium">
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                    <Clock size={14} className="text-blue-500 shrink-0" />
                    <span className="truncate">Thời gian: <span className="font-bold text-slate-700">{req.startDate === req.endDate ? dayjs(req.startDate).format("DD/MM/YYYY") : `${dayjs(req.startDate).format("DD/MM")} đến ${dayjs(req.endDate).format("DD/MM/YYYY")}`}</span></span>
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
              rowKey="id"
              bordered
              columns={columns}
              className="w-full"
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
          <div className="flex items-center gap-2 text-blue-600">
            <FilePlus size={20} /> <span className="text-slate-800">Tạo Yêu Cầu Mới</span>
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
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white!"
            >
              {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </ButtonBase>
          </div>
        }
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Loại yêu cầu</label>
            <SelectBase
              options={typeOptions}
              value={type}
              onChange={(value) => setType(value as LeaveRequest['type'])}
              placeholder="Chọn loại yêu cầu"
              className="h-10! text-sm font-medium w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Từ ngày</label>
              <InputBase
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-sm font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Đến ngày</label>
              <InputBase
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-sm font-medium"
              />
            </div>
          </div>

          {(type === 'arrive_late' || type === 'leave_early') && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                {type === 'arrive_late' ? 'Số phút xin đi muộn' : 'Số phút xin về sớm'}
              </label>
              <InputBase
                type="number"
                min={1}
                value={requestedMinutes}
                onChange={(e) => setRequestedMinutes(e.target.value ? Number(e.target.value) : '')}
                placeholder="Ví dụ: 30"
                className="w-full text-sm font-medium"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Lý do chi tiết</label>
            <InputAreaBase
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do chi tiết để Quản lý duyệt..."
              className="w-full text-sm font-medium resize-none"
            />
          </div>
        </div>
      </ModalBase>
    </div>
  );
}
