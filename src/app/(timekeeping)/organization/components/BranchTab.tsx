'use client';

import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Popconfirm, message, Space } from 'antd';
import { Plus, Pencil, Trash2, Building2, Search, X } from 'lucide-react';
import type { BranchTimekeeping } from '@/app/interface/timekeeping';
import { WithPermission } from '@/app/service/permissions/permission-gate';
import { cookieBase } from '@/app/utils/cookie';
import type { User } from '@/app/data/dataUser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export default function BranchTab() {
  const userInfo = cookieBase.get<User>('info_user');
  const roleId = userInfo?.role ?? '';
  const queryClient = useQueryClient();

  const { data: branches = [], isLoading } = useQuery<BranchTimekeeping[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await fetch('/api/branch-timekeeping');
      const data = await res.json();
      return data.data || [];
    }
  });
  
  // Bộ lọc states
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  
  const [filterOrgId, setFilterOrgId] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      setFilterOrgId(ce.detail);
    };
    window.addEventListener('org-filter', handler);
    return () => window.removeEventListener('org-filter', handler);
  }, []);

  const fetchBranches = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['branches'] });
  }, [queryClient]);

  const handleOpenCreate = () => {
    form.resetFields();
    setEditingId(null);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce.detail === 'branches') {
        handleOpenCreate();
      }
    };
    window.addEventListener('open-org-modal', handler);
    return () => window.removeEventListener('open-org-modal', handler);
  }, []);

  const handleOpenEdit = (record: BranchTimekeeping) => {
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      shortCode: record.shortCode,
      location: record.location,
      status: record.status,
    });
    setEditingId(record._id || null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/branch-timekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', _id: id }),
      });
      const data = await res.json();
      if (res.ok) {
        message.success('Xóa Chi nhánh thành công');
        fetchBranches();
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

      const res = await fetch('/api/branch-timekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        message.success(editingId ? 'Cập nhật thành công' : 'Thêm mới thành công');
        setIsModalOpen(false);
        fetchBranches();
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
  const filteredBranches = branches.filter(b => {
    if (filterOrgId && filterOrgId.startsWith('branch-')) {
      const bId = filterOrgId.replace('branch-', '');
      if ((b._id || b.id) !== bId) return false;
    }
    
    if (filterSearch) {
      const searchLower = filterSearch.toLowerCase();
      const matches = b.name.toLowerCase().includes(searchLower) || b.code.toLowerCase().includes(searchLower);
      if (!matches) return false;
    }
    if (filterStatus) {
      if (b.status !== filterStatus) return false;
    }
    return true;
  });

  const columns = [
    {
      title: 'Tên Chi nhánh',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span className="font-semibold text-slate-800">{text}</span>,
    },
    {
      title: 'Mã viết tắt',
      dataIndex: 'shortCode',
      key: 'shortCode',
      render: (text: string) => text ? <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">{text}</span> : <span className="text-slate-400 italic">---</span>,
    },
    {
      title: 'Mã (Slug)',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => <span className="text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{text}</span>,
    },
    {
      title: 'Khu vực / Địa chỉ',
      dataIndex: 'location',
      key: 'location',
      render: (text: string) => <span className="text-slate-600">{text || '---'}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {status === 'Active' ? 'Hoạt động' : 'Tạm khóa'}
        </span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: unknown, record: BranchTimekeeping) => (
        <Space>
          <WithPermission roleId={Number(roleId)} permission="timekeeping_branch_edit">
            <Button type="text" icon={<Pencil className="w-4 h-4 text-blue-600" />} onClick={() => handleOpenEdit(record)} />
          </WithPermission>
          <WithPermission roleId={Number(roleId)} permission="timekeeping_branch_delete">
            <Popconfirm title="Xóa chi nhánh này?" onConfirm={() => handleDelete(record._id || '')}>
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
          <h3 className="text-sm font-bold text-slate-800 m-0">Danh sách Chi nhánh</h3>
          <p className="text-xs text-slate-400">Cấu hình các chi nhánh thuộc công ty.</p>
        </div>
        <WithPermission roleId={Number(roleId)} permission="timekeeping_branch_create">
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
            Thêm Chi nhánh
          </Button>
        </WithPermission>
      </div>

      {/* Bộ lọc Inline Filter Bar */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Tìm theo tên hoặc mã chi nhánh..."
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            prefix={<Search className="w-4 h-4 text-slate-400 mr-1" />}
            allowClear
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
              { label: 'Hoạt động', value: 'Active' },
              { label: 'Tạm khóa', value: 'Inactive' },
            ]}
          />
        </div>
        {(filterSearch || filterStatus) && (
          <Button 
            type="text" 
            danger 
            className="flex items-center gap-1 text-xs font-semibold px-2 hover:bg-red-50 rounded-lg h-9"
            icon={<X className="w-3.5 h-3.5" />}
            onClick={() => {
              setFilterSearch('');
              setFilterStatus(null);
            }}
          >
            Xóa bộ lọc
          </Button>
        )}
      </div>

      <Table 
        dataSource={filteredBranches} 
        columns={columns} 
        rowKey="_id" 
        loading={isLoading}
        pagination={{ 
          pageSize: 10,
          showTotal: (total, range) => `Hiển thị ${range[0]} - ${range[1]} trên tổng số ${total} chi nhánh`
        }}
        className="text-base"
      />

      <Modal
        title={editingId ? 'Sửa Chi nhánh' : 'Thêm Chi nhánh mới'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={isSubmitting}
        okText="Lưu lại"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label="Tên Chi nhánh" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
            <Input 
              placeholder="VD: Chi nhánh Hà Nội" 
              onChange={(e) => {
                if (!editingId) {
                  const slug = e.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                  form.setFieldValue('code', slug);
                }
              }}
            />
          </Form.Item>
          <Form.Item name="code" label="Mã Chi nhánh (Slug)" rules={[{ required: true, message: 'Vui lòng nhập mã' }]}>
            <Input placeholder="VD: chi-nhanh-ha-noi" className="font-mono" />
          </Form.Item>
          <Form.Item name="shortCode" label="Mã viết tắt (Tùy chọn)">
            <Input placeholder="VD: HN" className="font-mono uppercase" style={{ textTransform: 'uppercase' }} onChange={(e) => form.setFieldValue('shortCode', e.target.value.toUpperCase())} />
          </Form.Item>
          <Form.Item name="location" label="Khu vực / Địa chỉ">
            <Input placeholder="VD: Tòa nhà A, Quận B..." />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" initialValue="Active">
            <Select>
              <Select.Option value="Active">Hoạt động</Select.Option>
              <Select.Option value="Inactive">Tạm khóa</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
