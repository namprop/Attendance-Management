'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Switch, InputNumber, Select, notification, Tag, Space, Popconfirm, Badge } from 'antd';
import { ListChecks, Plus, Edit, Trash2 } from 'lucide-react';
import { LeaveType, BranchTimekeeping, KioskLocation, DepartmentGroupTimekeeping, DepartmentTimekeeping } from '@/app/interface/timekeeping';

export default function LeaveTypesPage() {
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [branches, setBranches] = useState<BranchTimekeeping[]>([]);
  const [locations, setLocations] = useState<KioskLocation[]>([]);
  const [deptGroups, setDeptGroups] = useState<DepartmentGroupTimekeeping[]>([]);
  const [departments, setDepartments] = useState<DepartmentTimekeeping[]>([]);

  async function fetchAllOrgData() {
    try {
      const [bRes, lRes, gRes, dRes] = await Promise.all([
        fetch('/api/branch-timekeeping'),
        fetch('/api/v1/kiosk/locations'),
        fetch('/api/department-groups-timekeeping'),
        fetch('/api/departments-timekeeping'),
      ]);
      const [b, l, g, d] = await Promise.all([bRes.json(), lRes.json(), gRes.json(), dRes.json()]);
      
      if (b.data) setBranches(b.data);
      if (l.data) setLocations(l.data);
      if (g.data) setDeptGroups(g.data);
      if (d.data) setDepartments(d.data);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchTypes() {
    try {
      const res = await fetch('/api/leave-types');
      const data = await res.json();
      if (data.data) {
        setTypes(data.data);
      }
    } catch (error) {
      notification.error({ message: 'Lỗi tải danh sách hình thức nghỉ' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const init = async () => {
      fetchTypes();
      fetchAllOrgData();
    };
    init();
  }, []);

  const showModal = (record?: LeaveType) => {
    if (record) {
      setEditingId(record._id || null);
      form.setFieldsValue(record);
    } else {
      setEditingId(null);
      form.setFieldsValue({ 
        isActive: true, 
        isPaid: false, 
        requireProof: false, 
        maxDaysPerYear: 0,
        allowNegativeBalance: false,
        noticePeriodDays: 0,
        maxConsecutiveDays: 0,
        requireProofForDays: 0
      });
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  async function onFinish(values: Record<string, unknown>) {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        action: editingId ? 'edit' : 'add',
        _id: editingId,
      };

      const res = await fetch('/api/leave-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      if (data.success) {
        notification.success({ message: data.message });
        setIsModalVisible(false);
        fetchTypes();
      } else {
        notification.error({ message: data.message || 'Có lỗi xảy ra' });
      }
    } catch (error) {
      notification.error({ message: 'Lỗi server' });
    } finally {
      setSubmitting(false);
    }
  };

  async function handleDelete(id: string) {
    try {
      const res = await fetch('/api/leave-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', _id: id }),
      });
      const data = await res.json();
      if (data.success) {
        notification.success({ message: 'Xóa thành công' });
        fetchTypes();
      } else {
        notification.error({ message: data.message || 'Lỗi khi xóa' });
      }
    } catch (error) {
      notification.error({ message: 'Lỗi server' });
    }
  };

  const columns = [
    {
      title: 'Tên hình thức',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: LeaveType) => (
        <div>
          <div className="font-semibold text-blue-600">{text}</div>
          <div className="text-xs text-slate-400">{record.code}</div>
        </div>
      ),
    },
    {
      title: 'Có lương',
      dataIndex: 'isPaid',
      key: 'isPaid',
      render: (isPaid: boolean) => (
        <Tag color={isPaid ? 'green' : 'default'}>{isPaid ? 'Có lương' : 'Không lương'}</Tag>
      ),
    },
    {
      title: 'Yêu cầu minh chứng',
      dataIndex: 'requireProof',
      key: 'requireProof',
      render: (req: boolean) => (
        <Tag color={req ? 'orange' : 'default'}>{req ? 'Bắt buộc' : 'Không bắt buộc'}</Tag>
      ),
    },
    {
      title: 'Số ngày tối đa/năm',
      dataIndex: 'maxDaysPerYear',
      key: 'maxDaysPerYear',
      render: (val: number) => val > 0 ? `${val} ngày` : 'Không giới hạn',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean) => (
        <Badge status={active ? 'success' : 'default'} text={active ? 'Hoạt động' : 'Tạm ẩn'} />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_text: unknown, record: LeaveType) => (
        <Space size="middle">
          <Button type="text" icon={<Edit className="w-4 h-4 text-blue-500" />} onClick={() => showModal(record)} />
          <Popconfirm
            title="Xóa hình thức nghỉ này?"
            description="Hành động này không thể hoàn tác."
            onConfirm={() => record._id && handleDelete(record._id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<Trash2 className="w-4 h-4" />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-blue-500" />
            Quản lý hình thức xin nghỉ
          </h1>
          <p className="text-slate-500 mt-1">Danh sách các loại đơn xin nghỉ phép áp dụng trong công ty</p>
        </div>
        <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => showModal()} className="rounded-lg h-10 px-6">
          Thêm hình thức mới
        </Button>
      </div>

      <Card className="shadow-sm rounded-xl border-slate-200" bodyStyle={{ padding: 0 }}>
        <Table 
          columns={columns} 
          dataSource={types} 
          rowKey="_id" 
          loading={loading}
          pagination={false}
          className="overflow-x-auto"
        />
      </Card>

      <Modal
        title={editingId ? "Sửa hình thức xin nghỉ" : "Thêm hình thức xin nghỉ"}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={700}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          className="mt-4 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item 
              name="name" 
              label="Tên hình thức" 
              rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
            >
              <Input placeholder="VD: Nghỉ phép năm" />
            </Form.Item>
            <Form.Item 
              name="code" 
              label="Mã hình thức (viết liền không dấu)" 
              rules={[{ required: true, message: 'Vui lòng nhập mã' }]}
            >
              <Input placeholder="VD: ANNUAL_LEAVE" disabled={!!editingId} />
            </Form.Item>
          </div>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea placeholder="Nhập mô tả thêm..." rows={2} />
          </Form.Item>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <Form.Item name="isPaid" valuePropName="checked" label="Nghỉ có lương">
              <Switch />
            </Form.Item>
            <Form.Item name="requireProof" valuePropName="checked" label="Yêu cầu minh chứng">
              <Switch />
            </Form.Item>
            <Form.Item name="isActive" valuePropName="checked" label="Trạng thái hoạt động">
              <Switch />
            </Form.Item>
            <Form.Item name="allowNegativeBalance" valuePropName="checked" label="Cho phép âm phép">
              <Switch />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="maxDaysPerYear" label="Số ngày phép tối đa / năm" tooltip="Để 0 nếu không giới hạn">
              <InputNumber min={0} className="w-full" addonAfter="ngày" />
            </Form.Item>
            <Form.Item name="maxConsecutiveDays" label="Nghỉ liên tục tối đa" tooltip="Để 0 nếu không giới hạn">
              <InputNumber min={0} className="w-full" addonAfter="ngày" />
            </Form.Item>
            <Form.Item name="noticePeriodDays" label="Báo trước tối thiểu" tooltip="Phải tạo đơn trước X ngày">
              <InputNumber min={0} className="w-full" addonAfter="ngày" />
            </Form.Item>
            <Form.Item name="requireProofForDays" label="Minh chứng nếu nghỉ >=" tooltip="Bắt buộc có minh chứng nếu xin nghỉ từ số ngày này trở lên">
              <InputNumber min={0} className="w-full" addonAfter="ngày" />
            </Form.Item>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-slate-700">Phạm vi áp dụng (Bỏ trống = Áp dụng tất cả)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item name="applicableBranches" label="Chi nhánh">
                <Select mode="multiple" placeholder="Chọn chi nhánh" allowClear>
                  {branches.map(b => (
                    <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="applicableLocations" label="Cơ sở">
                <Select mode="multiple" placeholder="Chọn cơ sở" allowClear>
                  {locations.map(l => (
                    <Select.Option key={l._id} value={l._id}>{l.locationName}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="applicableGroups" label="Khối/Cụm">
                <Select mode="multiple" placeholder="Chọn khối/cụm" allowClear>
                  {deptGroups.map(g => (
                    <Select.Option key={g._id} value={g._id}>{g.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="applicableDepartments" label="Phòng ban">
                <Select mode="multiple" placeholder="Chọn phòng ban" allowClear>
                  {departments.map(d => (
                    <Select.Option key={d._id} value={d._id}>{d.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button onClick={handleCancel}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {editingId ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
