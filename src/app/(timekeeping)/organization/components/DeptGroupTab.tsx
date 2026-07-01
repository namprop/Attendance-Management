'use client';

import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Popconfirm, message, Space, Switch } from 'antd';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import type { DepartmentGroupTimekeeping, KioskLocation, BranchTimekeeping } from '@/app/interface/timekeeping';
import { WithPermission } from '@/app/service/permissions/permission-gate';
import { cookieBase } from '@/app/utils/cookie';
import type { User } from '@/app/data/dataUser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export default function DeptGroupTab() {
  const userInfo = cookieBase.get<User>('info_user');
  const roleId = userInfo?.role ?? '';
  const queryClient = useQueryClient();

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

  const isLoading = isGroupsLoading || isLocationsLoading || isBranchesLoading;

  // Bộ lọc states
  const [filterSearch, setFilterSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState<string | null>(null);
  const [filterLocation, setFilterLocation] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<boolean | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    await Promise.all([
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
      if (ce.detail === 'dept_groups') {
        handleOpenCreate();
      }
    };
    window.addEventListener('open-org-modal', handler);
    return () => window.removeEventListener('open-org-modal', handler);
  }, []);

  const handleOpenEdit = (record: DepartmentGroupTimekeeping) => {
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      shortCode: record.shortCode,
      locationId: record.locationId,
      isActive: record.isActive,
    });
    setEditingId(record._id || null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/department-groups-timekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', _id: id }),
      });
      const data = await res.json();
      if (res.ok) {
        message.success('Xóa Khối/Cụm thành công');
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

      const res = await fetch('/api/department-groups-timekeeping', {
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

  // Logic lọc dữ liệu
  const filteredGroups = groups.filter(g => {
    if (filterSearch) {
      const searchLower = filterSearch.toLowerCase();
      const matches = g.name.toLowerCase().includes(searchLower) || g.code.toLowerCase().includes(searchLower);
      if (!matches) return false;
    }
    if (filterLocation) {
      if (g.locationId !== filterLocation) return false;
    } else if (filterBranch) {
      // If no location is selected but a branch is, filter groups by locations that belong to this branch
      const branchObj = branches.find(b => (b._id || b.id) === filterBranch || (b.id || b._id) === filterBranch);
      const branchLocations = locations.filter(l => branchObj && (l.branchId === branchObj._id || l.branchId === branchObj.id)).map(l => l._id);
      if (!g.locationId || !branchLocations.includes(g.locationId)) return false;
    }
    if (filterStatus !== null) {
      if (g.isActive !== filterStatus) return false;
    }
    return true;
  });

  const columns = [
    {
      title: 'Tên Khối/Cụm',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: DepartmentGroupTimekeeping) => (
        <div>
          <div className="font-semibold text-slate-800">{text}</div>
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
      title: 'Thuộc Cơ sở / Điểm',
      dataIndex: 'locationId',
      key: 'locationId',
      render: (val: string) => {
        const loc = locations.find(l => l._id === val);
        return <span className="font-medium text-blue-600">{loc?.locationName || '---'}</span>;
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
      render: (_: unknown, record: DepartmentGroupTimekeeping) => (
        <Space>
          <WithPermission permission="timekeeping_department_edit" roleId={roleId}>
            <Button type="text" icon={<Pencil className="w-4 h-4 text-blue-600" />} onClick={() => handleOpenEdit(record)} />
          </WithPermission>
          <WithPermission permission="timekeeping_department_delete" roleId={roleId}>
            <Popconfirm title="Xóa khối/cụm này?" onConfirm={() => handleDelete(record._id || '')}>
              <Button type="text" danger icon={<Trash2 className="w-4 h-4" />} />
            </Popconfirm>
          </WithPermission>
        </Space>
      ),
    },
  ];

  return (
    <div className="pt-2">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 m-0">Danh sách Khối / Cụm</h3>
          <p className="text-xs text-slate-400">Phân chia cấu trúc thành các khối lớn.</p>
        </div>
        <WithPermission permission="timekeeping_department_create" roleId={roleId}>
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
            Thêm Khối
          </Button>
        </WithPermission>
      </div>

      {/* Bộ lọc Inline Filter Bar */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Tìm theo tên hoặc mã khối cụm..."
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            prefix={<Search className="w-4 h-4 text-slate-400 mr-1" />}
            allowClear
          />
        </div>
        <div className="w-48">
          <Select
            placeholder="Lọc theo Chi nhánh"
            className="w-full"
            allowClear
            value={filterBranch}
            onChange={(val) => {
              setFilterBranch(val);
              setFilterLocation(null);
            }}
            options={branches.map(b => ({ label: b.name, value: b._id || b.id }))}
          />
        </div>
        <div className="w-48">
          <Select
            placeholder="Lọc theo Cơ sở"
            className="w-full"
            allowClear
            value={filterLocation}
            onChange={setFilterLocation}
            options={locations
              .filter(l => {
                if (!filterBranch) return true;
                const bObj = branches.find(b => (b._id || b.id) === filterBranch || (b.id || b._id) === filterBranch);
                return bObj && (l.branchId === bObj._id || l.branchId === bObj.id);
              })
              .map(l => ({ label: l.locationName, value: l._id }))}
          />
        </div>
        <div className="w-40">
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
        {(filterSearch || filterBranch || filterLocation || filterStatus !== null) && (
          <Button 
            type="text" 
            danger 
            className="flex items-center gap-1 text-xs font-semibold px-2 hover:bg-red-50 rounded-lg h-9"
            icon={<X className="w-3.5 h-3.5" />}
            onClick={() => {
              setFilterSearch('');
              setFilterBranch(null);
              setFilterLocation(null);
              setFilterStatus(null);
            }}
          >
            Xóa bộ lọc
          </Button>
        )}
      </div>

      <Table 
        dataSource={filteredGroups} 
        columns={columns} 
        rowKey="_id" 
        loading={isLoading}
        pagination={{ 
          pageSize: 10,
          showTotal: (total, range) => `Hiển thị ${range[0]} - ${range[1]} trên tổng số ${total} khối/tổ`
        }}
        className="text-base"
      />

      <Modal
        title={editingId ? 'Sửa Khối/Cụm' : 'Thêm Khối/Cụm mới'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={isSubmitting}
        okText="Lưu lại"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label="Tên Khối" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
            <Input 
              placeholder="VD: Khối Sản Xuất" 
              onChange={(e) => {
                if (!editingId) {
                  const slug = e.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                  form.setFieldValue('code', slug);
                }
              }}
            />
          </Form.Item>
          <Form.Item name="code" label="Mã Khối (Slug)" rules={[{ required: true, message: 'Vui lòng nhập mã' }]}>
            <Input placeholder="VD: khoi-san-xuat" className="font-mono" />
          </Form.Item>

          <Form.Item name="shortCode" label="Mã viết tắt (Tùy chọn)">
            <Input placeholder="VD: KSX" className="font-mono uppercase" style={{ textTransform: 'uppercase' }} onChange={(e) => form.setFieldValue('shortCode', e.target.value.toUpperCase())} />
          </Form.Item>
          
          <Form.Item name="locationId" label="Thuộc Cơ sở" rules={[{ required: true, message: 'Vui lòng chọn cơ sở' }]}>
            <Select placeholder="Chọn cơ sở / điểm chấm công mẹ">
              {locations.map(l => (
                <Select.Option key={l._id} value={l._id}>{l.locationName}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="isActive" label="Trạng thái hoạt động" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
