'use client';

import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Popconfirm, message, Space, Switch, Divider, InputNumber } from 'antd';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import type { DepartmentTimekeeping, DepartmentGroupTimekeeping, KioskLocation, BranchTimekeeping } from '@/app/interface/timekeeping';
import { WithPermission } from '@/app/service/permissions/permission-gate';
import { cookieBase } from '@/app/utils/cookie';
import type { User } from '@/app/data/dataUser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export default function DepartmentTab() {
  const userInfo = cookieBase.get<User>('info_user');
  const roleId = userInfo?.role ?? '';
  const queryClient = useQueryClient();

  const { data: departments = [], isLoading: isDepartmentsLoading } = useQuery<DepartmentTimekeeping[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await fetch('/api/departments-timekeeping');
      const data = await res.json();
      return data.data || [];
    }
  });

  const { data: groups = [], isLoading: isGroupsLoading } = useQuery<DepartmentGroupTimekeeping[]>({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await fetch('/api/department-groups-timekeeping');
      const data = await res.json();
      return data.data || [];
    }
  });

  const { data: locations = [], isLoading: isLocationsLoading } = useQuery<KioskLocation[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      const res = await fetch('/api/v1/kiosk/locations');
      const data = await res.json();
      return data.data || [];
    }
  });

  const { data: branches = [], isLoading: isBranchesLoading } = useQuery<BranchTimekeeping[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await fetch('/api/branch-timekeeping');
      const data = await res.json();
      return data.data || [];
    }
  });

  const isLoading = isDepartmentsLoading || isGroupsLoading || isLocationsLoading || isBranchesLoading;

  // Bộ lọc states
  const [filterSearch, setFilterSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState<string | null>(null);
  const [filterLocation, setFilterLocation] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<boolean | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  // Quick Create States
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  
  const [branchForm] = Form.useForm();
  const [locationForm] = Form.useForm();
  const [groupForm] = Form.useForm();

  const branchIdWatch = Form.useWatch('branchTimekeepingId', form);
  const locationIdWatch = Form.useWatch('locationId', form);

  const fetchData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['departments'] }),
      queryClient.invalidateQueries({ queryKey: ['groups'] }),
      queryClient.invalidateQueries({ queryKey: ['locations'] }),
      queryClient.invalidateQueries({ queryKey: ['branches'] })
    ]);
  }, [queryClient]);

  const handleOpenCreate = () => {
    form.resetFields();
    setEditingId(null);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce.detail === 'departments') {
        handleOpenCreate();
      } else if (typeof ce.detail === 'string') {
        const val = ce.detail;
        if (val.startsWith('branch-')) {
          const bId = val.replace('branch-', '');
          setFilterBranch(bId);
          setFilterLocation(null);
          setFilterGroup(null);
        } else if (val.startsWith('dept-')) {
          const dId = val.replace('dept-', '');
          const dept = departments.find(d => d._id === dId);
          if (dept) {
            setFilterSearch(dept.name); // Hoặc chỉ để search
          }
        }
      } else if (ce.detail === null) {
        setFilterBranch(null);
        setFilterLocation(null);
        setFilterSearch('');
      }
    };
    window.addEventListener('open-org-modal', handler);
    window.addEventListener('org-filter', handler);
    return () => {
      window.removeEventListener('open-org-modal', handler);
      window.removeEventListener('org-filter', handler);
    };
  }, [departments]);

  const handleOpenEdit = (record: DepartmentTimekeeping) => {
    // Find branch based on location
    const loc = locations.find(l => l._id === record.locationId);
    
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      shortCode: record.shortCode,
      shortName: record.shortName,
      branchTimekeepingId: loc?.branchId, // For UI filter only
      locationId: record.locationId,
      departmentGroupTimekeepingId: record.departmentGroupTimekeepingId,
      isActive: record.isActive,
    });
    setEditingId(record._id || null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/departments-timekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', _id: id }),
      });
      const data = await res.json();
      if (res.ok) {
        message.success('Xóa Phòng ban thành công');
        fetchData();
      } else {
        message.error(data.message || 'Lỗi khi xóa');
      }
    } catch (err) {
      message.error('Lỗi hệ thống');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);
      const action = editingId ? 'edit' : 'add';
      const body = { action, ...values, _id: editingId };

      const res = await fetch('/api/departments-timekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        message.success(editingId ? 'Cập nhật thành công' : 'Thêm mới thành công');
        setIsModalOpen(false);
        fetchData();
      } else {
        message.error(data.message || 'Lỗi khi lưu');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Create Handlers
  const handleQuickCreateBranch = async () => {
    try {
      const values = await branchForm.validateFields();
      const body = {
        action: 'add',
        name: values.name,
        code: values.code || values.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        shortCode: values.shortCode || '',
        location: values.location || '',
        status: 'Active'
      };
      const res = await fetch('/api/branch-timekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        message.success('Thêm chi nhánh thành công');
        setIsBranchModalOpen(false);
        branchForm.resetFields();
        await fetchData();
        form.setFieldValue('branchTimekeepingId', data.data._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickCreateLocation = async () => {
    try {
      const values = await locationForm.validateFields();
      const body = {
        locationName: values.locationName,
        branchId: form.getFieldValue('branchTimekeepingId'),
        locationSlug: values.locationName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        shortCode: values.shortCode || '',
        status: 'ACTIVE',
        allowedRadiusMeters: 100
      };

      const res = await fetch('/api/v1/kiosk/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        message.success('Thêm cơ sở thành công');
        setIsLocationModalOpen(false);
        locationForm.resetFields();
        await fetchData();
        form.setFieldValue('locationId', data.data._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickCreateGroup = async () => {
    try {
      const values = await groupForm.validateFields();
      const body = {
        action: 'add',
        name: values.name,
        code: values.code || values.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        shortCode: values.shortCode || '',
        locationId: form.getFieldValue('locationId'),
        isActive: true
      };

      const res = await fetch('/api/department-groups-timekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        message.success('Thêm khối/cụm thành công');
        setIsGroupModalOpen(false);
        groupForm.resetFields();
        await fetchData();
        form.setFieldValue('departmentGroupTimekeepingId', data.data._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Logic lọc dữ liệu
  const filteredDepartments = departments.filter(d => {
    if (filterSearch) {
      const searchLower = filterSearch.toLowerCase();
      const matches = d.name.toLowerCase().includes(searchLower) || 
                      d.code.toLowerCase().includes(searchLower) || 
                      (d.shortName && d.shortName.toLowerCase().includes(searchLower));
      if (!matches) return false;
    }
    
    const loc = locations.find(l => l._id === d.locationId);
    if (filterBranch) {
      if (!loc || loc.branchId !== filterBranch) return false;
    }
    
    if (filterLocation) {
      if (d.locationId !== filterLocation) return false;
    }
    if (filterGroup) {
      if (d.departmentGroupTimekeepingId !== filterGroup) return false;
    }
    if (filterStatus !== null) {
      if (d.isActive !== filterStatus) return false;
    }
    return true;
  });

  // Cascading options cho bộ lọc ngang
  const searchBranchLocations = locations.filter(l => !filterBranch || l.branchId === filterBranch);
  const searchLocationGroups = groups.filter(g => !filterLocation || g.locationId === filterLocation);

  const columns = [
    {
      title: 'Phòng ban',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: DepartmentTimekeeping) => (
        <div>
          <div className="font-semibold text-slate-800">{text} {record.shortName ? `(${record.shortName})` : ''}</div>
          <div className="text-xs text-slate-500 font-mono">/{record.code}</div>
        </div>
      ),
    },
    {
      title: 'Mã viết tắt',
      dataIndex: 'shortCode',
      key: 'shortCode',
      render: (text: string) => text ? <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">{text}</span> : <span className="text-slate-400 italic">---</span>,
    },
    {
      title: 'Thuộc Khối/Cụm',
      dataIndex: 'departmentGroupTimekeepingId',
      key: 'group',
      render: (val: string) => {
        const grp = groups.find(g => g._id === val);
        return <span className="font-medium text-amber-600">{grp?.name || '---'}</span>;
      },
    },
    {
      title: 'Thuộc Cơ sở / Điểm',
      dataIndex: 'locationId',
      key: 'locationId',
      render: (val: string) => {
        const loc = locations.find(l => l._id === val);
        return <span className="text-slate-600">{loc?.locationName || '---'}</span>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isActive ? 'Hoạt động' : 'Tạm khóa'}
        </span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: unknown, record: DepartmentTimekeeping) => (
        <Space>
          <WithPermission permission="timekeeping_department_edit" roleId={roleId}>
            <Button type="text" icon={<Pencil className="w-4 h-4 text-blue-600" />} onClick={() => handleOpenEdit(record)} />
          </WithPermission>
          <WithPermission permission="timekeeping_department_delete" roleId={roleId}>
            <Popconfirm title="Xóa phòng ban này?" onConfirm={() => handleDelete(record._id!)}>
              <Button type="text" danger icon={<Trash2 className="w-4 h-4" />} />
            </Popconfirm>
          </WithPermission>
        </Space>
      ),
    },
  ];

  // Filter based on hierarchy for modal quick create
  const filteredLocations = locations.filter(l => {
    if (!branchIdWatch) return true;
    const selectedBranch = branches.find(b => (b._id && b._id === branchIdWatch) || (b.id && b.id === branchIdWatch));
    if (!selectedBranch) return l.branchId === branchIdWatch;
    return l.branchId === selectedBranch._id || l.branchId === selectedBranch.id;
  });
  
  const filteredGroups = groups.filter(g => !locationIdWatch || g.locationId === locationIdWatch);

  return (
    <div className="pt-2">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 m-0">Danh sách Phòng ban</h3>
          <p className="text-xs text-slate-400">Chi tiết các phòng ban, đội nhóm làm việc.</p>
        </div>
        <WithPermission permission="timekeeping_department_create" roleId={roleId}>
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
            Thêm Phòng ban
          </Button>
        </WithPermission>
      </div>

      {/* Bộ lọc Inline Filter Bar */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Tìm theo tên, viết tắt hoặc mã phòng..."
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            prefix={<Search className="w-4 h-4 text-slate-400 mr-1" />}
            allowClear
          />
        </div>
        <div className="w-48">
          <Select
            placeholder="Lọc Chi nhánh"
            className="w-full"
            allowClear
            value={filterBranch}
            onChange={(val) => {
              setFilterBranch(val);
              setFilterLocation(null);
              setFilterGroup(null);
            }}
            options={branches.map(b => ({ label: b.name, value: b._id || b.id }))}
          />
        </div>
        <div className="w-48">
          <Select
            placeholder="Lọc Cơ sở / Điểm"
            className="w-full"
            allowClear
            value={filterLocation}
            onChange={(val) => {
              setFilterLocation(val);
              setFilterGroup(null);
            }}
            options={searchBranchLocations.map(l => ({ label: l.locationName, value: l._id }))}
          />
        </div>
        <div className="w-48">
          <Select
            placeholder="Lọc Khối / Cụm"
            className="w-full"
            allowClear
            value={filterGroup}
            onChange={setFilterGroup}
            options={searchLocationGroups.map(g => ({ label: g.name, value: g._id }))}
          />
        </div>
        <div className="w-36">
          <Select
            placeholder="Lọc trạng thái"
            className="w-full"
            allowClear
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { label: 'Hoạt động', value: true },
              { label: 'Tạm khóa', value: false },
            ]}
          />
        </div>
        {(filterSearch || filterBranch || filterLocation || filterGroup || filterStatus !== null) && (
          <Button 
            type="text" 
            danger 
            className="flex items-center gap-1 text-xs font-semibold px-2 hover:bg-red-50 rounded-lg h-9"
            icon={<X className="w-3.5 h-3.5" />}
            onClick={() => {
              setFilterSearch('');
              setFilterBranch(null);
              setFilterLocation(null);
              setFilterGroup(null);
              setFilterStatus(null);
            }}
          >
            Xóa bộ lọc
          </Button>
        )}
      </div>

      <Table 
        dataSource={filteredDepartments} 
        columns={columns} 
        rowKey="_id" 
        loading={isLoading}
        pagination={{ 
          pageSize: 10,
          showTotal: (total, range) => `Hiển thị ${range[0]} - ${range[1]} trên tổng số ${total} phòng ban`
        }}
        className="text-base"
      />

      {/* MODAL THÊM/SỬA PHÒNG BAN CHÍNH */}
      <Modal
        title={editingId ? 'Sửa Phòng ban' : 'Thêm Phòng ban mới'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={isSubmitting}
        okText="Lưu lại"
        cancelText="Hủy"
        width={800}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-4">
            <h3 className="font-semibold text-slate-700 mb-2">1. Định tuyến Cấu trúc</h3>
            <div className="grid grid-cols-3 gap-4">
              <Form.Item name="branchTimekeepingId" label="Chi nhánh" rules={[{ required: true, message: 'Chọn chi nhánh' }]}>
                <Select 
                  placeholder="Chọn chi nhánh"
                  onChange={() => {
                    form.setFieldValue('locationId', undefined);
                    form.setFieldValue('departmentGroupTimekeepingId', undefined);
                  }}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <div className="p-2">
                        <WithPermission permission="timekeeping_branch_create" roleId={roleId}>
                          <Button type="dashed" block icon={<Plus className="w-4 h-4" />} onClick={() => setIsBranchModalOpen(true)}>
                            Thêm Chi nhánh mới
                          </Button>
                        </WithPermission>
                      </div>
                    </>
                  )}
                >
                  {branches.map(b => (
                    <Select.Option key={b._id || b.id} value={b._id || b.id}>{b.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="locationId" label="Cơ sở / Điểm" rules={[{ required: true, message: 'Chọn cơ sở' }]}>
                <Select 
                  placeholder="Chọn cơ sở"
                  disabled={!branchIdWatch}
                  onChange={() => form.setFieldValue('departmentGroupTimekeepingId', undefined)}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <div className="p-2">
                        <WithPermission permission="timekeeping_location_create" roleId={roleId}>
                          <Button type="dashed" block icon={<Plus className="w-4 h-4" />} onClick={() => setIsLocationModalOpen(true)}>
                            Thêm Cơ sở mới
                          </Button>
                        </WithPermission>
                      </div>
                    </>
                  )}
                >
                  {filteredLocations.map(l => (
                    <Select.Option key={l._id} value={l._id}>{l.locationName}</Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="departmentGroupTimekeepingId" label="Khối / Cụm" rules={[{ required: true, message: 'Chọn khối' }]}>
                <Select 
                  placeholder="Chọn Khối / Cụm" 
                  disabled={!locationIdWatch}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <div className="p-2">
                        <WithPermission permission="timekeeping_department_create" roleId={roleId}>
                          <Button type="dashed" block icon={<Plus className="w-4 h-4" />} onClick={() => setIsGroupModalOpen(true)}>
                            Thêm Khối mới
                          </Button>
                        </WithPermission>
                      </div>
                    </>
                  )}
                >
                  {filteredGroups.map(g => (
                    <Select.Option key={g._id} value={g._id}>{g.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="name" label="Tên Phòng ban" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
              <Input 
                placeholder="VD: Phòng Marketing" 
                onChange={(e) => {
                  if (!editingId) {
                    const slug = e.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    form.setFieldValue('code', slug);
                    const shortCode = e.target.value.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Đ/g, 'D').split(/\s+/).map(w => { const m = w.match(/[A-Z0-9]/); return m ? m[0] : ''; }).join('');
                    form.setFieldValue('shortCode', shortCode);
                  }
                }}
              />
            </Form.Item>
            <Form.Item name="shortName" label="Tên viết tắt">
              <Input placeholder="VD: MKT" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="code" label="Mã Phòng (Slug)" rules={[{ required: true, message: 'Vui lòng nhập mã' }]}>
              <Input placeholder="VD: phong-marketing" className="font-mono" />
            </Form.Item>
            <Form.Item name="shortCode" label="Mã viết tắt (Tùy chọn)">
              <Input placeholder="VD: MKT" className="font-mono uppercase" style={{ textTransform: 'uppercase' }} onChange={(e) => form.setFieldValue('shortCode', e.target.value.toUpperCase())} />
            </Form.Item>
            <Form.Item name="isActive" label="Trạng thái" valuePropName="checked" initialValue={true}>
              <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* QUICK CREATE MODALS */}
      <Modal title="Thêm Chi nhánh nhanh" open={isBranchModalOpen} onCancel={() => setIsBranchModalOpen(false)} onOk={handleQuickCreateBranch} okText="Tạo" cancelText="Hủy" width={450}>
        <Form form={branchForm} layout="vertical" className="mt-4">
          <Form.Item name="name" label="Tên Chi nhánh" rules={[{ required: true, message: 'Nhập tên' }]}>
            <Input 
              placeholder="VD: Chi nhánh Hà Nội" 
              onChange={(e) => {
                const slug = e.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                branchForm.setFieldValue('code', slug);
                const shortCode = e.target.value.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Đ/g, 'D').split(/\s+/).map(w => { const m = w.match(/[A-Z0-9]/); return m ? m[0] : ''; }).join('');
                branchForm.setFieldValue('shortCode', shortCode);
              }}
            />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="code" label="Mã Chi nhánh (Slug)" rules={[{ required: true, message: 'Vui lòng nhập mã' }]}>
              <Input placeholder="Tự động sinh..." className="font-mono bg-slate-50" readOnly />
            </Form.Item>
            <Form.Item name="shortCode" label="Mã viết tắt (Tùy chọn)">
              <Input placeholder="VD: HN" className="font-mono uppercase" style={{ textTransform: 'uppercase' }} onChange={(e) => branchForm.setFieldValue('shortCode', e.target.value.toUpperCase())} />
            </Form.Item>
          </div>
          <Form.Item name="location" label="Khu vực / Địa chỉ">
            <Input placeholder="VD: Tòa nhà A, Quận B..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Thêm Cơ sở nhanh" open={isLocationModalOpen} onCancel={() => setIsLocationModalOpen(false)} onOk={handleQuickCreateLocation} okText="Tạo" cancelText="Hủy" width={500}>
        <Form form={locationForm} layout="vertical" className="mt-4">
          <Form.Item name="locationName" label="Tên Cơ sở" rules={[{ required: true, message: 'Nhập tên' }]}>
            <Input 
              placeholder="VD: Văn phòng Cầu Giấy" 
              onChange={(e) => {
                const slug = e.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                locationForm.setFieldValue('locationSlug', slug);
                const shortCode = e.target.value.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Đ/g, 'D').split(/\s+/).map(w => { const m = w.match(/[A-Z0-9]/); return m ? m[0] : ''; }).join('');
                locationForm.setFieldValue('shortCode', shortCode);
              }}
            />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="locationSlug" label="Mã Cơ sở (Slug)" rules={[{ required: true, message: 'Nhập mã' }]}>
              <Input placeholder="Tự động sinh..." className="font-mono bg-slate-50" readOnly />
            </Form.Item>
            <Form.Item name="shortCode" label="Mã viết tắt (Tùy chọn)">
              <Input placeholder="VD: KHO" className="font-mono uppercase" style={{ textTransform: 'uppercase' }} onChange={(e) => locationForm.setFieldValue('shortCode', e.target.value.toUpperCase())} />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="lat" label="Vĩ độ (Lat)" initialValue={21.028511}>
              <InputNumber className="w-full" step={0.000001} />
            </Form.Item>
            <Form.Item name="lng" label="Kinh độ (Lng)" initialValue={105.804817}>
              <InputNumber className="w-full" step={0.000001} />
            </Form.Item>
          </div>
          <Form.Item name="radius" label="Bán kính chấm công (m)" initialValue={100} rules={[{ required: true, message: 'Nhập bán kính' }]}>
            <InputNumber className="w-full" min={10} max={5000} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Thêm Khối/Cụm nhanh" open={isGroupModalOpen} onCancel={() => setIsGroupModalOpen(false)} onOk={handleQuickCreateGroup} okText="Tạo" cancelText="Hủy" width={400}>
        <Form form={groupForm} layout="vertical" className="mt-4">
          <Form.Item name="name" label="Tên Khối/Cụm" rules={[{ required: true, message: 'Nhập tên' }]}>
            <Input 
              placeholder="VD: Khối Kỹ Thuật" 
              onChange={(e) => {
                const slug = e.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                groupForm.setFieldValue('code', slug);
                const shortCode = e.target.value.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Đ/g, 'D').split(/\s+/).map(w => { const m = w.match(/[A-Z0-9]/); return m ? m[0] : ''; }).join('');
                groupForm.setFieldValue('shortCode', shortCode);
              }}
            />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="code" label="Mã Khối (Slug)" rules={[{ required: true, message: 'Nhập mã' }]}>
              <Input placeholder="Tự động sinh..." className="font-mono bg-slate-50" readOnly />
            </Form.Item>
            <Form.Item name="shortCode" label="Mã viết tắt (Tùy chọn)">
              <Input placeholder="VD: KSX" className="font-mono uppercase" style={{ textTransform: 'uppercase' }} onChange={(e) => groupForm.setFieldValue('shortCode', e.target.value.toUpperCase())} />
            </Form.Item>
          </div>
        </Form>
      </Modal>

    </div>
  );
}
