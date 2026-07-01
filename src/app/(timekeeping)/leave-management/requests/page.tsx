'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card, Table, Tag, Button, Input, Select, DatePicker, Pagination,
  Modal, Drawer, notification, Space, Tooltip, Tabs, Divider, Badge
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, EyeOutlined,
  SearchOutlined, PrinterOutlined, EditOutlined, FilterOutlined,
  UserOutlined, FileTextOutlined, FormOutlined
} from '@ant-design/icons';
import { Filter, X, ChevronRight, Award, Contact, Building2, Users, FileSpreadsheet } from 'lucide-react';
import type {
  LeaveRequest, BranchTimekeeping, KioskLocation,
  DepartmentGroupTimekeeping, DepartmentTimekeeping, LeaveType, Employee
} from '@/app/interface/timekeeping';
import dayjs from 'dayjs';
import { DateRangePicker } from '@/app/ui/base/date-range-picker';
import { useSignatureCanvas } from '@/app/hooks/useSignatureCanvas';

// ─── Helpers ────────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  annual: 'Nghỉ phép năm',
  sick: 'Nghỉ ốm',
  maternity: 'Thai sản',
  personal: 'Việc riêng (Hiếu, Hỉ)',
  unpaid: 'Nghỉ không lương',
  arrive_late: 'Đi muộn / Về sớm',
};

function getTypeName(type: string, leaveTypes: LeaveType[] = []) {
  const found = leaveTypes.find(t => t.code === type);
  return found?.name || TYPE_LABELS[type] || type;
}

function formatDateVN(dateStr?: string) {
  if (!dateStr) return '……';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function calcDays(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const diff = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 0;
}

// ─── A4 Leave Form ───────────────────────────────────────────────────────────
interface A4LeaveFormProps {
  record: LeaveRequest;
  leaveTypes: LeaveType[];
}
function A4LeaveForm({ record, leaveTypes }: A4LeaveFormProps) {
  const typeName = getTypeName(record.type, leaveTypes);
  const days = calcDays(record.startDate, record.endDate);
  const now = new Date(record.requestedAt || new Date());
  const extra = record as LeaveRequest & { managerSignature?: string; digitalSignature?: string };

  return (
    <div
      id="leave-form-print"
      style={{ width: '100%', maxWidth: 740, margin: '0 auto', padding: '40px 56px', fontFamily: 'Times New Roman, serif', fontSize: 16, color: '#111', backgroundColor: '#fff', lineHeight: 1.8 }}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <p style={{ fontWeight: 700, margin: 0, fontSize: 16 }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
        <p style={{ fontWeight: 700, margin: 0, fontSize: 16 }}>Độc lập – Tự do – Hạnh phúc</p>
        <div style={{ width: 120, height: 1, background: '#000', margin: '4px auto 0' }} />
      </div>
      <div style={{ textAlign: 'center', marginTop: 32, marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>ĐƠN XIN NGHỈ PHÉP</h1>
      </div>
      <div style={{ marginBottom: 16, display: 'flex' }}>
        <div style={{ whiteSpace: 'nowrap', marginRight: 16 }}>Kính gửi</div>
        <div>
          <div>– Ban Giám Đốc Công Ty: <span style={{ fontWeight: 700 }}>HUPUNA GROUP</span></div>
          <div>– Phòng Hành chính – Nhân sự</div>
        </div>
      </div>
      
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-end' }}>
        <span style={{ whiteSpace: 'nowrap' }}>Tôi tên là :</span>
        <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: 8, fontWeight: 700, paddingLeft: 8, lineHeight: 1 }}>{record.employeeName}</span>
      </div>
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-end' }}>
        <span style={{ whiteSpace: 'nowrap' }}>Chức vụ:</span>
        <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: 8, paddingLeft: 8, lineHeight: 1 }}>{record.employeeRole || ''}</span>
      </div>
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-end' }}>
        <span style={{ whiteSpace: 'nowrap' }}>Bộ phận:</span>
        <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: 8, paddingLeft: 8, lineHeight: 1 }}>{record.department || ''}</span>
      </div>
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-end' }}>
        <span style={{ whiteSpace: 'nowrap' }}>Địa chỉ:</span>
        <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: 8, paddingLeft: 8, lineHeight: 1 }}></span>
      </div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-end' }}>
        <span style={{ whiteSpace: 'nowrap' }}>Điện thoại:</span>
        <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: 8, paddingLeft: 8, lineHeight: 1 }}></span>
      </div>

      <div style={{ marginBottom: 16, textAlign: 'justify' }}>
        Nay tôi trình đơn này kính xin Ban Giám Đốc chấp thuận cho tôi được nghỉ phép trong
        thời gian <span style={{ fontWeight: 700, borderBottom: '1px dotted #000', padding: '0 16px' }}>{days}</span> ngày 
        (Kể từ ngày <span style={{ fontWeight: 700, borderBottom: '1px dotted #000', padding: '0 8px' }}>{formatDateVN(record.startDate)}</span> 
        đến hết ngày <span style={{ fontWeight: 700, borderBottom: '1px dotted #000', padding: '0 8px' }}>{formatDateVN(record.endDate)}</span>)
      </div>

      <div style={{ marginBottom: 8 }}>Lý do xin nghỉ phép:</div>
      <div style={{ borderBottom: '1px dotted #000', width: '100%', marginBottom: 8, minHeight: 28 }}>
        <span style={{ paddingLeft: 8, fontStyle: 'italic' }}>{record.reason || ''}</span>
      </div>
      <div style={{ height: 28, borderBottom: '1px dotted #000', width: '100%', marginBottom: 16 }}></div>

      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-end' }}>
        <span style={{ whiteSpace: 'nowrap' }}>Tôi đã bàn giao công việc cho :</span>
        <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: 8, fontWeight: 700, paddingLeft: 8, lineHeight: 1 }}>{record.handoverTo || ''}</span>
        <span style={{ whiteSpace: 'nowrap', marginLeft: 8 }}>Bộ phận:</span>
        <span style={{ width: 150, borderBottom: '1px dotted #000', marginLeft: 8, paddingLeft: 8, lineHeight: 1 }}>{record.handoverDept || ''}</span>
      </div>

      <div style={{ marginBottom: 8 }}>Các công việc được bàn giao:</div>
      <div style={{ borderBottom: '1px dotted #000', width: '100%', marginBottom: 16, minHeight: 28 }}>
        <span style={{ paddingLeft: 8, fontStyle: 'italic' }}>{record.handoverTasks || ''}</span>
      </div>

      <div style={{ marginBottom: 16 }}>Tôi xin hứa sẽ cập nhật đầy đủ nội dung công tác trong thời gian vắng.</div>
      <div style={{ marginBottom: 24 }}>Kính mong Ban Giám Đốc xem xét và chấp thuận.</div>

      <p style={{ textAlign: 'right', margin: '0 0 16px' }}>
        ……., ngày {String(now.getDate()).padStart(2, '0')} tháng {String(now.getMonth() + 1).padStart(2, '0')} năm {now.getFullYear()}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
        <div style={{ width: '45%' }}>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>Trưởng Bộ phận (3)</p>
          <p style={{ fontSize: 16, color: '#000', margin: 0 }}>(Ký, ghi rõ họ tên)</p>
          <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {extra.managerSignature && (
              <img src={extra.managerSignature} alt="Chữ ký" style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain' }} />
            )}
            {extra.digitalSignature && !extra.managerSignature && (
              <div style={{ fontSize: 12, color: '#2563eb', fontStyle: 'italic', border: '1px dashed #2563eb', padding: '4px 8px', borderRadius: 4 }}>
                ✓ {extra.digitalSignature}
              </div>
            )}
          </div>
          <p style={{ margin: 0, fontWeight: 700 }}>{record.resolvedBy || ''}</p>
        </div>
        <div style={{ width: '45%' }}>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>Người làm đơn</p>
          <p style={{ fontSize: 16, color: '#000', margin: 0 }}>(Ký, ghi rõ họ tên)</p>
          <div style={{ height: 100 }} />
          <p style={{ margin: 0, fontWeight: 700 }}>{record.employeeName}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Status helpers ──────────────────────────────────────────────────────────
function StatusTag({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  if (s === 'approved') return <Tag color="success" icon={<CheckCircleOutlined />}>Đã duyệt</Tag>;
  if (s === 'rejected') return <Tag color="error" icon={<CloseCircleOutlined />}>Từ chối</Tag>;
  return <Tag color="warning">Chờ duyệt</Tag>;
}

function isPending(status: string) {
  return (status || '').toLowerCase() === 'pending';
}

interface OverviewStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  totalDays: number;
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function LeaveRequestsPage() {
  const [data, setData] = useState<LeaveRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Org data
  const [branches, setBranches] = useState<BranchTimekeeping[]>([]);
  const [locations, setLocations] = useState<KioskLocation[]>([]);
  const [deptGroups, setDeptGroups] = useState<DepartmentGroupTimekeeping[]>([]);
  const [departments, setDepartments] = useState<DepartmentTimekeeping[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

  // Filters
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [deptGroupFilter, setDeptGroupFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [resolvedFrom, setResolvedFrom] = useState('');
  const [resolvedTo, setResolvedTo] = useState('');

  // UI state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<LeaveRequest | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printRecord, setPrintRecord] = useState<LeaveRequest | null>(null);
  const [sigModalOpen, setSigModalOpen] = useState(false);  const [digitalSigModalOpen, setDigitalSigModalOpen] = useState(false);
  const [sigRecord, setSigRecord] = useState<LeaveRequest | null>(null);
  const [submittingSig, setSubmittingSig] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectRecord, setRejectRecord] = useState<LeaveRequest | null>(null);
  
  const [overviewModalOpen, setOverviewModalOpen] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);

  const sig = useSignatureCanvas();

  useEffect(() => {
    (async () => {
      fetchData();
      await fetchOrgData();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;
    if (selectedRecord && selectedRecord.employeeCode) {
      fetch(`/api/v1/employees?employeeCodes=${encodeURIComponent(selectedRecord.employeeCode)}`)
        .then(res => res.json())
        .then(json => {
          if (active && json.data && json.data.length > 0) {
            setEmployeeDetails(json.data[0]);
          }
        })
        .catch(err => console.error('Failed to fetch employee details', err));
    }
    return () => { active = false; };
  }, [selectedRecord]);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, statusFilter, typeFilter, branchFilter, locationFilter, deptGroupFilter, departmentFilter, fromDate, toDate, createdFrom, createdTo]);

  async function fetchOrgData() {
    try {
      const [bRes, lRes, gRes, dRes, tRes] = await Promise.all([
        fetch('/api/branch-timekeeping'),
        fetch('/api/v1/kiosk/locations'),
        fetch('/api/department-groups-timekeeping'),
        fetch('/api/departments-timekeeping'),
        fetch('/api/leave-types?active=true'),
      ]);
      const [b, l, g, d, t] = await Promise.all([bRes.json(), lRes.json(), gRes.json(), dRes.json(), tRes.json()]);
      if (b.data) setBranches(b.data);
      if (l.data) setLocations(l.data);
      if (g.data) setDeptGroups(g.data);
      if (d.data) setDepartments(d.data);
      if (t.data) setLeaveTypes(t.data);
    } catch (e) { console.error(e); }
  }

  async function fetchData() {
    setLoading(true);
    try {
      const query = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString(), search, status: statusFilter });
      if (typeFilter) query.append('type', typeFilter);
      if (branchFilter) {
        query.append('branch', branchFilter);
        const b = branches.find(x => x._id === branchFilter || x.id === branchFilter);
        if (b) query.append('branchName', b.name);
      }
      if (locationFilter) query.append('location', locationFilter);
      if (deptGroupFilter) query.append('deptGroup', deptGroupFilter);
      if (departmentFilter) {
        query.append('department', departmentFilter);
        const d = departments.find(x => x._id === departmentFilter);
        if (d) query.append('departmentName', d.name);
      }
      if (fromDate) query.append('fromDate', fromDate);
      if (toDate) query.append('toDate', toDate);
      if (createdFrom) query.append('createdFrom', createdFrom);
      if (createdTo) query.append('createdTo', createdTo);
      if (resolvedFrom) query.append('resolvedFrom', resolvedFrom);
      if (resolvedTo) query.append('resolvedTo', resolvedTo);

      const res = await fetch(`/api/leave-requests?${query}`);
      const json = await res.json();
      if (json.data) { setData(json.data); setTotal(json.total || 0); }
    } catch { notification.error({ message: 'Lỗi tải danh sách đơn xin nghỉ' }); }
    finally { setLoading(false); }
  }

  function clearAllFilters() {
    setStatusFilter(''); setTypeFilter(''); setBranchFilter(''); setLocationFilter('');
    setDeptGroupFilter(''); setDepartmentFilter(''); setFromDate(''); setToDate(''); 
    setCreatedFrom(''); setCreatedTo(''); setResolvedFrom(''); setResolvedTo(''); setSearch(''); setPage(1);
  }

  const activeFiltersCount = [statusFilter, typeFilter, branchFilter, locationFilter, deptGroupFilter, departmentFilter].filter(Boolean).length;

  // ── Actions ──
  async function handleApproveReject(id: string, newStatus: 'approved' | 'rejected', reason?: string) {
    try {
      const res = await fetch(`/api/leave-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, rejectReason: reason }),
      });
      const json = await res.json();
      if (res.ok) {
        notification.success({ message: json.message });
        setDrawerOpen(false); setRejectModalOpen(false);
        fetchData();
      } else { notification.error({ message: json.message || 'Lỗi thao tác' }); }
    } catch { notification.error({ message: 'Lỗi server' }); }
  }

  async function handleOpenOverview() {
    setOverviewModalOpen(true);
    setOverviewLoading(true);
    try {
      const query = new URLSearchParams({ page: '1', pageSize: '10000', search, status: statusFilter });
      if (typeFilter) query.append('type', typeFilter);
      if (branchFilter) query.append('branch', branchFilter);
      if (locationFilter) query.append('location', locationFilter);
      if (deptGroupFilter) query.append('deptGroup', deptGroupFilter);
      if (departmentFilter) query.append('department', departmentFilter);
      if (fromDate) query.append('fromDate', fromDate);
      if (toDate) query.append('toDate', toDate);
      if (createdFrom) query.append('createdFrom', createdFrom);
      if (createdTo) query.append('createdTo', createdTo);
      if (resolvedFrom) query.append('resolvedFrom', resolvedFrom);
      if (resolvedTo) query.append('resolvedTo', resolvedTo);

      const res = await fetch(`/api/leave-requests?${query}`);
      const json = await res.json();
      if (json.data) {
        const list = json.data;
        setOverviewStats({
          total: list.length,
          pending: list.filter((x: LeaveRequest) => isPending(x.status)).length,
          approved: list.filter((x: LeaveRequest) => x.status === 'approved').length,
          rejected: list.filter((x: LeaveRequest) => x.status === 'rejected').length,
          totalDays: list.filter((x: LeaveRequest) => x.status === 'approved').reduce((acc: number, cur: LeaveRequest) => acc + calcDays(cur.startDate, cur.endDate), 0),
        });
      }
    } catch { notification.error({ message: 'Lỗi tải tổng quan' }); }
    finally { setOverviewLoading(false); }
  }

  function confirmCanvasSignatureSubmit() {
    if (!sigRecord) return;
    if (sig.isEmpty()) { notification.warning({ message: 'Vui lòng vẽ chữ ký trước khi xác nhận' }); return; }
    Modal.confirm({
      title: 'Xác nhận phê duyệt',
      content: 'Bạn có chắc chắn muốn duyệt đơn xin nghỉ này?',
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      onOk: handleCanvasSignatureSubmit,
    });
  }

  async function handleCanvasSignatureSubmit() {
    if (!sigRecord) return;
    setSubmittingSig(true);
    try {
      const id = sigRecord._id || sigRecord.id || '';
      const res = await fetch(`/api/leave-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved', managerSignature: sig.getDataUrl() }),
      });
      const json = await res.json();
      if (res.ok) {
        notification.success({ message: '✅ Đã phê duyệt & lưu chữ ký thành công!' });
        setSigModalOpen(false); sig.clearCanvas(); setDrawerOpen(false); fetchData();
      } else { notification.error({ message: json.message || 'Lỗi lưu chữ ký' }); }
    } catch { notification.error({ message: 'Lỗi server' }); }
    finally { setSubmittingSig(false); }
  }

  function confirmDigitalSignatureSubmit() {
    if (!sigRecord) return;
    Modal.confirm({
      title: 'Xác nhận phê duyệt điện tử',
      content: 'Bạn có chắc chắn muốn phê duyệt đơn này bằng chữ ký điện tử?',
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      onOk: handleDigitalSignatureSubmit,
    });
  }

  async function handleDigitalSignatureSubmit() {
    if (!sigRecord) return;
    setSubmittingSig(true);
    try {
      const id = sigRecord._id || sigRecord.id || '';
      const digitalSig = `Quản lý – ${dayjs().format('HH:mm DD/MM/YYYY')}`;
      const res = await fetch(`/api/leave-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved', digitalSignature: digitalSig }),
      });
      const json = await res.json();
      if (res.ok) {
        notification.success({ message: '✅ Đã phê duyệt với chữ ký điện tử!' });
        setDigitalSigModalOpen(false); setDrawerOpen(false); fetchData();
      } else { notification.error({ message: json.message || 'Lỗi' }); }
    } catch { notification.error({ message: 'Lỗi server' }); }
    finally { setSubmittingSig(false); }
  }

  // ── Table columns ──
  const columns = [
    {
      title: 'Nhân viên',
      key: 'employee',
      render: (_: unknown, record: LeaveRequest) => (
        <div>
          <div className="font-semibold text-slate-800">{record.employeeName || 'N/A'}</div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-blue-500 font-mono">{record.employeeCode}</span>
            {record.employeeRole && <span className="text-slate-500 bg-slate-100 px-1 rounded">{record.employeeRole}</span>}
          </div>
          <div className="text-xs text-gray-400 mt-1 space-y-0.5">
            {record.branch && <div className="flex items-center gap-1.5 truncate"><Building2 size={12} className="text-slate-400" /> {record.branch}</div>}
            {record.department && <div className="flex items-center gap-1.5 truncate"><Users size={12} className="text-slate-400" /> {record.department}</div>}
          </div>
        </div>
      ),
    },
    {
      title: 'Hình thức nghỉ',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color="blue">{getTypeName(type, leaveTypes)}</Tag>,
    },
    {
      title: 'Thời gian',
      key: 'time',
      render: (_: unknown, record: LeaveRequest) => (
        <div className="text-xs">
          <div><span className="text-gray-400">Từ:</span> <span className="font-medium">{formatDateVN(record.startDate)}</span></div>
          <div><span className="text-gray-400">Đến:</span> <span className="font-medium">{formatDateVN(record.endDate)}</span></div>
          <div className="text-blue-600 font-semibold mt-1">
            {calcDays(record.startDate, record.endDate)} ngày
            {record.requestedMinutes ? ` (${record.requestedMinutes} phút)` : ''}
          </div>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => <StatusTag status={st} />,
    },
    {
      title: 'Ngày nộp',
      dataIndex: 'requestedAt',
      key: 'requestedAt',
      render: (text: string) => <span className="text-xs text-gray-500">{text ? dayjs(text).format('DD/MM/YYYY HH:mm') : '—'}</span>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: unknown, record: LeaveRequest) => (
        <div className="flex items-center gap-1.5">
          <Tooltip title="Xem chi tiết">
            <Button size="small" className="border-blue-100 text-blue-600 bg-blue-50/50 hover:bg-blue-100" icon={<EyeOutlined />}
              onClick={(e) => { e.stopPropagation(); setEmployeeDetails(null); setSelectedRecord(record); setDrawerOpen(true); }} />
          </Tooltip>
          <Tooltip title="In đơn">
            <Button size="small" className="border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100" icon={<PrinterOutlined />}
              onClick={(e) => { e.stopPropagation(); setPrintRecord(record); setPrintModalOpen(true); }} />
          </Tooltip>
          {isPending(record.status) && (
            <>
              <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
              <Tooltip title="Phê duyệt">
                <Button size="small" className="border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100" icon={<FormOutlined />}
                  onClick={(e) => { e.stopPropagation(); setSigRecord(record); setSigModalOpen(true); }} />
              </Tooltip>
              <Tooltip title="Từ chối">
                <Button size="small" danger className="border-red-200 bg-red-50 hover:bg-red-100" icon={<CloseCircleOutlined />}
                  onClick={(e) => { e.stopPropagation(); setRejectRecord(record); setRejectModalOpen(true); }} />
              </Tooltip>
            </>
          )}
        </div>
      ),
    },
  ];

  // ── Render ──
  return (
    <div className="flex h-full min-h-screen">
      {/* SIDEBAR FILTER (DRAWER) */}
      <Drawer
        title={<span className="font-bold text-slate-700 flex items-center gap-2"><Filter size={16} />Bộ lọc</span>}
        placement="left"
        onClose={() => setFilterOpen(false)}
        open={filterOpen}
        width={300}
        closeIcon={<X size={18} />}
        bodyStyle={{ padding: '16px' }}
      >
        <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Khoảng ngày xin nghỉ</label>
              <DateRangePicker className="w-full" allowClear
                value={fromDate && toDate ? [dayjs(fromDate), dayjs(toDate)] : undefined}
                onRangeChanges={(dates) => {
                  setFromDate(dates?.[0]?.format('YYYY-MM-DD') || '');
                  setToDate(dates?.[1]?.format('YYYY-MM-DD') || '');
                  setPage(1);
                }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Khoảng ngày tạo đơn</label>
              <DateRangePicker className="w-full" allowClear
                value={createdFrom && createdTo ? [dayjs(createdFrom), dayjs(createdTo)] : undefined}
                onRangeChanges={(dates) => {
                  setCreatedFrom(dates?.[0]?.format('YYYY-MM-DD') || '');
                  setCreatedTo(dates?.[1]?.format('YYYY-MM-DD') || '');
                  setPage(1);
                }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Khoảng ngày duyệt</label>
              <DateRangePicker className="w-full" allowClear
                value={resolvedFrom && resolvedTo ? [dayjs(resolvedFrom), dayjs(resolvedTo)] : undefined}
                onRangeChanges={(dates) => {
                  setResolvedFrom(dates?.[0]?.format('YYYY-MM-DD') || '');
                  setResolvedTo(dates?.[1]?.format('YYYY-MM-DD') || '');
                  setPage(1);
                }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Trạng thái</label>
              <Select size="small" className="w-full" placeholder="Tất cả" allowClear
                value={statusFilter || undefined}
                onChange={(v) => { setStatusFilter(v || ''); setPage(1); }}
                options={[
                  { label: 'Chờ duyệt', value: 'pending' },
                  { label: 'Đã duyệt', value: 'approved' },
                  { label: 'Từ chối', value: 'rejected' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Hình thức nghỉ</label>
              <Select size="small" className="w-full" placeholder="Tất cả" allowClear showSearch optionFilterProp="label"
                value={typeFilter || undefined}
                onChange={(v) => { setTypeFilter(v || ''); setPage(1); }}
                options={leaveTypes.map(t => ({ label: t.name, value: t.code }))}
              />
            </div>
            <Divider className="my-2" />
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Chi nhánh</label>
              <Select size="small" className="w-full" placeholder="Tất cả" allowClear showSearch optionFilterProp="label"
                value={branchFilter || undefined}
                onChange={(v) => { setBranchFilter(v || ''); setLocationFilter(''); setPage(1); }}
                options={branches.map(b => ({ label: b.name, value: b._id || b.id }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Cơ sở làm việc</label>
              <Select size="small" className="w-full" placeholder="Tất cả" allowClear showSearch optionFilterProp="label"
                value={locationFilter || undefined}
                onChange={(v) => { setLocationFilter(v || ''); setPage(1); }}
                options={locations.filter(l => !branchFilter || l.branchId === branchFilter).map(l => ({ label: l.locationName, value: l._id }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Khối / Cụm</label>
              <Select size="small" className="w-full" placeholder="Tất cả" allowClear showSearch optionFilterProp="label"
                value={deptGroupFilter || undefined}
                onChange={(v) => { setDeptGroupFilter(v || ''); setDepartmentFilter(''); setPage(1); }}
                options={deptGroups.map(g => ({ label: g.name, value: g._id }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Phòng ban</label>
              <Select size="small" className="w-full" placeholder="Tất cả" allowClear showSearch optionFilterProp="label"
                value={departmentFilter || undefined}
                onChange={(v) => { setDepartmentFilter(v || ''); setPage(1); }}
                options={departments.filter(d => !deptGroupFilter || d.departmentGroupTimekeepingId === deptGroupFilter).map(d => ({ label: d.name, value: d._id }))}
              />
            </div>
            <Button size="small" block onClick={clearAllFilters} className="mt-4 border-slate-200 text-slate-600">Xóa bộ lọc</Button>
          </div>
      </Drawer>

      {/* MAIN CONTENT */}
      <div className="flex-1 min-w-0 overflow-auto pb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6 px-4 sm:px-0">
          <div className="mt-4 sm:mt-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Danh sách đơn xin nghỉ</h1>
            <p className="text-sm sm:text-base text-slate-500 mt-1">Quản lý và phê duyệt đơn xin nghỉ phép của nhân viên</p>
          </div>
        </div>

        <Card className="shadow-sm border-slate-200 rounded-none sm:rounded-xl border-x-0 sm:border-x mx-[-12px]! sm:mx-0! [&_.ant-card-body]:p-0 sm:[&_.ant-card-body]:p-6 [&_.ant-table-container]:rounded-none! sm:[&_.ant-table-container]:rounded-lg!">
          <div className="flex flex-col xl:flex-row flex-wrap gap-3 mb-4 xl:items-center px-4 pt-4 sm:px-0 sm:pt-0">
            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
              <Badge count={activeFiltersCount} size="small">
                <Button icon={<FilterOutlined />} onClick={() => setFilterOpen(!filterOpen)}
                  className={activeFiltersCount > 0 ? 'border-blue-400 text-blue-600' : ''}>Bộ lọc</Button>
              </Badge>
              <Input placeholder="Tìm mã NV, họ tên..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                onPressEnter={() => { setPage(1); fetchData(); }}
                className="flex-1 min-w-[150px] sm:w-56" prefix={<SearchOutlined />} allowClear />
            </div>
            
            <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto">
              <Select className="w-full sm:w-36" placeholder="Trạng thái" allowClear
                value={statusFilter || undefined}
                onChange={(v) => { setStatusFilter(v || ''); setPage(1); }}
                options={[
                  { label: 'Chờ duyệt', value: 'pending' },
                  { label: 'Đã duyệt', value: 'approved' },
                  { label: 'Từ chối', value: 'rejected' },
                ]}
              />
              
              <Select className="w-full sm:w-48" placeholder="Chi nhánh" allowClear showSearch optionFilterProp="label"
                value={branchFilter || undefined}
                onChange={(v) => { setBranchFilter(v || ''); setLocationFilter(''); setPage(1); }}
                options={branches.map(b => ({ label: b.name, value: b._id || b.id }))}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 w-full xl:w-auto">
              <span className="text-xs font-medium text-slate-500 mb-0.5 sm:mb-0 sm:text-sm sm:text-slate-600 whitespace-nowrap block sm:inline-block">Ngày xin nghỉ:</span>
              <div className="w-full sm:w-60">
                <DateRangePicker className="w-full" allowClear
                  value={fromDate && toDate ? [dayjs(fromDate), dayjs(toDate)] : undefined}
                  onRangeChanges={(dates) => {
                    setFromDate(dates?.[0]?.format('YYYY-MM-DD') || '');
                    setToDate(dates?.[1]?.format('YYYY-MM-DD') || '');
                    setPage(1);
                  }} />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 w-full xl:w-auto">
              <span className="text-xs font-medium text-slate-500 mb-0.5 sm:mb-0 sm:text-sm sm:text-slate-600 whitespace-nowrap block sm:inline-block">Ngày tạo đơn:</span>
              <div className="w-full sm:w-60">
                <DateRangePicker className="w-full" allowClear
                  value={createdFrom && createdTo ? [dayjs(createdFrom), dayjs(createdTo)] : undefined}
                  onRangeChanges={(dates) => {
                    setCreatedFrom(dates?.[0]?.format('YYYY-MM-DD') || '');
                    setCreatedTo(dates?.[1]?.format('YYYY-MM-DD') || '');
                    setPage(1);
                  }} />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 w-full xl:w-auto">
              <span className="text-xs font-medium text-slate-500 mb-0.5 sm:mb-0 sm:text-sm sm:text-slate-600 whitespace-nowrap block sm:inline-block">Ngày duyệt:</span>
              <div className="w-full sm:w-60">
                <DateRangePicker className="w-full" allowClear
                  value={resolvedFrom && resolvedTo ? [dayjs(resolvedFrom), dayjs(resolvedTo)] : undefined}
                  onRangeChanges={(dates) => {
                    setResolvedFrom(dates?.[0]?.format('YYYY-MM-DD') || '');
                    setResolvedTo(dates?.[1]?.format('YYYY-MM-DD') || '');
                    setPage(1);
                  }} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto mt-2 xl:mt-0">
              <Button type="primary" onClick={() => { setPage(1); fetchData(); }} className="flex-1 sm:flex-none">Tìm kiếm</Button>
              <Button onClick={handleOpenOverview} icon={<FileSpreadsheet className="w-4 h-4" />} className="border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 flex-1 sm:flex-none">Tổng quan</Button>
              {(activeFiltersCount > 0 || fromDate || createdFrom || resolvedFrom) && (
                <Button onClick={clearAllFilters} className="text-red-500 border-red-200 flex-1 sm:flex-none">Xóa bộ lọc</Button>
              )}
            </div>
            
            <div className="mt-1 xl:mt-0 xl:ml-auto text-sm text-slate-500 self-end xl:self-center font-medium">Tổng: <strong className="text-blue-600">{total}</strong> đơn</div>
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden md:block border-t sm:border-t-0 border-slate-100">
            <Table
              columns={columns}
              dataSource={data}
              rowKey={(record) => record._id || record.id || Math.random().toString()}
              loading={loading}
              onRow={(record) => ({ onClick: () => { setEmployeeDetails(null); setSelectedRecord(record); setDrawerOpen(true); }, style: { cursor: 'pointer' } })}
              pagination={{ current: page, pageSize, total, showSizeChanger: true, showTotal: (t) => `${t} đơn`, pageSizeOptions: ['10', '15', '25', '50'], onChange: (p, s) => { setPage(p); setPageSize(s); } }}
              scroll={{ x: 'max-content' }}
              className="[&_.ant-table-pagination]:px-4 sm:[&_.ant-table-pagination]:px-0 [&_.ant-table-pagination]:pb-4 sm:[&_.ant-table-pagination]:pb-0"
            />
          </div>

          {/* MOBILE LIST */}
          <div className="block md:hidden bg-slate-50/50 py-4 border-t border-slate-100">
            <div className="flex flex-col gap-4">
              {data.map(record => (
                <div key={record._id || record.id || Math.random().toString()} 
                     className="bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)] border-y border-slate-200 active:bg-slate-50 cursor-pointer transition-colors" 
                     onClick={() => { setEmployeeDetails(null); setSelectedRecord(record); setDrawerOpen(true); }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-slate-800 text-base">{record.employeeName || 'N/A'}</div>
                      <div className="flex items-center gap-2 text-xs mt-0.5">
                        <span className="text-blue-500 font-mono font-medium">{record.employeeCode}</span>
                        {record.employeeRole && <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{record.employeeRole}</span>}
                      </div>
                    </div>
                    <StatusTag status={record.status} />
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-3 space-y-1.5 mt-2">
                    {record.branch && <div className="flex items-center gap-1.5"><Building2 size={13} className="text-slate-400" /> {record.branch}</div>}
                    {record.department && <div className="flex items-center gap-1.5"><Users size={13} className="text-slate-400" /> {record.department}</div>}
                  </div>

                  <div className="flex items-end justify-between bg-slate-50/80 p-3 rounded-lg border border-slate-100 mt-2">
                    <div>
                      <div className="text-[11px] text-slate-400 uppercase font-semibold mb-1">Hình thức</div>
                      <div className="text-sm font-medium text-slate-700">{getTypeName(record.type, leaveTypes)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400 uppercase font-semibold mb-1">Thời gian ({calcDays(record.startDate, record.endDate)} ngày)</div>
                      <div className="text-sm font-medium text-blue-600">
                        {formatDateVN(record.startDate)} <span className="text-slate-400 mx-1">→</span> {formatDateVN(record.endDate)}
                      </div>
                    </div>
                  </div>

                  {isPending(record.status) && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                      <Button size="middle" className="flex-1 border-emerald-200 text-emerald-600 bg-emerald-50 font-medium" icon={<FormOutlined />} onClick={(e) => { e.stopPropagation(); setSigRecord(record); setSigModalOpen(true); }}>Phê duyệt</Button>
                      <Button size="middle" danger className="flex-1 border-red-200 bg-red-50 font-medium" icon={<CloseCircleOutlined />} onClick={(e) => { e.stopPropagation(); setRejectRecord(record); setRejectModalOpen(true); }}>Từ chối</Button>
                    </div>
                  )}
                </div>
              ))}
              
              {!loading && data.length === 0 && (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-sm shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)]">Không có đơn nghỉ phép nào</div>
              )}
              
              {data.length > 0 && (
                <div className="pt-2 flex justify-center">
                  <Pagination current={page} pageSize={pageSize} total={total} onChange={(p, s) => { setPage(p); setPageSize(s); }} size="small" showSizeChanger={false} />
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* DRAWER — Chi tiết */}
      <Drawer
        title={<div className="flex items-center gap-2"><FileTextOutlined className="text-blue-500" /><span>Chi tiết đơn xin nghỉ</span></div>}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={560}
        footer={
          selectedRecord && isPending(selectedRecord.status) ? (
            <div className="flex gap-2 justify-end flex-wrap">
              <Button danger icon={<CloseCircleOutlined />} onClick={() => { setRejectRecord(selectedRecord); setRejectModalOpen(true); }}>Từ chối</Button>
              <Button icon={<EditOutlined />} onClick={() => { setSigRecord(selectedRecord); setDigitalSigModalOpen(true); }}>Ký điện tử</Button>
              <Button type="primary" className="bg-emerald-500 hover:bg-emerald-600! border-emerald-500" icon={<FormOutlined />}
                onClick={() => { setSigRecord(selectedRecord); setSigModalOpen(true); }}>Ký tay & Phê duyệt</Button>
            </div>
          ) : (
            <div className="flex gap-2 justify-end">
              <Button icon={<PrinterOutlined />} onClick={() => { setPrintRecord(selectedRecord); setPrintModalOpen(true); }}>Xem & In đơn</Button>
            </div>
          )
        }
      >
        {selectedRecord && (
          <Tabs defaultActiveKey="leave" items={[
            {
              key: 'employee',
              label: <span><UserOutlined /> Nhân viên</span>,
              children: (
                <div className="space-y-4">
                  <div 
                    className="flex items-center gap-4 p-4 bg-linear-to-r from-blue-50 to-indigo-50 rounded-xl cursor-pointer hover:shadow-md transition-all border border-transparent hover:border-blue-200"
                    onClick={() => setEmployeeModalOpen(true)}
                  >
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600 shrink-0 overflow-hidden">
                      {employeeDetails?.avatar ? (
                        <img src={employeeDetails.avatar} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        (selectedRecord.employeeName || '?').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-lg font-bold text-slate-800">{selectedRecord.employeeName || 'N/A'}</div>
                      <div className="font-mono text-blue-600 text-sm">{selectedRecord.employeeCode}</div>
                      {selectedRecord.employeeRole && <div className="text-sm text-gray-500">{selectedRecord.employeeRole}</div>}
                    </div>
                    <ChevronRight className="text-blue-300" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {[
                      { label: 'Chi nhánh', value: selectedRecord.branch || employeeDetails?.branchName || employeeDetails?.branch?.name }, 
                      { label: 'Phòng ban', value: selectedRecord.department || employeeDetails?.departmentName || employeeDetails?.department?.name },
                      { label: 'Số điện thoại', value: selectedRecord.phone || employeeDetails?.phone },
                      { label: 'Địa chỉ', value: selectedRecord.address || employeeDetails?.address }
                    ].map(item => (
                      <div key={item.label} className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                        <p className="font-medium text-slate-700 text-sm">{item.value || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            },
            {
              key: 'leave',
              label: <span><FileTextOutlined /> Nội dung đơn</span>,
              children: (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Trạng thái:</span>
                    <StatusTag status={selectedRecord.status} />
                  </div>
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-blue-600 font-semibold">HÌNH THỨC NGHỈ</span>
                      <Tag color="blue">{getTypeName(selectedRecord.type, leaveTypes)}</Tag>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <p className="text-xs text-gray-400">Từ ngày</p>
                        <p className="font-semibold">{formatDateVN(selectedRecord.startDate)}</p>
                        {selectedRecord.startTime && <p className="text-xs text-gray-500">lúc {selectedRecord.startTime}</p>}
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Đến ngày</p>
                        <p className="font-semibold">{formatDateVN(selectedRecord.endDate)}</p>
                        {selectedRecord.endTime && <p className="text-xs text-gray-500">lúc {selectedRecord.endTime}</p>}
                      </div>
                    </div>
                    <div className="text-center text-blue-700 font-bold">
                      Tổng: {calcDays(selectedRecord.startDate, selectedRecord.endDate)} ngày
                      {selectedRecord.requestedMinutes ? ` (${selectedRecord.requestedMinutes} phút)` : ''}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Thời gian tạo đơn</p>
                      <p className="text-sm font-medium">{dayjs(selectedRecord.requestedAt).format('HH:mm DD/MM/YYYY')}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Lý do nghỉ</p>
                    <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm whitespace-pre-wrap">{selectedRecord.reason || 'Không có lý do'}</div>
                  </div>
                  {selectedRecord.handoverTo && (
                    <div className="flex items-start gap-2">
                      <ChevronRight size={16} className="text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400">Người nhận bàn giao</p>
                        <p className="font-medium text-sm">{selectedRecord.handoverTo} {selectedRecord.handoverDept ? `(${selectedRecord.handoverDept})` : ''}</p>
                        <p className="text-sm mt-1 text-gray-600">{selectedRecord.handoverTasks}</p>
                      </div>
                    </div>
                  )}
                  {selectedRecord.resolvedBy && (
                    <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg">
                      <p className="text-xs text-emerald-600 font-semibold mb-1">THÔNG TIN PHÊ DUYỆT</p>
                      <p className="text-sm">Người duyệt: <strong>{selectedRecord.resolvedBy}</strong></p>
                      {selectedRecord.resolvedAt && <p className="text-xs text-gray-500">{dayjs(selectedRecord.resolvedAt as string).format('HH:mm DD/MM/YYYY')}</p>}
                      {(selectedRecord as LeaveRequest & { managerSignature?: string }).managerSignature && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-400 mb-1">Chữ ký tay:</p>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={(selectedRecord as LeaveRequest & { managerSignature: string }).managerSignature} alt="Chữ ký" className="max-h-16 border border-gray-200 rounded p-1 bg-white" />
                        </div>
                      )}
                    </div>
                  )}
                  <Button block icon={<PrinterOutlined />} onClick={() => { setPrintRecord(selectedRecord); setPrintModalOpen(true); }}>Xem đơn & In</Button>
                </div>
              ),
            },
          ]} />
        )}
      </Drawer>

      {/* MODAL — In đơn A4 */}
      <Modal
        title={<span><PrinterOutlined /> Xem & In đơn xin nghỉ</span>}
        open={printModalOpen}
        onCancel={() => setPrintModalOpen(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setPrintModalOpen(false)}>Đóng</Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => {
            const el = document.getElementById('leave-form-print');
            if (!el) return;
            const win = window.open('', '_blank');
            if (!win) return;
            win.document.write(`<html><head><title>Đơn xin nghỉ phép</title><style>body{margin:0;font-family:'Times New Roman',serif;}@media print{body{margin:0;}}</style></head><body>${el.outerHTML}</body></html>`);
            win.document.close();
            win.focus();
            setTimeout(() => win.print(), 400);
          }}>In đơn</Button>,
        ]}
      >
        {printRecord && <A4LeaveForm record={printRecord} leaveTypes={leaveTypes} />}
      </Modal>

      {/* MODAL — Ký tay Canvas */}
      <Modal
        title={<span><FormOutlined /> Ký tay phê duyệt đơn</span>}
        open={sigModalOpen}
        onCancel={() => { setSigModalOpen(false); sig.clearCanvas(); }}
        footer={[
          <Button key="clear" onClick={sig.clearCanvas}>Xóa chữ ký</Button>,
          <Button key="cancel" onClick={() => { setSigModalOpen(false); sig.clearCanvas(); }}>Hủy</Button>,
          <Button key="confirm" type="primary" className="bg-emerald-500 hover:bg-emerald-600 border-emerald-500" loading={submittingSig} icon={<Award size={14} />} onClick={confirmCanvasSignatureSubmit}>
            Xác nhận ký & Phê duyệt
          </Button>,
        ]}
        width={520}
      >
        <div className="space-y-4">
          {sigRecord && (
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <span className="font-semibold">Đơn của:</span> {sigRecord.employeeName} ({sigRecord.employeeCode})<br />
              <span className="font-semibold">Hình thức:</span> {getTypeName(sigRecord.type, leaveTypes)}<br />
              <span className="font-semibold">Thời gian:</span> {formatDateVN(sigRecord.startDate)} → {formatDateVN(sigRecord.endDate)}
            </div>
          )}
          <div>
            <p className="text-sm text-gray-600 mb-2 font-medium">Vẽ chữ ký tay vào ô bên dưới:</p>
            <div className="border-2 border-dashed border-blue-300 rounded-xl overflow-hidden bg-gray-50">
              <canvas ref={sig.canvasRef} width={460} height={160} className="w-full cursor-crosshair touch-none" style={{ display: 'block' }}
                onMouseDown={sig.startDraw} onMouseMove={sig.draw} onMouseUp={sig.stopDraw} onMouseLeave={sig.stopDraw}
                onTouchStart={sig.startDraw} onTouchMove={sig.draw} onTouchEnd={sig.stopDraw} />
            </div>
            <p className="text-xs text-gray-400 mt-1 text-center">Dùng chuột hoặc ngón tay để vẽ chữ ký</p>
          </div>
        </div>
      </Modal>

      {/* MODAL — Ký điện tử */}
      <Modal
        title={<span><EditOutlined /> Ký điện tử phê duyệt</span>}
        open={digitalSigModalOpen}
        onCancel={() => setDigitalSigModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setDigitalSigModalOpen(false)}>Hủy</Button>,
          <Button key="confirm" type="primary" loading={submittingSig} icon={<CheckCircleOutlined />} onClick={confirmDigitalSignatureSubmit}>Xác nhận phê duyệt</Button>,
        ]}
      >
        {sigRecord && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
              <p className="text-sm text-amber-800 font-semibold mb-2">📋 Thông tin đơn cần phê duyệt</p>
              <p className="text-sm"><strong>Nhân viên:</strong> {sigRecord.employeeName} ({sigRecord.employeeCode})</p>
              <p className="text-sm"><strong>Hình thức:</strong> {getTypeName(sigRecord.type, leaveTypes)}</p>
              <p className="text-sm"><strong>Thời gian:</strong> {formatDateVN(sigRecord.startDate)} → {formatDateVN(sigRecord.endDate)}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-center">
              <p className="text-xs text-blue-600 font-semibold mb-1">CHỮ KÝ ĐIỆN TỬ SẼ ĐƯỢC GHI LÀ</p>
              <div className="text-blue-800 font-mono bg-white border border-blue-200 rounded p-2 mt-1 text-sm">
                Quản lý – {dayjs().format('HH:mm DD/MM/YYYY')}
              </div>
              <p className="text-xs text-gray-400 mt-2">Ghi nhận thời gian phê duyệt tự động</p>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL — Từ chối */}
      <Modal
        title={<span className="text-red-600"><CloseCircleOutlined /> Từ chối đơn xin nghỉ</span>}
        open={rejectModalOpen}
        onCancel={() => { setRejectModalOpen(false); setRejectReason(''); }}
        footer={[
          <Button key="cancel" onClick={() => { setRejectModalOpen(false); setRejectReason(''); }}>Hủy</Button>,
          <Button key="confirm" danger icon={<CloseCircleOutlined />}
            onClick={() => { if (rejectRecord) handleApproveReject(rejectRecord._id || rejectRecord.id || '', 'rejected', rejectReason); }}>
            Xác nhận từ chối
          </Button>,
        ]}
      >
        {rejectRecord && (
          <div className="space-y-3">
            <div className="bg-red-50 p-3 rounded-lg text-sm">
              <strong>Đơn của:</strong> {rejectRecord.employeeName} — {formatDateVN(rejectRecord.startDate)} đến {formatDateVN(rejectRecord.endDate)}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lý do từ chối (tùy chọn)</label>
              <Input.TextArea rows={3} placeholder="Nhập lý do từ chối..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            </div>
          </div>
        )}
      </Modal>

      {/* EMPLOYEE DETAIL MODAL */}
      <Modal
        title={<div className="flex items-center gap-2 text-blue-700"><Contact size={20} /><span>Hồ sơ nhân sự chi tiết</span></div>}
        open={employeeModalOpen}
        onCancel={() => setEmployeeModalOpen(false)}
        footer={null}
        width={700}
        centered
      >
        {employeeDetails ? (
          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-4xl font-bold text-blue-600 overflow-hidden shadow-sm border-2 border-white ring-4 ring-blue-50">
                {employeeDetails.avatar ? (
                  <img src={employeeDetails.avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  (employeeDetails.fullName || employeeDetails.name || '?').charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 m-0">{employeeDetails.fullName || employeeDetails.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-sm font-semibold">{employeeDetails.employeeCode}</span>
                  <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-sm">{employeeDetails.role}</span>
                  {employeeDetails.status === 'ACTIVE' ? (
                    <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-sm flex items-center gap-1"><CheckCircleOutlined /> Đang làm việc</span>
                  ) : (
                    <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-sm">Đã nghỉ việc</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">Giới tính</p>
                <p className="font-medium text-slate-700">{employeeDetails.gender || '—'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">Ngày sinh</p>
                <p className="font-medium text-slate-700">{formatDateVN(employeeDetails.dateOfBirth)}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">Số điện thoại</p>
                <p className="font-medium text-slate-700">{employeeDetails.phone || '—'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">Email</p>
                <p className="font-medium text-slate-700 truncate" title={employeeDetails.email}>{employeeDetails.email || '—'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">CCCD / CMND</p>
                <p className="font-medium text-slate-700">{employeeDetails.identityCard || '—'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">Ngày vào làm</p>
                <p className="font-medium text-slate-700">{formatDateVN(employeeDetails.joinDate)}</p>
              </div>
            </div>

            <Divider className="my-0" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">Chi nhánh</p>
                <p className="font-medium text-slate-700">{employeeDetails.branchName || employeeDetails.branch?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Phòng ban</p>
                <p className="font-medium text-slate-700">{employeeDetails.departmentName || employeeDetails.department?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Cơ sở làm việc</p>
                <p className="font-medium text-slate-700">{employeeDetails.locationName || employeeDetails.location?.locationName || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Khối / Cụm</p>
                <p className="font-medium text-slate-700">{employeeDetails.deptGroupName || employeeDetails.deptGroup?.name || '—'}</p>
              </div>
            </div>

            <Divider className="my-0" />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">Loại nhân viên</p>
                <p className="font-medium text-slate-700">
                   {employeeDetails.employeeType === 'full_time' ? 'Chính thức' : 
                    employeeDetails.employeeType === 'part_time' ? 'Bán thời gian' : 
                    employeeDetails.employeeType || '—'}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">Mã số thuế</p>
                <p className="font-medium text-slate-700">{employeeDetails.taxCode || '—'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">Dân tộc / Quốc tịch</p>
                <p className="font-medium text-slate-700">{employeeDetails.ethnicity || '—'} / {employeeDetails.nationality || '—'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 md:col-span-2">
                <p className="text-xs text-slate-400 mb-1">Tài khoản ngân hàng</p>
                <p className="font-medium text-slate-700">{employeeDetails.bankAccount ? `${employeeDetails.bankAccount} (${employeeDetails.bankName || 'Không rõ NH'})` : '—'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">Dữ liệu khuôn mặt</p>
                <p className="font-medium text-slate-700 text-sm">
                   {employeeDetails.faceEnrolled ? <span className="text-emerald-600 font-semibold"><CheckCircleOutlined /> Đã đăng ký</span> : <span className="text-amber-500 font-semibold">Chưa đăng ký</span>}
                </p>
              </div>
            </div>

            <Divider className="my-0" />

            <div>
              <p className="text-xs text-slate-400 mb-1">Địa chỉ thường trú</p>
              <p className="font-medium text-slate-700">{employeeDetails.address || '—'}</p>
            </div>
            
            {employeeDetails.nativePlace && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Quê quán</p>
                <p className="font-medium text-slate-700">{employeeDetails.nativePlace}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400">
            {selectedRecord?.employeeCode ? 'Đang tải dữ liệu...' : 'Không có thông tin hồ sơ nhân sự'}
          </div>
        )}
      </Modal>
    </div>
  );
}
