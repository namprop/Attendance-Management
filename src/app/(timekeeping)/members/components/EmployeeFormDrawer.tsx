import React from 'react';
import { Drawer, Form, Row, Col, Input, Select, Button, Upload, Divider, Space, DatePicker, Radio, Modal, Table, message } from 'antd';
import { Camera, Plus, Building2, UserPlus, FileEdit, Contact, Fingerprint, ShieldCheck, ShieldAlert, Eye, Printer, Maximize, Minimize, Monitor, Server } from 'lucide-react';
import type { FormInstance } from 'antd/es/form';
import { BranchItem, LocationItem, DepartmentItem, DeptGroupItem, Employee, AuthRole, AuthUser } from '../types';
import { ContractA4Preview, ContractTemplate } from './ContractA4Preview';
import dayjs from 'dayjs';

interface AuthUserOption {
  value: string | number;
  label: React.ReactNode;
  isLinkedToOther: boolean;
  username: string;
  employeeCode?: string | null;
}
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface EmployeeFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  editingEmployee: Employee | null;
  form: FormInstance;
  isSubmitting: boolean;
  onSubmit: () => void;
  isTablet: boolean;
  
  branches: BranchItem[];
  locations: LocationItem[];
  departments: DepartmentItem[];
  groups: DeptGroupItem[];
  authRoles?: AuthRole[];
  authUsers?: AuthUser[];
  contractTypes?: { _id: string; name: string; templateId?: string; [key: string]: unknown }[];
  contractTemplates?: ContractTemplate[];
  
  avatarOptions: { value: string; label: string }[];
  renderAvatarPreview: (avatarUrl: string | undefined | null) => React.ReactNode;
  formAvatarWatch: string;
  modalBranchIdWatch?: string;
  modalLocationIdWatch?: string;
  modalGroupIdWatch?: string;
  
  setIsBranchModalOpen: (open: boolean) => void;
  setIsLocationModalOpen: (open: boolean) => void;
  setIsGroupModalOpen: (open: boolean) => void;
  setIsDeptModalOpen: (open: boolean) => void;
  
  removeVietnameseTones: (str: string) => string;
}

export const EmployeeFormDrawer: React.FC<EmployeeFormDrawerProps> = ({
  isOpen, onClose, editingEmployee, form, isSubmitting, onSubmit, isTablet,
  branches, locations, departments, groups, authRoles, authUsers,
  avatarOptions, renderAvatarPreview, formAvatarWatch,
  modalBranchIdWatch, modalLocationIdWatch, modalGroupIdWatch,
  setIsBranchModalOpen, setIsLocationModalOpen, setIsGroupModalOpen, setIsDeptModalOpen,
  removeVietnameseTones,
  contractTypes, contractTemplates
}) => {
  const accountActionWatch = Form.useWatch('accountAction', form);
  const accountIdWatch = Form.useWatch('accountId', form);
  const contractTypeIdWatch = Form.useWatch('contractTypeId', form);
  const employeeTypeWatch = Form.useWatch('employeeType', form);
  const hasContractWatch = Form.useWatch('hasContract', form) !== false; // Default true
  const employeeCodeWatch = Form.useWatch('employeeCode', form);

  const queryClient = useQueryClient();
  const [selectOpen, setSelectOpen] = React.useState(false);
  const [isConfirming, setIsConfirming] = React.useState(false);

  const confirmUnlinkUser = (user: AuthUser) => {
    setIsConfirming(true);
    Modal.confirm({
      title: 'Xác nhận gỡ liên kết',
      icon: <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />,
      content: `Bạn có chắc chắn muốn gỡ liên kết tài khoản "${user.username}" khỏi nhân viên có mã "${user.employeeCode}" không?`,
      okText: 'Gỡ liên kết',
      okType: 'danger',
      cancelText: 'Hủy',
      onCancel: () => {
        setIsConfirming(false);
        setSelectOpen(true);
      },
      onOk: async () => {
        try {
          const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update',
              field: user.id ? 'id' : '_id',
              value: user.id || user._id,
              data: { employeeCode: null }
            })
          });
          if (res.ok) {
            message.success(`Đã gỡ liên kết tài khoản "${user.username}" thành công!`);
            await queryClient.invalidateQueries({ queryKey: ['authUsers'] });
          } else {
            message.error('Gỡ liên kết tài khoản thất bại.');
          }
        } catch (err) {
          console.error(err);
          message.error('Lỗi kết nối khi gỡ liên kết.');
        } finally {
          setIsConfirming(false);
          setSelectOpen(true);
        }
      }
    });
  };

  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [isFullscreenPreview, setIsFullscreenPreview] = React.useState(false);

  // Lấy ra template liên kết với contractType đang chọn
  const activeContractType = contractTypes?.find(ct => ct._id === contractTypeIdWatch);
  const activeTemplate = contractTemplates?.find(t => String(t._id) === String(activeContractType?.templateId));

  interface ZktecoDevice {
    _id: string;
    id?: string;
    name?: string;
    deviceName?: string;
    ip?: string;
    ipAddress?: string;
    locationId?: string;
    branchId?: string;
    connectorId?: string;
  }

  interface ZktecoConnector {
    _id: string;
    name: string;
    code?: string;
  }

  const { data: devices = [], isLoading: isLoadingDevices } = useQuery<ZktecoDevice[]>({
    queryKey: ['zkteco-devices-form'],
    queryFn: async () => {
      const res = await fetch('/api/v1/zkteco-devices');
      const data = await res.json();
      return data.data || [];
    },
    enabled: isOpen
  });

  const { data: connectors = [] } = useQuery<ZktecoConnector[]>({
    queryKey: ['zkteco-connectors-form'],
    queryFn: async () => {
      const res = await fetch('/api/v1/zkteco-connectors');
      const data = await res.json();
      return data.data || [];
    },
    enabled: isOpen && devices.length > 0
  });

  const connectorMap = React.useMemo(() => {
    const map: Record<string, ZktecoConnector> = {};
    connectors.forEach(c => { map[c._id] = c; });
    return map;
  }, [connectors]);

  return (
    <Drawer
      title={
        <span className="flex items-center gap-2 font-extrabold text-slate-800 text-sm md:text-base uppercase tracking-wider font-mono">
          {editingEmployee ? (
            <>
              <FileEdit className="w-4 h-4 md:w-5 md:h-5 text-blue-500 shrink-0" />
              <span className="hidden sm:inline">Cập nhật Hồ Sơ Nhân Sự</span>
              <span className="sm:hidden">Cập nhật</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 md:w-5 md:h-5 text-blue-500 shrink-0" />
              <span className="hidden sm:inline">Đăng ký Hồ Sơ Nhân Sự Mới</span>
              <span className="sm:hidden">Thêm Mới</span>
            </>
          )}
        </span>
      }
      open={isOpen}
      size="large"
      styles={{ wrapper: { width: isTablet ? "100%" : "85%" } }}
      placement="right"
      onClose={onClose}
      destroyOnHidden
      className="font-sans"
      extra={
        <div className="flex items-center gap-1 md:gap-2">
          <Button onClick={onClose} className="rounded-lg font-medium px-2 sm:px-4">Bỏ qua</Button>
          <Button
            type="primary"
            onClick={onSubmit}
            loading={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold shadow-xs px-2 sm:px-4"
          >
            <span className="hidden sm:inline">{editingEmployee ? "Cập nhật hồ sơ" : "Lưu dữ liệu"}</span>
            <span className="sm:hidden">{editingEmployee ? "Cập nhật" : "Lưu"}</span>
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" className="p-1">
        <Row gutter={24}>
          {/* Cột trái: Hình nhân viên & Chọn biểu tượng */}
          <Col xs={24} lg={6}>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 shadow-inner space-y-4 flex flex-col items-center">
              <div className="w-full text-left">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Camera className="w-4 h-4 text-slate-400" />
                  Hình nhân viên
                </span>
              </div>

              {/* Khung ảnh thẻ 3x4 đứng cao cấp */}
              <div className="relative w-40 h-52 rounded-xl overflow-hidden border border-dashed border-slate-300 shadow-md bg-white flex items-center justify-center shrink-0">
                {renderAvatarPreview(formAvatarWatch)}
              </div>

              <span className="text-[10px] text-slate-400 text-center leading-normal">
                Ảnh thẻ tỷ lệ 3x4. Biểu tượng sẽ tự động thay đổi theo lựa chọn bên dưới.
              </span>

              <div className="w-full mt-2">
                <Form.Item name="avatar" label="Biểu tượng đại diện" initialValue="User" className="mb-0">
                  <Select className="h-9 w-full" options={avatarOptions} />
                </Form.Item>
                <div className="mt-3">
                  <Upload
                    accept="image/*"
                    showUploadList={false}
                    beforeUpload={(file) => {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        const base64 = e.target?.result as string;
                        form.setFieldValue('avatar', base64);
                      };
                      reader.readAsDataURL(file);
                      return false; // Stop auto upload
                    }}
                  >
                    <Button className="w-full flex items-center justify-center text-xs font-semibold border-dashed hover:border-blue-500 hover:text-blue-500 transition-colors h-9">
                      <Camera className="w-4 h-4 mr-2" />
                      Tải ảnh cá nhân
                    </Button>
                  </Upload>
                </div>
              </div>

              <div className="w-full mt-4 pt-4 border-t border-slate-200">
                <Form.Item name="employeeCode" label="Mã nhân viên" rules={[{ required: true, message: 'Vui lòng nhập mã NV' }]}>
                  <Input placeholder="Ví dụ: NV123456" className="font-mono rounded-lg h-9 w-full" disabled={!!editingEmployee} />
                </Form.Item>
                <Form.Item name="status" label="Trạng thái nhân sự" initialValue="ACTIVE" className="mb-0">
                  <Select className="h-9 w-full" options={[
                    { value: 'ACTIVE', label: 'Hoạt động' },
                    { value: 'INACTIVE', label: 'Tạm khóa' },
                  ]} />
                </Form.Item>
              </div>
            </div>
          </Col>

          {/* Cột phải: Toàn bộ Form thông tin chi tiết */}
          <Col xs={24} lg={18}>
            <div className="space-y-6">
              
              {/* Phân vùng 0: Tài khoản hệ thống */}
              <div>
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                  <ShieldCheck className="w-5 h-5 text-blue-500" />
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider m-0">Tài khoản hệ thống</h3>
                </div>

                <Form.Item name="accountAction" initialValue="none" className="mb-4">
                  <Radio.Group className="flex flex-col sm:flex-row gap-4">
                    <Radio value="create">Tạo tài khoản mới</Radio>
                    <Radio value="link">Liên kết tài khoản có sẵn</Radio>
                    <Radio value="none">Không cấp tài khoản</Radio>
                  </Radio.Group>
                </Form.Item>

                {accountActionWatch === 'create' && (
                  <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 mb-6 space-y-3">
                    <p className="text-xs text-blue-700 m-0">
                      Mật khẩu ngẫu nhiên 10 ký tự sẽ được tạo và gửi thẳng vào Email của nhân viên để đảm bảo bảo mật. Tên đăng nhập sẽ được cắt tự động từ Email.
                    </p>
                    <Row gutter={[16, 12]}>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          name="authRole"
                          label="Phân quyền (Role)"
                          rules={[{ required: true, message: 'Vui lòng chọn phân quyền' }]}
                          className="mb-0"
                        >
                          <Select
                            placeholder="Chọn nhóm quyền..."
                            className="h-9"
                            options={authRoles?.map(r => ({ value: r.id || r._id, label: r.name })) || []}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                )}

                {accountActionWatch === 'link' && (
                  <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-200 mb-6">
                    <Row gutter={[16, 12]}>
                      <Col xs={24} sm={16}>
                        <Form.Item
                          name="accountId"
                          label="Chọn tài khoản User"
                          rules={[{ required: true, message: 'Vui lòng chọn tài khoản' }]}
                          className="mb-0"
                          extra={
                            <span className="text-[11px] text-slate-400 mt-1 block">
                              ⚠️ Tài khoản đã liên kết NV khác sẽ hiển thị nút <strong>Gỡ liên kết ngay</strong> bên cạnh.
                            </span>
                          }
                        >
                          <Select
                            placeholder="Chọn tài khoản để liên kết..."
                            className="h-9"
                            showSearch
                            optionFilterProp="label"
                            open={selectOpen}
                            onDropdownVisibleChange={(visible) => {
                              if (isConfirming) return;
                              setSelectOpen(visible);
                            }}
                            onSelect={(value, option) => {
                              const opt = option as AuthUserOption | undefined;
                              if (opt?.isLinkedToOther) {
                                form.setFieldValue('accountId', undefined);
                                return false;
                              }
                            }}
                            onChange={(value, option) => {
                              const opt = Array.isArray(option) ? option[0] : option;
                              const userOpt = opt as AuthUserOption | undefined;
                              if (userOpt?.isLinkedToOther) {
                                form.setFieldValue('accountId', undefined);
                              }
                            }}
                            options={authUsers?.map((u: AuthUser) => {
                              const isLinkedToOther = u.employeeCode && u.employeeCode !== editingEmployee?.employeeCode;
                              return {
                                value: u.id || u._id,
                                isLinkedToOther,
                                username: u.username,
                                employeeCode: u.employeeCode,
                                label: (
                                  <div className="flex items-center justify-between w-full py-0.5">
                                    <span className={isLinkedToOther ? "text-slate-400 font-normal" : "text-slate-700 font-semibold"}>
                                      {isLinkedToOther ? `🔒 ${u.username} — Đã liên kết ${u.employeeCode}` : u.username}
                                      {u.email && <span className="text-xs text-slate-400 font-mono ml-1.5">({u.email})</span>}
                                    </span>
                                    {isLinkedToOther && (
                                      <button
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          confirmUnlinkUser(u);
                                        }}
                                        className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 rounded px-1.5 py-0.5 transition-colors cursor-pointer"
                                      >
                                        Gỡ liên kết ngay
                                      </button>
                                    )}
                                  </div>
                                )
                              };
                            }) || []}
                          />
                        </Form.Item>
                      </Col>
                    </Row>


                    {/* Badge hiển thị thông tin user đã liên kết */}
                    {(() => {
                      const linkedUser = authUsers?.find((u: AuthUser) =>
                        String(u.id || u._id) === String(accountIdWatch)
                      );
                      if (!linkedUser) return null;
                      return (
                        <div className="mt-3 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider m-0">Đã liên kết tài khoản</p>
                            <p className="text-sm font-bold text-slate-800 m-0 truncate">
                              {linkedUser.name || linkedUser.username}
                              <span className="text-xs font-mono text-slate-500 ml-2">@{linkedUser.username}</span>
                            </p>
                            {linkedUser.email && (
                              <p className="text-xs text-slate-500 m-0 truncate">{linkedUser.email}</p>
                            )}
                          </div>
                          {/* Nút gỡ liên kết trực tiếp */}
                          <button
                            type="button"
                            onClick={() => {
                              form.setFieldsValue({ accountAction: 'none', accountId: '' });
                            }}
                            className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-red-500 border border-red-200 bg-white hover:bg-red-50 hover:border-red-400 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
                            title="Gỡ liên kết tài khoản này"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/><line x1="4" x2="20" y1="4" y2="20"/>
                            </svg>
                            Gỡ liên kết
                          </button>
                        </div>
                      );
                    })()}

                  </div>
                )}
              </div>

              {/* Phân vùng 1: Tổ chức & Vị trí */}
              <div>
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                  <Building2 className="w-5 h-5 text-blue-500" />
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider m-0">Thông tin Tổ chức & Công tác</h3>
                </div>

                <Row gutter={[16, 12]}>
                  <Col xs={24} md={12}>
                    <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}>
                      <Input
                        placeholder="Ví dụ: Nguyễn Văn A"
                        className="rounded-lg h-9"
                        onChange={(e) => {
                          const val = e.target.value;
                          const unaccented = removeVietnameseTones(val);
                          form.setFieldValue('unaccentedName', unaccented);
                        }}
                      />
                    </Form.Item>
                  </Col>


                  <Col xs={24} md={12}>
                    <Form.Item name="role" label="Chức vụ / Vai trò" rules={[{ required: true, message: 'Vui lòng chọn chức vụ / vai trò' }]}>
                      <Select
                        placeholder="Chọn chức vụ / vai trò..."
                        className="h-9"
                        showSearch
                        optionFilterProp="label"
                        options={authRoles?.map(r => ({ value: r.id || r._id, label: r.name })) || []}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item name="employeeType" label="Loại nhân viên" rules={[{ required: true, message: 'Vui lòng chọn loại nhân viên' }]} initialValue="full_time">
                      <Select
                        placeholder="Chọn loại nhân viên..."
                        className="h-9"
                        options={[
                          { value: 'full_time', label: 'Toàn thời gian (Full-time)' },
                          { value: 'part_time', label: 'Bán thời gian (Part-time)' }
                        ]}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <label className="text-sm font-semibold text-slate-800">Ký hợp đồng lao động</label>
                      </div>
                      <Form.Item name="hasContract" initialValue={true} className="mb-2">
                        <Radio.Group onChange={(e) => {
                          if (!e.target.value) {
                            form.setFieldValue('contractTypeId', undefined);
                          }
                        }}>
                          <Radio value={true}>Có hợp đồng</Radio>
                          <Radio value={false}>Không có hợp đồng</Radio>
                        </Radio.Group>
                      </Form.Item>
                      
                      {hasContractWatch && (
                        <div className="flex gap-2">
                          <Form.Item
                            name="contractTypeId"
                            rules={[{ required: true, message: 'Chọn loại hợp đồng' }]}
                            className="flex-1 mb-0"
                          >
                            <Select
                              placeholder="Chọn loại hợp đồng..."
                              className="h-9"
                              options={contractTypes?.filter(ct => ct.isActive).map(ct => ({
                                value: ct._id,
                                label: ct.name
                              })) || []}
                              showSearch
                              optionFilterProp="label"
                            />
                          </Form.Item>
                          <Button 
                            icon={<Eye size={16} />} 
                            className="h-9 w-9 shrink-0 text-slate-500 hover:text-blue-600 border-slate-300"
                            onClick={() => setIsPreviewOpen(true)}
                            title="Xem trước Hợp đồng"
                            disabled={!activeTemplate || !contractTypeIdWatch}
                          />
                        </div>
                      )}
                    </div>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item name="branchId" label="Chi nhánh" rules={[{ required: true, message: 'Chọn chi nhánh' }]}>
                      <Select
                        placeholder="Chọn chi nhánh..."
                        className="h-9"
                        options={branches.map(b => ({ value: b._id || b.id, label: b.name }))}
                        onChange={() => form.setFieldValue('locationId', undefined)}
                        dropdownRender={(menu) => (
                          <>
                            {menu}
                            <Divider style={{ margin: '8px 0' }} />
                            <div className="p-2">
                              <Button type="dashed" block icon={<Plus className="w-4 h-4" />} onClick={() => setIsBranchModalOpen(true)}>
                                Thêm Chi nhánh nhanh
                              </Button>
                            </div>
                          </>
                        )}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item name="locationId" label="Cơ sở chấm công" rules={[{ required: true, message: 'Chọn cơ sở' }]}>
                      <Select
                        placeholder="Chọn cơ sở..."
                        className="h-9"
                        disabled={!modalBranchIdWatch}
                        options={locations
                          .filter(l => l.branchId && modalBranchIdWatch && String(l.branchId) === String(modalBranchIdWatch))
                          .map(l => ({ value: l._id || l.id, label: l.locationName }))}
                        onChange={() => form.setFieldValue('deptGroupId', undefined)}
                        dropdownRender={(menu) => (
                          <>
                            {menu}
                            <Divider style={{ margin: '8px 0' }} />
                            <div className="p-2">
                              <Button type="dashed" block icon={<Plus className="w-4 h-4" />} onClick={() => setIsLocationModalOpen(true)}>
                                Thêm Cơ sở nhanh
                              </Button>
                            </div>
                          </>
                        )}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item name="deptGroupId" label="Khối / Cụm phòng ban">
                      <Select
                        placeholder="Chọn khối cụm..."
                        className="h-9"
                        allowClear
                        disabled={!modalLocationIdWatch}
                        options={groups
                          .filter(g => g.locationId && modalLocationIdWatch && String(g.locationId) === String(modalLocationIdWatch))
                          .map(g => ({ value: g._id, label: g.name }))}
                        onChange={() => form.setFieldValue('departmentId', undefined)}
                        dropdownRender={(menu) => (
                          <>
                            {menu}
                            <Divider style={{ margin: '8px 0' }} />
                            <div className="p-2">
                              <Button type="dashed" block icon={<Plus className="w-4 h-4" />} onClick={() => setIsGroupModalOpen(true)}>
                                Thêm Khối / Cụm nhanh
                              </Button>
                            </div>
                          </>
                        )}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item name="departmentId" label="Phòng ban" rules={[{ required: true, message: 'Chọn phòng ban' }]}>
                      <Select
                        placeholder="Chọn phòng ban..."
                        className="h-9"
                        disabled={!modalGroupIdWatch && !modalLocationIdWatch}
                        options={departments
                          .filter(d => modalGroupIdWatch 
                            ? (d.departmentGroupTimekeepingId && String(d.departmentGroupTimekeepingId) === String(modalGroupIdWatch)) 
                            : (d.locationId && modalLocationIdWatch && String(d.locationId) === String(modalLocationIdWatch))
                          )
                          .map(d => ({ value: d._id, label: d.name }))}
                        dropdownRender={(menu) => (
                          <>
                            {menu}
                            <Divider style={{ margin: '8px 0' }} />
                            <div className="p-2">
                              <Button type="dashed" block icon={<Plus className="w-4 h-4" />} onClick={() => setIsDeptModalOpen(true)}>
                                Thêm Phòng ban nhanh
                              </Button>
                            </div>
                          </>
                        )}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      name="joinDate"
                      label="Ngày vào làm"
                      rules={[{ required: true, message: 'Vui lòng chọn ngày vào làm' }]}
                    >
                      <DatePicker format="DD/MM/YYYY" placeholder="Chọn ngày..." className="w-full h-9" />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              {/* Phân vùng 2: Lý lịch & Liên hệ */}
              <div>
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                  <Contact className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider m-0">Thông tin Cá nhân & Lý lịch</h3>
                </div>

                <Row gutter={[16, 12]}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="phone"
                      label="Số điện thoại di động"
                      rules={[
                        { required: true, message: 'Vui lòng nhập số điện thoại' },
                        { pattern: /^(0|\+84)[3|5|7|8|9][0-9]{8}$/, message: 'Số điện thoại không hợp lệ (VD: 0987654321)' }
                      ]}
                    >
                      <Input placeholder="Ví dụ: 0987654321" className="rounded-lg h-9 font-mono" />
                    </Form.Item>
                  </Col>

                   <Col xs={24} md={12}>
                    <Form.Item
                      name="email"
                      label="Địa chỉ Email"
                      rules={[
                        { required: true, message: 'Vui lòng nhập email' },
                        { type: 'email', message: 'Email không hợp lệ' },
                        {
                          validator: async (_, value) => {
                            if (!value || typeof value !== 'string') return;
                            const trimmed = value.trim();
                            // Email regex chuẩn để nhận biết đã nhập xong định dạng email hợp lệ
                            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                            if (!emailRegex.test(trimmed)) {
                              return;
                            }
                            try {
                              const empId = editingEmployee?.id || editingEmployee?._id;
                              const url = `/api/v1/employees?checkEmail=${encodeURIComponent(trimmed)}` + 
                                (empId ? `&excludeId=${empId}` : '');
                              const res = await fetch(url);
                              const data = await res.json();
                              if (res.ok && data.exists) {
                                throw new Error(data.message || 'Địa chỉ Email đã được sử dụng bởi nhân sự khác.');
                              }
                            } catch (err) {
                              throw new Error((err as Error).message);
                            }
                          }
                        }
                      ]}
                    >
                      <Input placeholder="Ví dụ: hotro@abc.com" className="rounded-lg h-9 font-mono" type="email" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      name="identityCard"
                      label="Số CMND / CCCD"
                      rules={[
                        { pattern: /^\d{9}(\d{3})?$/, message: 'CMND/CCCD phải có 9 hoặc 12 chữ số' }
                      ]}
                    >
                      <Input placeholder="Ví dụ: 0123456789" className="rounded-lg h-9 font-mono" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      name="taxCode"
                      label="Mã số thuế"
                    >
                      <Input placeholder="Không bắt buộc" className="rounded-lg h-9 font-mono" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item name="dateOfBirth" label="Ngày sinh">
                      <DatePicker format="DD/MM/YYYY" placeholder="Chọn ngày..." className="w-full h-9" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item name="gender" label="Giới tính">
                      <Select className="h-9" options={[
                        { value: 'Nam', label: 'Nam' },
                        { value: 'Nữ', label: 'Nữ' },
                        { value: 'Khác', label: 'Khác' },
                      ]} placeholder="Chọn giới tính" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item name="nativePlace" label="Nguyên quán / Nơi sinh">
                      <Input placeholder="Ví dụ: Hà Nội" className="rounded-lg h-9" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item name="ethnicity" label="Dân tộc" initialValue="Kinh">
                      <Input placeholder="Ví dụ: Kinh" className="rounded-lg h-9" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item name="nationality" label="Quốc tịch" initialValue="Việt Nam">
                      <Input placeholder="Ví dụ: Việt Nam" className="rounded-lg h-9" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={24}>
                    <Form.Item
                      name="address"
                      label="Địa chỉ thường trú"
                      rules={[{ min: 5, message: 'Địa chỉ quá ngắn (tối thiểu 5 ký tự)' }]}
                    >
                      <Input placeholder="Ghi rõ số nhà, đường, xã, huyện..." className="rounded-lg h-9" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      name="bankName"
                      label="Tên ngân hàng"
                    >
                      <Input placeholder="Ví dụ: Vietcombank, Techcombank..." className="rounded-lg h-9" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      name="bankAccount"
                      label="Số tài khoản ngân hàng"
                    >
                      <Input placeholder="Ví dụ: 1234567890" className="font-mono rounded-lg h-9" />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              {/* Phân vùng 3: ZKTeco Machine Settings */}
              <div>
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                  <Fingerprint className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider m-0">Cấu hình trên Thiết bị Chấm công (ZKTeco)</h3>
                </div>

                <Row gutter={[16, 12]}>
                  <Col xs={24} md={12}>
                    <Form.Item label="Mã NV (UserID trên máy ZKTeco)">
                      <Input value={employeeCodeWatch || 'Tự động lấy theo Mã NV'} readOnly className="font-mono rounded-lg h-9 bg-slate-50 text-slate-500" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item name="unaccentedName" label="Tên không dấu trên máy">
                      <Input placeholder="Ví dụ: do trung kien" className="font-mono rounded-lg h-9" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item name="cardNo" label="Mã số thẻ từ (RFID Card)">
                      <Input placeholder="Ví dụ: 0001234567" className="font-mono rounded-lg h-9" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item name="devicePassword" label="Mật mã trên thiết bị (Mã PIN)">
                      <Input.Password placeholder="Nhập mã pin số..." className="font-mono rounded-lg h-9" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item name="devicePrivilege" label="Phân quyền trên máy" initialValue="Nhân viên">
                      <Select className="h-9" options={[
                        { value: 'Nhân viên', label: 'Nhân viên (Thường)' },
                        { value: 'Quản trị viên', label: 'Quản trị viên (Admin máy)' },
                      ]} />
                    </Form.Item>
                  </Col>

                  <Col xs={24}>
                    <Form.Item name="linkedDevices" label="Liên kết máy chấm công vật lý">
                      <Form.Item noStyle name="linkedDevices">
                        <ZktecoDeviceTable devices={devices} connectorMap={connectorMap} loading={isLoadingDevices} />
                      </Form.Item>
                    </Form.Item>
                  </Col>
                </Row>
              </div>

            </div>
          </Col>
        </Row>
      </Form>

      <Modal
        title={
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              <span>Xem trước Hợp đồng — {activeTemplate?.templateName || 'Không tìm thấy mẫu'}</span>
            </div>
            <Button 
              type="text" 
              icon={isFullscreenPreview ? <Minimize size={16} /> : <Maximize size={16} />} 
              onClick={() => setIsFullscreenPreview(!isFullscreenPreview)} 
              title={isFullscreenPreview ? "Thu nhỏ" : "Phóng to toàn màn hình"}
            />
          </div>
        }
        open={isPreviewOpen}
        onCancel={() => { setIsPreviewOpen(false); setIsFullscreenPreview(false); }}
        footer={[
          <Button key="close" onClick={() => { setIsPreviewOpen(false); setIsFullscreenPreview(false); }}>Đóng</Button>,
          <Button key="print" type="primary" icon={<Printer size={14} />}
            className="bg-blue-600 hover:bg-blue-700"
            onClick={async () => {
              try {
                await form.validateFields();
              } catch (error) {
                setIsPreviewOpen(false); // Close preview to show the form errors
                return;
              }

              const el = document.getElementById('employee-creation-contract-preview');
              if (!el) return;
              const win = window.open('', '_blank');
              if (!win) return;
              win.document.write(`<!DOCTYPE html><html><head><title>Xem trước Hợp đồng</title><style>
                * { box-sizing: border-box; }
                body { margin: 0; font-family: 'Times New Roman', serif; }
                @page { size: A4 portrait; margin: 0; }
                @media print { body { margin: 0; } }
              </style></head><body>${el.outerHTML}</body></html>`);
              win.document.close();
              win.focus();
              setTimeout(() => win.print(), 500);
            }}
          >
            In nhanh
          </Button>
        ]}
        width={isFullscreenPreview ? '100vw' : 850}
        style={isFullscreenPreview ? { top: 0, padding: 0, margin: 0, maxWidth: '100vw' } : { top: 20 }}
        bodyStyle={{ 
          height: isFullscreenPreview ? 'calc(100vh - 110px)' : '75vh', 
          overflowY: 'auto', 
          padding: '24px',
          backgroundColor: '#f1f5f9'
        }}
        destroyOnHidden
      >
        <div id="employee-creation-contract-preview" className="shadow-lg mx-auto bg-white" style={{ width: '210mm', minHeight: '297mm' }}>
          {activeTemplate ? (
            <ContractA4Preview 
              template={activeTemplate}
              employee={{
                ...(editingEmployee || {}),
                ...form.getFieldsValue(),
                id: editingEmployee?.id || 'NEW_EMP',
                _id: editingEmployee?._id || 'NEW_EMP',
                // Make sure to parse joinDate correctly
                joinDate: form.getFieldValue('joinDate') ? form.getFieldValue('joinDate').toISOString() : '',
                dateOfBirth: form.getFieldValue('dateOfBirth') ? form.getFieldValue('dateOfBirth').toISOString() : '',
                // find dept name, branch name
                locationName: locations.find(l => l._id === form.getFieldValue('locationId'))?.locationName || '',
              } as Employee}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 p-12 text-center">
              <div>
                <FileEdit className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p>Mẫu hợp đồng không tồn tại hoặc đã bị xóa.</p>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </Drawer>
  );
};

const ZktecoDeviceTable: React.FC<{
  devices: {
    _id: string;
    id?: string;
    name?: string;
    deviceName?: string;
    ip?: string;
    ipAddress?: string;
    connectorId?: string;
  }[];
  connectorMap: Record<string, { _id: string; name: string; code?: string }>;
  loading: boolean;
  value?: string[];
  onChange?: (value: string[]) => void;
}> = ({ devices, connectorMap, loading, value = [], onChange }) => {
  const columns = [
    {
      title: 'Danh sách thiết bị có sẵn',
      dataIndex: 'deviceName',
      key: 'deviceName',
      render: (text: string, record: { _id: string; id?: string; name?: string; ip?: string; ipAddress?: string; connectorId?: string }) => {
        const connector = record.connectorId ? connectorMap[record.connectorId] : null;
        return (
          <div className="flex items-start gap-3 py-1">
            <div className="mt-0.5 bg-blue-50 text-blue-500 p-2 rounded-xl border border-blue-100/50 shadow-sm shrink-0">
              <Monitor className="w-4 h-4" />
            </div>
            <div className="font-medium text-slate-700">
              <div className="text-[13px] font-bold text-slate-800">{text || record.name}</div>
              <div className="text-[11px] text-slate-500 mt-1 flex flex-col gap-1">
                <span className="flex items-center gap-1.5">
                  <span className="opacity-75">IP:</span> 
                  <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md border border-slate-200/60">
                    {record.ipAddress || record.ip}
                  </span>
                </span>
                {connector && (
                  <span className="text-indigo-600 font-medium flex items-center gap-1.5 bg-indigo-50 px-1.5 py-0.5 rounded-md w-fit border border-indigo-100/50">
                    <Server className="w-3 h-3 opacity-70" />
                    Cổng: {connector.name || connector.code}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      }
    }
  ];

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden mt-1 shadow-sm bg-white">
      <Table 
        size="small"
        rowKey={(record) => record._id || record.id || ''}
        dataSource={devices}
        columns={columns}
        pagination={false}
        loading={loading}
        rowSelection={{
          selectedRowKeys: value,
          onChange: (selectedRowKeys) => onChange?.(selectedRowKeys as string[]),
          columnWidth: 48
        }}
        scroll={{ y: 240 }}
        className="[&_.ant-table-thead>tr>th]:bg-slate-50 [&_.ant-table-thead>tr>th]:text-xs [&_.ant-table-thead>tr>th]:uppercase [&_.ant-table-thead>tr>th]:text-slate-500 [&_.ant-table-tbody>tr>td]:border-b-slate-100 [&_.ant-table-tbody>tr:last-child>td]:border-0"
      />
    </div>
  );
};
