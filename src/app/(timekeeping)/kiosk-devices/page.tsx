'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Popconfirm, Space, Divider, Switch, Row, Col } from 'antd';
import { Monitor, Plus, Pencil, Trash2, Power, PowerOff, RefreshCw, Eye, Copy, Check, MapPin, LayoutGrid, List, Camera, ScanFace, ChevronsRight } from 'lucide-react';
import { message } from 'antd';
import { cookieBase } from '@/app/utils/cookie';
import { hasPermission, getCachedRoles } from '@/app/service/permissions/permissions';
import type { User } from '@/app/data/dataUser';
import Unauthorized from '@/app/ui/timekeeping/components/unauthorized/Unauthorized';
import type { KioskDevice, KioskLocation, BranchTimekeeping } from '@/app/interface/timekeeping';
import { WithPermission } from '@/app/service/permissions/permission-gate';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface LocationOption {
  _id: string;
  locationName: string;
  locationSlug: string;
}

export default function KioskDevicesPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Queries using TanStack React Query
  const { data: devices = [], isLoading: isDevicesLoading } = useQuery<KioskDevice[]>({
    queryKey: ['devices'],
    queryFn: async () => {
      const res = await fetch('/api/v1/kiosk/devices');
      const data = await res.json();
      return data.data || [];
    }
  });

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

  const isLoading = isDevicesLoading || isLocationsLoading || isBranchesLoading;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<KioskDevice | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const selectedDevice = devices.find(d => d._id === selectedDeviceId) || null;

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [pairingToken, setPairingToken] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(new Date().getTime());
  const [form] = Form.useForm();

  // Trạng thái đối chiếu định vị thực tế của trình duyệt với cơ sở
  const [isComparingLocation, setIsComparingLocation] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<{
    success: boolean;
    currentLat: number;
    currentLng: number;
    accuracy: number;
    distance: number;
    allowedRadius: number;
    isValid: boolean;
  } | null>(null);

  // 1. Hàm tính khoảng cách Haversine trên client
  const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Bán kính Trái Đất tính bằng mét
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dp = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dp / 2) * Math.sin(dp / 2) +
      Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // 2. Hàm đối chiếu vị trí bằng Geolocation API của trình duyệt
  const handleCompareLocation = (locLat: number, locLng: number, allowedRadius: number, locationId: string) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      message.error('Trình duyệt của bạn không hỗ trợ định vị Geolocation.');
      return;
    }

    setIsComparingLocation(true);
    setComparisonResult(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const curLat = position.coords.latitude;
        const curLng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        const distance = calculateDistanceMeters(curLat, curLng, locLat, locLng);
        const isValid = distance <= allowedRadius;

        setComparisonResult({
          success: true,
          currentLat: curLat,
          currentLng: curLng,
          accuracy,
          distance,
          allowedRadius,
          isValid,
        });
        setIsComparingLocation(false);
        message.success('Định vị và đối chiếu khoảng cách thành công!');
      },
      (error) => {
        console.error("Lỗi Geolocation:", error);
        let errorMsg = 'Không thể lấy vị trí hiện tại. ';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg += 'Vui lòng cấp quyền vị trí cho trình duyệt.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg += 'Thông tin vị trí không khả dụng (Hãy bật Wi-Fi/GPS).';
        } else if (error.code === error.TIMEOUT) {
          errorMsg += 'Hết thời gian định vị vị trí.';
        }
        message.error(errorMsg);
        setIsComparingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // 3. Hàm đồng bộ hóa tọa độ cơ sở theo vị trí hiện tại
  const handleApplyCurrentLocation = async (locationId: string, lat: number, lng: number, radius: number) => {
    try {
      const res = await fetch('/api/v1/kiosk/locations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: locationId,
          coordinates: {
            lat,
            lng,
          },
          allowedRadiusMeters: radius,
        }),
      });
      if (res.ok) {
        message.success('Đã đồng bộ và cập nhật tọa độ cơ sở theo vị trí thực tế của bạn!');
        await fetchLocations();
        // Cập nhật kết quả đối chiếu thành công 0m
        setComparisonResult(prev => prev ? { ...prev, distance: 0, isValid: true } : null);
      } else {
        const data = await res.json();
        message.error(data.message || 'Lỗi khi cập nhật tọa độ cơ sở.');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi kết nối máy chủ.');
    }
  };

  // Location & Branch modal states
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isSubmittingLocation, setIsSubmittingLocation] = useState(false);
  const [locationForm] = Form.useForm();
  const [branchForm] = Form.useForm();

  const branchIdWatch = Form.useWatch('branchTimekeepingId', form);
  const locationIdWatch = Form.useWatch('locationId', form);

  // Watch fields in main form for updating map coordinates
  const mainLocLatWatch = Form.useWatch('locLat', form) || 21.043819;
  const mainLocLngWatch = Form.useWatch('locLng', form) || 105.774492;

  // Watch fields in quick location form for updating map coordinates
  const locationLatWatch = Form.useWatch('lat', locationForm) || 21.043819;
  const locationLngWatch = Form.useWatch('lng', locationForm) || 105.774492;

  // Tự động nạp tọa độ & bán kính của cơ sở đã chọn vào Form thiết bị
  useEffect(() => {
    if (locationIdWatch) {
      const activeLocation = locations.find(l => l._id === locationIdWatch);
      if (activeLocation) {
        form.setFieldsValue({
          locLat: activeLocation.coordinates?.lat || 21.043819,
          locLng: activeLocation.coordinates?.lng || 105.774492,
          locRadius: activeLocation.allowedRadiusMeters || 100,
        });
      }
    }
  }, [locationIdWatch, locations, form]);

  // Auth check
  const [isLoaded, setIsLoaded] = useState(false);
  const [realUser, setRealUser] = useState<User | null>(null);

  // Filters
  const [filterSearch, setFilterSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState<string | null>(null);
  const [filterLocation, setFilterLocation] = useState<string | null>(null);

  useEffect(() => {
    const userObj = cookieBase.get<User>('info_user');
    setTimeout(() => {
      if (userObj) {
        setRealUser(userObj);
      }
      setIsLoaded(true);
    }, 0);
  }, []);

  // Fetch devices invalidator
  const fetchDevices = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['devices'] });
  }, [queryClient]);

  // Fetch locations invalidator
  const fetchLocations = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['locations'] });
  }, [queryClient]);

  // Fetch branches invalidator
  const fetchBranches = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['branches'] });
  }, [queryClient]);

  useEffect(() => {
    // Update time for countdown
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  if (!isLoaded) return null;

  // Permission check
  const roleId = realUser?.role ?? -1;
  const isSuperAdmin = hasPermission(roleId, '*');
  const hasAccess = isSuperAdmin || hasPermission(roleId, 'timekeeping_kiosk_devices');
  const hasViewAccess = isSuperAdmin || hasPermission(roleId, 'timekeeping_kiosk_device_view');

  if (realUser && (!hasAccess || !hasViewAccess)) {
    return <Unauthorized />;
  }

  // Handlers
  const handleOpenCreate = () => {
    setEditingDevice(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (device: KioskDevice) => {
    setEditingDevice(device);
    const loc = locations.find(l => l._id === device.locationId);
    setEditingDevice(device);
    form.setFieldsValue({
      deviceName: device.deviceName,
      ipAddress: device.ipAddress,
      branchTimekeepingId: loc?.branchId,
      locationId: device.locationId,
      note: device.note,
      requireGps: device.requireGps !== false,
    });
    setIsModalOpen(true);
  };

  const handleCopyQR = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      message.success("Đã copy hình ảnh QR Code vào khay nhớ tạm!");
    } catch (error) {
      console.error(error);
      message.warning("Vui lòng Chuột phải vào ảnh QR và chọn 'Sao chép hình ảnh'.");
    }
  };

  const generatePairingToken = async (deviceId: string) => {
    setPairingLoading(true);
    try {
      const res = await fetch("/api/v1/kiosk/devices/pairing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });
      const data = await res.json();
      if (res.ok) {
        setPairingToken(data.data.pairingToken);
      } else {
        message.error("Lỗi tạo mã QR an toàn");
      }
    } catch (e) {
      console.error("Lỗi sinh OTP", e);
      message.error("Mất kết nối máy chủ");
    } finally {
      setPairingLoading(false);
    }
  };

  const handleOpenDetail = async (device: KioskDevice) => {

    setSelectedDeviceId(device._id || null);
    setPairingToken(null);
    setIsDetailModalOpen(true);
    // Tự động sinh OTP Pairing an toàn khi mở modal
    if (device._id && device.deviceToken) {
      generatePairingToken(device._id);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);

      // Tìm thông tin location từ select
      const selectedLocation = locations.find(l => l._id === values.locationId);

      // Cập nhật tọa độ và bán kính của cơ sở được chọn lên DB cơ sở trước
      if (values.locationId) {
        try {
          await fetch('/api/v1/kiosk/locations', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              _id: values.locationId,
              coordinates: {
                lat: Number(values.locLat),
                lng: Number(values.locLng),
              },
              allowedRadiusMeters: Number(values.locRadius),
            }),
          });
          // Tải lại danh sách cơ sở để cập nhật cache local
          await fetchLocations();
        } catch (err) {
          console.error("Lỗi cập nhật tọa độ cơ sở:", err);
        }
      }

      if (editingDevice) {
        // UPDATE
        const res = await fetch('/api/v1/kiosk/devices', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            _id: editingDevice._id,
            deviceName: values.deviceName,
            ipAddress: values.ipAddress,
            locationId: values.locationId,
            locationSlug: selectedLocation?.locationSlug || editingDevice.locationSlug,
            locationName: selectedLocation?.locationName || editingDevice.locationName,
            tokenExpiry: values.tokenExpiry,
            note: values.note || '',
            requireGps: values.requireGps,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          message.success(data.message);
          setIsModalOpen(false);
          fetchDevices();
        } else {
          message.error(data.message);
        }
      } else {
        // CREATE
        if (!selectedLocation) {
          message.error('Vui lòng chọn cơ sở.');
          setIsSubmitting(false);
          return;
        }

        const res = await fetch('/api/v1/kiosk/devices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceName: values.deviceName,
            ipAddress: values.ipAddress,
            locationId: selectedLocation._id,
            locationSlug: selectedLocation.locationSlug,
            locationName: selectedLocation.locationName,
            tokenExpiry: values.tokenExpiry || 'never',
            note: values.note || '',
            requireGps: values.requireGps,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          message.success(data.message);
          setIsModalOpen(false);
          fetchDevices();
        } else {
          message.error(data.message);
        }
      }
    } catch {
      // Validation error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickCreateBranch = async () => {
    try {
      const values = await branchForm.validateFields();
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
        await fetchBranches();
        form.setFieldValue('branchTimekeepingId', data.data._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateLocation = async () => {
    try {
      const values = await locationForm.validateFields();
      setIsSubmittingLocation(true);

      const res = await fetch('/api/v1/kiosk/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationName: values.locationName,
          locationSlug: values.locationName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          branchId: form.getFieldValue('branchTimekeepingId'),
          status: 'ACTIVE',
          coordinates: {
            lat: Number(values.lat) || 21.043819,
            lng: Number(values.lng) || 105.774492,
          },
          allowedRadiusMeters: Number(values.allowedRadiusMeters) || 100,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        message.success(data.message || 'Thêm cơ sở thành công');
        setIsLocationModalOpen(false);
        locationForm.resetFields();
        // Cập nhật lại danh sách cơ sở
        await fetchLocations();
        // Tự động set form device vào cơ sở vừa tạo
        const insertedId = typeof data.data === 'string' ? data.data : data.data?._id;
        if (insertedId) {
          form.setFieldValue('locationId', insertedId);
        }
      } else {
        message.error(data.message);
      }
    } catch {
      // Validate failed
    } finally {
      setIsSubmittingLocation(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/v1/kiosk/devices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: id }),
      });
      const data = await res.json();
      if (res.ok) {
        message.success(data.message);
        fetchDevices();
      } else {
        message.error(data.message);
      }
    } catch {
      message.error('Lỗi xóa thiết bị.');
    }
  };

  const handleToggleStatus = async (device: KioskDevice) => {
    const newStatus = device.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch('/api/v1/kiosk/devices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: device._id,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        message.success(`Đã ${newStatus === 'ACTIVE' ? 'kích hoạt' : 'vô hiệu hóa'} thiết bị.`);
        fetchDevices();
      } else {
        message.error(data.message);
      }
    } catch {
      message.error('Lỗi cập nhật trạng thái.');
    }
  };

  const getRemainingTime = (expiresAt: Date | string | null | undefined) => {
    if (!expiresAt) return <span className="text-green-600 font-semibold">Vĩnh viễn</span>;
    const timeDiff = new Date(expiresAt).getTime() - currentTime;
    if (timeDiff <= 0) return <span className="text-red-500 font-semibold">Đã hết hạn</span>;

    const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    return (
      <span className="text-amber-600 font-semibold">
        Còn {days} ngày ({new Date(expiresAt).toLocaleDateString('vi-VN')})
      </span>
    );
  };

  // Table columns
  const columns = [
    {
      title: 'Tên thiết bị',
      dataIndex: 'deviceName',
      key: 'deviceName',
      fixed: isMobile ? undefined : 'left' as const,
      width: 220,
      render: (val: string) => (
        <div className="flex items-center gap-2 truncate">
          <Monitor className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="font-bold text-sm text-slate-800 truncate" title={val}>{val}</span>
        </div>
      ),
    },
    {
      title: 'Địa chỉ IP',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      fixed: isMobile ? undefined : 'left' as const,
      width: 140,
      render: (val: string) => (
        <span className="font-mono text-xs bg-slate-50 px-2 py-1 rounded-md border border-slate-100 text-slate-700 font-bold">
          {val}
        </span>
      ),
    },
    {
      title: 'Device Token',
      dataIndex: 'deviceToken',
      key: 'deviceToken',
      width: 180,
      render: (val: string, record: KioskDevice) => val ? (
        <div className="flex flex-col gap-1 max-w-[160px]">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { navigator.clipboard.writeText(val); message.success("Đã copy Token!"); }}>
            <span className="font-mono text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-200 truncate max-w-[120px]" title={val}>
              {val}
            </span>
            <Button type="text" size="small" icon={<i className="fa-solid fa-copy text-amber-500" />} />
          </div>
          <div className="text-[10px] bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 inline-block w-fit">
            {getRemainingTime(record.expiresAt)}
          </div>
        </div>
      ) : <span className="text-xs text-slate-400 italic">Chưa có</span>,
    },
    {
      title: 'Cơ sở',
      dataIndex: 'locationName',
      key: 'locationName',
      width: 200,
      render: (text: string, record: KioskDevice) => {
        const matchingLocation = locations.find(loc => loc._id === record.locationId);
        return (
          <div className="flex flex-col gap-0 w-full max-w-[180px]">
            <span className="font-bold text-slate-800 text-sm truncate block" title={text}>{text}</span>
            <span className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded w-fit truncate block mt-1">
              {matchingLocation?.branchName ? `Chi nhánh: ${matchingLocation.branchName}` : record.locationSlug}
            </span>
            {matchingLocation?.coordinates && (
              <div className="text-[10px] text-slate-400 mt-1 flex flex-col gap-0.5">
                <span className="font-semibold text-slate-500 truncate">
                  📍 Tọa độ: {matchingLocation.coordinates.lat}, {matchingLocation.coordinates.lng}
                </span>
                <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 w-fit mt-0.5">
                  Bán kính: {matchingLocation.allowedRadiusMeters || 100}m
                </span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Định vị GPS',
      dataIndex: 'requireGps',
      key: 'requireGps',
      align: 'center' as const,
      width: 120,
      render: (val: boolean) => (
        <Tag color={val !== false ? 'blue' : 'warning'} className="font-semibold m-0">
          {val !== false ? 'Bắt buộc' : 'Bỏ qua'}
        </Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      align: 'center' as const,
      width: 110,
      render: (val: string) => (
        <Tag color={val === 'ACTIVE' ? 'green' : 'default'} className="font-semibold m-0">
          {val === 'ACTIVE' ? 'Hoạt động' : 'Vô hiệu'}
        </Tag>
      ),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      width: 200,
      render: (val: string) => (
        <span className="text-xs text-slate-500 block truncate max-w-[180px]" title={val}>{val || '—'}</span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right' as const,
      fixed: isMobile ? undefined : 'right' as const,
      width: 150,
      render: (_: unknown, record: KioskDevice) => (
        <div className="flex items-center justify-end gap-1 flex-nowrap">
          <Button
            type="text"
            size="small"
            icon={<Eye className="w-3.5 h-3.5 text-slate-500" />}
            onClick={() => handleOpenDetail(record)}
            title="Xem chi tiết"
          />
          <WithPermission permission="timekeeping_kiosk_device_toggle" roleId={roleId}>
            <Button
              type="text"
              size="small"
              icon={record.status === 'ACTIVE'
                ? <PowerOff className="w-3.5 h-3.5 text-amber-500" />
                : <Power className="w-3.5 h-3.5 text-emerald-500" />
              }
              onClick={() => handleToggleStatus(record)}
              title={record.status === 'ACTIVE' ? 'Vô hiệu hóa' : 'Kích hoạt'}
            />
          </WithPermission>
          <WithPermission permission="timekeeping_kiosk_device_edit" roleId={roleId}>
            <Button
              type="text"
              size="small"
              icon={<Pencil className="w-3.5 h-3.5 text-blue-500" />}
              onClick={() => handleOpenEdit(record)}
              title="Sửa"
            />
          </WithPermission>
          <WithPermission permission="timekeeping_kiosk_device_delete" roleId={roleId}>
            <Popconfirm
              title="Xóa thiết bị này?"
              description="Thiết bị sẽ không thể truy cập hệ thống chấm công."
              onConfirm={() => handleDelete(record._id || '')}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<Trash2 className="w-3.5 h-3.5" />}
                title="Xóa"
              />
            </Popconfirm>
          </WithPermission>
        </div>
      ),
    },
  ];

  const filteredDevices = devices.filter(device => {
    if (filterBranch) {
      const loc = locations.find(l => l._id === device.locationId);
      if (!loc || loc.branchId !== filterBranch) return false;
    }
    if (filterLocation && device.locationId !== filterLocation) return false;
    if (filterSearch) {
      const searchLower = filterSearch.toLowerCase();
      return device.deviceName?.toLowerCase().includes(searchLower) || device.ipAddress?.toLowerCase().includes(searchLower);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-linear-to-r from-blue-50/90 to-indigo-50/50 p-6 rounded-2xl border border-blue-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] mb-6">
        <div className="relative z-10 max-w-3xl">
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full">
            Quản Lý Thiết Bị
          </span>
          <h2 className="text-xl font-bold mt-2.5 mb-1.5 text-slate-800">
            Thiết Bị Hupuna Chấm Công
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Đăng ký và quản lý các thiết bị chấm công tại cơ sở. Mỗi thiết bị được xác thực qua địa chỉ IP tĩnh trước khi cho phép nhân viên chấm công.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs mb-6 flex flex-col sm:flex-row flex-wrap gap-4 items-stretch sm:items-center">
        <div className="w-full sm:flex-1 sm:min-w-[200px]">
          <Input
            placeholder="Tìm theo tên thiết bị, IP..."
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            allowClear
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            className="w-full"
            placeholder="Chọn Chi nhánh"
            allowClear
            popupMatchSelectWidth={false}
            value={filterBranch}
            onChange={(val) => {
              setFilterBranch(val);
              setFilterLocation(null);
            }}
            options={branches.map(b => ({ label: b.name, value: b._id || b.id }))}
          />
        </div>
        <div className="w-full sm:w-64">
          <Select
            className="w-full"
            placeholder="Chọn Cơ sở"
            allowClear
            popupMatchSelectWidth={false}
            value={filterLocation}
            onChange={setFilterLocation}
            options={locations
              .filter(l => !filterBranch || l.branchId === filterBranch)
              .map(l => ({ label: l.locationName, value: l._id }))}
          />
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="text-sm text-slate-500 whitespace-nowrap">
          Tổng cộng: <span className="font-bold text-slate-800">{filteredDevices.length}</span> thiết bị
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
          {/* Switch View Mode */}
          <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200/85 flex items-center gap-0.5 mr-2">
            <Button
              type={viewMode === 'list' ? 'primary' : 'text'}
              size="small"
              icon={<List className="w-3.5 h-3.5" />}
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'shadow-xs text-xs' : 'text-slate-500 text-xs'}
            >
              Danh sách
            </Button>
            <Button
              type={viewMode === 'grid' ? 'primary' : 'text'}
              size="small"
              icon={<LayoutGrid className="w-3.5 h-3.5" />}
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'shadow-xs text-xs' : 'text-slate-500 text-xs'}
            >
              Lưới Card
            </Button>
          </div>
          
          <Button
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => {
              fetchDevices();
            }}
            loading={isLoading}
          >
            Tải lại
          </Button>
          <WithPermission permission="timekeeping_kiosk_device_create" roleId={roleId}>
            <Button
              type="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenCreate}
            >
              Thêm thiết bị
            </Button>
          </WithPermission>
        </div>
      </div>

      {/* Devices View (Table / Card Grid) */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden relative kiosk-table-wrapper">
          <Table
            dataSource={filteredDevices}
            columns={columns}
            rowKey="_id"
            loading={isLoading}
            scroll={{ x: 1200 }}
            pagination={{
              pageSize: 10,
              showTotal: (total, range) => `Hiển thị ${range[0]} - ${range[1]} trên tổng số ${total} thiết bị`
            }}
            size="middle"
            locale={{
              emptyText: (
                <div className="py-12 text-center">
                  <Monitor className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">Chưa có thiết bị nào</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Nhấn &quot;Thêm thiết bị&quot; để đăng ký máy chấm công mới.
                  </p>
                </div>
              ),
            }}
          />
          {isMobile && (
            <div className="absolute right-3 top-3 z-50">
              <Button
                type="primary"
                shape="circle"
                className="shadow-lg opacity-80 hover:opacity-100 flex items-center justify-center w-8 h-8 transition-opacity duration-300"
                onClick={() => {
                  const scrollContainer = document.querySelector('.kiosk-table-wrapper .ant-table-content');
                  if (scrollContainer) scrollContainer.scrollTo({ left: scrollContainer.scrollWidth, behavior: 'smooth' });
                }}
                title="Cuộn sang phải"
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        // Grid View - Máy Chấm Công Card
        isLoading ? (
          <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-xs">Đang tải dữ liệu thiết bị...</div>
        ) : filteredDevices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/60 p-12 text-center shadow-xs">
            <Monitor className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Chưa có thiết bị nào phù hợp bộ lọc</p>
            <p className="text-slate-400 text-xs mt-1">
              Nhấn &quot;Thêm thiết bị&quot; để đăng ký máy chấm công mới.
            </p>
          </div>
        ) : (
          <div>
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes scan-laser-kiosk {
                0% { transform: translateY(0); opacity: 0.3; }
                50% { transform: translateY(112px); opacity: 1; }
                100% { transform: translateY(0); opacity: 0.3; }
              }
              .kiosk-laser-line {
                animation: scan-laser-kiosk 3s infinite ease-in-out;
              }
            `}} />
            <Row gutter={[24, 32]}>
              {filteredDevices.map((device) => {
                const isActive = device.status === 'ACTIVE';
                const matchingLocation = locations.find(loc => loc._id === device.locationId);

                return (
                  <Col xs={24} sm={12} md={8} xl={6} key={device._id}>
                    <div className="flex flex-col items-center">
                      {/* Thân máy chấm công Tablet */}
                      <div className={`w-full max-w-[340px] sm:max-w-[280px] bg-slate-100 rounded-[2.2rem] p-3 shadow-md border-3 transition-all duration-300 relative flex flex-col justify-between mx-auto ${
                        isActive 
                          ? 'border-slate-300 hover:shadow-xl hover:border-blue-400' 
                          : 'border-slate-200 grayscale opacity-80'
                      }`}>
                        
                        {/* Viền đen màn hình iPad/Tablet */}
                        <div className="bg-slate-900 rounded-[1.8rem] p-3 flex flex-col gap-3 relative border border-slate-950 shadow-inner">
                          
                          {/* Dải Notch loa thoại + Camera giả lập */}
                          <div className="absolute top-1 inset-x-0 flex justify-center items-center gap-1.5 z-20">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-800 border border-slate-700"></div>
                            <div className="w-8 h-1 rounded-full bg-slate-800"></div>
                            <div className="w-2 h-2 rounded-full bg-blue-900/80 border border-slate-800"></div>
                          </div>

                          {/* Màn hình Camera Quét sinh trắc */}
                          <div className="bg-slate-950 rounded-2xl h-[120px] flex flex-col items-center justify-center relative overflow-hidden border border-slate-900 mt-2 shadow-inner">
                            {/* Radial gradient background */}
                            <div className={`absolute inset-0 opacity-15 pointer-events-none transition-colors duration-300 ${
                              isActive ? 'bg-gradient-to-b from-blue-500/20 to-transparent' : 'bg-transparent'
                            }`} />

                            {/* Đèn chỉ thị trạng thái nhấp nháy */}
                            <div className="absolute top-2 right-3 flex items-center gap-1.5 z-10">
                              <span className="relative flex h-2 w-2">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isActive ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${isActive ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                              </span>
                              <span className="font-mono text-[7px] text-slate-500 tracking-wider font-bold">
                                {isActive ? 'ONLINE' : 'STANDBY'}
                              </span>
                            </div>

                            {/* Laser Line Quét */}
                            {isActive && (
                              <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent kiosk-laser-line z-10" />
                            )}

                            {/* Biểu tượng mặt quét hoặc camera */}
                            {isActive ? (
                              <div className="flex flex-col items-center gap-1 z-10">
                                <ScanFace className="w-10 h-10 text-blue-400/90 animate-pulse" />
                                <span className="text-[8px] text-blue-400/85 tracking-widest font-mono uppercase font-black">AI Active Scan</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1 z-10 opacity-40">
                                <Camera className="w-10 h-10 text-slate-500" />
                                <span className="text-[8px] text-slate-500 tracking-widest font-mono uppercase font-semibold">Offline</span>
                              </div>
                            )}
                          </div>

                          {/* Màn hình hiển thị thông tin Thiết bị */}
                          <div className="bg-slate-900 rounded-xl p-3 flex flex-col gap-2 border border-slate-850">
                            {/* Tên Kiosk */}
                            <div className="truncate">
                              <h3 className="text-white text-xs font-black truncate m-0 text-center uppercase tracking-wide">
                                {device.deviceName}
                              </h3>
                            </div>
                            
                            <div className="h-px bg-slate-850" />

                            {/* Details list */}
                            <div className="space-y-1.5 text-[10px] text-slate-400">
                              <div className="flex justify-between items-center gap-1">
                                <span>Địa chỉ IP:</span>
                                <span className="font-mono font-bold text-slate-200 truncate bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                  {device.ipAddress}
                                </span>
                              </div>
                              <div className="flex justify-between items-center gap-1">
                                <span>Cơ sở:</span>
                                <span className="font-bold text-slate-200 truncate max-w-[120px]" title={device.locationName}>
                                  {device.locationName}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>GPS Check:</span>
                                <Tag color={device.requireGps !== false ? 'blue' : 'warning'} className="font-bold text-[8px] px-1 py-0 m-0 leading-tight border-none">
                                  {device.requireGps !== false ? 'BẮT BUỘC' : 'BỎ QUA'}
                                </Tag>
                              </div>
                              
                              {/* Token copy block */}
                              {device.deviceToken ? (
                                <div className="flex justify-between items-center gap-1 pt-0.5">
                                  <span>Token OTP:</span>
                                  <div 
                                    className="flex items-center gap-1 cursor-pointer bg-slate-950/85 px-1.5 py-0.5 rounded border border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-950 transition-colors w-fit max-w-[110px]"
                                    onClick={() => {
                                      navigator.clipboard.writeText(device.deviceToken || '');
                                      message.success('Đã copy Token!');
                                    }}
                                    title="Copy Token"
                                  >
                                    <span className="font-mono text-[8px] text-amber-500 truncate">
                                      {device.deviceToken}
                                    </span>
                                    <Copy className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>

                        </div>

                        {/* Nút hành động nhanh ở chân máy */}
                        <div className="mt-3 px-1 flex justify-between items-center gap-2 z-10">
                          {/* Nút Xem chi tiết */}
                          <Button
                            type="default"
                            size="small"
                            className="bg-white hover:bg-slate-50 border-slate-205 hover:border-slate-350 text-slate-650 flex-1 text-[11px] h-7 flex items-center justify-center gap-1 font-bold shadow-xs"
                            icon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => handleOpenDetail(device)}
                          >
                            Chi tiết
                          </Button>

                          {/* Nhóm action icons */}
                          <div className="flex items-center gap-0.5">
                            <WithPermission permission="timekeeping_kiosk_device_toggle" roleId={roleId}>
                              <Button
                                type="text"
                                size="small"
                                className="w-7 h-7 p-0 flex items-center justify-center hover:bg-slate-200 rounded-lg text-slate-500"
                                icon={isActive
                                  ? <PowerOff className="w-3.5 h-3.5 text-amber-500" />
                                  : <Power className="w-3.5 h-3.5 text-emerald-500" />
                                }
                                onClick={() => handleToggleStatus(device)}
                                title={isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                              />
                            </WithPermission>
                            <WithPermission permission="timekeeping_kiosk_device_edit" roleId={roleId}>
                              <Button
                                type="text"
                                size="small"
                                className="w-7 h-7 p-0 flex items-center justify-center hover:bg-slate-200 rounded-lg text-blue-500"
                                icon={<Pencil className="w-3.5 h-3.5" />}
                                onClick={() => handleOpenEdit(device)}
                                title="Sửa"
                              />
                            </WithPermission>
                            <WithPermission permission="timekeeping_kiosk_device_delete" roleId={roleId}>
                              <Popconfirm
                                title="Xóa thiết bị này?"
                                description="Thiết bị sẽ không thể chấm công."
                                onConfirm={() => handleDelete(device._id || '')}
                                okText="Xóa"
                                cancelText="Hủy"
                              >
                                <Button
                                  type="text"
                                  size="small"
                                  className="w-7 h-7 p-0 flex items-center justify-center hover:bg-slate-200 rounded-lg text-red-500"
                                  icon={<Trash2 className="w-3.5 h-3.5" />}
                                  title="Xóa"
                                />
                              </Popconfirm>
                            </WithPermission>
                          </div>
                        </div>

                      </div>
                      
                      {/* Chân đế kim loại cách điệu */}
                      <div className="w-14 h-3 bg-slate-300 rounded-b-lg shadow-xs border-t border-slate-400/30"></div>
                      <div className="w-20 h-1 bg-slate-200 rounded-full opacity-50"></div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </div>
        )
      )}

      {/* Create/Edit Modal */}
      <Modal
        title={editingDevice ? 'Chỉnh sửa thiết bị' : 'Thêm thiết bị mới'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={isSubmitting}
        okText={editingDevice ? 'Cập nhật' : 'Thêm mới'}
        cancelText="Hủy"
        width={800}
      >
        <Form form={form} layout="vertical" className="mt-2 sm:mt-4">
          <div className="bg-slate-50 p-2 sm:p-4 rounded-xl border border-slate-200 mb-4 sm:mb-6 space-y-4">
            <h3 className="font-semibold text-slate-700 mb-2">1. Định vị Thiết bị</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item name="branchTimekeepingId" label="Chi nhánh" rules={[{ required: true, message: 'Chọn chi nhánh' }]}>
                <Select
                  placeholder="Chọn chi nhánh"
                  onChange={() => form.setFieldValue('locationId', undefined)}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <div className="p-2">
                        <WithPermission permission="timekeeping_branch_create" roleId={roleId}>
                          <Button type="dashed" block icon={<Plus className="w-4 h-4" />} onClick={() => setIsBranchModalOpen(true)}>
                            Thêm Chi nhánh mới
                          </Button>
                        </WithPermission>
                      </div>
                    </>
                  )}
                >
                  {branches.map(b => (
                    <Select.Option key={b._id} value={b._id}>{b.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="locationId" label="Cơ sở / Điểm" rules={[{ required: true, message: 'Chọn cơ sở' }]}>
                <Select
                  placeholder="Chọn cơ sở"
                  disabled={!branchIdWatch}
                  showSearch
                  filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase()) ?? false}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <div className="p-2">
                        <WithPermission permission="timekeeping_location_create" roleId={roleId}>
                          <Button type="dashed" block icon={<Plus className="w-4 h-4" />} onClick={() => setIsLocationModalOpen(true)}>
                            Thêm Cơ sở mới
                          </Button>
                        </WithPermission>
                      </div>
                    </>
                  )}
                >
                  {locations.filter(l => {
                    if (!branchIdWatch) return true;
                    const selectedBranch = branches.find(b => b._id === branchIdWatch);
                    if (!selectedBranch) return l.branchId === branchIdWatch;
                    return l.branchId === selectedBranch._id || l.branchId === selectedBranch.id;
                  }).map(loc => (
                    <Select.Option key={loc._id} value={loc._id} label={loc.locationName}>
                      {loc.locationName}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </div>

            {locationIdWatch && (
              <div className="bg-white p-2 sm:p-4 rounded-xl border border-slate-200 mt-4 space-y-4">
                <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                  Cấu hình Tọa độ & Bán kính Điểm chấm công
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Form.Item
                    name="locLat"
                    label="Vĩ độ (Lat)"
                    rules={[{ required: true, message: 'Vui lòng nhập vĩ độ' }]}
                  >
                    <Input type="number" step="0.000001" placeholder="Ví dụ: 21.043819" />
                  </Form.Item>
                  <Form.Item
                    name="locLng"
                    label="Kinh độ (Lng)"
                    rules={[{ required: true, message: 'Vui lòng nhập kinh độ' }]}
                  >
                    <Input type="number" step="0.000001" placeholder="Ví dụ: 105.774492" />
                  </Form.Item>
                  <Form.Item
                    name="locRadius"
                    label="Bán kính (M)"
                    rules={[{ required: true, message: 'Vui lòng nhập bán kính' }]}
                  >
                    <Input type="number" min={1} placeholder="Ví dụ: 100" />
                  </Form.Item>
                </div>

                {/* Google Map Preview */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <iframe
                    src={`https://maps.google.com/maps?q=${mainLocLatWatch},${mainLocLngWatch}&hl=vi&z=16&output=embed`}
                    width="100%"
                    height="200"
                    style={{ border: 0 }}
                    allowFullScreen={false}
                    loading="lazy"
                  ></iframe>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-2 sm:p-4 rounded-xl border border-slate-200 mb-4 sm:mb-6 space-y-4">
            <h3 className="font-semibold text-slate-700 mb-2">2. Thông tin Kỹ thuật</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                name="deviceName"
                label="Tên thiết bị"
                rules={[{ required: true, message: 'Vui lòng nhập tên thiết bị' }]}
              >
                <Input placeholder="Ví dụ: Tablet 1 - Kho Thái Bình" />
              </Form.Item>

              <Form.Item
                name="ipAddress"
                label="Địa chỉ IP tĩnh"
                rules={[
                  { required: true, message: 'Vui lòng nhập địa chỉ IP' },
                  {
                    pattern: /^(\d{1,3}\.){3}\d{1,3}$/,
                    message: 'Định dạng IP không hợp lệ (ví dụ: 113.190.xxx.xxx)',
                  },
                ]}
              >
                <Input placeholder="Ví dụ: 113.190.1.100" className="font-mono" />
              </Form.Item>
            </div>

            {editingDevice && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 mb-4 text-sm text-slate-600">
                <div className="flex flex-col sm:flex-row justify-between mb-2 gap-1 sm:gap-2">
                  <span className="shrink-0">Mã hiện tại:</span>
                  <span className="font-mono font-bold text-blue-700 break-all text-left sm:text-right">
                    {editingDevice.deviceToken}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span>Trạng thái:</span>
                  {getRemainingTime(editingDevice.expiresAt)}
                </div>
              </div>
            )}

            <Form.Item
              name="tokenExpiry"
              label={editingDevice ? "Cấp lại / Gia hạn Token" : "Thời hạn Token (bảo mật)"}
              help={editingDevice ? "Lưu ý: Chọn gia hạn sẽ tạo ra Mã Token mới và hủy mã cũ." : undefined}
              initialValue={editingDevice ? undefined : "never"}
            >
              <Select
                allowClear={!!editingDevice}
                placeholder={editingDevice ? "Giữ nguyên mã hiện tại" : undefined}
                options={[
                  { value: 'never', label: 'Vĩnh viễn (Không hết hạn)' },
                  { value: '3_months', label: '3 Tháng' },
                  { value: '6_months', label: '6 Tháng' },
                  { value: '1_year', label: '1 Năm' },
                  { value: '2_years', label: '2 Năm' },
                ]}
              />
            </Form.Item>

            <Form.Item name="requireGps" label="Yêu cầu kiểm tra định vị GPS" valuePropName="checked" initialValue={true}>
              <Switch checkedChildren="Bắt buộc" unCheckedChildren="Bỏ qua" />
            </Form.Item>

            <Form.Item name="note" label="Ghi chú">
              <Input.TextArea
                rows={2}
                placeholder="Ví dụ: Samsung Tab A9, đặt tại cổng kho"
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* Quick Create Branch Modal */}
      <Modal title="Thêm Chi nhánh nhanh" open={isBranchModalOpen} onCancel={() => setIsBranchModalOpen(false)} onOk={handleQuickCreateBranch} okText="Tạo" cancelText="Hủy" width={400}>
        <Form form={branchForm} layout="vertical" className="mt-4">
          <Form.Item name="name" label="Tên Chi nhánh" rules={[{ required: true, message: 'Nhập tên' }]}>
            <Input placeholder="VD: Chi nhánh Hà Nội" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Quick Create Location Modal */}
      <Modal
        title="Thêm cơ sở mới nhanh"
        open={isLocationModalOpen}
        onCancel={() => setIsLocationModalOpen(false)}
        onOk={handleCreateLocation}
        confirmLoading={isSubmittingLocation}
        okText="Thêm mới"
        cancelText="Hủy"
        width={500}
      >
        <Form form={locationForm} layout="vertical" className="mt-4">
          <Form.Item
            name="locationName"
            label="Tên cơ sở"
            rules={[{ required: true, message: 'Vui lòng nhập tên cơ sở' }]}
          >
            <Input placeholder="Ví dụ: Kho Thái Bình" />
          </Form.Item>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item
              name="lat"
              label="Vĩ độ (Lat)"
              initialValue={21.043819}
              rules={[{ required: true, message: 'Vui lòng nhập vĩ độ' }]}
            >
              <Input type="number" step="0.000001" placeholder="21.043819" />
            </Form.Item>
            <Form.Item
              name="lng"
              label="Kinh độ (Lng)"
              initialValue={105.774492}
              rules={[{ required: true, message: 'Vui lòng nhập kinh độ' }]}
            >
              <Input type="number" step="0.000001" placeholder="105.774492" />
            </Form.Item>
          </div>

          <Form.Item
            name="allowedRadiusMeters"
            label="Bán kính chấm công (M)"
            initialValue={100}
            rules={[{ required: true, message: 'Vui lòng nhập bán kính' }]}
          >
            <Input type="number" min={1} placeholder="100" />
          </Form.Item>

          {/* Google Map Preview */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm mt-2">
            <iframe
              src={`https://maps.google.com/maps?q=${locationLatWatch},${locationLngWatch}&hl=vi&z=16&output=embed`}
              width="100%"
              height="180"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
            ></iframe>
          </div>
        </Form>
      </Modal>

      {/* Detail Device Modal */}
      <Modal
        title={
          <span className="font-extrabold text-slate-800 text-base uppercase font-mono tracking-wide flex items-center gap-2">
            <Monitor className="w-5 h-5 text-blue-500" />
            Chi tiết Thiết bị Chấm công
          </span>
        }
        open={isDetailModalOpen}
        onCancel={() => {
          setIsDetailModalOpen(false);
          setSelectedDeviceId(null);
          setComparisonResult(null);
          setIsComparingLocation(false);
        }}
        footer={[
          <Button key="close" type="primary" onClick={() => {
            setIsDetailModalOpen(false);
            setSelectedDeviceId(null);
            setComparisonResult(null);
            setIsComparingLocation(false);
          }}>
            Đóng
          </Button>
        ]}
        width={720}
        centered
        destroyOnHidden
      >
        {selectedDevice && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-2 border-t border-slate-100">
            {/* Cột 1: Thông tin chung */}
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider font-mono border-b border-slate-200/60 pb-1.5 mb-2">
                  1. Thông tin Định danh
                </h4>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs">Tên thiết bị:</span>
                  <span className="font-bold text-slate-800 text-xs text-right">{selectedDevice.deviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs">Địa điểm:</span>
                  <span className="font-semibold text-slate-800 text-xs text-right">{selectedDevice.locationName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs">Chi nhánh:</span>
                  <span className="font-semibold text-slate-800 text-xs text-right">
                    {(() => {
                      const loc = locations.find(l => l._id === selectedDevice.locationId);
                      return loc?.branchName || '---';
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs">Trạng thái:</span>
                  <Tag color={selectedDevice.status === 'ACTIVE' ? 'green' : 'default'} className="font-bold text-[9px] m-0">
                    {selectedDevice.status === 'ACTIVE' ? 'Hoạt động' : 'Vô hiệu hóa'}
                  </Tag>
                </div>
              </div>

              {/* Thông tin Địa lý & Bản đồ Cơ sở */}
              {(() => {
                const loc = locations.find(l => l._id === selectedDevice.locationId);
                if (!loc) return null;
                return (
                  <div className="bg-emerald-50/30 p-4 rounded-xl border border-emerald-100/60 space-y-3">
                    <h4 className="font-bold text-emerald-800 text-xs uppercase tracking-wider font-mono border-b border-emerald-200/50 pb-1.5 mb-2 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      2. Vị trí & Bán kính Chấm công
                    </h4>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Vĩ độ (Lat):</span>
                      <span className="font-mono font-bold text-slate-800 text-xs">{loc.coordinates?.lat ?? 'Chưa cấu hình'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Kinh độ (Lng):</span>
                      <span className="font-mono font-bold text-slate-800 text-xs">{loc.coordinates?.lng ?? 'Chưa cấu hình'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Bán kính cho phép:</span>
                      <span className="font-bold text-emerald-600 text-xs">{loc.allowedRadiusMeters ?? 100}m</span>
                    </div>

                    <div className="pt-2">
                      <Button
                        type="dashed"
                        size="small"
                        block
                        className="flex items-center justify-center gap-1.5 border-emerald-300 hover:border-emerald-500 text-emerald-700 hover:text-emerald-800 bg-emerald-50/50 hover:bg-emerald-50 font-semibold text-xs h-7 animate-pulse"
                        loading={isComparingLocation}
                        icon={<RefreshCw className="w-3.5 h-3.5" />}
                        onClick={() => handleCompareLocation(
                          loc.coordinates?.lat ?? 0,
                          loc.coordinates?.lng ?? 0,
                          loc.allowedRadiusMeters ?? 100,
                          selectedDevice.locationId
                        )}
                      >
                        {isComparingLocation ? "Đang định vị vị trí của bạn..." : "Đối chiếu Vị trí Hiện tại"}
                      </Button>
                    </div>

                    {comparisonResult && (
                      <div className={`p-3 rounded-xl border text-[11px] space-y-2 mt-2 transition-all shadow-inner ${comparisonResult.isValid
                        ? "bg-emerald-500/10 border-emerald-400/20 text-emerald-800"
                        : "bg-red-500/10 border-red-400/20 text-red-800"
                        }`}>
                        <div className="flex items-center justify-between font-bold text-xs">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" /> Kết quả đối chiếu:
                          </span>
                          <span className={comparisonResult.isValid ? "text-emerald-600 uppercase font-extrabold" : "text-red-600 uppercase font-extrabold"}>
                            {comparisonResult.isValid ? "Hợp lệ ✔" : "Quá xa ✖"}
                          </span>
                        </div>
                        <div className="space-y-1 text-slate-600 leading-relaxed">
                          <div>• Khoảng cách hiện tại: <strong className={comparisonResult.isValid ? "text-emerald-700" : "text-red-700"}>{Math.round(comparisonResult.distance)} mét</strong> (Mức tối đa cho phép: {comparisonResult.allowedRadius}m)</div>
                          <div>• Tọa độ máy tính: <strong>{comparisonResult.currentLat.toFixed(6)}, {comparisonResult.currentLng.toFixed(6)}</strong> (Sai số ±{Math.round(comparisonResult.accuracy)}m)</div>
                        </div>

                        {!comparisonResult.isValid && (
                          <div className="pt-1">
                            <Button
                              type="primary"
                              danger
                              size="small"
                              block
                              className="text-[10px] font-bold h-7 flex items-center justify-center gap-1 shadow-sm"
                              onClick={() => handleApplyCurrentLocation(
                                selectedDevice.locationId,
                                comparisonResult.currentLat,
                                comparisonResult.currentLng,
                                comparisonResult.allowedRadius
                              )}
                            >
                              Đồng bộ vị trí cơ sở theo Tọa độ hiện tại
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {loc.coordinates && (
                      <div className="border border-emerald-100 rounded-lg overflow-hidden shadow-xs mt-2">
                        <iframe
                          src={`https://maps.google.com/maps?q=${loc.coordinates.lat},${loc.coordinates.lng}&hl=vi&z=16&output=embed`}
                          width="100%"
                          height="140"
                          style={{ border: 0 }}
                          allowFullScreen={false}
                          loading="lazy"
                        ></iframe>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider font-mono border-b border-slate-200/60 pb-1.5 mb-2">
                  3. Thông tin Phụ trợ
                </h4>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-400 text-xs">Ghi chú thiết bị:</span>
                  <span className="text-slate-600 text-xs leading-relaxed italic bg-white p-2.5 rounded-lg border border-slate-200/60 block min-h-[60px]">
                    {selectedDevice.note || 'Không có ghi chú.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Cột 2: Bảo mật & Kết nối QR */}
            <WithPermission permission="timekeeping_kiosk_device_token_view" roleId={roleId}>
              <div className="space-y-4">
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3">
                  <h4 className="font-bold text-indigo-800 text-xs uppercase tracking-wider font-mono border-b border-indigo-200 pb-1.5 mb-2">
                    3. Thông số kỹ thuật & Bảo mật
                  </h4>
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-xs">Địa chỉ IP:</span>
                    <span className="font-mono font-bold text-slate-800 text-xs bg-white px-2 py-0.5 rounded border border-slate-200">{selectedDevice.ipAddress}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 mt-2">
                    <span className="text-slate-500 text-xs">Mã bảo mật (Device Token):</span>
                    {selectedDevice.deviceToken ? (
                      <div className="flex gap-1.5 items-center w-full">
                        <Input.TextArea
                          value={selectedDevice.deviceToken}
                          rows={2}
                          readOnly
                          className="font-mono text-[9px] bg-white border border-slate-200 text-slate-600 p-1.5 rounded-lg w-full resize-none"
                        />
                        <Button
                          type="default"
                          size="small"
                          className="h-[46px] flex items-center justify-center shrink-0 border-indigo-200 hover:border-indigo-500 hover:text-indigo-500"
                          icon={<Copy className="w-3.5 h-3.5" />}
                          onClick={() => {
                            navigator.clipboard.writeText(selectedDevice.deviceToken || '');
                            message.success('Đã copy Token bảo mật!');
                          }}
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Chưa cấp Token</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-500 text-xs">Thời hạn:</span>
                    <span className="text-xs">{getRemainingTime(selectedDevice.expiresAt)}</span>
                  </div>
                </div>

                {selectedDevice.deviceToken && (
                  <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center space-y-2 relative min-h-[220px]">

                    <div className="flex items-center justify-between w-full border-b border-slate-50 pb-2 mb-2">
                      <span className="text-slate-500 text-xs font-semibold">QR Kích hoạt Kiosk (Bảo mật 1 lần)</span>
                      <Button
                        size="small"
                        type="dashed"
                        icon={<RefreshCw className={`w-3 h-3 ${pairingLoading ? 'animate-spin' : ''}`} />}
                        onClick={() => selectedDevice._id && generatePairingToken(selectedDevice._id)}
                        disabled={pairingLoading}
                        title="Làm mới QR và Link"
                        className="text-[10px]"
                      >
                        Làm mới
                      </Button>
                    </div>
                    {pairingLoading ? (
                      <div className="flex flex-col items-center justify-center text-slate-400 py-10">
                        <RefreshCw className="w-6 h-6 animate-spin mb-2" />
                        <span className="text-xs">Đang tạo liên kết an toàn...</span>
                      </div>
                    ) : pairingToken ? (
                      <>
                        <div className="relative group">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                              typeof window !== "undefined"
                                ? `${window.location.origin}/kiosk/${selectedDevice.locationSlug}?setup=${pairingToken}`
                                : ""
                            )}`}
                            alt="QR Connection"
                            className="w-36 h-36 border border-slate-100 rounded-xl p-1 bg-white shadow-xs"
                          />
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              type="primary"
                              icon={<Copy className="w-4 h-4" />}
                              onClick={() => handleCopyQR(`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                                typeof window !== "undefined"
                                  ? `${window.location.origin}/kiosk/${selectedDevice.locationSlug}?setup=${pairingToken}`
                                  : ""
                              )}`)}
                            >
                              Copy Ảnh
                            </Button>
                          </div>
                        </div>
                        <div className="w-full flex items-center gap-1.5 mt-2">
                          <Input
                            readOnly
                            value={typeof window !== "undefined" ? `${window.location.origin}/kiosk/${selectedDevice.locationSlug}?setup=${pairingToken}` : ""}
                            className="text-[10px] bg-slate-50 font-mono text-slate-500 flex-1"
                          />
                          <Button
                            size="small"
                            icon={<Copy className="w-3 h-3" />}
                            onClick={() => {
                              navigator.clipboard.writeText(typeof window !== "undefined" ? `${window.location.origin}/kiosk/${selectedDevice.locationSlug}?setup=${pairingToken}` : "");
                              message.success("Đã copy Link Kích hoạt!");
                            }}
                            title="Copy Link"
                          />
                        </div>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-100 text-center leading-normal font-medium w-full shadow-inner mt-1">
                          <span className="font-bold text-emerald-600 block mb-0.5">✓ Mã QR an toàn</span>
                          Đường link ẩn token, chỉ có hiệu lực 1 lần duy nhất trong 5 phút. Quét bằng máy Kiosk để kết nối ngay.
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-red-500 text-center py-10">Không thể tạo mã QR an toàn. Vui lòng thử lại.</span>
                    )}
                  </div>
                )}
              </div>
            </WithPermission>
          </div>
        )}
      </Modal>
    </div>
  );
}
