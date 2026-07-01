'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import type { Dayjs } from 'dayjs';
import { Search } from 'lucide-react';
import { InputBase } from '@/app/ui/base/input';
import { useTimekeepingStore } from '@/app/store/timekeeping/useTimekeepingStore';
import type { LeaveRequest } from '@/app/interface/timekeeping';
import type { User } from '@/app/data/dataUser';
import { cookieBase } from '@/app/utils/cookie';
import LeaveRequestList from './components/LeaveRequestList';

interface LeaveRequestsApiResponse {
  data?: LeaveRequest[] | LeaveRequest;
  message?: string;
  total?: number;
  page?: number;
  pageSize?: number;
}

export default function LeavesPage() {
  const { employees, setEmployees, setLeaveRequests, refreshPendingLeavesCount } = useTimekeepingStore();

  const [leaveRequests, setPageLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isFetchingLeaves, setIsFetchingLeaves] = useState(true);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Search & filter state
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [search, setSearch] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  const handleSearchInput = useCallback((value: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      setSearch(value);
    }, 400);
  }, []);

  const fetchLeaves = useCallback(async (p: number, ps: number, q: string, status: string, range: [Dayjs, Dayjs] | null) => {
    try {
      queueMicrotask(() => setIsFetchingLeaves(true));
      const params = new URLSearchParams({
        page: String(p),
        pageSize: String(ps),
      });
      if (q) params.set('search', q);
      if (status) params.set('status', status);
      if (range) {
        params.set('fromDate', range[0].format('YYYY-MM-DD'));
        params.set('toDate', range[1].format('YYYY-MM-DD'));
      }

      const response = await fetch(`/api/leave-requests?${params.toString()}`);
      const json = await response.json() as LeaveRequestsApiResponse;
      const nextLeaveRequests = Array.isArray(json.data) ? json.data : [];

      setPageLeaveRequests(nextLeaveRequests);
      setLeaveRequests(nextLeaveRequests);
      setTotal(json.total ?? nextLeaveRequests.length);
      await refreshPendingLeavesCount();
    } catch (error) {
      console.error('Failed to fetch leave requests', error);
      message.error('Không lấy được danh sách đơn nghỉ phép.');
    } finally {
      queueMicrotask(() => setIsFetchingLeaves(false));
    }
  }, [refreshPendingLeavesCount, setLeaveRequests]);

  // Load employees for mapping
  const loadEmployees = useCallback(async () => {
    if (employees && employees.length > 0) return;
    try {
      const response = await fetch('/api/v1/employees?pageSize=2000');
      const json = await response.json();
      setEmployees(Array.isArray(json.data) ? json.data : []);
    } catch (error) {
      console.error('Failed to load employees for leaves page', error);
    }
  }, [employees, setEmployees]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  // Refetch when pagination or filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchLeaves(page, pageSize, search, statusFilter, dateRange);
    }, 0);
    return () => clearTimeout(timer);
  }, [page, pageSize, search, statusFilter, dateRange, fetchLeaves]);

  const handlePageChange = useCallback((p: number, ps: number) => {
    setPage(p);
    setPageSize(ps);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setLocalSearch(value);
    setPage(1); // Reset về trang 1 khi tìm kiếm
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const handleResolveLeave = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/leave-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, approver: cookieBase.get<User>('info_user') }),
      });
      const json = await response.json() as LeaveRequestsApiResponse;

      if (!response.ok || !json.data || Array.isArray(json.data)) {
        message.error(json.message || 'Không cập nhật được đơn nghỉ phép.');
        return;
      }

      // Refetch current page to reflect the update
      await fetchLeaves(page, pageSize, search, statusFilter, dateRange);
      message.success(status === 'approved' ? 'Đã phê duyệt đơn nghỉ phép.' : 'Đã từ chối đơn nghỉ phép.');
    } catch (error) {
      console.error('Failed to update leave request', error);
      message.error('Lỗi kết nối khi cập nhật đơn nghỉ phép.');
    }
  };

  const handleDeleteLeave = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đơn nghỉ phép này không?')) return;
    
    try {
      const response = await fetch(`/api/leave-requests/${id}`, {
        method: 'DELETE',
      });
      const json = await response.json();
      if (!response.ok) {
        message.error(json.message || 'Lỗi khi xóa đơn nghỉ phép.');
        return;
      }
      message.success('Đã xóa đơn nghỉ phép thành công.');
      await fetchLeaves(page, pageSize, search, statusFilter, dateRange);
    } catch (error) {
      console.error('Failed to delete leave request', error);
      message.error('Lỗi kết nối khi xóa đơn nghỉ phép.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-2">
        <div>
          <h2 className="m-0 text-lg font-bold text-slate-800">Quản lý xin nghỉ phép</h2>
          <p className="mt-1 text-xs text-slate-400">
            Chỉ quản lý danh sách đơn, phê duyệt hoặc từ chối yêu cầu nghỉ phép.
          </p>
        </div>
        <div className="relative w-full lg:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <InputBase
            placeholder="Tìm theo mã NV, tên, lý do..."
            value={localSearch}
            onChange={(event) => {
              setLocalSearch(event.target.value);
              handleSearchInput(event.target.value);
            }}
            className="pl-9! h-9 w-full rounded-lg border-slate-200 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500/20 shadow-sm transition-all"
          />
        </div>
      </div>

      <LeaveRequestList
        employees={employees}
        leaveRequests={leaveRequests}
        loading={isFetchingLeaves}
        onResolve={handleResolveLeave}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        search={search}
        onSearchChange={handleSearchInput}
        statusFilter={statusFilter}
        onStatusFilterChange={(value) => {
          setStatusFilter(value);
          setPage(1);
        }}
        dateRange={dateRange}
        onDateRangeChange={(range) => {
          setDateRange(range);
          setPage(1);
        }}
        onEdit={(record) => {
          message.info('Vui lòng đợi 1 lát, form giao diện sửa đang được hoàn thiện!');
        }}
        onDelete={handleDeleteLeave}
      />
    </div>
  );
}
