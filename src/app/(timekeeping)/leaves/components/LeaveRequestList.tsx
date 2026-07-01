'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Tag, Drawer } from 'antd';
import dayjs from 'dayjs';
import { Check, X, Search, ChevronsRight, Filter } from 'lucide-react';
import type { Dayjs } from 'dayjs';
import type { Employee, LeaveRequest } from '@/app/interface/timekeeping';
import { TableBase, type Column } from '@/app/ui/base/table';
import { InputBase } from '@/app/ui/base/input';
import { SelectBase } from '@/app/ui/base/select';
import { DateRangePicker } from '@/app/ui/base/date-range-picker';
interface LeaveRequestListProps {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  loading?: boolean;
  onResolve: (id: string, status: 'approved' | 'rejected') => void;
  // Server-side pagination
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  // Server-side search/filter
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  dateRange: [Dayjs, Dayjs] | null;
  onDateRangeChange: (range: [Dayjs, Dayjs] | null) => void;
  onEdit?: (record: LeaveRequest) => void;
  onDelete?: (id: string) => void;
}

type LeaveRequestRow = LeaveRequest & {
  employeeName?: string;
  employeeCode?: string;
};

const LEAVE_TYPE_MAP: Record<LeaveRequest['type'], string> = {
  annual: 'Phép năm',
  sick: 'Nghỉ ốm',
  overtime: 'Tăng ca',
  personal: 'Việc riêng',
  unpaid: 'Không lương',
  arrive_late: 'Đi muộn',
  leave_early: 'Về sớm',
};

const LEAVE_COLOR_MAP: Record<LeaveRequest['type'], string> = {
  annual: 'blue',
  sick: 'red',
  overtime: 'cyan',
  personal: 'orange',
  unpaid: 'default',
  arrive_late: 'purple',
  leave_early: 'magenta',
};

const STATUS_MAP: Record<LeaveRequest['status'], { label: string; color: string }> = {
  pending: { label: 'Chờ duyệt', color: 'gold' },
  approved: { label: 'Đã duyệt', color: 'success' },
  rejected: { label: 'Từ chối', color: 'error' },
};

const getEmployeeValue = (employee: Employee) => employee.employeeCode || employee.id || employee._id || '';

export default function LeaveRequestList({
  employees,
  leaveRequests,
  loading,
  onResolve,
  total,
  page,
  pageSize,
  onPageChange,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  dateRange,
  onDateRangeChange,
  onEdit,
  onDelete,
}: LeaveRequestListProps) {
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localSearch, setLocalSearch] = useState(search);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileFilterVisible, setIsMobileFilterVisible] = useState(false);
  const [detailRecord, setDetailRecord] = useState<LeaveRequestRow | null>(null);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSearchInput = useCallback(
    (value: string) => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        onSearchChange(value);
      }, 400);
    },
    [onSearchChange]
  );

  const columns: Column<LeaveRequestRow>[] = [
    {
      title: 'Nhân viên',
      dataIndex: 'employeeId',
      render: (_, record) => {
        const employee = employees.find((item) => getEmployeeValue(item) === record.employeeId || item.id === record.employeeId);
        const name = employee?.fullName || employee?.name || record.employeeName || 'Nhân viên';
        const code = employee?.employeeCode || record.employeeCode || record.employeeId;

        return (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
              {name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-bold text-slate-800">{name}</div>
              <div className="font-mono text-[10px] text-slate-400">
                {code && code.length !== 24 ? `Mã NV: ${code}` : (employee?.departmentName || employee?.role || 'Chưa cập nhật mã NV')}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Phòng ban / Khối cụm',
      render: (_, record) => {
        const employee = employees.find((item) => getEmployeeValue(item) === record.employeeId || item.id === record.employeeId);
        const deptName = employee?.departmentName || employee?.departmentGroupName || employee?.deptGroupName || '--';
        return <div className="text-[11px] text-slate-500">{deptName}</div>;
      },
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      className: 'text-center justify-center',
      render: (value, record) => {
        const typeVal = value as LeaveRequest['type'];
        const text = LEAVE_TYPE_MAP[typeVal] || typeVal;
        const display = record.requestedMinutes && (typeVal === 'arrive_late' || typeVal === 'leave_early')
          ? `${text} (${record.requestedMinutes}p)`
          : text;
        return <Tag color={LEAVE_COLOR_MAP[typeVal] || 'default'}>{display}</Tag>;
      },
    },
    {
      title: 'Ngày nghỉ',
      dataIndex: 'startDate',
      className: 'text-center justify-center',
      render: (_, record) => (
        <div className="font-mono text-[11px] text-slate-500">
          {record.startDate === record.endDate ? record.startDate : `${record.startDate} -> ${record.endDate}`}
        </div>
      ),
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      render: (value) => (
        <span className="block max-w-[220px] truncate text-xs text-slate-600" title={value as string}>
          {value as string}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      className: 'text-center justify-center',
      render: (value) => {
        const statusVal = value as LeaveRequest['status'];
        return <Tag color={STATUS_MAP[statusVal].color}>{STATUS_MAP[statusVal].label}</Tag>;
      },
    },
    {
      title: 'Phê duyệt',
      dataIndex: 'status',
      className: 'text-right justify-end',
      render: (_, record) => {
        if (record.status !== 'pending') {
          return <div className="flex justify-end"><span className="text-[11px] text-slate-400">Đã xử lý</span></div>;
        }

        return (
          <div className="flex justify-end gap-1.5">
            <Button
              size="small"
              type="primary"
              icon={<Check className="h-3.5 w-3.5" />}
              onClick={() => onResolve(record.id || '', 'approved')}
              className="inline-flex items-center gap-1 bg-emerald-600"
            >
              Duyệt
            </Button>
            <Button
              size="small"
              danger
              icon={<X className="h-3.5 w-3.5" />}
              onClick={() => onResolve(record.id || '', 'rejected')}
              className="inline-flex items-center gap-1"
            >
              Từ chối
            </Button>
          </div>
        );
      },
    },
    {
      title: 'Thao tác',
      className: 'text-right justify-end',
      render: (_, record) => (
        <div className="flex justify-end gap-1.5">
          {onEdit && (
            <Button
              size="small"
              onClick={() => onEdit(record)}
              className="text-[11px] text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100"
            >
              Sửa
            </Button>
          )}
          {onDelete && (
            <Button
              size="small"
              danger
              onClick={() => onDelete(record.id || '')}
              className="text-[11px]"
            >
              Xóa
            </Button>
          )}
        </div>
      ),
    },
  ];

  const pendingCount = leaveRequests.filter((r) => r.status === 'pending').length;
  const approvedCount = leaveRequests.filter((r) => r.status === 'approved').length;
  const rejectedCount = leaveRequests.filter((r) => r.status === 'rejected').length;

  return (
    <section className="bg-white py-4 px-0 sm:p-5 rounded-none sm:rounded-2xl border border-slate-100 shadow-xs -mx-4 sm:mx-0">
      <div className="px-4 sm:px-0 mb-4 flex flex-col xl:flex-row xl:items-center gap-3 justify-between">
        {/* Left side: Filters */}
        <div className="w-full xl:w-auto">
          {/* Desktop Filters */}
          <div className="hidden sm:flex flex-wrap items-center gap-6">
            <div className="w-56">
              <DateRangePicker
                value={dateRange || undefined}
                onRangeChanges={(dates) => {
                  if (dates) {
                    onDateRangeChange([dates[0].startOf('day'), dates[1].endOf('day')]);
                  } else {
                    onDateRangeChange(null);
                  }
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
                onChange={(val) => onStatusFilterChange((val as string) || '')}
                options={[
                  { label: 'Chờ duyệt', value: 'pending' },
                  { label: 'Đã duyệt', value: 'approved' },
                  { label: 'Từ chối', value: 'rejected' },
                ]}
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
                  onDateRangeChange([dates[0].startOf('day'), dates[1].endOf('day')]);
                } else {
                  onDateRangeChange(null);
                }
              }}
              className="w-full text-sm rounded-xl h-10"
            />
            <Button 
              icon={<Filter className="w-4 h-4" />} 
              onClick={() => setIsMobileFilterVisible(true)}
              className="w-full h-10 bg-white border-slate-200 text-slate-600 font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs"
            >
              Lọc dữ liệu {statusFilter ? '(Đang bật)' : ''}
            </Button>
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
          size="default"
          onClose={() => setIsMobileFilterVisible(false)}
          open={isMobileFilterVisible}
          className="[&_.ant-drawer-body]:p-5"
          extra={
            statusFilter && (
              <Button type="text" danger onClick={() => { onStatusFilterChange(''); setIsMobileFilterVisible(false); }} className="text-xs font-bold px-2">
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
                  placeholder="Lọc trạng thái"
                  allowClear
                  isSort={false}
                  onChange={(val) => onStatusFilterChange((val as string) || '')}
                  options={[
                    { label: 'Chờ duyệt', value: 'pending' },
                    { label: 'Đã duyệt', value: 'approved' },
                    { label: 'Từ chối', value: 'rejected' },
                  ]}
                  className="!h-auto min-h-10 text-sm"
                />
              </div>
            </div>
            
            <Button type="primary" className="mt-2 w-full h-10 rounded-xl font-bold" onClick={() => setIsMobileFilterVisible(false)}>
              Áp dụng
            </Button>
          </div>
        </Drawer>

        {/* Right side: Stats */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-2 py-1 rounded bg-amber-50 text-amber-600 text-[11px] font-semibold">Chờ duyệt {pendingCount}</div>
          <div className="px-2 py-1 rounded bg-emerald-50 text-emerald-600 text-[11px] font-semibold">Đã duyệt {approvedCount}</div>
          <div className="px-2 py-1 rounded bg-rose-50 text-rose-600 text-[11px] font-semibold">Từ chối {rejectedCount}</div>
        </div>
      </div>

      <div className="relative leave-table-wrapper">
        <TableBase<LeaveRequestRow>
          rowKey="id"
          onRow={(record) => ({
            onClick: () => {
              if (window.innerWidth < 768) {
                setDetailRecord(record);
                setIsDetailDrawerVisible(true);
              }
            },
          })}
          classNameRow={(record) => {
            let baseClass = 'cursor-pointer md:cursor-default ';
            if (record.status === 'pending') baseClass += 'bg-amber-50/35';
            else if (record.status === 'approved') baseClass += 'bg-emerald-50/30';
            else if (record.status === 'rejected') baseClass += 'bg-rose-50/25';
            return baseClass;
          }}
          loading={loading}
          columns={columns}
          data={leaveRequests}
          bordered={true}
          isSTT={false}
          pagination={{
            current: page,
            pageSize,
            total,
            onPageChange,
          }}
        />
        {isMobile && (
          <div className="absolute right-3 top-3 z-50">
            <Button
              type="primary"
              shape="circle"
              className="shadow-lg opacity-80 hover:opacity-100 flex items-center justify-center w-8 h-8 transition-opacity duration-300"
              onClick={() => {
                const scrollContainer = document.querySelector('.leave-table-wrapper > div');
                if (scrollContainer) scrollContainer.scrollTo({ left: scrollContainer.scrollWidth, behavior: 'smooth' });
              }}
              title="Cuộn sang phải"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Detail Bottom Sheet */}
      <Drawer
        title="Chi tiết đơn nghỉ phép"
        placement="bottom"
        size="default"
        onClose={() => setIsDetailDrawerVisible(false)}
        open={isDetailDrawerVisible}
        className="rounded-t-2xl [&_.ant-drawer-header]:border-b-0 [&_.ant-drawer-body]:pt-0 sm:hidden"
      >
        {detailRecord && (() => {
          const employee = employees.find((item) => getEmployeeValue(item) === detailRecord.employeeId || item.id === detailRecord.employeeId);
          const name = employee?.fullName || employee?.name || detailRecord.employeeName || 'Nhân viên';
          const code = employee?.employeeCode || detailRecord.employeeCode || detailRecord.employeeId;
          const statusConfig = STATUS_MAP[detailRecord.status] || STATUS_MAP.pending;
          const totalDays = detailRecord.startDate && detailRecord.endDate 
            ? dayjs(detailRecord.endDate).diff(dayjs(detailRecord.startDate), 'day') + 1 
            : 1;
          
          return (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-xs border border-blue-100">
                  {name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-slate-800">{name}</div>
                  <div className="text-[11px] text-slate-400 font-mono uppercase font-semibold mt-0.5">{code && code.length !== 24 ? code : 'NV'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ngày nghỉ</span>
                  <span className="font-bold text-slate-700">
                    {detailRecord.startDate === detailRecord.endDate ? detailRecord.startDate : `${detailRecord.startDate} -> ${detailRecord.endDate}`}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Số ngày</span>
                  <span className="font-bold text-slate-700">{totalDays} ngày</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Loại</span>
                  <div><Tag color={LEAVE_COLOR_MAP[detailRecord.type]} className="m-0 font-bold border-0 px-2 py-0.5 shadow-xs">{LEAVE_TYPE_MAP[detailRecord.type]}</Tag></div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Trạng thái</span>
                  <div><Tag color={statusConfig.color} className="m-0 font-bold border-0 px-2 py-0.5 shadow-xs">{statusConfig.label}</Tag></div>
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Lý do</span>
                  <span className="font-medium text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">{detailRecord.reason || '---'}</span>
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-2 pt-4 border-t border-slate-100">
                {detailRecord.status === 'pending' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      type="primary" 
                      className="bg-emerald-500 hover:bg-emerald-600 font-bold h-11 rounded-xl shadow-sm"
                      icon={<Check className="w-4 h-4" strokeWidth={3} />}
                      onClick={() => {
                        setIsDetailDrawerVisible(false);
                        onResolve(detailRecord.id || '', 'approved');
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
                        onResolve(detailRecord.id || '', 'rejected');
                      }}
                    >
                      Từ chối
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 text-xs italic font-semibold py-1 bg-slate-50 rounded-lg border border-slate-100">
                    Đơn đã được xử lý
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Drawer>
    </section>
  );
}
