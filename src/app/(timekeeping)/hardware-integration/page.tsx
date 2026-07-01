'use client';

import React, { useState } from 'react';
import { Row, Col, Table, Tag, Button, Input } from 'antd';
import { Database } from 'lucide-react';
import { useTimekeepingStore } from '@/app/store/timekeeping/useTimekeepingStore';
import type { Employee } from '@/app/interface/timekeeping';
import { message } from 'antd';
import { cookieBase } from '@/app/utils/cookie';
import { hasPermission, getCachedRoles } from '@/app/service/permissions/permissions';
import type { User } from '@/app/data/dataUser';
import Unauthorized from '@/app/ui/timekeeping/components/unauthorized/Unauthorized';
import { useEffect } from 'react';

interface HardwareRow {
  employeeId: string;
  date: string;
  time: string;
  type: 'IN' | 'OUT';
}

const PYTHON_CODE_SNIPPET = `import requests
from zk import ZK

# Ronald Jack hardware config
zk = ZK('192.168.1.201', port=4370, timeout=10)
try:
    conn = zk.connect()
    records = conn.get_attendance()
    payload = []
    for r in records:
        payload.append({
            "employeeId": f"EMP{str(r.user_id).zfill(3)}",
            "date": r.timestamp.strftime('%Y-%m-%d'),
            "time": r.timestamp.strftime('%H:%M'),
            "type": "IN" if r.status == 0 else "OUT"
        })
    res = requests.post("http://localhost:3000/api/hardware/import-excel", json={"rows": payload})
    print("Xử lý đồng bộ:", res.json())
except Exception as e:
    print("Thất bại:", e)`;

export default function HardwareIntegrationPage() {
  const { employees, refreshState } = useTimekeepingStore();

  const [isLoaded, setIsLoaded] = useState(false);
  const [realUser, setRealUser] = useState<User | null>(null);

  useEffect(() => {
    const userObj = cookieBase.get<User>('info_user');
    setTimeout(() => {
      if (userObj) {
        setRealUser(userObj);
      }
      setIsLoaded(true);
    }, 0);
  }, []);

  const [hardwareRows, setHardwareRows] = useState<HardwareRow[]>([]);
  const [hardwareExcelInput, setHardwareExcelInput] = useState('');
  const [isImportingHardware, setIsImportingHardware] = useState(false);
  const [hardwareImportMsg, setHardwareImportMsg] = useState('');

  if (!isLoaded) {
    return null;
  }

  const roleId = realUser?.role ?? '';
  const roles = getCachedRoles();
  const userRole = roles.find(r => r.id === roleId);
  const isSuperAdmin = hasPermission(roleId, '*');
  const hasAccess = isSuperAdmin || hasPermission(roleId, 'timekeeping_hardware');

  if (realUser && !hasAccess) {
    return <Unauthorized />;
  }


  const handleParseCSV = (csv: string) => {
    const rows: HardwareRow[] = [];
    const lines = csv.trim().split('\n');
    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length >= 4) {
        rows.push({
          employeeId: parts[0],
          date: parts[1],
          time: parts[2],
          type: parts[3].toUpperCase() === 'IN' ? 'IN' : 'OUT',
        });
      }
    }
    setHardwareRows(rows);
  };

  const handleHardwareImport = async () => {
    if (hardwareRows.length === 0) return;
    setIsImportingHardware(true);
    try {
      const res = await fetch('/api/hardware/import-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: hardwareRows }),
      });
      const data = await res.json();
      if (res.ok) {
        setHardwareImportMsg(`✓ Đồng bộ thành công: ${data.processedCount} bản ghi được lưu trữ.`);
        setHardwareRows([]);
        setHardwareExcelInput('');
        message.success('Đồng bộ dữ liệu vân tay thành công!');
        refreshState();
      } else {
        message.error(data.error || 'Lỗi khi đồng bộ dữ liệu vân tay.');
      }
    } catch {
      message.error('Lỗi kết nối máy chủ.');
    } finally {
      setIsImportingHardware(false);
    }
  };

  const loadDemoData = () => {
    const today = new Date().toISOString().split('T')[0];
    const demoCsv = `EMP001,${today},08:02,IN\nEMP002,${today},08:14,IN\nEMP003,${today},08:24,IN\nEMP004,${today},07:54,IN\nEMP005,${today},08:09,IN\nEMP001,${today},12:05,OUT\nEMP002,${today},12:02,OUT`;
    setHardwareExcelInput(demoCsv);
    handleParseCSV(demoCsv);
  };

  const hardwareTableColumns = [
    {
      title: 'Nhân sự',
      key: 'member',
      render: (_: unknown, record: HardwareRow & { tableRowId: number }) => {
        const emp = employees.find((e: Employee) => e.id === record.employeeId);
        return emp ? (
          <span className="font-semibold text-xs text-slate-700">{emp.name} ({record.employeeId})</span>
        ) : (
          <span className="text-red-500 font-bold text-xs">Mã {record.employeeId} lạ</span>
        );
      },
    },
    {
      title: 'Ngày quét',
      dataIndex: 'date',
      key: 'date',
      render: (val: string) => <span className="font-mono text-[11px] text-slate-500">{val}</span>,
    },
    {
      title: 'Giờ quét',
      dataIndex: 'time',
      key: 'time',
      render: (val: string) => <span className="font-mono text-xs text-slate-800 font-bold">{val}</span>,
    },
    {
      title: 'Thể loại',
      dataIndex: 'type',
      key: 'type',
      align: 'center' as const,
      render: (val: string) => <Tag color={val === 'IN' ? 'cyan' : 'blue'}>{val}</Tag>,
    },
    {
      title: 'Gỡ',
      key: 'delete',
      align: 'right' as const,
      render: (_: unknown, record: HardwareRow & { tableRowId: number }) => (
        <Button
          type="text"
          danger
          size="small"
          onClick={() => setHardwareRows((prev) => prev.filter((_, i) => i !== record.tableRowId))}
        >
          ✕
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-linear-to-rrom-blue-50/90 to-indigo-50/50 p-6 rounded-2xl border border-blue-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(22,119,255,0.06)] hover:-translate-y-0.5 transition-all duration-300">
        <div className="relative z-10 max-w-3xl">
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full">
            Phần Cứng & Tích Hợp
          </span>
          <h2 className="text-xl font-bold mt-2.5 mb-1.5 text-slate-800">Kết Nối Máy Chấm Công Vân Tay Vật Lý</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Lập trình đồng bộ hóa nhật ký chấm công từ các máy vân tay ZKTeco, Ronald Jack, Hikvision sử dụng SDK mạng LAN (TCP 4370) hoặc nhập nhanh từ tệp xuất Excel thô.
          </p>
        </div>
      </div>

      {hardwareImportMsg && (
        <div className="p-3.5 bg-blue-50 text-blue-800 border border-blue-100 rounded-lg text-xs font-semibold">
          {hardwareImportMsg}
        </div>
      )}

      <Row gutter={[24, 24]}>
        {/* Documentation & Python agent guidelines */}
        <Col xs={24} lg={10} className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
            <span className="font-bold text-xs uppercase text-slate-400 tracking-wider block mb-3">Phương án liên kết thiết bị</span>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                <h4 className="font-bold text-slate-800 m-0 text-xs">Phân tích tệp Excel Thô (Simulated)</h4>
                <p className="text-[11px] text-slate-500 mt-1 mb-0 leading-normal">
                  HR trích xuất Excel log thô hàng ngày từ phần mềm máy vân tay văn phòng, sau đó dán dữ liệu đó vào trường xử lý phía bên phải.
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                <h4 className="font-bold text-slate-800 m-0 text-xs">Kết nối API LAN Agent</h4>
                <p className="text-[11px] text-slate-500 mt-1 mb-0 leading-normal">
                  Sử dụng mã agent chạy nền liên tục lắng nghe giao thức TCP 4370 của Máy vân tay nội bộ để tự động cập nhật báo cáo lên Chấm công.
                </p>
              </div>
            </div>
          </div>

          {/* Python Code Card */}
          <div className="bg-slate-50 text-slate-700 shadow-xs font-mono text-[10px] p-5 rounded-2xl border border-slate-200/60">
            <p className="text-blue-600 font-bold border-b border-slate-200 pb-1.5 mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              ❖ zk_agent_pusher.py
            </p>
            <pre className="m-0 overflow-x-auto leading-relaxed text-slate-600 font-medium font-mono" style={{ maxHeight: '200px' }}>
              {PYTHON_CODE_SNIPPET}
            </pre>
          </div>
        </Col>

        {/* CSV Paste + Sync */}
        <Col xs={24} lg={14}>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
            <div className="flex justify-between items-center w-full mb-3">
              <span className="font-bold text-xs uppercase text-slate-400 tracking-wider">Nạp dữ liệu Excel từ máy vân tay</span>
              <Button size="small" type="dashed" onClick={loadDemoData}>
                Tải Demo Vân Tay
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Dán các dòng CSV định dạng (ID_Nhân_Sự, Ngày, Giờ, IN/OUT):
                </label>
                <Input.TextArea
                  rows={4}
                  value={hardwareExcelInput}
                  placeholder="v.v. EMP001,2026-05-25,08:02,IN"
                  className="font-mono text-xs"
                  onChange={(e) => {
                    setHardwareExcelInput(e.target.value);
                    handleParseCSV(e.target.value);
                  }}
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center">
                <span className="text-xs text-slate-500">
                  Xếp hàng: <b>{hardwareRows.length} bản ghi</b> sẵn sàng đồng bộ.
                </span>
                <Button
                  type="primary"
                  icon={<Database className="w-4 h-4" />}
                  disabled={hardwareRows.length === 0 || isImportingHardware}
                  loading={isImportingHardware}
                  onClick={handleHardwareImport}
                >
                  Đồng bộ lên Cloud HQ
                </Button>
              </div>

              {hardwareRows.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Xem thử các dòng vân tay:
                  </span>
                  <Table
                    dataSource={hardwareRows.map((row, idx) => ({ ...row, tableRowId: idx }))}
                    rowKey="tableRowId"
                    pagination={{ pageSize: 4 }}
                    size="small"
                    className="border border-slate-100 rounded-lg overflow-hidden"
                    scroll={{ x: 'max-content' }}
                    columns={hardwareTableColumns}
                  />
                </div>
              )}
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}
