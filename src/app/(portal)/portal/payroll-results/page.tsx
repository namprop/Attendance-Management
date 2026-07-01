"use client";

import React, { useState, useEffect } from 'react';
import { Table, Card, Typography, message, Tag } from 'antd';
import { Receipt, CheckCircle } from 'lucide-react';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
import { DateSinglePicker } from '@/app/ui/base/date-picker';

export default function PortalPayrollResultsPage() {
  const [payrollMonth, setPayrollMonth] = useState<string>(dayjs().format('YYYY-MM'));
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async (month: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll-results?payrollMonth=${month}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data || []);
      } else {
        message.error(json.message || 'Lỗi khi tải dữ liệu lương');
      }
    } catch (error) {
      message.error('Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(payrollMonth);
  }, [payrollMonth]);

  const formatVND = (num: number) => {
    if (!num) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const columns = [
    {
      title: 'Tên nhân viên',
      dataIndex: 'employeeName',
      key: 'employeeName',
      render: (text: string, record: any) => (
        <div>
          <div className="font-semibold text-slate-800">{text}</div>
          <div className="text-xs text-slate-500">{record.employeeCode}</div>
        </div>
      )
    },
    {
      title: 'Phòng ban',
      dataIndex: 'departmentName',
      key: 'departmentName',
    },
    {
      title: 'Vị trí',
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: 'Tổng công',
      dataIndex: 'workDaysVP',
      key: 'totalDays',
      render: (_: any, record: any) => {
        const total = (record.workDaysVP || 0) + (record.workDaysOT || 0) + (record.workDaysWFH || 0) + (record.workDaysProbation || 0);
        return <span className="font-semibold text-blue-600">{total}</span>;
      }
    },
    {
      title: 'Lương thực nhận',
      dataIndex: 'finalSalary',
      key: 'finalSalary',
      render: (val: number) => <span className="font-bold text-emerald-600">{formatVND(val)}</span>
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: () => <Tag color="success" icon={<CheckCircle size={14} className="mr-1 inline" />}>Đã chốt</Tag>
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Title level={4} className="flex items-center gap-2 m-0 text-slate-800">
            <Receipt className="text-indigo-600" />
            Bảng lương của tôi
          </Title>
          <Text type="secondary">Xem kết quả lương đã được chốt theo tháng.</Text>
        </div>
        
        <DateSinglePicker
          picker="month"
          values={dayjs(payrollMonth, 'YYYY-MM')}
          onDateChange={(date) => {
            if (date) {
              setPayrollMonth(date.format('YYYY-MM'));
            }
          }}
          className="w-40"
          allowClear={false}
        />
      </div>

      <Card className="shadow-sm border-slate-200" bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="_id"
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
}
