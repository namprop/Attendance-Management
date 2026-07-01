import React, { useState } from 'react';
import { Modal, Form, Input, message } from 'antd';

interface QuickCreateModalsProps {
  isBranchModalOpen: boolean;
  setIsBranchModalOpen: (open: boolean) => void;
  isLocationModalOpen: boolean;
  setIsLocationModalOpen: (open: boolean) => void;
  isGroupModalOpen: boolean;
  setIsGroupModalOpen: (open: boolean) => void;
  isDeptModalOpen: boolean;
  setIsDeptModalOpen: (open: boolean) => void;
  
  modalBranchIdWatch?: string;
  modalLocationIdWatch?: string;
  modalGroupIdWatch?: string;

  onSuccess: (type: 'branch' | 'location' | 'group' | 'dept', insertedId: string) => void;
}

export const QuickCreateModals: React.FC<QuickCreateModalsProps> = ({
  isBranchModalOpen, setIsBranchModalOpen,
  isLocationModalOpen, setIsLocationModalOpen,
  isGroupModalOpen, setIsGroupModalOpen,
  isDeptModalOpen, setIsDeptModalOpen,
  modalBranchIdWatch, modalLocationIdWatch, modalGroupIdWatch,
  onSuccess
}) => {
  const [branchForm] = Form.useForm();
  const [locationForm] = Form.useForm();
  const [groupForm] = Form.useForm();
  const [deptForm] = Form.useForm();
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);

  const handleQuickCreateBranch = async () => {
    try {
      const values = await branchForm.validateFields();
      setIsSubmittingQuick(true);
      const res = await fetch('/api/branch-timekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        message.success('Thêm chi nhánh thành công');
        setIsBranchModalOpen(false);
        branchForm.resetFields();
        const insertedId = typeof data.data === 'string' ? data.data : (data.data?._id || data.data?.id);
        onSuccess('branch', insertedId);
      } else {
        message.error(data.message || 'Lỗi thêm chi nhánh');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  const handleQuickCreateLocation = async () => {
    try {
      if (!modalBranchIdWatch) {
        message.error('Vui lòng chọn Chi nhánh trước khi thêm Cơ sở');
        return;
      }
      const values = await locationForm.validateFields();
      setIsSubmittingQuick(true);

      const body = {
        locationName: values.locationName,
        branchId: modalBranchIdWatch,
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
        const insertedId = typeof data.data === 'string' ? data.data : (data.data?._id || data.data?.id);
        onSuccess('location', insertedId);
      } else {
        message.error(data.message || 'Lỗi thêm cơ sở');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  const handleQuickCreateGroup = async () => {
    try {
      if (!modalLocationIdWatch) {
        message.error('Vui lòng chọn Cơ sở chấm công trước khi thêm Khối / Cụm');
        return;
      }
      const values = await groupForm.validateFields();
      setIsSubmittingQuick(true);
      const body = {
        action: 'add',
        name: values.name,
        code: values.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        shortCode: values.shortCode || '',
        locationId: modalLocationIdWatch,
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
        const insertedId = typeof data.data === 'string' ? data.data : (data.data?._id || data.data?.id);
        onSuccess('group', insertedId);
      } else {
        message.error(data.message || 'Lỗi thêm khối/cụm');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  const handleQuickCreateDept = async () => {
    try {
      if (!modalGroupIdWatch) {
        message.error('Vui lòng chọn Khối / Cụm trước khi thêm Phòng ban');
        return;
      }
      const values = await deptForm.validateFields();
      setIsSubmittingQuick(true);

      const body = {
        action: 'add',
        name: values.name,
        code: values.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        shortCode: values.shortCode || '',
        departmentGroupTimekeepingId: modalGroupIdWatch,
        locationId: modalLocationIdWatch || ""
      };

      const res = await fetch('/api/departments-timekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        message.success('Thêm phòng ban thành công');
        setIsDeptModalOpen(false);
        deptForm.resetFields();
        const insertedId = typeof data.data === 'string' ? data.data : (data.data?._id || data.data?.id);
        onSuccess('dept', insertedId);
      } else {
        message.error(data.message || 'Lỗi thêm phòng ban');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  return (
    <>
      <Modal
        title="Thêm Chi nhánh nhanh"
        open={isBranchModalOpen}
        onCancel={() => { setIsBranchModalOpen(false); branchForm.resetFields(); }}
        onOk={handleQuickCreateBranch}
        confirmLoading={isSubmittingQuick}
        okText="Tạo"
        cancelText="Hủy"
        width={400}
        destroyOnHidden
      >
        <Form form={branchForm} layout="vertical" className="mt-4">
          <Form.Item name="name" label="Tên Chi nhánh" rules={[{ required: true, message: 'Nhập tên chi nhánh' }]}>
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
            <Form.Item name="code" label="Mã Chi nhánh (Slug)" rules={[{ required: true, message: 'Nhập mã chi nhánh' }]}>
              <Input placeholder="VD: chi-nhanh-ha-noi" className="font-mono" />
            </Form.Item>
            <Form.Item name="shortCode" label="Mã viết tắt">
              <Input placeholder="VD: CNHN" className="font-mono uppercase" style={{ textTransform: 'uppercase' }} onChange={(e) => branchForm.setFieldValue('shortCode', e.target.value.toUpperCase())} />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Thêm cơ sở mới nhanh"
        open={isLocationModalOpen}
        onCancel={() => { setIsLocationModalOpen(false); locationForm.resetFields(); }}
        onOk={handleQuickCreateLocation}
        confirmLoading={isSubmittingQuick}
        okText="Thêm mới"
        cancelText="Hủy"
        width={400}
        destroyOnHidden
      >
        <Form form={locationForm} layout="vertical" className="mt-4">
          <Form.Item
            name="locationName"
            label="Tên cơ sở"
            rules={[{ required: true, message: 'Vui lòng nhập tên cơ sở' }]}
          >
            <Input 
              placeholder="Ví dụ: Kho Thái Bình" 
              onChange={(e) => {
                const slug = e.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                locationForm.setFieldValue('locationSlug', slug);
                const shortCode = e.target.value.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Đ/g, 'D').split(/\s+/).map(w => { const m = w.match(/[A-Z0-9]/); return m ? m[0] : ''; }).join('');
                locationForm.setFieldValue('shortCode', shortCode);
              }}
            />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="locationSlug" label="Mã cơ sở (Slug)" rules={[{ required: true, message: 'Vui lòng nhập mã cơ sở' }]}>
              <Input placeholder="VD: kho-thai-binh" className="font-mono" />
            </Form.Item>
            <Form.Item name="shortCode" label="Mã viết tắt">
              <Input placeholder="VD: KTB" className="font-mono uppercase" style={{ textTransform: 'uppercase' }} onChange={(e) => locationForm.setFieldValue('shortCode', e.target.value.toUpperCase())} />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Thêm Khối/Cụm nhanh"
        open={isGroupModalOpen}
        onCancel={() => { setIsGroupModalOpen(false); groupForm.resetFields(); }}
        onOk={handleQuickCreateGroup}
        confirmLoading={isSubmittingQuick}
        okText="Thêm mới"
        cancelText="Hủy"
        width={400}
        destroyOnHidden
      >
        <Form form={groupForm} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="Tên Khối / Cụm"
            rules={[{ required: true, message: 'Vui lòng nhập tên khối cụm' }]}
          >
            <Input 
              placeholder="Ví dụ: Khối Công nghệ" 
              onChange={(e) => {
                const slug = e.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                groupForm.setFieldValue('code', slug);
                const shortCode = e.target.value.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Đ/g, 'D').split(/\s+/).map(w => { const m = w.match(/[A-Z0-9]/); return m ? m[0] : ''; }).join('');
                groupForm.setFieldValue('shortCode', shortCode);
              }}
            />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="code" label="Mã Khối/Cụm (Slug)" rules={[{ required: true, message: 'Vui lòng nhập mã khối cụm' }]}>
              <Input placeholder="VD: khoi-cong-nghe" className="font-mono" />
            </Form.Item>
            <Form.Item name="shortCode" label="Mã viết tắt">
              <Input placeholder="VD: KCN" className="font-mono uppercase" style={{ textTransform: 'uppercase' }} onChange={(e) => groupForm.setFieldValue('shortCode', e.target.value.toUpperCase())} />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Thêm Phòng ban nhanh"
        open={isDeptModalOpen}
        onCancel={() => { setIsDeptModalOpen(false); deptForm.resetFields(); }}
        onOk={handleQuickCreateDept}
        confirmLoading={isSubmittingQuick}
        okText="Thêm mới"
        cancelText="Hủy"
        width={400}
        destroyOnHidden
      >
        <Form form={deptForm} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="Tên Phòng ban"
            rules={[{ required: true, message: 'Vui lòng nhập tên phòng ban' }]}
          >
            <Input 
              placeholder="Ví dụ: Phòng Kế toán" 
              onChange={(e) => {
                const slug = e.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                deptForm.setFieldValue('code', slug);
                const shortCode = e.target.value.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Đ/g, 'D').split(/\s+/).map(w => { const m = w.match(/[A-Z0-9]/); return m ? m[0] : ''; }).join('');
                deptForm.setFieldValue('shortCode', shortCode);
              }}
            />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="code" label="Mã Phòng ban (Slug)" rules={[{ required: true, message: 'Vui lòng nhập mã phòng ban' }]}>
              <Input placeholder="VD: phong-ke-toan" className="font-mono" />
            </Form.Item>
            <Form.Item name="shortCode" label="Mã viết tắt">
              <Input placeholder="VD: PKT" className="font-mono uppercase" style={{ textTransform: 'uppercase' }} onChange={(e) => deptForm.setFieldValue('shortCode', e.target.value.toUpperCase())} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </>
  );
};
