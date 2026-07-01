'use client';

import React, { useEffect, useState } from 'react';
import { Card, Form, Switch, InputNumber, Button, notification, Spin } from 'antd';
import { Settings, Save } from 'lucide-react';
import { LeaveConfig } from '@/app/interface/timekeeping';

export default function LeaveConfigsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function fetchConfig() {
    try {
      const res = await fetch('/api/leave-configs');
      const data = await res.json();
      if (data.data) {
        form.setFieldsValue(data.data);
      }
    } catch (error) {
      notification.error({ message: 'Lỗi tải cấu hình' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const init = async () => {
      fetchConfig();
    };
    init();
  }, []);

  async function onFinish(values: LeaveConfig) {
    setSaving(true);
    try {
      const res = await fetch('/api/leave-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (data.success) {
        notification.success({ message: 'Lưu cấu hình thành công' });
      } else {
        notification.error({ message: data.message || 'Lỗi lưu cấu hình' });
      }
    } catch (error) {
      notification.error({ message: 'Lỗi server' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-500" />
            Cấu hình đơn xin nghỉ
          </h1>
          <p className="text-slate-500 mt-1">Thiết lập các quy tắc chung cho việc tạo đơn xin nghỉ phép</p>
        </div>
      </div>

      <Card className="shadow-sm rounded-xl border-slate-200">
        <Spin spinning={loading}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card type="inner" title="Xin nghỉ trong quá khứ">
                <Form.Item name="allowPastDates" valuePropName="checked" label="Cho phép chọn ngày quá khứ">
                  <Switch />
                </Form.Item>
                <Form.Item 
                  name="maxPastDays" 
                  label="Số ngày tối đa trong quá khứ"
                  tooltip="Chỉ có tác dụng khi bật Cho phép chọn ngày quá khứ"
                >
                  <InputNumber min={0} className="w-full" addonAfter="ngày" />
                </Form.Item>
              </Card>

              <Card type="inner" title="Xin nghỉ trong tương lai" className="h-full">
                <Form.Item name="allowFutureDates" valuePropName="checked" label="Cho phép chọn ngày tương lai">
                  <Switch />
                </Form.Item>
                <Form.Item 
                  name="maxFutureDays" 
                  label="Số ngày tối đa trong tương lai"
                  tooltip="Chỉ có tác dụng khi bật Cho phép chọn ngày tương lai"
                >
                  <InputNumber min={0} className="w-full" addonAfter="ngày" />
                </Form.Item>
              </Card>

              <Card type="inner" title="Quy tắc chung" className="h-full">
                <Form.Item name="requireApprovalLevels" label="Số cấp duyệt mặc định" tooltip="Đơn xin nghỉ cần qua bao nhiêu người duyệt">
                  <InputNumber min={1} max={5} className="w-full" addonAfter="cấp" />
                </Form.Item>
                <Form.Item name="maxLeaveDaysPerMonth" label="Giới hạn phép / Tháng" tooltip="Để 0 nếu không giới hạn">
                  <InputNumber min={0} className="w-full" addonAfter="ngày" />
                </Form.Item>
                <Form.Item name="allowHalfDayLeave" valuePropName="checked" label="Cho phép xin nghỉ nửa ngày (sáng/chiều)">
                  <Switch />
                </Form.Item>
              </Card>

              <Card type="inner" title="Đi muộn / Về sớm" className="h-full">
                <Form.Item name="limitLateEarlyMinutes" label="Giới hạn số phút tối đa / lần" tooltip="Số phút tối đa cho phép xin đi muộn/về sớm mỗi lần">
                  <InputNumber min={0} className="w-full" addonAfter="phút" />
                </Form.Item>
              </Card>

              <Card type="inner" title="Bàn giao công việc" className="h-full">
                <Form.Item name="requireHandover" valuePropName="checked" label="Bắt buộc nhập thông tin bàn giao công việc">
                  <Switch />
                </Form.Item>
              </Card>
            </div>

            <div className="flex justify-end pt-4 border-t mt-4">
              <Button type="primary" htmlType="submit" icon={<Save className="w-4 h-4" />} loading={saving} size="large" className="rounded-lg">
                Lưu cấu hình
              </Button>
            </div>
          </Form>
        </Spin>
      </Card>
    </div>
  );
}
