import React, { useState, useEffect } from 'react';
import { Modal, Table, message, Button, Popconfirm, Tooltip, Form, Input, Select, Radio } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnsType } from 'antd/es/table';
import { CheckCircle2, XCircle, Pencil, Lock } from 'lucide-react';
import { EnrollFingerModal } from './EnrollFingerModal';

interface DeviceUser {
  uid: number;
  userId?: string;
  userid?: string;
  deviceUserId?: string;
  name?: string;
  linkedEmployee?: {
    employeeId: string;
    employeeCode: string;
    employeeName: string;
  } | null;
}

interface ZktecoDevice {
  _id: string;
  id?: string;
  name?: string;
  deviceName?: string;
  ip?: string;
  ipAddress?: string;
  locationId?: string;
  branchId?: string;
  connectorId?: string;
}

interface SyncResult {
  deviceId: string;
  deviceName: string;
  success: boolean;
  message: string;
}

interface ZktecoConnector {
  _id: string;
  name: string;
  code?: string;
}

interface ZktecoSyncDetail {
  uid?: string | number;
  syncedAt?: string | Date;
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

interface ZktecoSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeCode?: string;
  employeeName: string;
  linkedDevices?: string[];
  zktecoSyncDetails?: Record<string, ZktecoSyncDetail>;
  onSuccess?: () => void;
}

export const ZktecoSyncModal: React.FC<ZktecoSyncModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeCode,
  employeeName,
  linkedDevices = [],
  zktecoSyncDetails = {},
  onSuccess
}) => {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>(linkedDevices);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, SyncResult>>({});
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [enrollDeviceId, setEnrollDeviceId] = useState('');
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState<string>('');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [editForm] = Form.useForm();
  
  const [syncMode, setSyncMode] = useState<'new' | 'link'>('new');
  const [selectedDeviceForLink, setSelectedDeviceForLink] = useState<string | null>(null);
  const [deviceUsers, setDeviceUsers] = useState<DeviceUser[]>([]);
  const [isLoadingDeviceUsers, setIsLoadingDeviceUsers] = useState(false);
  const [selectedDeviceUserUid, setSelectedDeviceUserUid] = useState<number | null>(null);

  const { data: devices = [], isLoading } = useQuery<ZktecoDevice[]>({
    queryKey: ['zkteco-devices'],
    queryFn: async () => {
      const res = await fetch('/api/v1/zkteco-devices');
      const data = await res.json();
      return data.data;
    }
  });

  const { data: activeDeviceIds = [] } = useQuery<string[]>({
    queryKey: ['zkteco-active-connections'],
    queryFn: async () => {
      const res = await fetch('/api/v1/zkteco-devices/active-connections');
      const data = await res.json();
      if (data.success) return data.data;
      return [];
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!isOpen) return;

    const eventSource = new EventSource('/api/v1/zkteco-devices/active-connections/stream');
    
    eventSource.onmessage = (event) => {
      try {
        const newData = JSON.parse(event.data);
        queryClient.setQueryData(['zkteco-active-connections'], newData.activeDeviceIds || []);
      } catch (e) {}
    };

    return () => {
      eventSource.close();
    };
  }, [isOpen, queryClient]);

  const { data: connectors = [] } = useQuery<ZktecoConnector[]>({
    queryKey: ['zkteco-connectors'],
    queryFn: async () => {
      const res = await fetch('/api/v1/zkteco-connectors');
      const data = await res.json();
      return data.data || [];
    },
    enabled: isOpen
  });

  const connectorMap = React.useMemo(() => {
    const map: Record<string, ZktecoConnector> = {};
    connectors.forEach(c => {
      map[c._id] = c;
    });
    return map;
  }, [connectors]);

  const fetchDeviceUsers = async (deviceId: string) => {
    setIsLoadingDeviceUsers(true);
    setSelectedDeviceUserUid(null);
    setDeviceUsers([]);
    try {
      const res = await fetch(`/api/v1/zkteco-devices/pull-users?deviceId=${deviceId}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
      const data = await res.json();
      if (data.success) {
        let usersArr: DeviceUser[] = [];
        if (Array.isArray(data.data)) {
          usersArr = data.data;
        } else if (data.data && Array.isArray(data.data.data)) {
          usersArr = data.data.data;
        }
        setDeviceUsers(usersArr);
        messageApi.success(`Đã tải ${usersArr.length} nhân viên từ máy chấm công`);
      } else {
        messageApi.error(data.message || 'Lỗi tải nhân viên từ máy');
      }
    } catch (err) {
      console.error(err);
      messageApi.error('Lỗi kết nối khi tải nhân viên từ máy');
    } finally {
      setIsLoadingDeviceUsers(false);
    }
  };

  const handleSync = async () => {
    let targetDeviceIds: string[] = [];
    let payloadExistingUid: number | undefined = undefined;

    if (syncMode === 'link') {
      if (!selectedDeviceForLink) {
        messageApi.warning('Vui lòng chọn máy chấm công để liên kết!');
        return;
      }
      if (selectedDeviceUserUid === null || selectedDeviceUserUid === undefined) {
        messageApi.warning('Vui lòng chọn nhân viên có sẵn trên máy chấm công!');
        return;
      }
      targetDeviceIds = [selectedDeviceForLink];
      payloadExistingUid = selectedDeviceUserUid;
    } else {
      const validKeys = selectedRowKeys.filter(key => activeDeviceIds.includes(key as string));
      if (validKeys.length === 0) {
        messageApi.warning('Vui lòng chọn ít nhất 1 máy đang kết nối!');
        return;
      }
      targetDeviceIds = validKeys.map(k => k as string);
    }

    setIsSyncing(true);
    setSyncResults({});

    try {
      const res = await fetch('/api/v1/zkteco-devices/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          deviceIds: targetDeviceIds,
          existingUid: payloadExistingUid
        })
      });

      const data = await res.json();
      if (res.ok) {
        const resultsMap: Record<string, SyncResult> = {};
        data.data.forEach((r: SyncResult) => {
          resultsMap[r.deviceId] = r;
        });
        setSyncResults(resultsMap);
        message.success(data.message);
        onSuccess?.();
        if (syncMode === 'link' && selectedDeviceForLink) {
          fetchDeviceUsers(selectedDeviceForLink);
        }
      } else {
        message.error(data.message || 'Lỗi khi đồng bộ');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi kết nối khi đồng bộ xuống máy chấm công');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteFromDevices = async () => {
    const validKeys = selectedRowKeys.filter(key => activeDeviceIds.includes(key as string));
    if (validKeys.length === 0) {
      message.warning('Vui lòng chọn ít nhất 1 máy đang kết nối!');
      return;
    }

    setIsDeleting(true);
    setSyncResults({});

    try {
      const res = await fetch('/api/v1/zkteco-devices/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          deviceIds: validKeys
        })
      });

      const data = await res.json();
      if (res.ok) {
        const resultsMap: Record<string, SyncResult> = {};
        data.data.forEach((r: SyncResult) => {
          resultsMap[r.deviceId] = r;
        });
        setSyncResults(resultsMap);
        message.success(data.message);
        onSuccess?.();
      } else {
        message.error(data.message || 'Lỗi khi xoá khỏi máy');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi kết nối khi xoá khỏi máy chấm công');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUnlinkOtherEmployee = async (targetEmployeeId: string) => {
    try {
      const res = await fetch('/api/v1/zkteco-devices/unlink-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: targetEmployeeId,
          deviceIds: [selectedDeviceForLink]
        })
      });
      const data = await res.json();
      if (res.ok) {
        message.success('Đã gỡ liên kết thành công!');
        if (selectedDeviceForLink) {
          fetchDeviceUsers(selectedDeviceForLink);
        }
        onSuccess?.();
      } else {
        message.error(data.message || 'Lỗi khi gỡ liên kết');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi hệ thống khi gỡ liên kết');
    }
  };

  const handleEnrollFinger = async (deviceId: string) => {
    setIsEnrolling(deviceId);
    try {
      const res = await fetch('/api/v1/zkteco-devices/enroll-finger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, deviceId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lấy vân tay');
      
      // Mở modal chờ lấy vân tay
      setEnrollDeviceId(deviceId);
      setEnrollModalVisible(true);
      
    } catch (error: unknown) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Lỗi kết nối';
      message.error(errorMessage);
    } finally {
      setIsEnrolling(null);
    }
  };

  const handleEditUser = (deviceId: string) => {
    const details = zktecoSyncDetails[deviceId] || {};
    
    editForm.setFieldsValue({
      uid: details.uid,
      userid: details.overrideUserid || employeeCode || employeeId,
      name: details.overrideName || employeeName,
      password: details.overridePassword || '',
      role: details.overrideRole !== undefined ? details.overrideRole : 0
    });
    setEditingDevice(deviceId);
    setEditModalVisible(true);
  };

  const submitEditUser = async () => {
    try {
      const values = await editForm.validateFields();
      setIsUpdatingUser(true);
      
      const res = await fetch('/api/v1/zkteco-devices/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          deviceId: editingDevice,
          name: values.name,
          password: values.password,
          role: values.role
        })
      });

      const data = await res.json();
      if (res.ok) {
        message.success(data.message);
        setEditModalVisible(false);
        onSuccess?.();
      } else {
        message.error(data.message || 'Lỗi cập nhật');
      }
    } catch (err) {
      console.error(err);
      // Ignore validation errors from form
      if (err instanceof Error) {
        message.error('Lỗi kết nối');
      }
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const columns: ColumnsType<ZktecoDevice> = [
    {
      title: 'Tên máy chấm công',
      dataIndex: 'deviceName',
      key: 'deviceName',
      render: (text, record) => {
        const deviceId = record._id || record.id!;
        const connector = record.connectorId ? connectorMap[record.connectorId] : null;
        const isOnline = activeDeviceIds.includes(deviceId);
        
        return (
          <div className="font-medium text-slate-700">
            <div className="text-base font-semibold flex items-center gap-2">
              {text || record.name}
              {isOnline ? (
                <Tooltip title="Đang kết nối ổn định">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                    <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Online</span>
                  </div>
                </Tooltip>
              ) : (
                <Tooltip title="Máy đang tắt hoặc mất mạng">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-full">
                    <div className="w-2 h-2 bg-slate-400 rounded-full" />
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Offline</span>
                  </div>
                </Tooltip>
              )}
            </div>
            <div className="text-sm text-slate-500 mt-1 flex flex-col gap-1">
              <span><span className="font-semibold">IP:</span> <span className="font-mono bg-slate-100 px-1 rounded">{record.ipAddress || record.ip}</span></span>
              {connector && (
                <span className="text-blue-600 font-medium">
                  Cổng: {connector.name || connector.code}
                </span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Trạng thái đồng bộ',
      key: 'status',
      width: 250,
      render: (_, record) => {
        const deviceId = record._id || record.id!;
        const result = syncResults[deviceId];
        const details = zktecoSyncDetails[deviceId];

        if (!result) {
          if (linkedDevices.includes(deviceId)) {
            return (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Đã đồng bộ
                </div>
                {details && details.uid && (
                  <div className="text-xs text-slate-500 mt-1 pl-6">
                    <div>Mã máy (UID): <span className="font-mono font-medium text-slate-700">{details.uid}</span></div>
                    {details.syncedAt && <div className="opacity-75">{new Date(details.syncedAt).toLocaleString('vi-VN')}</div>}
                  </div>
                )}
              </div>
            );
          }
          return <span className="text-slate-400 italic text-sm">Chưa đồng bộ</span>;
        }

        if (result.success) {
          return (
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" /> Thành công
            </div>
          );
        }

        return (
          <div className="flex flex-col text-red-500 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <XCircle className="w-4 h-4" /> Thất bại
            </div>
            <span className="text-xs opacity-80">{result.message}</span>
          </div>
        );
      }
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 150,
      render: (_, record) => {
        const deviceId = record._id || record.id!;
        const isLinked = linkedDevices.includes(deviceId) || syncResults[deviceId]?.success;
        const isOnline = activeDeviceIds.includes(deviceId);
        
        if (!isLinked) return null;
        
        return (
          <div className="flex items-center gap-2">
            {/* <Button 
              size="small" 
              type="primary" 
              ghost 
              loading={isEnrolling === deviceId}
              onClick={() => handleEnrollFinger(deviceId)}
              disabled={!isOnline}
              title={!isOnline ? "Máy đang mất kết nối" : ""}
            >
              Lấy vân tay
            </Button> */}
            <Tooltip title="Cập nhật nhân viên trên máy này">
              <Button 
                size="small" 
                icon={<Pencil className="w-4 h-4" />} 
                onClick={() => handleEditUser(deviceId)}
                disabled={!isOnline || !zktecoSyncDetails[deviceId]?.uid}
                className="text-slate-500 hover:text-blue-600 border-slate-200"
              />
            </Tooltip>
          </div>
        );
      }
    }
  ];

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .zkteco-sync-mobile-modal .ant-modal {
            max-width: 100vw !important;
            margin: 0 !important;
            top: 0 !important;
            padding-bottom: 0 !important;
            height: 100dvh !important;
          }
          .zkteco-sync-mobile-modal .ant-modal-content {
            display: flex !important;
            flex-direction: column !important;
            height: 100dvh !important;
            border-radius: 0 !important;
          }
          .zkteco-sync-mobile-modal .ant-modal-body {
            flex: 1 !important;
            padding: 16px 0 0 0 !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .zkteco-sync-mobile-modal .ant-table-wrapper {
            flex: 1;
            overflow: hidden;
          }
          .zkteco-sync-mobile-modal .ant-spin-nested-loading,
          .zkteco-sync-mobile-modal .ant-spin-container {
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .zkteco-sync-mobile-modal .ant-table {
            flex: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          .zkteco-sync-mobile-modal .ant-table-container {
            flex: 1;
            overflow-y: auto;
            border-left: 0 !important;
            border-right: 0 !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
      <Modal
        title={<div className="font-bold text-lg text-slate-800">Đồng bộ NV xuống Máy Chấm Công</div>}
        open={isOpen}
        onCancel={onClose}
        width={700}
        wrapClassName="zkteco-sync-mobile-modal"
        footer={[
          <Button key="cancel" onClick={onClose} disabled={isSyncing || isDeleting}>
            Đóng
          </Button>,
          syncMode === 'new' && (
            <Popconfirm
              key="delete"
              title="Bạn có chắc chắn muốn xoá?"
              description={`Nhân viên này sẽ bị gỡ hoàn toàn vân tay/khuôn mặt khỏi ${selectedRowKeys.length} máy đã chọn. Có thể sẽ mất vài giây để máy xử lý.`}
              onConfirm={handleDeleteFromDevices}
              okText="Xoá ngay"
              cancelText="Hủy"
              okButtonProps={{ danger: true, loading: isDeleting }}
              disabled={selectedRowKeys.length === 0 || isSyncing}
            >
              <Button
                danger
                loading={isDeleting}
                disabled={selectedRowKeys.length === 0 || isSyncing}
              >
                Xoá khỏi máy
              </Button>
            </Popconfirm>
          ),
          <Button
            key="sync"
            type="primary"
            onClick={handleSync}
            loading={isSyncing}
            disabled={
              syncMode === 'new' 
                ? (selectedRowKeys.length === 0 || isDeleting)
                : (!selectedDeviceForLink || selectedDeviceUserUid === null)
            }
          >
            Bắt đầu đồng bộ
          </Button>
        ].filter(Boolean)}
      >
        <div className="mb-4 px-4 md:px-0">
          <div className="mb-6 bg-slate-100/80 p-1 rounded-xl flex gap-1 relative overflow-hidden border border-slate-200 shadow-inner">
            <button
              onClick={() => setSyncMode('new')}
              className={`flex-1 relative z-10 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all duration-300 ${
                syncMode === 'new' 
                  ? 'text-blue-700 bg-white shadow-sm ring-1 ring-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              Tạo nhân viên mới
            </button>
            <button
              onClick={() => setSyncMode('link')}
              className={`flex-1 relative z-10 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all duration-300 ${
                syncMode === 'link' 
                  ? 'text-blue-700 bg-white shadow-sm ring-1 ring-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              Đồng bộ NV có sẵn trên máy
            </button>
          </div>

          {syncMode === 'new' ? (
            <>
              <p className="text-slate-600 mb-2">
                Chọn các máy chấm công bên dưới để đẩy thông tin của nhân viên <strong className="text-blue-600">{employeeName}</strong> xuống máy. Sau khi đồng bộ thành công, nhân viên có thể ra máy tương ứng để đăng ký vân tay/khuôn mặt.
              </p>

        <Table
          onRow={(record) => {
            const deviceId = record._id || record.id!;
            const isOnline = activeDeviceIds.includes(deviceId);
            const disabled = isSyncing || !isOnline;
            
            return {
              onClick: () => {
                if (disabled) return;
                setSelectedRowKeys(prev => {
                  const isSelected = prev.includes(deviceId);
                  if (isSelected) {
                    return prev.filter(key => key !== deviceId);
                  } else {
                    return [...prev, deviceId];
                  }
                });
              },
              className: disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-slate-50 transition-colors'
            };
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: (record) => {
              const deviceId = record._id || record.id!;
              const isOnline = activeDeviceIds.includes(deviceId);
              return {
                disabled: isSyncing || !isOnline,
                title: !isOnline ? "Máy đang mất kết nối" : ""
              };
            }
          }}
          columns={columns}
          dataSource={devices}
          rowKey={(record) => record._id || record.id!}
          pagination={false}
          loading={isLoading}
          scroll={{ x: 600, y: 'calc(100vh - 350px)' }}
          size="small"
        />
            </>
          ) : (
          <div className="px-4 md:px-0 space-y-4">
            <div className="p-4 border border-slate-100 rounded-lg bg-slate-50/50">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    1. Chọn máy chấm công chứa tài khoản:
                  </label>
                  <Select
                    placeholder="Chọn máy chấm công..."
                    className="w-full"
                    value={selectedDeviceForLink}
                    onChange={(value) => {
                      setSelectedDeviceForLink(value);
                      fetchDeviceUsers(value);
                    }}
                    disabled={isSyncing}
                  >
                    {devices
                      .filter(d => activeDeviceIds.includes(d._id || d.id!))
                      .map(d => (
                        <Select.Option key={d._id || d.id!} value={d._id || d.id!}>
                          {d.deviceName || d.name} (IP: {d.ipAddress || d.ip})
                        </Select.Option>
                      ))}
                  </Select>
                </div>

                {selectedDeviceForLink && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      2. Chọn nhân viên trên máy để liên kết:
                    </label>
                    <Select
                      placeholder={isLoadingDeviceUsers ? "Đang tải nhân viên từ máy..." : "Chọn nhân viên từ máy..."}
                      className="w-full"
                      loading={isLoadingDeviceUsers}
                      disabled={isLoadingDeviceUsers || isSyncing}
                      value={selectedDeviceUserUid}
                      onChange={(value) => setSelectedDeviceUserUid(value)}
                      showSearch
                      optionFilterProp="label"
                      filterOption={(input, option) => {
                        const label = String(option?.label || '').toLowerCase();
                        return label.includes(input.toLowerCase());
                      }}
                      options={deviceUsers.map(u => ({
                        value: u.uid,
                        label: `[UID: ${u.uid}] ${u.name || 'Không tên'} (Mã trên máy: ${u.userId || u.userid || u.deviceUserId || 'Không mã'})`,
                        disabled: !!u.linkedEmployee,
                        title: u.linkedEmployee ? `Đã liên kết với: ${u.linkedEmployee.employeeName} (${u.linkedEmployee.employeeCode})` : undefined
                      }))}
                      optionRender={(option) => {
                        const u = deviceUsers.find(user => user.uid === option.data.value);
                        if (u?.linkedEmployee) {
                          return (
                            <div className="flex items-center justify-between w-full py-1">
                              <div className="flex items-center gap-2 text-slate-400">
                                <div className="flex items-center justify-center w-5 h-5 rounded bg-gradient-to-br from-yellow-400 to-orange-500 text-white flex-shrink-0">
                                  <Lock className="w-3 h-3" />
                                </div>
                                <span className="font-medium text-sm truncate">
                                  {u.name || 'Không tên'} — Đã liên kết {u.linkedEmployee.employeeCode}
                                </span>
                              </div>
                              <Popconfirm
                                title="Gỡ liên kết nhân viên khác?"
                                description={`UID này đang liên kết với nhân viên ${u.linkedEmployee.employeeName}. Bạn có chắc muốn gỡ liên kết họ khỏi UID này không?`}
                                onConfirm={(e) => {
                                  e?.stopPropagation();
                                  handleUnlinkOtherEmployee(u.linkedEmployee!.employeeId);
                                }}
                                onCancel={(e) => e?.stopPropagation()}
                                okText="Gỡ liên kết"
                                cancelText="Hủy"
                                okButtonProps={{ danger: true }}
                              >
                                <button 
                                  className="h-7 text-xs px-2 font-medium border border-red-200 bg-red-50 text-red-500 rounded hover:bg-red-100 transition-colors flex-shrink-0 ml-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Gỡ liên kết ngay
                                </button>
                              </Popconfirm>
                            </div>
                          );
                        }

                        return (
                          <div className="flex items-center justify-between w-full py-1">
                            <span className="text-slate-700 font-medium">{option.data.label}</span>
                          </div>
                        );
                      }}
                    />
                    <div className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded border border-amber-100 font-medium">
                      ⚠️ Cảnh báo: Lệnh này sẽ đổi Mã nhân viên (UserID) trên máy thành {employeeCode || employeeId} để khớp với hệ thống, đồng thời giữ nguyên vân tay đã đăng ký của UID này.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {selectedDeviceForLink && syncResults[selectedDeviceForLink] && (
              <div className="p-3 rounded-lg border bg-white">
                <div className="text-sm font-semibold text-slate-700 mb-1">Kết quả đồng bộ liên kết:</div>
                {syncResults[selectedDeviceForLink].success ? (
                  <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Liên kết và đồng bộ thành công!
                  </div>
                ) : (
                  <div className="flex flex-col text-red-500 text-sm">
                    <div className="flex items-center gap-2 font-medium">
                      <XCircle className="w-4 h-4" /> Thất bại
                    </div>
                    <span className="text-xs opacity-80 mt-1">{syncResults[selectedDeviceForLink].message}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </div>
      </Modal>

        {enrollModalVisible && (
          <EnrollFingerModal
            isOpen={enrollModalVisible}
            onClose={() => setEnrollModalVisible(false)}
            employeeId={employeeId}
            employeeName={employeeName}
            deviceId={enrollDeviceId}
          />
        )}

        <Modal
          title="Cập nhật nhân viên"
          open={editModalVisible}
          onCancel={() => setEditModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setEditModalVisible(false)} disabled={isUpdatingUser}>
              Hủy
            </Button>,
            <Button key="submit" type="primary" onClick={submitEditUser} loading={isUpdatingUser}>
              Cập nhật
            </Button>
        ]}
      >
        <Form form={editForm} layout="vertical" className="mt-4">
          <Form.Item label="UID (Số ID nội bộ của máy)" name="uid">
            <Input readOnly disabled className="bg-slate-50 text-slate-500 font-mono" />
          </Form.Item>
          {/* We do not have the exact UserID here so we can omit it or show a placeholder, but the user requested it. Let's pass it manually later if needed, or hide it if we don't have it. We will use a placeholder disabled field for now, or assume it's set in the form. */}
          <Form.Item label="Mã NV (UserID)" name="userid" tooltip="Mã chấm công trên máy. Không thể thay đổi để tránh lệch dữ liệu.">
            <Input readOnly disabled className="bg-slate-50 text-slate-500 font-mono" />
          </Form.Item>
          <Form.Item 
            label="Tên hiển thị" 
            name="name" 
            rules={[{ required: true, message: 'Vui lòng nhập tên hiển thị' }]}
          >
            <Input placeholder="Nhập tên không dấu..." />
          </Form.Item>
          <Form.Item label="Mật khẩu (Tùy chọn)" name="password">
            <Input.Password placeholder="Để trống nếu không dùng" />
          </Form.Item>
          <Form.Item label="Quyền hạn" name="role" rules={[{ required: true }]}>
            <Select>
              <Select.Option value={0}>Nhân viên (User)</Select.Option>
              <Select.Option value={14}>Quản trị viên (Admin)</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
