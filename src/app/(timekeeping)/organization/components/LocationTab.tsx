'use client';

import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Popconfirm, message, Space, InputNumber } from 'antd';
import { Plus, Pencil, Trash2, MapPin, Search, X } from 'lucide-react';
import type { KioskLocation, BranchTimekeeping } from '@/app/interface/timekeeping';
import { WithPermission } from '@/app/service/permissions/permission-gate';
import { cookieBase } from '@/app/utils/cookie';
import type { User } from '@/app/data/dataUser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export default function LocationTab() {
  const userInfo = cookieBase.get<User>('info_user');
  const roleId = Number(userInfo?.role) || 0;
  const queryClient = useQueryClient();

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

  const isLoading = isLocationsLoading || isBranchesLoading;

  // Bộ lọc states
  const [filterSearch, setFilterSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const fetchLocations = useCallback(async () => {
    await Promise.all([
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
      if (ce.detail === 'locations') {
        handleOpenCreate();
      }
    };
    window.addEventListener('open-org-modal', handler);
    return () => window.removeEventListener('open-org-modal', handler);
  }, []);

  const handleOpenEdit = (record: KioskLocation) => {
    form.setFieldsValue({
      locationName: record.locationName,
      locationSlug: record.locationSlug,
      shortCode: record.shortCode,
      branchId: record.branchId,
      lat: record.coordinates?.lat,
      lng: record.coordinates?.lng,
      allowedRadiusMeters: record.allowedRadiusMeters,
      status: record.status || 'ACTIVE',
    });
    setEditingId(record._id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/kiosk/locations?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        message.success('Xóa Cơ sở thành công');
        fetchLocations();
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
      const method = editingId ? 'PUT' : 'POST';
      
      const body = {
        _id: editingId,
        locationName: values.locationName,
        locationSlug: values.locationSlug,
        shortCode: values.shortCode,
        branchId: values.branchId,
        coordinates: { lat: values.lat || 0, lng: values.lng || 0 },
        allowedRadiusMeters: values.allowedRadiusMeters || 100,
        status: values.status,
      };

      const res = await fetch('/api/v1/kiosk/locations', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        message.success(editingId ? 'Cập nhật thành công' : 'Thêm mới thành công');
        setIsModalOpen(false);
        fetchLocations();
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
  const filteredLocations = locations.filter(l => {
    if (filterSearch) {
      const searchLower = filterSearch.toLowerCase();
      const matches = l.locationName.toLowerCase().includes(searchLower) || l.locationSlug.toLowerCase().includes(searchLower);
      if (!matches) return false;
    }
    if (filterBranch) {
      const bObj = branches.find(b => (b._id || b.id) === filterBranch || (b.id || b._id) === filterBranch);
      if (!bObj || (l.branchId !== bObj._id && l.branchId !== bObj.id)) return false;
    }
    if (filterStatus) {
      if (l.status !== filterStatus) return false;
    }
    return true;
  });

  const columns = [
    {
      title: 'Tên Cơ sở / Điểm',
      dataIndex: 'locationName',
      key: 'locationName',
      render: (text: string, record: KioskLocation) => (
        <div>
          <div className="font-semibold text-slate-800">{text}</div>
          <div className="text-xs text-slate-500 font-mono">/{record.locationSlug}</div>
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
      title: 'Thuộc Chi nhánh',
      dataIndex: 'branchName',
      key: 'branchName',
      render: (text: string) => <span className="text-blue-600 font-medium">{text || '---'}</span>,
    },
    {
      title: 'Tọa độ GPS',
      key: 'gps',
      render: (_: unknown, record: KioskLocation) => (
        <div className="text-xs text-slate-500">
          <div>Lat: {record.coordinates?.lat || 0}</div>
          <div>Lng: {record.coordinates?.lng || 0}</div>
        </div>
      ),
    },
    {
      title: 'Bán kính',
      dataIndex: 'allowedRadiusMeters',
      key: 'allowedRadiusMeters',
      render: (val: number) => <span className="font-medium text-slate-700">{val || 100}m</span>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: unknown, record: KioskLocation) => (
        <Space>
          <WithPermission roleId={Number(roleId)} permission="timekeeping_location_edit">
            <Button type="text" icon={<Pencil className="w-4 h-4 text-blue-600" />} onClick={() => handleOpenEdit(record)} />
          </WithPermission>
          <WithPermission roleId={Number(roleId)} permission="timekeeping_location_delete">
            <Popconfirm title="Xóa cơ sở này?" onConfirm={() => handleDelete(record._id)}>
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
          <h3 className="text-sm font-bold text-slate-800 m-0">Danh sách Điểm chấm công</h3>
          <p className="text-xs text-slate-400">Định nghĩa tọa độ GPS và mạng Wifi hợp lệ.</p>
        </div>
        <WithPermission roleId={Number(roleId)} permission="timekeeping_location_create">
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
            Thêm Cơ sở
          </Button>
        </WithPermission>
      </div>

      {/* Bộ lọc Inline Filter Bar */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Tìm theo tên hoặc mã cơ sở..."
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            prefix={<Search className="w-4 h-4 text-slate-400 mr-1" />}
            allowClear
          />
        </div>
        <div className="w-56">
          <Select
            placeholder="Lọc theo Chi nhánh"
            className="w-full"
            allowClear
            value={filterBranch}
            onChange={setFilterBranch}
            options={branches.map(b => ({ label: b.name, value: b._id || b.id }))}
          />
        </div>
        <div className="w-48">
          <Select
            placeholder="Lọc trạng thái"
            className="w-full"
            allowClear
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { label: 'Hoạt động', value: 'ACTIVE' },
              { label: 'Tạm khóa', value: 'INACTIVE' },
            ]}
          />
        </div>
        {(filterSearch || filterBranch || filterStatus) && (
          <Button 
            type="text" 
            danger 
            className="flex items-center gap-1 text-xs font-semibold px-2 hover:bg-red-50 rounded-lg h-9"
            icon={<X className="w-3.5 h-3.5" />}
            onClick={() => {
              setFilterSearch('');
              setFilterBranch(null);
              setFilterStatus(null);
            }}
          >
            Xóa bộ lọc
          </Button>
        )}
      </div>

      <Table 
        dataSource={filteredLocations} 
        columns={columns} 
        rowKey="_id" 
        loading={isLoading}
        pagination={{ 
          pageSize: 10,
          showTotal: (total, range) => `Hiển thị ${range[0]} - ${range[1]} trên tổng số ${total} cơ sở`
        }}
        className="text-base"
      />

      <Modal
        title={editingId ? 'Sửa Cơ sở' : 'Thêm Cơ sở mới'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={isSubmitting}
        okText="Lưu lại"
        cancelText="Hủy"
        width={600}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="locationName" label="Tên Cơ sở" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
              <Input 
                placeholder="VD: Kho Sản xuất" 
                onChange={(e) => {
                  if (!editingId) {
                    const slug = e.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    form.setFieldValue('locationSlug', slug);
                  }
                }}
              />
            </Form.Item>
            <Form.Item name="locationSlug" label="Mã Cơ sở (Slug)" rules={[{ required: true, message: 'Vui lòng nhập mã' }]}>
              <Input placeholder="VD: kho-san-xuat" className="font-mono" />
            </Form.Item>
          </div>

          <Form.Item name="shortCode" label="Mã viết tắt (Tùy chọn)">
            <Input placeholder="VD: KHO" className="font-mono uppercase" style={{ textTransform: 'uppercase' }} onChange={(e) => form.setFieldValue('shortCode', e.target.value.toUpperCase())} />
          </Form.Item>

          <Form.Item name="branchId" label="Thuộc Chi nhánh" rules={[{ required: true, message: 'Vui lòng chọn chi nhánh' }]}>
            <Select placeholder="Chọn chi nhánh mẹ">
              {branches.map(b => (
                <Select.Option key={b._id || b.id} value={b._id || b.id}>{b.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="lat" label="Vĩ độ (Lat)">
              <InputNumber className="w-full" placeholder="21.028511" />
            </Form.Item>
            <Form.Item name="lng" label="Kinh độ (Lng)">
              <InputNumber className="w-full" placeholder="105.806477" />
            </Form.Item>
            <Form.Item name="allowedRadiusMeters" label="Bán kính (M)" initialValue={100}>
              <InputNumber className="w-full" min={10} max={5000} />
            </Form.Item>
          </div>

          <Form.Item name="status" label="Trạng thái" initialValue="ACTIVE">
            <Select>
              <Select.Option value="ACTIVE">Hoạt động</Select.Option>
              <Select.Option value="INACTIVE">Tạm khóa</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
