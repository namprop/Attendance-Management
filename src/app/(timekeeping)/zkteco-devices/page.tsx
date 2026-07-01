'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Popconfirm, message, Drawer, Tabs, Tooltip } from 'antd';
import { Monitor, Plus, Pencil, Trash2, Settings, AlertCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ZktecoDevice, KioskLocation, BranchTimekeeping } from '@/app/interface/timekeeping';
import ZktecoUserManagement from '@/app/ui/timekeeping/zkteco/ZktecoUserManagement';
import ZktecoDeviceSettings from '@/app/ui/timekeeping/zkteco/ZktecoDeviceSettings';
import ZktecoLogsView from '@/app/ui/timekeeping/zkteco/ZktecoLogsView';
import ZktecoConnectorsView from '@/app/ui/timekeeping/zkteco/ZktecoConnectorsView';

interface ZktecoConnectorData {
  _id: string;
  name: string;
  connectorUrl: string;
  branchId: string;
  branchName?: string;
  status: string;
  isConnector?: boolean;
  children?: ZktecoDevice[];
}

type TopologyNode = ZktecoConnectorData | (ZktecoDevice & { isConnector?: boolean });

export default function ZktecoDevicesPage() {
  const queryClient = useQueryClient();

  const { data: devices = [], isLoading: isDevicesLoading } = useQuery<ZktecoDevice[]>({
    queryKey: ['zkteco-devices'],
    queryFn: async () => {
      const res = await fetch('/api/v1/zkteco-devices');
      const data = await res.json();
      return data.data || [];
    }
  });

  const { data: deviceStatuses = {} } = useQuery<Record<string, { isOnline: boolean, lastErrorMessage?: string, lastErrorTime?: string }>>({
    queryKey: ['zkteco-active-statuses'],
    // queryFn bắt buộc với TanStack Query v5. Data thực sự được đẩy vào
    // qua queryClient.setQueryData() từ SSE stream bên dưới.
    queryFn: () => Promise.resolve({} as Record<string, { isOnline: boolean, lastErrorMessage?: string, lastErrorTime?: string }>),
    staleTime: Infinity, // Không tự fetch lại — chỉ update qua SSE
    initialData: {}
  });

  useEffect(() => {
    const eventSource = new EventSource('/api/v1/zkteco-devices/active-connections/stream');
    eventSource.onmessage = (event) => {
      try {
        const newData = JSON.parse(event.data);
        queryClient.setQueryData(['zkteco-active-statuses'], newData.deviceStatuses || {});
      } catch (e) {}
    };
    return () => eventSource.close();
  }, [queryClient]);

  const { data: locations = [], isLoading: isLocationsLoading } = useQuery<KioskLocation[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      const res = await fetch('/api/v1/kiosk/locations');
      const data = await res.json();
      return data.data || [];
    }
  });

  const { data: branches = [], isLoading: isBranchesLoading } = useQuery<BranchTimekeeping[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await fetch('/api/branch-timekeeping');
      const data = await res.json();
      return data.data || [];
    }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [controlDevice, setControlDevice] = useState<ZktecoDevice | null>(null);
  const [editingDevice, setEditingDevice] = useState<ZktecoDevice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Filter state
  const [filterSearch, setFilterSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState<string | null>(null);

  // Form state
  const [formBranchId, setFormBranchId] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['zkteco-devices'] });
  }, [queryClient]);

  const handleOpenCreate = () => {
    setEditingDevice(null);
    form.resetFields();
    setFormBranchId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (device: ZktecoDevice) => {
    setEditingDevice(device);
    setFormBranchId(device.branchId as string || null);
    form.setFieldsValue({
      deviceName: device.deviceName,
      connectorUrl: device.connectorUrl,
      ipAddress: device.ipAddress,
      branchId: device.branchId,
      locationId: device.locationId,
      note: device.note,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);

      const selectedLocation = locations.find(l => l._id === values.locationId);

      const payload = {
        ...values,
        locationSlug: selectedLocation?.locationSlug,
        locationName: selectedLocation?.locationName,
        branchId: selectedLocation?.branchId,
        branchName: selectedLocation?.branchName,
      };

      if (editingDevice) {
        const res = await fetch('/api/v1/zkteco-devices', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ _id: editingDevice._id, ...payload }),
        });
        const data = await res.json();
        if (res.ok) {
          message.success(data.message);
          setIsModalOpen(false);
          fetchDevices();
        } else message.error(data.message);
      } else {
        const res = await fetch('/api/v1/zkteco-devices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) {
          message.success(data.message);
          setIsModalOpen(false);
          fetchDevices();
        } else message.error(data.message);
      }
    } catch {
      // Validate error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/v1/zkteco-devices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: id }),
      });
      const data = await res.json();
      if (res.ok) {
        message.success(data.message);
        fetchDevices();
      } else message.error(data.message);
    } catch {
      message.error('Lỗi kết nối.');
    }
  };

  const filteredDevices = devices.filter(d => {
    if (filterBranch && d.branchId !== filterBranch) return false;
    if (filterSearch && !d.deviceName.toLowerCase().includes(filterSearch.toLowerCase()) && !d.ipAddress.includes(filterSearch)) return false;
    return true;
  });

  // Group devices by connector for topology view
  const { data: connectors = [] } = useQuery<ZktecoConnectorData[]>({
    queryKey: ['zkteco-connectors'],
    queryFn: async () => {
      const res = await fetch('/api/v1/zkteco-connectors');
      const data = await res.json();
      return data.data || [];
    }
  });

  const topologyData = connectors.map(connector => {
      const children = filteredDevices.filter(d => d.connectorId === connector._id);
      return {
          ...connector,
          isConnector: true,
          children: children.length > 0 ? children : undefined
      };
  });

  const columns = [
    {
      title: 'Tên / Thiết bị',
      dataIndex: 'deviceName',
      render: (val: string, record: TopologyNode) => {
        if (record.isConnector) {
           const conn = record as ZktecoConnectorData;
           return (
             <div className="flex items-center gap-2">
               <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
                 <Monitor className="w-3.5 h-3.5 text-blue-600" />
               </div>
               <span className="font-bold text-slate-800 uppercase">{conn.name}</span>
               <Tag color={conn.status === 'ONLINE' ? 'green' : 'red'} className="ml-2 text-[10px]">
                  {conn.status}
               </Tag>
             </div>
           );
        }
        const dev = record as ZktecoDevice;
        return (
          <div className="flex items-center gap-2 pl-4">
            <Monitor className="w-4 h-4 text-purple-600" />
            <span className="font-bold text-slate-800">{val || dev.deviceName}</span>
          </div>
        );
      }
    },
    {
      title: 'Mạng lưới (IP LAN)',
      render: (_: unknown, record: TopologyNode) => {
        if (record.isConnector) return <span className="text-xs text-slate-500">{(record as ZktecoConnectorData).connectorUrl}</span>;
        const dev = record as ZktecoDevice;
        return (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 w-fit font-mono font-bold">
              IP: {dev.ipAddress}{dev.port ? `:${dev.port}` : ''}
            </span>
          </div>
        );
      }
    },
    {
      title: 'Cơ sở',
      render: (_: unknown, record: TopologyNode) => {
        if (record.isConnector) return <span className="text-slate-500 font-medium">{(record as ZktecoConnectorData).branchName}</span>;
        const dev = record as ZktecoDevice;
        return (
          <div className="flex flex-col gap-0">
            <span className="font-bold text-slate-800 text-sm">{dev.locationName || 'Chưa phân bổ'}</span>
            <span className="text-xs text-slate-500">{dev.branchName || ''}</span>
          </div>
        );
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      align: 'center' as const,
      render: (val: string, record: TopologyNode) => {
        if (record.isConnector) return null;
        
        const dev = record as ZktecoDevice;
        const parentConnector = connectors.find(c => c._id === dev.connectorId);
        const isConnectorOnline = parentConnector ? parentConnector.status === 'ONLINE' : false;

        const deviceStatus = deviceStatuses[dev._id!];
        let isOnline = deviceStatus ? deviceStatus.isOnline : false;
        let errorMessage = deviceStatus?.lastErrorMessage;
        
        // Nếu Cổng bị ngắt kết nối thì máy con cũng bị ép thành Mất kết nối
        if (!isConnectorOnline) {
          isOnline = false;
          errorMessage = errorMessage || 'Mất kết nối với Cổng trung chuyển';
        }

        if (val !== 'ACTIVE') {
          return <Tag color="default" className="font-semibold m-0">Vô hiệu</Tag>;
        }

        if (isOnline) {
          return <Tag color="green" className="font-semibold m-0">Đã kết nối</Tag>;
        }

        return (
          <div className="flex flex-col items-center gap-1">
            <Tag color="red" className="font-semibold m-0">Mất kết nối</Tag>
            {errorMessage && (
              <Tooltip title={errorMessage}>
                <span className="text-[10px] text-red-500 font-medium flex items-center gap-1 cursor-help max-w-[120px] truncate">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errorMessage}
                </span>
              </Tooltip>
            )}
          </div>
        );
      }
    },
    {
      title: 'Thao tác',
      align: 'right' as const,
      render: (_: unknown, record: TopologyNode) => {
        if (record.isConnector) return null;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button type="primary" size="small" ghost icon={<Settings className="w-3.5 h-3.5" />} onClick={() => setControlDevice(record as ZktecoDevice)}>
              Điều khiển
            </Button>
            <Button type="text" size="small" icon={<Pencil className="w-3.5 h-3.5 text-blue-500" />} onClick={() => handleOpenEdit(record as ZktecoDevice)} />
            <Popconfirm title="Xóa thiết bị này?" onConfirm={() => handleDelete(record._id!)} okText="Xóa" cancelText="Hủy">
              <Button type="text" size="small" danger icon={<Trash2 className="w-3.5 h-3.5" />} />
            </Popconfirm>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-purple-50/90 to-indigo-50/50 p-6 rounded-2xl border border-purple-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-purple-600 bg-purple-100 px-2.5 py-1 rounded-full">
          ZKTeco / Ronald Jack
        </span>
        <h2 className="text-xl font-bold mt-2.5 mb-1.5 text-slate-800">Quản Lý Máy Chấm Công Vật Lý</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Quản lý tập trung các máy chấm công vân tay. Hệ thống sử dụng Connector để giao tiếp qua mạng LAN.
        </p>
      </div>

      <Tabs 
        defaultActiveKey="connectors"
        items={[
          {
            key: 'connectors',
            label: <span className="font-bold text-base px-2">Cổng Trung Chuyển (Gateway)</span>,
            children: <ZktecoConnectorsView />
          },
          {
            key: 'topology',
            label: <span className="font-bold text-base px-2">Sơ Đồ Thiết Bị (Topology)</span>,
            children: (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs">
                  <div className="flex gap-4">
                    <Input placeholder="Tìm tên, IP..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} style={{ width: 200 }} />
                    <Select placeholder="Tất cả chi nhánh" allowClear value={filterBranch} onChange={setFilterBranch} style={{ width: 200 }}
                      options={branches.map(b => ({ label: b.name, value: b._id || b.id }))} />
                  </div>
                  <div className="text-sm text-slate-500">
                    *Các thiết bị được đồng bộ tự động từ Cổng
                  </div>
                </div>

                <Table 
                  columns={columns} 
                  dataSource={topologyData} 
                  rowKey="_id" 
                  loading={isDevicesLoading || isLocationsLoading}
                  className="border border-slate-100 rounded-lg overflow-hidden bg-white shadow-xs"
                  pagination={false}
                  defaultExpandAllRows
                />
              </div>
            )
          }
        ]}
      />

      <Modal
        title={'Phân bổ Cơ sở cho Thiết bị'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={isSubmitting}
        okText="Lưu lại"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="deviceName" label="Tên thiết bị định danh" rules={[{ required: true }]}>
            <Input placeholder="VD: Máy cửa chính HN" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="ipAddress" label="Địa chỉ IP LAN của máy vân tay">
              <Input disabled className="bg-slate-50 text-slate-500" />
            </Form.Item>
            <Form.Item name="branchId" label="Chi nhánh" rules={[{ required: true }]}>
              <Select 
                placeholder="Chọn chi nhánh" 
                onChange={(val) => {
                  setFormBranchId(val);
                  form.setFieldsValue({ locationId: undefined });
                }}
                options={branches.map(b => ({ label: b.name, value: b._id || b.id }))} 
              />
            </Form.Item>
            <Form.Item name="locationId" label="Cơ sở đặt máy" rules={[{ required: true }]}>
              <Select 
                placeholder="Chọn cơ sở" 
                disabled={!formBranchId}
                options={locations.filter(l => l.branchId === formBranchId).map(l => ({ label: l.locationName, value: l._id }))} 
              />
            </Form.Item>
          </div>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={<div className="font-bold text-lg text-slate-800">Quản Lý Trực Tiếp: <span className="text-blue-600">{controlDevice?.deviceName}</span></div>}
        open={!!controlDevice}
        onClose={() => setControlDevice(null)}
        width="100%"
        className="max-w-7xl mx-auto"
        destroyOnClose
      >
        {controlDevice && (
          <Tabs 
            defaultActiveKey="1" 
            className="w-full"
            items={[
              {
                key: '1',
                label: 'Quản lý Nhân Viên & Vân tay',
                children: <ZktecoUserManagement connectorUrl={connectors.find(c => c._id === controlDevice.connectorId)?.connectorUrl || ''} deviceIp={controlDevice.ipAddress || ''} devicePort={controlDevice.port} />
              },
              {
                key: '2',
                label: 'Lịch sử chấm công (Máy)',
                children: <ZktecoLogsView connectorUrl={connectors.find(c => c._id === controlDevice.connectorId)?.connectorUrl || ''} deviceIp={controlDevice.ipAddress || ''} devicePort={controlDevice.port} />
              },
              {
                key: '3',
                label: <span className="text-red-600 font-bold">Cài đặt (Danger Zone)</span>,
                children: <ZktecoDeviceSettings connectorUrl={connectors.find(c => c._id === controlDevice.connectorId)?.connectorUrl || ''} deviceIp={controlDevice.ipAddress || ''} devicePort={controlDevice.port} />
              }
            ]}
          />
        )}
      </Drawer>
    </div>
  );
}
