"use client";

import React, { useState, useEffect } from 'react';
import { Table, Card, Typography, message, Tag, Input, Select } from 'antd';
import { Receipt, CheckCircle, Search as SearchIcon } from 'lucide-react';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
import { DateSinglePicker } from '@/app/ui/base/date-picker';

interface PayrollRecord {
  _id: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  position: string;
  workDaysVP?: number;
  workDaysOT?: number;
  workDaysWFH?: number;
  workDaysProbation?: number;
  finalSalary: number;
  isFinalized: boolean;
}

export default function PayrollResultsPage() {
  const [payrollMonth, setPayrollMonth] = useState<string>(dayjs().format('YYYY-MM'));
  const [data, setData] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(`/api/payroll-results?payrollMonth=${payrollMonth}`);
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

    loadData();
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
      render: (text: string, record: PayrollRecord) => (
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
      render: (_: unknown, record: PayrollRecord) => {
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
      render: (_: unknown, record: PayrollRecord) => record.isFinalized
        ? <Tag color="success" icon={<CheckCircle size={14} className="mr-1 inline" />}>Đã chốt</Tag>
        : <Tag color="default">Chưa chốt</Tag>
    }
  ];

  const filteredData = data.filter(item => {
    const matchName = (item.employeeName || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (item.employeeCode || '').toLowerCase().includes(searchText.toLowerCase());
    const matchDept = selectedDept === 'ALL' || item.departmentName === selectedDept;
    return matchName && matchDept;
  });

  const departments = Array.from(new Set(data.map(d => d.departmentName).filter(Boolean)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Title level={4} className="flex items-center gap-2 m-0 text-slate-800">
            <Receipt className="text-indigo-600" />
            Kết quả lương tháng
          </Title>
          <Text type="secondary">Danh sách bảng lương đã được chốt và đồng bộ từ hệ thống Tính lương (HQ).</Text>
        </div>

        <div className="flex items-center gap-3">
          <Input
            placeholder="Tìm theo tên hoặc mã NV..."
            prefix={<SearchIcon size={16} className="text-slate-400" />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-64"
            allowClear
          />
          <Select
            value={selectedDept}
            onChange={setSelectedDept}
            className="w-48"
            options={[
              { label: 'Tất cả phòng ban', value: 'ALL' },
              ...departments.map(d => ({ label: String(d), value: String(d) }))
            ]}
          />
          <DateSinglePicker
            picker="month"
            values={dayjs(payrollMonth, 'YYYY-MM')}
            onDateChange={(date) => {
              if (date) {
                setLoading(true);
                setPayrollMonth(date.format('YYYY-MM'));
              }
            }}
            className="w-32"
            allowClear={false}
          />
        </div>
      </div>

      <Card className="shadow-sm border-slate-200" bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={filteredData}
          loading={loading}
          rowKey="_id"
          pagination={{ pageSize: 50 }}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
}
