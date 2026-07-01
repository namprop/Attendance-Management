import React, { useState, useEffect } from 'react';
import { Modal, Button, Spin, Tag, Popconfirm, message, Tooltip, Tabs } from 'antd';
import { Fingerprint, Trash2, Monitor } from 'lucide-react';
import { WebAuthnCredentialItem, ZktecoSyncDetail } from '../types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EnrollFingerModal } from './EnrollFingerModal';

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

interface ZktecoConnector {
  _id: string;
  name: string;
  code?: string;
}

interface WebAuthnModalProps {
  isOpen: boolean;
  onClose: () => void;
  empId: string | null;
  empName: string;
  linkedDevices?: string[];
  zktecoSyncDetails?: Record<string, ZktecoSyncDetail>;
  onSuccess?: () => void;
}

export const WebAuthnModal: React.FC<WebAuthnModalProps> = ({
  isOpen,
  onClose,
  empId,
  empName,
  linkedDevices = [],
  zktecoSyncDetails = {},
  onSuccess
}) => {
  const queryClient = useQueryClient();
  const [isFetchingCredentials, setIsFetchingCredentials] = useState(false);
  const [webAuthnCredentials, setWebAuthnCredentials] = useState<WebAuthnCredentialItem[]>([]);

  const [isEnrolling, setIsEnrolling] = useState<string | null>(null);
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [enrollDeviceId, setEnrollDeviceId] = useState('');

  const { data: devices = [], isLoading: isLoadingDevices } = useQuery<ZktecoDevice[]>({
    queryKey: ['zkteco-devices'],
    queryFn: async () => {
      const res = await fetch('/api/v1/zkteco-devices');
      const data = await res.json();
      return data.data;
    },
    enabled: isOpen
  });

  const deviceMap = React.useMemo(() => {
    const map: Record<string, ZktecoDevice> = {};
    devices.forEach(d => {
      map[d._id] = d;
      if (d.id) map[d.id] = d;
    });
    return map;
  }, [devices]);

  const { data: activeDeviceIds = [] } = useQuery<string[]>({
    queryKey: ['zkteco-active-connections'],
    queryFn: async () => {
      const res = await fetch('/api/v1/zkteco-devices/active-connections');
      const data = await res.json();
      if (data.success) return data.data;
      return [];
    },
    staleTime: Infinity,
    enabled: isOpen
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
    return () => eventSource.close();
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

  const fetchCredentials = async (id: string) => {
    setTimeout(() => setIsFetchingCredentials(true), 0);
    try {
      const res = await fetch(`/api/webauthn/credentials?employeeId=${id}`);
      const data = await res.json();
      setWebAuthnCredentials(data.success ? data.data : []);
    } catch (err) {
      console.error(err);
      setWebAuthnCredentials([]);
    } finally {
      setIsFetchingCredentials(false);
    }
  };

  useEffect(() => {
    if (isOpen && empId) {
      setTimeout(() => fetchCredentials(empId), 0);
    } else {
      setTimeout(() => setWebAuthnCredentials([]), 0);
    }
  }, [isOpen, empId]);

  const handleDeleteCredential = async (credentialId: string) => {
    try {
      const res = await fetch(`/api/webauthn/credentials/${credentialId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        message.success('Đã xóa vân tay thành công!');
        if (empId) fetchCredentials(empId);
      } else {
        message.error(data.message || 'Xóa thất bại');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi kết nối khi xóa vân tay');
    }
  };

  const handleEnrollFinger = async (deviceId: string, fingerIndex: number = 0) => {
    if (!empId) return;
    setIsEnrolling(deviceId);
    try {
      const res = await fetch('/api/v1/zkteco-devices/enroll-finger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: empId, deviceId, fingerIndex })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lấy vân tay');
      
      setEnrollDeviceId(deviceId);
      setEnrollModalVisible(true);
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        message.error(error.message);
      } else {
        message.error('Không thể gửi lệnh lấy vân tay tới máy chấm công');
      }
    } finally {
      setIsEnrolling(null);
    }
  };

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .webauthn-mobile-modal .ant-modal {
            max-width: 100vw !important;
            margin: 0 !important;
            top: 0 !important;
            padding-bottom: 0 !important;
            height: 100dvh !important;
          }
          .webauthn-mobile-modal .ant-modal-content {
            display: flex !important;
            flex-direction: column !important;
            height: 100dvh !important;
            border-radius: 0 !important;
          }
          .webauthn-mobile-modal .ant-modal-body {
            flex: 1 !important;
            padding: 16px 0 0 0 !important;
            overflow-y: auto !important;
          }
        }
      `}</style>
      <Modal
        open={isOpen}
        onCancel={onClose}
        footer={null}
        wrapClassName="webauthn-mobile-modal"
        title={
          <span className="flex items-center gap-2 font-extrabold text-slate-800 uppercase tracking-wider text-sm">
            <Fingerprint className="w-5 h-5 text-emerald-500" />
            Lấy Vân Tay / Máy Chấm Công
            {empName && (
              <span className="text-xs text-slate-400 font-normal ml-1 normal-case">
                — {empName}
              </span>
            )}
          </span>
        }
        width={600}
        destroyOnHidden
      >
        <div className="space-y-4 pt-2 px-4 md:px-0 h-full flex flex-col">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-emerald-800 m-0">Đăng ký vân tay trực tiếp</p>
              <p className="text-xs text-emerald-600 m-0 mt-0.5">
                Chọn máy chấm công bên dưới để kích hoạt chế độ lấy vân tay. Sau đó, nhân viên đặt ngón tay lên máy 3 lần để hoàn tất đăng ký.
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-4">
            <Tabs defaultActiveKey="1" className="px-4">
              <Tabs.TabPane tab="Máy chấm công (ZKTeco)" key="1">
                {isLoadingDevices ? (
                  <div className="flex items-center justify-center py-8">
                    <Spin size="small" />
                    <span className="ml-2 text-sm text-slate-400">Đang tải danh sách thiết bị...</span>
                  </div>
                ) : linkedDevices.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100 mt-4">
                    <Monitor className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400 font-medium m-0">Nhân viên chưa được đồng bộ xuống máy nào</p>
                    <p className="text-xs text-slate-300 m-0 mt-1">Vui lòng sử dụng tính năng Đồng bộ máy trước khi lấy vân tay</p>
                  </div>
                ) : (
                  <div className="space-y-2 mt-4">
                    {linkedDevices.map((deviceId) => {
                      const device = deviceMap[deviceId];
                      const connector = device && device.connectorId ? connectorMap[device.connectorId] : null;
                      const deviceName = device ? (device.deviceName || device.name) : `Máy ZKTeco (${deviceId})`;
                      const ipAddress = device ? (device.ipAddress || device.ip) : 'Không rõ IP';
                      const isOnline = activeDeviceIds.includes(deviceId);

                      const syncDetail = zktecoSyncDetails[deviceId] || {};
                      const hasFingerprint = !!syncDetail.hasFingerprint;

                      return (
                        <div
                          key={deviceId}
                          className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                              <Monitor className="w-5 h-5 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-700 m-0 flex items-center gap-2">
                                {deviceName}
                                {isOnline ? (
                                  <Tooltip title="Đang kết nối ổn định">
                                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                                  </Tooltip>
                                ) : (
                                  <Tooltip title="Máy đang tắt hoặc mất mạng">
                                    <div className="w-2.5 h-2.5 bg-slate-300 rounded-full" />
                                  </Tooltip>
                                )}
                              </p>
                              <p className="text-xs text-slate-500 m-0 mt-0.5 font-mono">
                                IP: {ipAddress}
                              </p>
                              {connector && (
                                <div className="mt-1 flex items-center gap-2">
                                  <Tag color="blue" className="text-[10px] m-0 border-none bg-blue-50 text-blue-600 font-medium">
                                    Cổng: {connector.name || connector.code}
                                  </Tag>
                                  {hasFingerprint && (
                                    <Tag color="success" className="text-[10px] m-0 border-none bg-emerald-50 text-emerald-600 font-medium flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                      Đã có vân tay
                                    </Tag>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Button
                            type={hasFingerprint ? "default" : "primary"}
                            icon={<Fingerprint className="w-4 h-4" />}
                            loading={isEnrolling === deviceId}
                            onClick={() => handleEnrollFinger(deviceId, Number(syncDetail.fingerCount || 0))}
                            className={`shrink-0 font-semibold disabled:bg-slate-300 disabled:border-slate-300 disabled:text-slate-500 ${!hasFingerprint ? 'bg-emerald-600 border-emerald-600 hover:bg-emerald-700 text-white' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300'}`}
                            disabled={!isOnline}
                            title={!isOnline ? "Máy đang mất kết nối" : ""}
                          >
                            {hasFingerprint ? `Lấy lại (ngón ${Math.min(Number(syncDetail.fingerCount || 0) + 1, 10)})` : "Lấy vân tay"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Tabs.TabPane>

              <Tabs.TabPane tab="Điện thoại / Trình duyệt (WebAuthn)" key="2">
                {isFetchingCredentials ? (
                  <div className="flex items-center justify-center py-8">
                    <Spin size="small" />
                    <span className="ml-2 text-sm text-slate-400">Đang tải...</span>
                  </div>
                ) : webAuthnCredentials.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100 mt-4">
                    <Fingerprint className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400 font-medium m-0">Chưa có vân tay điện thoại nào được đăng ký</p>
                  </div>
                ) : (
                  <div className="space-y-2 mt-4">
                    {webAuthnCredentials.map((cred, index) => (
                      <div
                        key={cred.id}
                        className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                            <Fingerprint className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700 m-0">
                              Vân tay WebAuthn #{index + 1}
                            </p>
                            <p className="text-[10px] text-slate-400 m-0 font-mono">
                              {cred.credentialID.slice(0, 20)}...
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Tag color={cred.credentialDeviceType === 'multiDevice' ? 'blue' : 'green'} className="text-[10px] m-0 leading-tight">
                                {cred.credentialDeviceType === 'multiDevice' ? 'Đa thiết bị' : 'Thiết bị đơn'}
                              </Tag>
                              {cred.credentialBackedUp && (
                                <Tag color="purple" className="text-[10px] m-0 leading-tight">Đã sao lưu</Tag>
                              )}
                              {cred.createdAt && (
                                <span className="text-[10px] text-slate-300">
                                  {new Date(cred.createdAt).toLocaleDateString('vi-VN')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Popconfirm
                          title="Xóa vân tay này?"
                          description="Nhân viên sẽ không thể chấm công bằng thiết bị này nữa."
                          onConfirm={() => handleDeleteCredential(cred.id)}
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                            className="opacity-50 hover:opacity-100"
                          />
                        </Popconfirm>
                      </div>
                    ))}
                  </div>
                )}
              </Tabs.TabPane>
            </Tabs>
          </div>
        </div>
      </Modal>

      {enrollModalVisible && empId && (
        <EnrollFingerModal
          isOpen={enrollModalVisible}
          onClose={() => setEnrollModalVisible(false)}
          employeeId={empId}
          employeeName={empName}
          deviceId={enrollDeviceId}
          onSuccess={onSuccess}
        />
      )}
    </>
  );
};
