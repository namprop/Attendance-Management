'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { TitleBase } from '@/app/ui/base/tittle';
import { TableBase, type Column } from '@/app/ui/base/table';
import { InputBase } from '@/app/ui/base/input';
import { Box } from '@/app/ui/base/box';
import { History, Search, Pencil, Trash2 } from 'lucide-react';
import { message, DatePicker, Modal, Popconfirm } from 'antd';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

interface AttendanceSummaryOverrideLog {
  _id: string;
  overrideId?: string;
  employeeCode: string;
  employeeName?: string;
  departmentName?: string;
  date: string;
  periodFrom?: string;
  periodTo?: string;
  field: string;
  oldValue: number | string;
  newValue: number | string;
  originalValue: number | string;
  reason?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export default function AttendanceLogsPage() {
  const [logs, setLogs] = useState<AttendanceSummaryOverrideLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [editingLog, setEditingLog] = useState<AttendanceSummaryOverrideLog | null>(null);
  const [editReason, setEditReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());
      if (search) params.set('search', search);
      if (dateRange && dateRange[0]) params.set('periodFrom', dateRange[0].format('YYYY-MM-DD'));
      if (dateRange && dateRange[1]) params.set('periodTo', dateRange[1].format('YYYY-MM-DD'));
      
      const response = await fetch(`/api/attendance-summary-overrides/logs?${params.toString()}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'Lỗi lấy dữ liệu');
      setLogs(json.data || []);
      setTotal(json.total || 0);
    } catch (error: any) {
      message.error(error.message || 'Lỗi lấy dữ liệu');
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchLogs();
    }, 500);
    
    return () => clearTimeout(handler);
  }, [search, dateRange, page, pageSize]);

  const handleDelete = async (id: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/attendance-summary-overrides/logs/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      message.success('Đã xóa lịch sử');
      fetchLogs();
    } catch (error: any) {
      message.error(error.message || 'Lỗi xóa lịch sử');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingLog) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/attendance-summary-overrides/logs/${editingLog._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: editReason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      message.success('Đã cập nhật lý do');
      setEditingLog(null);
      fetchLogs();
    } catch (error: any) {
      message.error(error.message || 'Lỗi cập nhật');
    } finally {
      setIsUpdating(false);
    }
  };

  const columns: Column<AttendanceSummaryOverrideLog>[] = useMemo(() => [
    {
      title: 'Thời gian sửa',
      dataIndex: 'updatedAt',
      width: 140,
      render: (val) => val ? new Date(val as string).toLocaleString('vi-VN') : '',
    },
    { title: 'Người sửa', dataIndex: 'updatedBy', width: 120 },
    {
      title: 'Mã nhân viên',
      dataIndex: 'employeeCode',
      width: 120,
      render: (val) => <span className="font-medium text-slate-600">{val}</span>,
    },
    {
      title: 'Tên nhân viên',
      dataIndex: 'employeeName',
      width: 160,
      render: (val) => <span className="font-semibold">{val}</span>,
    },
    { title: 'Phòng ban', dataIndex: 'departmentName', width: 140 },
    {
      title: 'Ngày chấm công',
      dataIndex: 'date',
      width: 120,
      render: (val) => String(val || '').split('-').reverse().join('/'),
    },
    {
      title: 'Trường',
      dataIndex: 'field',
      width: 100,
      render: (val) => {
        switch (val) {
          case 'work': return <span className="font-medium text-emerald-600">Công</span>;
          case 'online': return <span className="font-medium text-blue-600">Online</span>;
          case 'overtime': return <span className="font-medium text-amber-600">Tăng ca</span>;
          case 'note': return <span className="font-medium text-slate-600">Ghi chú</span>;
          default: return String(val || '');
        }
      },
    },
    {
      title: 'Thay đổi',
      dataIndex: 'newValue',
      width: 150,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <span className="text-slate-500 line-through">{String(record.oldValue || '0')}</span>
          <span className="text-slate-400">➔</span>
          <span className="font-bold text-slate-800">{String(record.newValue || '0')}</span>
        </div>
      ),
    },
    { title: 'Lý do', dataIndex: 'reason', width: 200 },
    {
      title: 'Thao tác',
      className: 'text-center justify-center',
      width: 80,
      render: (_, record) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            className="p-1 text-blue-500 hover:bg-blue-50 rounded hover:text-blue-600 transition-colors disabled:opacity-50"
            title="Sửa lý do"
            disabled={isUpdating}
            onClick={() => {
              setEditingLog(record);
              setEditReason(record.reason || '');
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <Popconfirm
            title="Xóa lịch sử"
            description="Bạn có chắc chắn muốn xóa dòng log này?"
            onConfirm={() => handleDelete(record._id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <button
              type="button"
              className="p-1 text-red-500 hover:bg-red-50 rounded hover:text-red-600 transition-colors disabled:opacity-50"
              title="Xóa"
              disabled={isUpdating}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </Popconfirm>
        </div>
      ),
    },
  ], [isUpdating]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-2">
        <div>
          <h2 className="m-0 text-lg font-bold text-slate-800">Lịch sử chỉnh sửa chấm công</h2>
          <p className="mt-1 text-xs text-slate-400">
            Xem lại lịch sử các lần sửa tay trong bảng công tổng hợp.
          </p>
        </div>
        <div className="relative w-full lg:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <InputBase
            placeholder="Tìm nhân viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9! h-9 w-full rounded-lg border-slate-200 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500/20 shadow-sm transition-all"
          />
        </div>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
        <div className="mb-4 flex flex-col xl:flex-row xl:items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-6">
            <div className="w-56">
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates as any)}
                presets={[
                  { label: 'Hôm nay', value: [dayjs().startOf('day'), dayjs().endOf('day')] },
                  { label: 'Hôm qua', value: [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')] },
                  { label: 'Tuần này', value: [dayjs().startOf('week'), dayjs().endOf('week')] },
                  { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
                  { label: 'Tháng trước', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
                ]}
                format="DD/MM/YYYY"
                placeholder={['Từ ngày', 'Đến ngày']}
                className="w-full h-8 rounded-lg border-slate-200 hover:border-emerald-500 focus:border-emerald-500 text-xs"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-semibold border border-blue-100">
              Tổng cộng: {logs.length} lượt sửa
            </div>
          </div>
        </div>

        <TableBase<AttendanceSummaryOverrideLog>
          rowKey="_id"
          loading={isLoading}
          columns={columns}
          data={logs}
          bordered
          isSTT={false}
          className="whitespace-nowrap [&_th]:!px-2 [&_th]:!py-1.5 [&_td]:!px-2 [&_td]:!py-1.5"
          classNameHead="!bg-slate-100 !text-slate-700 text-xs sticky top-0 z-10 shadow-sm"
          classNameBody="text-xs [&_tr]:!border-b-slate-100 [&_td]:!py-2"
          showHorizontalScroll
          pagination={{
            current: page,
            pageSize,
            total,
            onPageChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
        />
      </section>

      {/* Edit Modal */}
      <Modal
        title="Sửa lý do chỉnh sửa công"
        open={!!editingLog}
        onOk={handleEditSave}
        onCancel={() => setEditingLog(null)}
        confirmLoading={isUpdating}
        okText="Lưu thay đổi"
        cancelText="Hủy"
      >
        <div className="pt-4 pb-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Lý do mới</label>
          <InputBase
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            placeholder="Nhập lý do..."
            className="w-full h-10 border-slate-200 rounded-lg text-sm px-3 focus:border-emerald-500 focus:ring-emerald-500/20 shadow-sm transition-all"
          />
        </div>
      </Modal>
    </div>
  );
}
