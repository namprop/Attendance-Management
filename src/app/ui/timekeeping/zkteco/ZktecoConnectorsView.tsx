'use client';

import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Popconfirm, message, Space } from 'antd';
import { Server, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { BranchTimekeeping } from '@/app/interface/timekeeping';

interface ZktecoConnector {
  _id?: string;
  name: string;
  connectorUrl: string;
  branchId: string;
  branchName?: string;
  status: string;
  lastPing?: string;
}

export default function ZktecoConnectorsView() {
  const queryClient = useQueryClient();

  const { data: connectors = [], isLoading } = useQuery<ZktecoConnector[]>({
    queryKey: ['zkteco-connectors'],
    queryFn: async () => {
      const res = await fetch('/api/v1/zkteco-connectors');
      const data = await res.json();
      return data.data || [];
    }
  });

  const { data: branches = [] } = useQuery<BranchTimekeeping[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await fetch('/api/branch-timekeeping');
      const data = await res.json();
      return data.data || [];
    }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnector, setEditingConnector] = useState<ZktecoConnector | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const handleOpenCreate = () => {
    setEditingConnector(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (connector: ZktecoConnector) => {
    setEditingConnector(connector);
    form.setFieldsValue({
      name: connector.name,
      connectorUrl: connector.connectorUrl,
      branchId: connector.branchId,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);

      const selectedBranch = branches.find(b => b._id === values.branchId || b.id === values.branchId);
      const payload = {
        ...values,
        branchName: selectedBranch?.name || '',
      };

      const url = '/api/v1/zkteco-connectors';
      const method = editingConnector ? 'PUT' : 'POST';
      const body = editingConnector ? { _id: editingConnector._id, ...payload } : payload;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      
      if (res.ok) {
        messageApi.success(data.message);
        setIsModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['zkteco-connectors'] });
      } else {
        messageApi.error(data.message);
      }
    } catch (e) {
      // Validation error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/v1/zkteco-connectors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: id }),
      });
      const data = await res.json();
      if (res.ok) {
        messageApi.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['zkteco-connectors'] });
      } else {
        messageApi.error(data.message);
      }
    } catch {
      messageApi.error('Lỗi kết nối');
    }
  };

  const handleSync = async (id: string) => {
    setSyncingId(id);
    try {
      const res = await fetch('/api/v1/zkteco-connectors/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectorId: id }),
      });
      const data = await res.json();
      if (data.success) {
        messageApi.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['zkteco-connectors'] });
        queryClient.invalidateQueries({ queryKey: ['zkteco-devices'] });
      } else {
        messageApi.error(data.message);
        queryClient.invalidateQueries({ queryKey: ['zkteco-connectors'] });
      }
    } catch {
      messageApi.error('Lỗi kết nối tới Lõi');
    } finally {
      setSyncingId(null);
    }
  };

  const columns = [
    {
      title: 'Tên Cổng (Gateway)',
      dataIndex: 'name',
      render: (val: string) => (
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-bold text-gray-800 dark:text-gray-100">{val}</span>
        </div>
      )
    },
    {
      title: 'Public URL',
      dataIndex: 'connectorUrl',
      render: (val: string) => (
        <span className="text-xs text-gray-600 dark:text-gray-300 font-mono bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded border border-gray-100 dark:border-gray-700">
          {val}
        </span>
      )
    },
    {
      title: 'Chi nhánh quản lý',
      dataIndex: 'branchName',
      render: (val: string) => <span className="font-medium text-gray-700 dark:text-gray-300">{val}</span>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      align: 'center' as const,
      render: (val: string) => (
        <Tag color={val === 'ONLINE' ? 'green' : 'red'} className="font-bold">
          {val === 'ONLINE' ? 'ĐANG KẾT NỐI' : 'MẤT KẾT NỐI'}
        </Tag>
      )
    },
    {
      title: 'Thao tác',
      align: 'right' as const,
      render: (_: unknown, record: ZktecoConnector) => (
        <div className="flex justify-end gap-2">
          <Button 
            type="primary" 
            ghost 
            size="small"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${syncingId === record._id ? 'animate-spin' : ''}`} />}
            onClick={() => handleSync(record._id!)}
            loading={syncingId === record._id}
          >
            Đồng bộ Thiết bị
          </Button>
          <Button type="text" size="small" icon={<Pencil className="w-3.5 h-3.5 text-blue-500" />} onClick={() => handleOpenEdit(record)} />
          <Popconfirm title="Xóa Cổng này?" onConfirm={() => handleDelete(record._id!)} okText="Xóa" cancelText="Hủy">
            <Button type="text" size="small" danger icon={<Trash2 className="w-3.5 h-3.5" />} />
          </Popconfirm>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {contextHolder}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-apple gap-4">
        <div className="text-gray-500 dark:text-gray-400 text-sm">
          Cổng trung chuyển đóng vai trò kết nối Phần mềm Lõi với các máy chấm công qua mạng LAN.
        </div>
        <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
          Thêm Cổng Trung Chuyển
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-apple overflow-hidden">
        <Table 
          columns={columns} 
          dataSource={connectors} 
          rowKey="_id"
          loading={isLoading}
          pagination={false}
          className="w-full"
        />
      </div>

      <Modal
        title={editingConnector ? 'Sửa Cổng Trung Chuyển' : 'Thêm Cổng Trung Chuyển'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={isSubmitting}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label="Tên gọi gợi nhớ" rules={[{ required: true }]}>
            <Input placeholder="VD: Cổng Trụ sở chính" />
          </Form.Item>
          <Form.Item name="connectorUrl" label="Đường dẫn Public (Ngrok/Tunnel)" rules={[{ required: true }]}>
            <Input placeholder="VD: https://cong-hanoi.ngrok.app" />
          </Form.Item>
          <Form.Item name="branchId" label="Thuộc Chi nhánh" rules={[{ required: true }]}>
            <Select options={branches.map(b => ({ label: b.name, value: b._id || b.id }))} placeholder="Chọn chi nhánh" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
