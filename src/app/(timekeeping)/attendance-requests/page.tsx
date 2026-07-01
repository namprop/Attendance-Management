'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Tag, message, Modal, Popconfirm, Drawer } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { CalendarDays, Check, RefreshCw, Search, X, Pencil, Trash2, Filter } from 'lucide-react';
import type {
  AttendanceRequest,
  AttendanceRequestStatus,
  AttendanceRequestType,
} from '@/app/interface/timekeeping';
import { InputBase } from '@/app/ui/base/input';
import { SelectBase } from '@/app/ui/base/select';
import { ButtonBase } from '@/app/ui/base/button';
import { TableBase, type Column } from '@/app/ui/base/table';
import { DateRangePicker } from '@/app/ui/base/date-range-picker';

interface AttendanceRequestsApiResponse {
  data?: AttendanceRequest[] | AttendanceRequest;
  message?: string;
  total?: number;
  pendingCount?: number;
  approvedCount?: number;
  rejectedCount?: number;
  page?: number;
  pageSize?: number;
}

type RequestStatusFilter = AttendanceRequestStatus | '';
type RequestTypeFilter = AttendanceRequestType | '';

const REQUEST_TYPE_MAP: Record<AttendanceRequestType, { label: string; color: string }> = {
  forgot_checkin: { label: 'Quên chấm công', color: 'orange' },
  forgot_checkout: { label: 'Quên kết công', color: 'volcano' },
  online_checkin: { label: 'Chấm công online', color: 'blue' },
  time_adjustment: { label: 'Điều chỉnh giờ', color: 'purple' },
};

const STATUS_MAP: Record<AttendanceRequestStatus, { label: string; color: string }> = {
  Pending: { label: 'Chờ xử lý', color: 'gold' },
  Approved: { label: 'Đã duyệt', color: 'success' },
  Rejected: { label: 'Từ chối', color: 'error' },
  Expired: { label: 'Quá hạn', color: 'default' },
};

const formatDate = (value: string) => {
  if (!value) return '---';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};

const formatTime = (value?: string | null) => {
  if (!value) return '---';
  return value.slice(0, 5);
};

export default function AttendanceRequestsPage() {
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isMobileFilterVisible, setIsMobileFilterVisible] = useState(false);
  const [detailRecord, setDetailRecord] = useState<AttendanceRequest | null>(null);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);

  const [editingRequest, setEditingRequest] = useState<AttendanceRequest | null>(null);
  const [editForm, setEditForm] = useState({
    requestType: 'time_adjustment' as AttendanceRequestType,
    currentCheckIn: '',
    currentCheckOut: '',
    adminNote: '',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [globalCounts, setGlobalCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [search, setSearch] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatusFilter>('');
  const [typeFilter, setTypeFilter] = useState<RequestTypeFilter>('');
  const startDate = dateRange ? dateRange[0].format('YYYY-MM-DD') : undefined;
  const endDate = dateRange ? dateRange[1].format('YYYY-MM-DD') : undefined;

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (search.trim()) params.set('search', search.trim());
    if (statusFilter) params.set('status', statusFilter);
    if (typeFilter) params.set('requestType', typeFilter);
    return params.toString();
  }, [endDate, page, pageSize, search, startDate, statusFilter, typeFilter]);

  const fetchRequests = useCallback(async () => {
    setIsFetching(true);
    try {
      const response = await fetch(`/api/attendance-requests?${queryString}`);
      const json = await response.json() as AttendanceRequestsApiResponse;
      const nextRequests = Array.isArray(json.data) ? json.data : [];

      setRequests(nextRequests);
      setTotal(json.total ?? nextRequests.length);
      setGlobalCounts({
        pending: json.pendingCount || 0,
        approved: json.approvedCount || 0,
        rejected: json.rejectedCount || 0,
      });
    } catch (error) {
      console.error('Failed to fetch attendance requests', error);
      message.error('Không lấy được danh sách yêu cầu xử lý công.');
    } finally {
      setIsFetching(false);
    }
  }, [queryString]);

  const syncSelectedRange = useCallback(async (showToast = false) => {
    if (!startDate || !endDate) {
      message.warning('Vui lòng chọn khoảng ngày để quét lại lỗi chấm công.');
      return;
    }
    setIsSyncing(true);
    try {
      const response = await fetch('/api/time-records-timekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list',
          page: 1,
          pageSize: 5,
          startDate,
          endDate,
          detailStartDate: startDate,
          detailEndDate: endDate,
        }),
      });

      if (!response.ok) {
        message.error('Không đồng bộ được lỗi chấm công.');
        return;
      }

      if (showToast) message.success('Đã quét lại lỗi chấm công theo khoảng ngày đã chọn.');
      await fetchRequests();
    } catch (error) {
      console.error('Failed to sync attendance requests', error);
      message.error('Lỗi kết nối khi đồng bộ yêu cầu xử lý công.');
    } finally {
      setIsSyncing(false);
    }
  }, [endDate, fetchRequests, startDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchRequests();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchRequests]);

  const handleSearchInput = useCallback((value: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      setSearch(value);
    }, 400);
  }, []);

  const handleResolve = async (id: string, status: Extract<AttendanceRequestStatus, 'Approved' | 'Rejected'>) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/attendance-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolvedBy: 'admin' }),
      });
      const json = await response.json() as AttendanceRequestsApiResponse;

      if (!response.ok || !json.data || Array.isArray(json.data)) {
        message.error(json.message || 'Không cập nhật được yêu cầu xử lý công.');
        return;
      }

      await fetchRequests();
      message.success(status === 'Approved' ? 'Đã duyệt yêu cầu xử lý công.' : 'Đã từ chối yêu cầu xử lý công.');
    } catch (error) {
      console.error('Failed to update attendance request', error);
      message.error('Lỗi kết nối khi cập nhật yêu cầu xử lý công.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/attendance-requests/${id}`, {
        method: 'DELETE',
      });
      const json = await response.json() as AttendanceRequestsApiResponse;

      if (!response.ok) {
        message.error(json.message || 'Không xóa được yêu cầu xử lý công.');
        return;
      }

      await fetchRequests();
      message.success('Đã xóa yêu cầu xử lý công.');
    } catch (error) {
      console.error('Failed to delete attendance request', error);
      message.error('Lỗi kết nối khi xóa yêu cầu xử lý công.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleEditSave = async () => {
    if (!editingRequest) return;
    setUpdatingId(editingRequest.id);
    try {
      const response = await fetch(`/api/attendance-requests/${editingRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editingRequest.status,
          requestType: editForm.requestType,
          currentCheckIn: editForm.currentCheckIn || null,
          currentCheckOut: editForm.currentCheckOut || null,
          adminNote: editForm.adminNote,
          resolvedBy: 'admin',
        }),
      });
      const json = await response.json() as AttendanceRequestsApiResponse;
      if (!response.ok) {
        message.error(json.message || 'Lỗi cập nhật yêu cầu.');
        return;
      }
      message.success('Đã cập nhật yêu cầu thành công.');
      setEditingRequest(null);
      await fetchRequests();
    } catch (error) {
      console.error('Failed to update request', error);
      message.error('Lỗi kết nối khi cập nhật.');
    } finally {
      setUpdatingId(null);
    }
  };

  const { pending: pendingCount, approved: approvedCount, rejected: rejectedCount } = globalCounts;

  const columns: Column<AttendanceRequest>[] = [
    {
      title: 'STT',
      className: 'text-center justify-center font-semibold text-slate-500',
      width: 60,
      render: (_, __, index) => <div className="text-center text-[11px]">{(page - 1) * pageSize + index + 1}</div>,
    },
    {
      title: 'Nhân viên',
      dataIndex: 'employeeName',
      width: 220,
      render: (_, record) => (
        <div>
          <div className="text-xs font-bold text-slate-800">{record.employeeName || record.employeeCode || record.employeeId}</div>
          <div className="font-mono text-[10px] font-semibold uppercase text-slate-400 mt-0.5">{record.employeeCode || record.employeeId}</div>
        </div>
      ),
    },
    {
      title: 'Ngày',
      dataIndex: 'date',
      className: 'text-center justify-center',
      width: 110,
      render: (value) => <div className="text-center font-mono text-[11px] font-semibold text-slate-600">{formatDate(String(value || ''))}</div>,
    },
    {
      title: 'Ca',
      dataIndex: 'shiftName',
      className: 'text-center justify-center',
      width: 120,
      render: (value) => <div className="text-center text-[11px] font-medium text-slate-600">{String(value || 'Chưa có ca')}</div>,
    },
    {
      title: 'Loại lỗi',
      dataIndex: 'requestType',
      className: 'text-center justify-center',
      width: 150,
      render: (value) => {
        const requestType = value as AttendanceRequestType;
        const config = REQUEST_TYPE_MAP[requestType] || REQUEST_TYPE_MAP.time_adjustment;
        return <div className="text-center"><Tag color={config.color}>{config.label}</Tag></div>;
      },
    },
    {
      title: 'Giờ hiện tại',
      dataIndex: 'currentCheckIn',
      className: 'text-center justify-center',
      width: 140,
      render: (_, record) => (
        <div className="flex flex-col gap-0 font-mono !text-[11px] text-slate-600 items-center">
          <div className="flex items-center justify-between w-20">
            <span className="text-slate-400">Vào</span>
            <span className="font-semibold text-slate-700">{formatTime(record.currentCheckIn) || '---'}</span>
          </div>
          <div className="flex items-center justify-between w-20">
            <span className="text-slate-400">Ra</span>
            <span className="font-semibold text-slate-700">{formatTime(record.currentCheckOut) || '---'}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      className: 'text-center justify-center',
      width: 120,
      render: (value) => {
        const status = value as AttendanceRequestStatus;
        const config = STATUS_MAP[status] || STATUS_MAP.Pending;
        return <div className="text-center"><Tag color={config.color}>{config.label}</Tag></div>;
      },
    },
    {
      title: 'Xử lý',
      dataIndex: 'status',
      className: 'text-center justify-center',
      width: 180,
      render: (_, record) => {
        if (record.status !== 'Pending') {
          return <div className="flex justify-center"><span className="text-[11px] font-semibold text-slate-400 italic">Đã xử lý</span></div>;
        }

        return (
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              title="Duyệt"
              disabled={updatingId === record.id}
              onClick={() => void handleResolve(record.id, 'Approved')}
              className={`inline-flex items-center justify-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 transition-all hover:bg-emerald-100 hover:text-emerald-700 ${updatingId === record.id ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
              Duyệt
            </button>
            <button
              type="button"
              title="Từ chối"
              disabled={updatingId === record.id}
              onClick={() => void handleResolve(record.id, 'Rejected')}
              className={`inline-flex items-center justify-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 transition-all hover:bg-rose-100 hover:text-rose-700 ${updatingId === record.id ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <X className="h-2.5 w-2.5" strokeWidth={3} />
              Từ chối
            </button>
          </div>
        );
      },
    },
    {
      title: 'Thao tác',
      className: 'text-center justify-center',
      width: 80,
      render: (_, record) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            className="p-1 text-blue-500 hover:bg-blue-50 rounded hover:text-blue-600 transition-colors disabled:opacity-50"
            title="Sửa"
            disabled={updatingId === record.id}
            onClick={() => {
              setEditingRequest(record);
              setEditForm({
                requestType: record.requestType,
                currentCheckIn: record.currentCheckIn || '',
                currentCheckOut: record.currentCheckOut || '',
                adminNote: record.adminNote || '',
              });
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <Popconfirm
            title="Xóa yêu cầu"
            description="Bạn có chắc chắn muốn xóa bản ghi này không?"
            onConfirm={() => void handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <button
              type="button"
              className="p-1 text-red-500 hover:bg-red-50 rounded hover:text-red-600 transition-colors disabled:opacity-50"
              title="Xóa"
              disabled={updatingId === record.id}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-2">
        <div>
          <h2 className="m-0 text-lg font-bold text-slate-800">Yêu cầu xử lý công</h2>
          <p className="mt-1 text-xs text-slate-400">
            Tự bắt quên chấm công và quên kết công sau giờ chốt.
          </p>
        </div>
        <div className="relative w-full lg:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <InputBase
            placeholder="Tìm nhân viên..."
            value={localSearch}
            onChange={(event) => {
              setLocalSearch(event.target.value);
              handleSearchInput(event.target.value);
            }}
            className="pl-9! h-9 w-full rounded-lg border-slate-200 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500/20 shadow-sm transition-all"
          />
        </div>
      </div>

      <section className="bg-white py-4 px-0 sm:p-5 rounded-none sm:rounded-2xl border border-slate-100 shadow-xs -mx-4 sm:mx-0">
        <div className="px-4 sm:px-0 mb-4 flex flex-col xl:flex-row xl:items-center gap-3 justify-between">
          {/* Left side: Filters and Search */}
          <div className="w-full xl:w-auto">
            {/* Desktop Filters */}
            <div className="hidden sm:flex flex-wrap items-center gap-6">
              <div className="w-56">
                <DateRangePicker
                  value={dateRange || undefined}
                  onRangeChanges={(dates) => {
                    if (dates) {
                      setDateRange([dates[0].startOf('day'), dates[1].endOf('day')]);
                    } else {
                      setDateRange(null);
                    }
                    setPage(1);
                  }}
                  className="w-full h-8 rounded-lg border-slate-200 hover:border-emerald-500 focus:border-emerald-500 text-xs"
                />
              </div>

              <div className="w-32">
                <SelectBase
                  value={statusFilter || null}
                  placeholder="Lọc trạng thái"
                  allowClear
                  isSort={false}
                  options={[
                    { label: 'Chờ xử lý', value: 'Pending' },
                    { label: 'Đã duyệt', value: 'Approved' },
                    { label: 'Từ chối', value: 'Rejected' },
                    { label: 'Quá hạn', value: 'Expired' },
                  ]}
                  onChange={(value) => {
                    setPage(1);
                    setStatusFilter((value as RequestStatusFilter) || '');
                  }}
                  className="h-8 text-xs"
                />
              </div>

              <div className="w-36">
                <SelectBase
                  value={typeFilter || null}
                  placeholder="Lọc loại lỗi"
                  allowClear
                  isSort={false}
                  options={[
                    { label: 'Quên chấm công', value: 'forgot_checkin' },
                    { label: 'Quên kết công', value: 'forgot_checkout' },
                  ]}
                  onChange={(value) => {
                    setPage(1);
                    setTypeFilter((value as RequestTypeFilter) || '');
                  }}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Mobile Filters */}
            <div className="flex flex-col sm:hidden gap-3 w-full mt-2">
              <DateRangePicker
                value={dateRange || undefined}
                onRangeChanges={(dates) => {
                  if (dates) {
                    setDateRange([dates[0].startOf('day'), dates[1].endOf('day')]);
                  } else {
                    setDateRange(null);
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
                Lọc dữ liệu {(statusFilter || typeFilter) ? '(Đang bật)' : ''}
              </Button>
            </div>
          </div>

          {/* Right side: Stats */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 text-[10px] font-semibold border border-amber-100">
              Chờ xử lý {pendingCount}
            </div>
            <div className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-semibold border border-emerald-100">
              Đã duyệt {approvedCount}
            </div>
            <div className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 text-[10px] font-semibold border border-rose-100">
              Từ chối {rejectedCount}
            </div>
          </div>
        </div>

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
            (statusFilter || typeFilter) && (
              <Button type="text" danger onClick={() => { setStatusFilter(''); setTypeFilter(''); setPage(1); }} className="text-xs font-bold px-2">
                Đặt lại
              </Button>
            )
          }
        >
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái:</span>
              <div className="w-full">
                <SelectBase
                  value={statusFilter || null}
                  placeholder="Tất cả trạng thái"
                  allowClear
                  isSort={false}
                  options={[
                    { label: 'Chờ xử lý', value: 'Pending' },
                    { label: 'Đã duyệt', value: 'Approved' },
                    { label: 'Từ chối', value: 'Rejected' },
                    { label: 'Quá hạn', value: 'Expired' },
                  ]}
                  onChange={(value) => {
                    setPage(1);
                    setStatusFilter((value as RequestStatusFilter) || '');
                  }}
                  className="!h-auto min-h-10 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Loại lỗi:</span>
              <div className="w-full">
                <SelectBase
                  value={typeFilter || null}
                  placeholder="Tất cả loại lỗi"
                  allowClear
                  isSort={false}
                  options={[
                    { label: 'Quên chấm công', value: 'forgot_checkin' },
                    { label: 'Quên kết công', value: 'forgot_checkout' },
                  ]}
                  onChange={(value) => {
                    setPage(1);
                    setTypeFilter((value as RequestTypeFilter) || '');
                  }}
                  className="!h-auto min-h-10 text-sm"
                />
              </div>
            </div>
            
            <Button type="primary" className="mt-2 w-full h-10 rounded-xl font-bold" onClick={() => setIsMobileFilterVisible(false)}>
              Áp dụng
            </Button>
          </div>
        </Drawer>

        <TableBase<AttendanceRequest>
          rowKey="id"
          onRow={(record) => ({
            onClick: () => {
              if (window.innerWidth < 768) {
                setDetailRecord(record);
                setIsDetailDrawerVisible(true);
              }
            },
          })}
          loading={isFetching || isSyncing}
          columns={columns}
          data={requests}
          bordered
          isSTT={false}
          className="whitespace-nowrap [&_th]:!px-2 [&_th]:!py-1.5 [&_td]:!px-2 [&_td]:!py-1.5"
          pagination={{
            current: page,
            pageSize,
            total,
            onPageChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
          classNameRow={(record) => {
            let baseClass = 'cursor-pointer md:cursor-default ';
            if (record.status === 'Pending') baseClass += 'bg-amber-50/35';
            else if (record.status === 'Approved') baseClass += 'bg-emerald-50/30';
            else if (record.status === 'Rejected') baseClass += 'bg-rose-50/25';
            return baseClass;
          }}
          showHorizontalScroll
        />
      </section>

      {/* Mobile Detail Bottom Sheet */}
      <Drawer
        title="Chi tiết yêu cầu"
        placement="bottom"
        height="auto"
        onClose={() => setIsDetailDrawerVisible(false)}
        open={isDetailDrawerVisible}
        className="rounded-t-2xl [&_.ant-drawer-header]:border-b-0 [&_.ant-drawer-body]:pt-0 sm:hidden"
      >
        {detailRecord && (() => {
          const requestTypeConfig = REQUEST_TYPE_MAP[detailRecord.requestType as AttendanceRequestType] || REQUEST_TYPE_MAP.time_adjustment;
          const statusConfig = STATUS_MAP[detailRecord.status as AttendanceRequestStatus] || STATUS_MAP.Pending;
          return (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-xs border border-emerald-100">
                  {detailRecord.employeeName?.charAt(0) || 'NV'}
                </div>
                <div>
                  <div className="font-bold text-slate-800">{detailRecord.employeeName || detailRecord.employeeCode || detailRecord.employeeId}</div>
                  <div className="text-[11px] text-slate-400 font-mono uppercase font-semibold mt-0.5">{detailRecord.employeeCode || detailRecord.employeeId}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ngày</span>
                  <span className="font-bold text-slate-700">{formatDate(String(detailRecord.date || ''))}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ca làm</span>
                  <span className="font-bold text-slate-700">{detailRecord.shiftName || '---'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Loại lỗi</span>
                  <div><Tag color={requestTypeConfig.color} className="m-0 font-bold border-0 px-2 py-0.5 shadow-xs">{requestTypeConfig.label}</Tag></div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Trạng thái</span>
                  <div><Tag color={statusConfig.color} className="m-0 font-bold border-0 px-2 py-0.5 shadow-xs">{statusConfig.label}</Tag></div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Giờ vào hiện tại</span>
                  <span className="font-bold text-emerald-600 font-mono text-base">{formatTime(detailRecord.currentCheckIn)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Giờ ra hiện tại</span>
                  <span className="font-bold text-rose-600 font-mono text-base">{formatTime(detailRecord.currentCheckOut)}</span>
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-2 pt-4 border-t border-slate-100">
                {detailRecord.status === 'Pending' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      type="primary" 
                      className="bg-emerald-500 hover:bg-emerald-600 font-bold h-11 rounded-xl shadow-sm"
                      icon={<Check className="w-4 h-4" strokeWidth={3} />}
                      onClick={() => {
                        setIsDetailDrawerVisible(false);
                        handleResolve(detailRecord.id, 'Approved');
                      }}
                    >
                      Duyệt
                    </Button>
                    <Button 
                      danger 
                      className="font-bold h-11 rounded-xl bg-rose-50 border-rose-200"
                      icon={<X className="w-4 h-4" strokeWidth={3} />}
                      onClick={() => {
                        setIsDetailDrawerVisible(false);
                        handleResolve(detailRecord.id, 'Rejected');
                      }}
                    >
                      Từ chối
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 text-xs italic font-semibold py-1 bg-slate-50 rounded-lg border border-slate-100">
                    Yêu cầu đã được xử lý
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mt-1">
                  <Button
                    className="font-bold h-11 rounded-xl border-slate-200 text-slate-600 shadow-xs"
                    icon={<Pencil className="w-4 h-4" />}
                    onClick={() => {
                      setIsDetailDrawerVisible(false);
                      setEditingRequest(detailRecord);
                      setEditForm({
                        requestType: detailRecord.requestType,
                        currentCheckIn: detailRecord.currentCheckIn || '',
                        currentCheckOut: detailRecord.currentCheckOut || '',
                        adminNote: detailRecord.adminNote || '',
                      });
                    }}
                  >
                    Sửa thông tin
                  </Button>
                  <Button
                    type="text"
                    danger
                    className="font-bold h-11 rounded-xl hover:bg-rose-50"
                    icon={<Trash2 className="w-4 h-4" />}
                    onClick={() => {
                      setIsDetailDrawerVisible(false);
                      Modal.confirm({
                        title: 'Xóa yêu cầu',
                        content: 'Bạn có chắc chắn muốn xóa bản ghi này không?',
                        okText: 'Xóa',
                        cancelText: 'Hủy',
                        okButtonProps: { danger: true },
                        onOk: () => handleDelete(detailRecord.id),
                      });
                    }}
                  >
                    Xóa
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
      </Drawer>

      {/* Edit Modal */}
      <Modal
        title="Sửa yêu cầu xử lý công"
        open={!!editingRequest}
        onOk={handleEditSave}
        onCancel={() => setEditingRequest(null)}
        confirmLoading={updatingId === editingRequest?.id}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        width={500}
      >
        <div className="space-y-4 pt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Loại lỗi</label>
            <SelectBase
              value={editForm.requestType}
              onChange={(value) => setEditForm(prev => ({ ...prev, requestType: value as AttendanceRequestType }))}
              options={[
                { label: 'Quên chấm công', value: 'forgot_checkin' },
                { label: 'Quên kết công', value: 'forgot_checkout' },
                // { label: 'Chấm công online', value: 'online_checkin' },
                // { label: 'Điều chỉnh giờ', value: 'time_adjustment' },
              ]}
              isSort={false}
              className="w-full h-10"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Giờ vào (HH:mm)</label>
              <InputBase
                value={editForm.currentCheckIn}
                onChange={(e) => setEditForm(prev => ({ ...prev, currentCheckIn: e.target.value }))}
                placeholder="VD: 08:00"
                className="w-full h-10 border-slate-200 rounded-lg text-sm px-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Giờ ra (HH:mm)</label>
              <InputBase
                value={editForm.currentCheckOut}
                onChange={(e) => setEditForm(prev => ({ ...prev, currentCheckOut: e.target.value }))}
                placeholder="VD: 17:30"
                className="w-full h-10 border-slate-200 rounded-lg text-sm px-3"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú của Admin</label>
            <InputBase
              value={editForm.adminNote}
              onChange={(e) => setEditForm(prev => ({ ...prev, adminNote: e.target.value }))}
              placeholder="Nhập ghi chú hoặc lý do sửa..."
              className="w-full h-10 border-slate-200 rounded-lg text-sm px-3"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
