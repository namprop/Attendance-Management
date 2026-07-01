'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Select, Switch,
  notification, Space, Popconfirm, Tooltip, Badge,
} from 'antd';
import {
  FileText, Plus, Edit2, Trash2, CheckCircle, XCircle
} from 'lucide-react';
import dayjs from 'dayjs';

interface ContractType {
  _id: string;
  name: string;
  description: string;
  templateId: string;
  isActive: boolean;
  createdAt: string;
}

interface ContractTemplate {
  _id: string;
  templateName: string;
}

export default function ContractTypesPage() {
  const [types, setTypes] = useState<ContractType[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form] = Form.useForm();

  // ── Fetch ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resTypes, resTemplates] = await Promise.all([
        fetch('/api/contract-types'),
        fetch('/api/contract-templates?active=true')
      ]);
      const jsonTypes = await resTypes.json();
      const jsonTemplates = await resTemplates.json();

      if (jsonTypes.data) setTypes(jsonTypes.data);
      if (jsonTemplates.data) setTemplates(jsonTemplates.data);
    } catch {
      notification.error({ message: 'Lỗi tải danh sách dữ liệu' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function initFetch() {
      try {
        const [resTypes, resTemplates] = await Promise.all([
          fetch('/api/contract-types'),
          fetch('/api/contract-templates?active=true')
        ]);
        const jsonTypes = await resTypes.json();
        const jsonTemplates = await resTemplates.json();

        if (!ignore && jsonTypes.data) setTypes(jsonTypes.data);
        if (!ignore && jsonTemplates.data) setTemplates(jsonTemplates.data);
      } catch {
        if (!ignore) notification.error({ message: 'Lỗi tải danh sách dữ liệu' });
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    initFetch();
    return () => { ignore = true; };
  }, []);

  // ── Open modal ──
  function openCreate() {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({
      isActive: true,
    });
    setModalOpen(true);
  }

  function openEdit(ct: ContractType) {
    setEditingId(ct._id);
    form.setFieldsValue({
      name: ct.name,
      description: ct.description,
      templateId: ct.templateId,
      isActive: ct.isActive,
    });
    setModalOpen(true);
  }

  // ── Submit ──
  async function handleSubmit() {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        action: editingId ? 'edit' : 'add',
        ...(editingId ? { _id: editingId } : {}),
        ...values,
      };

      const res = await fetch('/api/contract-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        notification.success({ message: json.message });
        setModalOpen(false);
        fetchData();
      } else {
        notification.error({ message: json.message || 'Lỗi lưu loại hợp đồng' });
      }
    } catch {
      // validation error handled by form
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ──
  async function handleDelete(id: string) {
    const res = await fetch('/api/contract-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', _id: id }),
    });
    const json = await res.json();
    if (json.success) {
      notification.success({ message: json.message });
      fetchData();
    } else {
      notification.error({ message: json.message || 'Lỗi xóa' });
    }
  }

  // ── Toggle active ──
  async function handleToggle(ct: ContractType) {
    const res = await fetch('/api/contract-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', _id: ct._id, isActive: ct.isActive }),
    });
    const json = await res.json();
    if (json.success) {
      notification.success({ message: json.message });
      fetchData();
    } else {
      notification.error({ message: 'Lỗi thay đổi trạng thái' });
    }
  }

  // ── Columns ──
  const columns = [
    {
      title: 'Tên loại hợp đồng',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ContractType) => (
        <div>
          <div className="font-semibold text-slate-800">{name}</div>
          {record.description && (
            <div className="text-xs text-slate-500 mt-0.5 max-w-sm truncate">
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Mẫu hợp đồng áp dụng',
      dataIndex: 'templateId',
      key: 'templateId',
      render: (tid: string) => {
        if (!tid) return <span className="text-slate-400 italic">Chưa chọn mẫu</span>;
        const template = templates.find(t => t._id === tid);
        return template ? (
          <span className="text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded border border-blue-100">
            {template.templateName}
          </span>
        ) : (
          <span className="text-slate-400 italic">Mẫu không tồn tại</span>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean, record: ContractType) => (
        <Tooltip title={active ? 'Đang kích hoạt — Click để tắt' : 'Đang tắt — Click để kích hoạt'}>
          <Switch
            checked={active}
            size="small"
            onChange={() => handleToggle(record)}
            checkedChildren={<CheckCircle size={12} />}
            unCheckedChildren={<XCircle size={12} />}
          />
        </Tooltip>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => d ? (
        <span className="text-xs text-slate-400">{dayjs(d).format('DD/MM/YYYY')}</span>
      ) : '—',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: ContractType) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa">
            <Button size="small" icon={<Edit2 size={14} />}
              className="border-blue-200 text-blue-600"
              onClick={() => openEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="Xóa loại hợp đồng này?"
            description="Thao tác này không thể hoàn tác."
            onConfirm={() => handleDelete(record._id)}
            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa">
              <Button size="small" danger icon={<Trash2 size={14} />}
                className="border-red-200" />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="flex-1 overflow-auto pb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 px-4 sm:px-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Loại Hợp đồng
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Quản lý các loại hợp đồng và cài đặt mẫu hợp đồng áp dụng tương ứng
          </p>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}
          className="bg-blue-600 font-medium">
          Tạo loại hợp đồng
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <Badge count={types.filter(t => t.isActive).length} color="#2563eb"
            title="Đang kích hoạt">
            <span className="text-sm text-slate-500">
              Tổng: <strong className="text-slate-800">{types.length}</strong> loại hợp đồng
            </span>
          </Badge>
        </div>

        <Table
          columns={columns}
          dataSource={types}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 'max-content' }}
          rowClassName="hover:bg-slate-50/50 cursor-pointer"
        />
      </Card>

      {/* ── MODAL Tạo / Sửa ───────────────────────────────────────────── */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>{editingId ? 'Chỉnh sửa loại hợp đồng' : 'Tạo loại hợp đồng mới'}</span>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editingId ? 'Lưu thay đổi' : 'Tạo mới'}
        cancelText="Hủy"
        confirmLoading={submitting}
        width={500}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label="Tên loại hợp đồng" rules={[{ required: true, message: 'Nhập tên loại hợp đồng' }]}>
            <Input placeholder="VD: Hợp đồng Thử việc" />
          </Form.Item>
          
          <Form.Item name="templateId" label="Mẫu hợp đồng áp dụng" rules={[{ required: true, message: 'Vui lòng chọn mẫu áp dụng' }]}>
            <Select 
              placeholder="Chọn mẫu hợp đồng..." 
              options={templates.map(t => ({ label: t.templateName, value: t._id }))}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea placeholder="Nhập mô tả thêm..." rows={3} />
          </Form.Item>

          <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
            <Switch checkedChildren="Kích hoạt" unCheckedChildren="Tắt" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
