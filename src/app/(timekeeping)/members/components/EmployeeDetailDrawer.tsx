import React, { useState } from 'react';
import { Drawer, Row, Col, Tag, QRCode, Button, Tooltip, message, Space, Popconfirm, Modal, Input, Form, Select, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { Contact, Building2, Calendar, Users, Phone, Mail, MapPin, Fingerprint, Copy, Check, QrCode, ScanFace, Pencil, Trash2, FileText, FilePlus2, Eye, Ban, Printer, Monitor, MoreVertical } from 'lucide-react';
import dayjs from 'dayjs';
import { BranchItem, LocationItem, DepartmentItem, DeptGroupItem, Employee, ZktecoSyncDetail, ZktecoDevice, ZktecoConnector } from '../types';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface EmployeeContract {
  _id: string;
  templateId: string;
  contractTypeId: string;
  startDate: string | null;
  endDate: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'DRAFT' | 'SUPPLEMENTARY';
  createdAt: string;
}

interface EmployeeDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEmp: Employee | null;
  isTablet: boolean;
  branches: BranchItem[];
  locations: LocationItem[];
  departments: DepartmentItem[];
  groups: DeptGroupItem[];
  renderAvatarPreview: (avatarUrl: string | undefined | null) => React.ReactNode;
  onEdit?: (emp: Employee) => void;
  onDelete?: (emp: Employee) => void;
  onFaceId?: (emp: Employee) => void;
  onWebAuthn?: (emp: Employee) => void;
  hasEditAccess?: boolean;
  hasDeleteAccess?: boolean;
  hasFaceIdAccess?: boolean;
  hasFingerprintAccess?: boolean;
  onPrintContract?: (emp: Employee) => void;
  onCreateContract?: (emp: Employee) => void;
  onAddSupplementaryContract?: (emp: Employee) => void;
  onSyncZkteco?: (emp: Employee) => void;
}

export const EmployeeDetailDrawer: React.FC<EmployeeDetailDrawerProps> = ({
  isOpen,
  onClose,
  selectedEmp,
  isTablet,
  branches,
  locations,
  departments,
  groups,
  renderAvatarPreview,
  onEdit,
  onDelete,
  onFaceId,
  onWebAuthn,
  hasEditAccess,
  hasDeleteAccess,
  hasFaceIdAccess,
  hasFingerprintAccess,
  onPrintContract,
  onCreateContract,
  onAddSupplementaryContract,
  onSyncZkteco
}) => {
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState<string>('');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [editForm] = Form.useForm();

  const handleCopyQR = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    message.success('Đã sao chép nội dung QR');
    setTimeout(() => setCopied(false), 2000);
  };

  const { data: devices = [] } = useQuery<ZktecoDevice[]>({
    queryKey: ['zkteco-devices-drawer'],
    queryFn: async () => {
      const res = await fetch('/api/v1/zkteco-devices');
      const data = await res.json();
      return data.data || [];
    },
    enabled: isOpen && !!selectedEmp?.linkedDevices?.length
  });

  const { data: connectors = [] } = useQuery<ZktecoConnector[]>({
    queryKey: ['zkteco-connectors-drawer'],
    queryFn: async () => {
      const res = await fetch('/api/v1/zkteco-connectors');
      const data = await res.json();
      return data.data || [];
    },
    enabled: isOpen && !!selectedEmp?.linkedDevices?.length
  });

  const deviceMap = React.useMemo(() => {
    const map: Record<string, ZktecoDevice> = {};
    devices.forEach(d => { map[d._id] = d; });
    return map;
  }, [devices]);

  const connectorMap = React.useMemo(() => {
    const map: Record<string, ZktecoConnector> = {};
    connectors.forEach(c => { map[c._id] = c; });
    return map;
  }, [connectors]);

  const { data: contracts = [], isLoading: loadingContracts, refetch: refetchContracts } = useQuery({
    queryKey: ['employee-contracts', selectedEmp?.id || selectedEmp?._id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/employee-contracts?employeeId=${selectedEmp?.id || selectedEmp?._id}`);
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!selectedEmp && isOpen,
  });

  const handleCancelContract = (contractId: string) => {
    let cancelReason = '';
    Modal.confirm({
      title: 'Chấm dứt hợp đồng',
      content: (
        <div>
          <p className="mb-2 text-slate-600">Vui lòng nhập lý do chấm dứt hợp đồng:</p>
          <Input.TextArea 
            rows={3} 
            placeholder="Ví dụ: Nhân viên xin nghỉ việc, Chuyển sang hợp đồng mới..." 
            onChange={(e) => cancelReason = e.target.value}
          />
        </div>
      ),
      okText: 'Chấm dứt',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        if (!cancelReason.trim()) {
          message.error('Vui lòng nhập lý do');
          return Promise.reject();
        }
        try {
          const res = await fetch(`/api/v1/employee-contracts/${contractId}/cancel`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cancelReason }),
          });
          const data = await res.json();
          if (data.success) {
            message.success('Đã chấm dứt hợp đồng');
            refetchContracts();
          } else {
            message.error(data.message || 'Lỗi chấm dứt hợp đồng');
          }
        } catch {
          message.error('Lỗi server');
        }
      }
    });
  };

  const handleDeleteContract = async (contractId: string) => {
    try {
      const res = await fetch(`/api/v1/employee-contracts/${contractId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        message.success('Đã xóa hợp đồng');
        refetchContracts();
      } else {
        message.error(data.message || 'Lỗi xóa hợp đồng');
      }
    } catch {
      message.error('Lỗi server');
    }
  };

  const handleEditUser = (deviceId: string) => {
    if (!selectedEmp) return;
    const details = (selectedEmp.zktecoSyncDetails?.[deviceId] as ZktecoSyncDetail) || {};
    
    editForm.setFieldsValue({
      uid: details.uid,
      userid: details.overrideUserid || selectedEmp.employeeCode || selectedEmp.enrollNumber,
      name: details.overrideName || selectedEmp.unaccentedName || selectedEmp.fullName,
      password: details.overridePassword || '',
      role: details.overrideRole !== undefined ? details.overrideRole : (selectedEmp.devicePrivilege === 'Quản trị viên' ? 14 : 0)
    });
    setEditingDevice(deviceId);
    setEditModalVisible(true);
  };

  const submitEditUser = async () => {
    if (!selectedEmp) return;
    try {
      const values = await editForm.validateFields();
      setIsUpdatingUser(true);
      
      const res = await fetch('/api/v1/zkteco-devices/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmp.id || selectedEmp._id,
          deviceId: editingDevice,
          name: values.name,
          password: values.password,
          role: values.role
        })
      });

      const data = await res.json();
      if (res.ok) {
        message.success(data.message);
        setEditModalVisible(false);
        // Invalidate queries to refresh data in parent components
        queryClient.invalidateQueries({ queryKey: ['employees'] });
        queryClient.invalidateQueries({ queryKey: ['employee-stats'] });
      } else {
        message.error(data.message || 'Lỗi cập nhật');
      }
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        message.error('Lỗi kết nối');
      }
    } finally {
      setIsUpdatingUser(false);
    }
  };

  return (
    <Drawer
      title={
        <span className="flex items-center gap-2 font-extrabold text-slate-800 text-sm md:text-base uppercase tracking-wider font-mono">
          <Contact className="w-4 h-4 md:w-5 md:h-5 text-blue-500 shrink-0" />
          <span className="hidden sm:inline">Hồ Sơ Nhân Sự Chi Tiết</span>
          <span className="sm:hidden">Hồ Sơ</span>
        </span>
      }
      extra={
        selectedEmp ? (
          <div className="flex items-center gap-1 md:gap-2">
            {hasFaceIdAccess && (
              <Button 
                size="middle" 
                type={selectedEmp.faceEnrolled ? "default" : "primary"} 
                onClick={() => onFaceId?.(selectedEmp)} 
                className={`${selectedEmp.faceEnrolled ? "text-blue-600 border-blue-200 bg-blue-50" : "bg-blue-500"} !px-2 sm:!px-4`} 
                icon={<ScanFace className="w-4 h-4" />}
              >
                <span className="hidden sm:inline">{selectedEmp.faceEnrolled ? "Cấu hình FaceID" : "Thiết lập FaceID"}</span>
              </Button>
            )}
            {hasFingerprintAccess && (
              <Button size="middle" className="!px-2 sm:!px-4" icon={<Fingerprint className="w-4 h-4 text-emerald-500" />} onClick={() => onWebAuthn?.(selectedEmp)}>
                <span className="hidden sm:inline">Vân tay</span>
              </Button>
            )}
            <Button size="middle" className="!px-2 sm:!px-4" icon={<Monitor className="w-4 h-4 text-blue-500" />} onClick={() => onSyncZkteco?.(selectedEmp)}>
              <span className="hidden sm:inline">Đồng bộ máy</span>
            </Button>
            {hasEditAccess && (
              <Button size="middle" type="primary" ghost className="!px-2 sm:!px-4" icon={<Pencil className="w-4 h-4" />} onClick={() => { onClose(); onEdit?.(selectedEmp); }}>
                <span className="hidden sm:inline">Sửa hồ sơ</span>
              </Button>
            )}
            <Dropdown 
              menu={{ 
                items: [
                  {
                    key: 'create-contract',
                    icon: <FileText className="w-4 h-4" />,
                    label: 'Thêm hợp đồng',
                    onClick: () => onCreateContract?.(selectedEmp)
                  },
                  {
                    key: 'print-contract',
                    icon: <Printer className="w-4 h-4" />,
                    label: 'In hợp đồng',
                    onClick: () => onPrintContract?.(selectedEmp)
                  },
                  hasDeleteAccess ? { type: 'divider' as const } : null,
                  hasDeleteAccess ? {
                    key: 'delete-emp',
                    icon: <Trash2 className="w-4 h-4 text-red-500" />,
                    label: <span className="text-red-500 font-medium">Xoá hồ sơ</span>,
                    onClick: () => {
                      Modal.confirm({
                        title: 'Xóa nhân sự này?',
                        content: 'Hồ sơ nhân sự và vân tay liên quan sẽ bị xóa vĩnh viễn.',
                        okText: 'Xoá',
                        okType: 'danger',
                        cancelText: 'Huỷ',
                        onOk: () => { onClose(); onDelete?.(selectedEmp); }
                      });
                    }
                  } : null
                ].filter(Boolean) as MenuProps['items']
              }} 
              trigger={['click']}
            >
              <Button size="middle" type="text" icon={<MoreVertical className="w-4 h-4 text-slate-500" />} className="px-1" />
            </Dropdown>
          </div>
        ) : null
      }
      open={isOpen}
      size="large"
      styles={{ 
        wrapper: { width: isTablet ? "100%" : "85%" },
        body: { padding: isTablet ? "16px 8px" : "24px" }
      }}
      placement="right"
      onClose={onClose}
      destroyOnHidden
      className="font-sans"
    >
      {selectedEmp && (
        <div className="space-y-6">
          {/* Header Profile Card */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
            {/* Banner tinh giản */}
            <div className="h-24 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100" />

            {/* Profile Info Overlay */}
            <div className="px-5 pb-5 pt-0 -mt-10 flex flex-col md:flex-row items-center md:items-end justify-between gap-4">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-4 text-center md:text-left">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full border-4 border-white bg-slate-100 shadow-sm flex items-center justify-center overflow-hidden shrink-0 relative">
                  {renderAvatarPreview(selectedEmp.avatar)}
                </div>

                <div className="mb-1">
                  <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
                    <h2 className="text-xl font-bold text-slate-800 m-0 leading-tight">
                      {selectedEmp.fullName}
                    </h2>
                    <span className="font-mono bg-blue-50 border border-blue-100 text-blue-600 px-2 py-0.5 rounded-md text-[11px] font-bold">
                      {selectedEmp.employeeCode}
                    </span>
                  </div>
                  <p className="text-slate-500 m-0 text-sm mt-1">
                    Nhân viên • <span className="font-medium text-slate-600">{selectedEmp.employeeType === 'Part-time' ? 'Bán thời gian' : 'Chính thức'}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap justify-center md:justify-end items-center gap-2">
                <span className={`font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 m-0 rounded border ${selectedEmp.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                  {selectedEmp.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm khóa'}
                </span>
                {selectedEmp.faceEnrolled ? (
                  <span className="font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 m-0 rounded border border-blue-100 bg-blue-50 text-blue-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    FaceID
                  </span>
                ) : (
                  <span className="font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 m-0 rounded border border-orange-100 bg-orange-50 text-orange-600">
                    Chưa quét mặt
                  </span>
                )}
              </div>
            </div>
          </div>

          <Row gutter={[24, 24]}>
            {/* Cột trái: QR Code Mini Profile */}
            <Col xs={24} lg={6}>
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 h-full sticky top-4">
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="w-full flex flex-col items-center gap-3 py-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1 self-start ml-4">
                      <QrCode className="w-3.5 h-3.5" />
                      QR cá nhân
                    </span>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col items-center justify-center shadow-xs gap-3">
                      <QRCode
                        value={selectedEmp.employeeCode || selectedEmp.id || ''}
                        size={120}
                        color="#1e293b"
                        bordered={false}
                      />
                      <Tooltip title={copied ? "Đã sao chép" : "Sao chép mã QR"}>
                        <Button 
                          type="dashed" 
                          size="small" 
                          className={`w-full flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${copied ? 'text-emerald-600 border-emerald-300 bg-emerald-50' : 'text-slate-600 border-slate-300 hover:text-blue-600 hover:border-blue-300'}`}
                          onClick={() => handleCopyQR(selectedEmp.employeeCode || selectedEmp.id || '')}
                        >
                          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {selectedEmp.employeeCode}
                        </Button>
                      </Tooltip>
                    </div>
                    <span className="text-[9px] text-slate-400 text-center leading-tight px-2">
                      Sử dụng mã QR này để định danh hoặc quét tại máy Kiosk
                    </span>
                  </div>
                </div>
              </div>
            </Col>

            {/* Cột phải: Thông tin chi tiết phân nhóm */}
            <Col xs={24} lg={18}>
              <div className="space-y-6">
                {/* Phân vùng 1: Tổ chức & Vị trí */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider m-0">Thông tin Tổ chức & Công tác</h4>
                  </div>

                  <Row gutter={[16, 16]} className="text-xs">
                    <Col xs={24} md={12}>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-400 font-medium">Chi nhánh làm việc:</span>
                        <span className="font-semibold text-slate-800">
                          {(() => {
                            const locObj = locations.find(l => l.locationName === selectedEmp.locationName || l._id === selectedEmp.locationId);
                            const branchObj = branches.find(b => b._id === locObj?.branchId || b.id === locObj?.branchId);
                            return branchObj?.name || '—';
                          })()}
                        </span>
                      </div>
                    </Col>

                    <Col xs={24} md={12}>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-400 font-medium">Cơ sở chấm công:</span>
                        <span className="font-semibold text-slate-800">
                          {selectedEmp.locationName || '—'}
                        </span>
                      </div>
                    </Col>

                    <Col xs={24} md={12}>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-400 font-medium">Khối / Cụm phòng ban:</span>
                        <span className="font-semibold text-slate-800">
                          {(() => {
                            const deptObj = departments.find(d => d._id === selectedEmp.departmentId);
                            const grpObj = groups.find(g => g._id === selectedEmp.deptGroupId || g._id === deptObj?.groupId);
                            return grpObj?.name || '—';
                          })()}
                        </span>
                      </div>
                    </Col>

                    <Col xs={24} md={12}>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-400 font-medium">Phòng ban cụ thể:</span>
                        <span className="font-semibold text-slate-800">
                          {(() => {
                            const deptObj = departments.find(d => d._id === selectedEmp.departmentId);
                            return deptObj?.name || '—';
                          })()}
                        </span>
                      </div>
                    </Col>

                    <Col xs={24} md={12}>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-400 font-medium">Ngày vào công ty:</span>
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {selectedEmp.joinDate ? dayjs(selectedEmp.joinDate).format('DD/MM/YYYY') : '—'}
                        </span>
                      </div>
                    </Col>

                    <Col xs={24} md={12}>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-400 font-medium">Thâm niên công tác:</span>
                        <span className="font-semibold text-slate-800 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded w-fit">
                          {(() => {
                            if (!selectedEmp.joinDate) return 'Chưa xác định';
                            const join = dayjs(selectedEmp.joinDate);
                            const now = dayjs();
                            const years = now.diff(join, 'year');
                            const months = now.diff(join, 'month') % 12;
                            if (years === 0) {
                              return `${months} tháng`;
                            }
                            return `${years} năm ${months} tháng`;
                          })()}
                        </span>
                      </div>
                    </Col>
                  </Row>
                </div>

                {/* Phân vùng 2: Lý lịch & Liên hệ */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider m-0">Thông tin Cá nhân & Lý lịch</h4>
                  </div>

                  <Row gutter={[16, 16]} className="text-xs">
                    <Col xs={24} md={12}>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-400 font-medium">Số CMND / CCCD:</span>
                        <span className="font-semibold text-slate-800 font-mono text-sm">
                          {selectedEmp.identityCard || '—'}
                        </span>
                      </div>
                    </Col>

                    <Col xs={24} md={12}>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-400 font-medium">Ngày sinh:</span>
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {selectedEmp.dateOfBirth ? dayjs(selectedEmp.dateOfBirth).format('DD/MM/YYYY') : '—'}
                        </span>
                      </div>
                    </Col>

                    <Col xs={24} md={12}>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-400 font-medium">Giới tính:</span>
                        <span className="font-semibold text-slate-800">
                          {selectedEmp.gender || 'Nam'}
                        </span>
                      </div>
                    </Col>

                    <Col xs={24} md={12}>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-400 font-medium">Nguyên quán / Nơi sinh:</span>
                        <span className="font-semibold text-slate-800">
                          {selectedEmp.nativePlace || '—'}
                        </span>
                      </div>
                    </Col>

                    <Col xs={24} md={12}>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-400 font-medium">Dân tộc:</span>
                        <span className="font-semibold text-slate-800">
                          {selectedEmp.ethnicity || 'Kinh'}
                        </span>
                      </div>
                    </Col>

                    <Col xs={24} md={12}>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-400 font-medium">Quốc tịch:</span>
                        <span className="font-semibold text-slate-800">
                          {selectedEmp.nationality || 'Việt Nam'}
                        </span>
                      </div>
                    </Col>

                    <Col xs={24} md={12}>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-400 font-medium">Số điện thoại:</span>
                        <span className="font-semibold text-slate-800 font-mono flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {selectedEmp.phone || '—'}
                        </span>
                      </div>
                    </Col>

                    <Col xs={24} md={12}>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-400 font-medium">Địa chỉ Email:</span>
                        <span className="font-semibold text-slate-800 font-mono flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {selectedEmp.email || '—'}
                        </span>
                      </div>
                    </Col>

                    <Col xs={24} md={12}>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-400 font-medium">Tài khoản Ngân hàng:</span>
                        <span className="font-semibold text-slate-800 font-mono">
                          {selectedEmp.bankAccount || '—'}
                        </span>
                      </div>
                    </Col>

                    <Col xs={24} md={24}>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-400 font-medium">Địa chỉ thường trú:</span>
                        <span className="font-semibold text-slate-800 flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{selectedEmp.address || '—'}</span>
                        </span>
                      </div>
                    </Col>
                  </Row>
                </div>


                {/* Phân vùng 4: Lịch sử hợp đồng */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-500" />
                      <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider m-0">Lịch sử Hợp đồng</h4>
                      {contracts.length > 0 && (
                        <span className="text-[10px] font-bold bg-orange-50 text-orange-500 border border-orange-100 px-1.5 py-0.5 rounded-full">
                          {contracts.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Tooltip title="Thêm hợp đồng bổ sung / phụ lục (không thay thế hợp đồng hiện tại)">
                        <Button
                          size="small"
                          type="dashed"
                          icon={<FilePlus2 className="w-3.5 h-3.5" />}
                          onClick={() => onAddSupplementaryContract?.(selectedEmp)}
                          className="text-violet-600 border-violet-200 hover:border-violet-400 hover:text-violet-700 bg-violet-50 text-[11px]"
                        >
                          <span className="hidden sm:inline">Hợp đồng bổ sung</span>
                        </Button>
                      </Tooltip>
                      <Tooltip title="Thêm hợp đồng mới (sẽ kết thúc hợp đồng hiện tại)">
                        <Button
                          size="small"
                          type="primary"
                          icon={<FileText className="w-3.5 h-3.5" />}
                          onClick={() => onCreateContract?.(selectedEmp)}
                          className="text-[11px]"
                        >
                          <span className="hidden sm:inline">Hợp đồng mới</span>
                        </Button>
                      </Tooltip>
                    </div>
                  </div>

                  {loadingContracts ? (
                    <div className="text-center text-slate-400 py-4 text-xs">Đang tải lịch sử hợp đồng...</div>
                  ) : contracts.length === 0 ? (
                    <div className="text-center text-slate-400 py-4 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      Chưa có hợp đồng nào được lưu
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {contracts.map((contract: EmployeeContract) => {
                        const isExpired = contract.status === 'EXPIRED';
                        const isCancelled = contract.status === 'CANCELLED';
                        const isDraft = contract.status === 'DRAFT';
                        const isSupplementaryContract = contract.status === 'SUPPLEMENTARY';
                        const isWarning = contract.status === 'ACTIVE' && contract.endDate && dayjs(contract.endDate).diff(dayjs(), 'day') <= 60;
                        
                        return (
                          <div key={contract._id} className={`p-3 rounded-xl border flex items-center justify-between ${
                            contract.status === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50/50' :
                            contract.status === 'SUPPLEMENTARY' ? 'border-violet-200 bg-violet-50/50' :
                            'border-slate-200 bg-slate-50'
                          }`}>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold ${contract.status === 'ACTIVE' ? 'text-emerald-700' : 'text-slate-500'}`}>
                                  {contract.startDate ? dayjs(contract.startDate).format('DD/MM/YYYY') : '—'} 
                                  {' '}đến{' '} 
                                  {contract.endDate ? dayjs(contract.endDate).format('DD/MM/YYYY') : 'Vô thời hạn'}
                                </span>
                                {contract.status === 'ACTIVE' && (
                                  <Tag color="success" className="m-0 text-[10px] px-1.5 py-0">Đang hiệu lực</Tag>
                                )}
                                {isSupplementaryContract && (
                                  <Tag color="purple" className="m-0 text-[10px] px-1.5 py-0">Hợp đồng bổ sung</Tag>
                                )}
                                {isDraft && (
                                  <Tag color="orange" className="m-0 text-[10px] px-1.5 py-0">Bản nháp</Tag>
                                )}
                                {isWarning && (
                                  <Tag color="warning" className="m-0 text-[10px] px-1.5 py-0">Sắp hết hạn</Tag>
                                )}
                                {isExpired && (
                                  <Tag color="default" className="m-0 text-[10px] px-1.5 py-0">Đã hết hạn</Tag>
                                )}
                                {isCancelled && (
                                  <Tag color="error" className="m-0 text-[10px] px-1.5 py-0">Đã chấm dứt</Tag>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500">
                                Tạo ngày: {dayjs(contract.createdAt).format('DD/MM/YYYY HH:mm')}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {(contract.status === 'ACTIVE' || contract.status === 'DRAFT' || contract.status === 'SUPPLEMENTARY') && (
                                <Tooltip title="Chấm dứt hợp đồng">
                                  <Button 
                                    size="small" 
                                    danger
                                    type="text"
                                    icon={<Ban className="w-3.5 h-3.5" />}
                                    onClick={() => handleCancelContract(contract._id)}
                                  />
                                </Tooltip>
                              )}
                              <Button 
                                size="small" 
                                type="dashed" 
                                icon={<Eye className="w-3.5 h-3.5" />}
                                onClick={() => {
                                  const empId = selectedEmp.id || selectedEmp._id;
                                  window.open(`/contracts/fill/${contract.templateId}?employeeId=${empId}&contractId=${contract._id}`, '_blank');
                                }}
                              >
                                <span className="hidden sm:inline">Xem lại</span>
                              </Button>
                              <Popconfirm
                                title="Xóa hợp đồng này?"
                                description="Hành động này không thể hoàn tác."
                                okText="Xóa"
                                okButtonProps={{ danger: true }}
                                cancelText="Hủy"
                                onConfirm={() => handleDeleteContract(contract._id)}
                              >
                                <Tooltip title="Xóa hợp đồng">
                                  <Button
                                    size="small"
                                    type="text"
                                    danger
                                    icon={<Trash2 className="w-3.5 h-3.5" />}
                                  />
                                </Tooltip>
                              </Popconfirm>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Phân vùng 5: Thiết bị đồng bộ & Vân tay */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-blue-500" />
                      <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider m-0">Trạng thái Đồng bộ Thiết bị</h4>
                    </div>
                    {onSyncZkteco && (
                      <Button size="small" type="primary" ghost onClick={() => onSyncZkteco(selectedEmp)}>
                        Đồng bộ ngay
                      </Button>
                    )}
                  </div>

                  {!selectedEmp.linkedDevices || selectedEmp.linkedDevices.length === 0 ? (
                    <div className="text-center text-slate-400 py-4 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      Nhân sự này chưa được đồng bộ xuống máy chấm công nào
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedEmp.linkedDevices.map((deviceId) => {
                        const device = deviceMap[deviceId];
                        const connector = device && device.connectorId ? connectorMap[device.connectorId] : null;
                        const deviceName = device ? (device.deviceName || device.name) : `Máy ZKTeco (${deviceId})`;
                        const ipAddress = device ? (device.ipAddress || device.ip) : 'Không rõ IP';

                        return (
                          <div key={deviceId} className="mb-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="p-3 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200">
                              <div className="flex items-start gap-3">
                                <div className="mt-1 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                  <Monitor className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-800 text-sm">{deviceName}</span>
                                  <span className="text-[11px] text-slate-500 font-mono mt-0.5">
                                    {ipAddress} {connector && <span className="text-slate-400">• Cổng: {connector.name || connector.code}</span>}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 self-end md:self-center">
                                <Tag color="success" className="m-0 border-none flex items-center gap-1 bg-emerald-50 text-emerald-600 font-bold px-2 py-1 rounded-md">
                                  <Check className="w-3.5 h-3.5" /> Đã đồng bộ
                                </Tag>
                                <Tooltip title="Cập nhật thông tin trên máy này">
                                  <Button 
                                    size="small" 
                                    type="default" 
                                    icon={<Pencil className="w-3.5 h-3.5 text-slate-600" />} 
                                    onClick={() => handleEditUser(deviceId)}
                                    className="rounded-md"
                                  />
                                </Tooltip>
                              </div>
                            </div>
                            
                            {/* Chi tiết liên kết */}
                            {(() => {
                              const details = (selectedEmp.zktecoSyncDetails?.[deviceId] as ZktecoSyncDetail) || ({} as ZktecoSyncDetail);
                              const savedUid = details.uid;
                              if (!savedUid) return null;
                              
                              const displayUserId = String(details.overrideUserid || selectedEmp.employeeCode || selectedEmp.enrollNumber || '');
                              const displayName = String(details.overrideName || selectedEmp.unaccentedName || selectedEmp.fullName || '');
                              const displayRole = details.overrideRole !== undefined ? details.overrideRole : (selectedEmp.devicePrivilege === 'Quản trị viên' ? 14 : 0);
                              const roleText = displayRole === 14 ? 'Quản trị viên' : 'Nhân viên';
                              const hasPassword = !!(details.overridePassword || selectedEmp.devicePassword);
                              
                              return (
                                <div className="p-4 text-xs bg-white">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="flex flex-col gap-1">
                                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">UID trên máy</span>
                                      <span className="font-mono font-bold text-slate-700">{savedUid}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Mã NV (UserID)</span>
                                      <span className="font-mono font-bold text-slate-700">{displayUserId}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Tên hiển thị</span>
                                      <span className="font-bold text-slate-700 truncate" title={displayName}>{displayName}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Quyền / Mật khẩu</span>
                                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                                        {roleText}
                                        {hasPassword && (
                                          <Tooltip title="Đã thiết lập mật khẩu">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                                          </Tooltip>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                  {details.syncedAt && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400 text-right italic font-medium">
                                      Cập nhật lần cuối: {new Date(details.syncedAt).toLocaleString('vi-VN')}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </Col>
          </Row>
        </div>
      )}

      {/* Modal chỉnh sửa thông tin nhân viên trên máy */}
      <Modal
        title="Cập nhật nhân viên"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setEditModalVisible(false)} disabled={isUpdatingUser}>
            Hủy
          </Button>,
          <Button key="submit" type="primary" onClick={submitEditUser} loading={isUpdatingUser}>
            Cập nhật
          </Button>
        ]}
      >
        <Form form={editForm} layout="vertical" className="mt-4">
          <Form.Item label="UID (Số ID nội bộ của máy)" name="uid">
            <Input readOnly disabled className="bg-slate-50 text-slate-500 font-mono" />
          </Form.Item>
          <Form.Item label="Mã NV (UserID)" name="userid" tooltip="Mã chấm công trên máy. Không thể thay đổi để tránh lệch dữ liệu.">
            <Input readOnly disabled className="bg-slate-50 text-slate-500 font-mono" />
          </Form.Item>
          <Form.Item 
            label="Tên hiển thị" 
            name="name" 
            rules={[{ required: true, message: 'Vui lòng nhập tên hiển thị' }]}
          >
            <Input placeholder="Nhập tên không dấu..." />
          </Form.Item>
          <Form.Item label="Mật khẩu (Tùy chọn)" name="password">
            <Input.Password placeholder="Để trống nếu không dùng" />
          </Form.Item>
          <Form.Item label="Quyền hạn" name="role" rules={[{ required: true }]}>
            <Select>
              <Select.Option value={0}>Nhân viên (User)</Select.Option>
              <Select.Option value={14}>Quản trị viên (Admin)</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
};
