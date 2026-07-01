'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, message, InputNumber, Divider } from 'antd';
import { Building2, MapPin, Network, Users, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const generateSlug = (text: string) => {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

interface FormValues {
  branchName: string;
  branchCode: string;
  branchLocation?: string;
  branchStatus: string;
  kioskName: string;
  kioskCode: string;
  kioskLat: number;
  kioskLng: number;
  kioskRadius: number;
  kioskStatus: string;
  groupName: string;
  groupCode: string;
  groupStatus: string;
  deptName: string;
  deptCode: string;
  deptShortName?: string;
  deptStatus: string;
}

export default function OrganizationWizard({ open, onCancel, onSuccess }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [stepLoading, setStepLoading] = useState<string | null>(null);

  // Auto-generate slugs
  const handleValuesChange = (changedValues: Partial<FormValues>) => {
    if (changedValues.branchName) form.setFieldValue('branchCode', generateSlug(changedValues.branchName));
    if (changedValues.kioskName) form.setFieldValue('kioskCode', generateSlug(changedValues.kioskName));
    if (changedValues.groupName) form.setFieldValue('groupCode', generateSlug(changedValues.groupName));
    if (changedValues.deptName) form.setFieldValue('deptCode', generateSlug(changedValues.deptName));
  };

  const handleFinish = async (values: FormValues) => {
    setLoading(true);
    try {
      // 1. Tạo Chi nhánh
      setStepLoading('Đang tạo Chi nhánh...');
      const branchRes = await fetch('/api/branch-timekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          name: values.branchName,
          code: values.branchCode,
          location: values.branchLocation || '',
          status: values.branchStatus
        }),
      });
      const branchData = await branchRes.json();
      if (!branchRes.ok || !branchData.data?._id) throw new Error(branchData.error || 'Lỗi khi tạo Chi nhánh');
      const branchId = branchData.data._id;

      // 2. Tạo Cơ sở
      setStepLoading('Đang tạo Cơ sở (Điểm chấm công)...');
      const kioskRes = await fetch('/api/v1/kiosk/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationName: values.kioskName,
          locationSlug: values.kioskCode,
          branchId: branchId,
          coordinates: { lat: values.kioskLat, lng: values.kioskLng },
          allowedRadiusMeters: values.kioskRadius,
          status: values.kioskStatus
        }),
      });
      const kioskData = await kioskRes.json();
      if (!kioskRes.ok || !kioskData.data?._id) throw new Error(kioskData.error || 'Lỗi khi tạo Cơ sở');
      const locationId = kioskData.data._id;

      // 3. Tạo Khối/Cụm
      setStepLoading('Đang tạo Khối / Cụm...');
      const groupRes = await fetch('/api/department-groups-timekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          name: values.groupName,
          code: values.groupCode,
          locationId: locationId,
          isActive: values.groupStatus === 'Active'
        }),
      });
      const groupData = await groupRes.json();
      if (!groupRes.ok || !groupData.data?._id) throw new Error(groupData.error || 'Lỗi khi tạo Khối/Cụm');
      const groupId = groupData.data._id;

      // 4. Tạo Phòng ban
      setStepLoading('Đang tạo Phòng ban...');
      const deptRes = await fetch('/api/departments-timekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          name: values.deptName,
          shortName: values.deptShortName || '',
          code: values.deptCode,
          locationId: locationId,
          departmentGroupTimekeepingId: groupId,
          isActive: values.deptStatus === 'Active'
        }),
      });
      const deptData = await deptRes.json();
      if (!deptRes.ok || !deptData.data?._id) throw new Error(deptData.error || 'Lỗi khi tạo Phòng ban');

      message.success('Đã khởi tạo thành công toàn bộ cấu trúc tổ chức!');
      form.resetFields();
      onSuccess();
    } catch (error: unknown) {
      if (error instanceof Error) {
        message.error(error.message);
      } else {
        message.error('Có lỗi xảy ra trong quá trình khởi tạo.');
      }
    } finally {
      setLoading(false);
      setStepLoading(null);
    }
  };

  return (
    <Modal
      title={
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-bold text-slate-800 m-0">Wizard Khởi Tạo Liên Hoàn 4 Cấp</h3>
          <p className="text-sm text-slate-500 font-normal m-0">Tạo mới toàn bộ cấu trúc Tổ chức trong 1 thao tác duy nhất.</p>
        </div>
      }
      open={open}
      onCancel={onCancel}
      width={900}
      footer={null}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        onValuesChange={handleValuesChange}
        className="mt-6"
      >
        <div className="h-[60vh] overflow-y-auto pr-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
          
          {/* Section 1: Chi nhánh */}
          <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <h4 className="text-base font-semibold text-blue-900 m-0">1. Cấp Chi nhánh</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="branchName" label="Tên Chi nhánh" rules={[{ required: true, message: 'Nhập tên' }]}>
                <Input placeholder="VD: Chi nhánh Hà Nội" />
              </Form.Item>
              <Form.Item name="branchCode" label="Mã Chi nhánh (Slug)" rules={[{ required: true, message: 'Nhập mã' }]}>
                <Input placeholder="vd: chi-nhanh-ha-noi" className="font-mono" />
              </Form.Item>
              <Form.Item name="branchLocation" label="Khu vực / Địa chỉ">
                <Input placeholder="VD: Quận Hai Bà Trưng..." />
              </Form.Item>
              <Form.Item name="branchStatus" label="Trạng thái" initialValue="Active">
                <Select>
                  <Select.Option value="Active">Hoạt động</Select.Option>
                  <Select.Option value="Inactive">Tạm khóa</Select.Option>
                </Select>
              </Form.Item>
            </div>
          </div>

          {/* Section 2: Cơ sở */}
          <div className="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <h4 className="text-base font-semibold text-indigo-900 m-0">2. Cấp Cơ sở (Điểm chấm công)</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="kioskName" label="Tên Cơ sở" rules={[{ required: true, message: 'Nhập tên' }]}>
                <Input placeholder="VD: Tòa nhà Vincom Center" />
              </Form.Item>
              <Form.Item name="kioskCode" label="Mã Cơ sở (Slug)" rules={[{ required: true, message: 'Nhập mã' }]}>
                <Input placeholder="vd: toa-nha-vincom" className="font-mono" />
              </Form.Item>
              <Form.Item name="kioskLat" label="Vĩ độ (Lat)" initialValue={21.028511}>
                <InputNumber className="w-full" step={0.000001} />
              </Form.Item>
              <Form.Item name="kioskLng" label="Kinh độ (Lng)" initialValue={105.804817}>
                <InputNumber className="w-full" step={0.000001} />
              </Form.Item>
              <Form.Item name="kioskRadius" label="Bán kính cho phép (m)" initialValue={100} rules={[{ required: true, message: 'Nhập bán kính' }]}>
                <InputNumber className="w-full" min={10} max={5000} />
              </Form.Item>
              <Form.Item name="kioskStatus" label="Trạng thái" initialValue="ACTIVE">
                <Select>
                  <Select.Option value="ACTIVE">Hoạt động</Select.Option>
                  <Select.Option value="INACTIVE">Tạm khóa</Select.Option>
                </Select>
              </Form.Item>
            </div>
          </div>

          {/* Section 3: Khối */}
          <div className="bg-purple-50/50 rounded-xl p-5 border border-purple-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <Network className="w-4 h-4" />
              </div>
              <h4 className="text-base font-semibold text-purple-900 m-0">3. Cấp Khối / Cụm</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="groupName" label="Tên Khối/Cụm" rules={[{ required: true, message: 'Nhập tên' }]}>
                <Input placeholder="VD: Khối Văn phòng" />
              </Form.Item>
              <Form.Item name="groupCode" label="Mã Khối/Cụm (Slug)" rules={[{ required: true, message: 'Nhập mã' }]}>
                <Input placeholder="vd: khoi-van-phong" className="font-mono" />
              </Form.Item>
              <Form.Item name="groupStatus" label="Trạng thái" initialValue="Active">
                <Select>
                  <Select.Option value="Active">Hoạt động</Select.Option>
                  <Select.Option value="Inactive">Tạm khóa</Select.Option>
                </Select>
              </Form.Item>
            </div>
          </div>

          {/* Section 4: Phòng ban */}
          <div className="bg-emerald-50/50 rounded-xl p-5 border border-emerald-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h4 className="text-base font-semibold text-emerald-900 m-0">4. Cấp Phòng ban</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="deptName" label="Tên Phòng ban" rules={[{ required: true, message: 'Nhập tên' }]}>
                <Input placeholder="VD: Phòng Kế toán" />
              </Form.Item>
              <Form.Item name="deptCode" label="Mã Phòng ban (Slug)" rules={[{ required: true, message: 'Nhập mã' }]}>
                <Input placeholder="vd: phong-ke-toan" className="font-mono" />
              </Form.Item>
              <Form.Item name="deptShortName" label="Tên viết tắt">
                <Input placeholder="VD: KT" />
              </Form.Item>
              <Form.Item name="deptStatus" label="Trạng thái" initialValue="Active">
                <Select>
                  <Select.Option value="Active">Hoạt động</Select.Option>
                  <Select.Option value="Inactive">Tạm khóa</Select.Option>
                </Select>
              </Form.Item>
            </div>
          </div>

        </div>

        <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
          <div className="text-sm text-slate-500 flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {stepLoading && <span className="text-blue-600 font-medium">{stepLoading}</span>}
          </div>
          <div className="flex gap-3">
            <Button onClick={onCancel} disabled={loading}>Hủy bỏ</Button>
            <Button type="primary" htmlType="submit" className="bg-blue-600" loading={loading}>
              Lưu toàn bộ
            </Button>
          </div>
        </div>
      </Form>
    </Modal>
  );
}
