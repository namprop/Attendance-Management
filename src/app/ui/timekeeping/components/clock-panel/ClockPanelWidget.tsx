'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock, MapPin, Wifi, CheckCircle, AlertTriangle,
  Map, Fingerprint, Calendar, ArrowRight, CornerDownRight,
} from 'lucide-react';
import type { Employee, WorkShift, OfficeConfig, CheckInLog } from '@/app/interface/timekeeping';

interface ClockPanelWidgetProps {
  employees: Employee[];
  shifts: WorkShift[];
  officeConfig: OfficeConfig;
  activeEmployeeId: string;
  onCheckInSuccess: (data: { type: 'checkin' | 'checkout'; log: CheckInLog }) => void;
  todayLog: CheckInLog | undefined;
}

export default function ClockPanelWidget({
  employees, shifts, officeConfig, activeEmployeeId, onCheckInSuccess, todayLog,
}: ClockPanelWidgetProps) {
  const currentEmp = employees.find((e) => e.id === activeEmployeeId);
  const [time, setTime] = useState(new Date());
  const [selectedShiftId, setSelectedShiftId] = useState(shifts[0]?.id || '');
  const [isLocating, setIsLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(() => {
    return {
      lat: officeConfig.latitude + (Math.random() - 0.5) * 0.0001,
      lng: officeConfig.longitude + (Math.random() - 0.5) * 0.0001,
    };
  });
  const [simulateWifi, setSimulateWifi] = useState(true);
  const [simulateInOfficeGps, setSimulateInOfficeGps] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ type: 'checkin' | 'checkout'; time: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleSimulateGps = (inOffice: boolean) => {
    setSimulateInOfficeGps(inOffice);
    if (inOffice) {
      setCoords({
        lat: officeConfig.latitude + (Math.random() - 0.5) * 0.0001,
        lng: officeConfig.longitude + (Math.random() - 0.5) * 0.0001,
      });
    } else {
      setCoords({ lat: officeConfig.latitude + 0.015, lng: officeConfig.longitude - 0.012 });
    }
  };

  const effectiveShiftId = selectedShiftId || shifts[0]?.id || '';
  const selectedShift = shifts.find((s) => s.id === effectiveShiftId) || shifts[0];

  const triggerRealGPS = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Trình duyệt không hỗ trợ Geolocation.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setSimulateInOfficeGps(false);
        setIsLocating(false);
      },
      () => {
        setErrorMessage('Không thể truy vấn tọa độ thực tế.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true },
    );
  };

  const getDistance = () => {
    if (!coords) return null;
    const R = 6371e3;
    const φ1 = (coords.lat * Math.PI) / 180;
    const φ2 = (officeConfig.latitude * Math.PI) / 180;
    const Δφ = ((officeConfig.latitude - coords.lat) * Math.PI) / 180;
    const Δλ = ((officeConfig.longitude - coords.lng) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const distance = getDistance();
  const isWithinRadius = distance !== null && distance <= officeConfig.radius;
  const isWifiMatched = simulateWifi;
  const isEligibleToClock = isWithinRadius || isWifiMatched;

  const getIsLate = () => {
    if (!selectedShift) return false;
    const [shiftH, shiftM] = selectedShift.startTime.split(':').map(Number);
    const nowH = time.getHours();
    const nowM = time.getMinutes();
    return nowH * 60 + nowM > shiftH * 60 + shiftM + selectedShift.graceMinutes;
  };

  const isLate = getIsLate() && !todayLog;

  const handleClockInAction = async () => {
    if (!currentEmp) { setErrorMessage('Vui lòng chọn nhân sự trước khi chấm công!'); return; }
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: activeEmployeeId,
          shiftId: effectiveShiftId,
          deviceType: isWifiMatched ? 'WiFi' : 'Web',
          lat: coords?.lat,
          lng: coords?.lng,
          wifiName: isWifiMatched ? officeConfig.wifiSsid : null,
          wifiBssid: isWifiMatched ? officeConfig.wifiBssid : null,
          notes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkin server error');
      onCheckInSuccess(data);
      setSuccessInfo({ type: data.type, time: data.type === 'checkin' ? data.log.clockIn : data.log.clockOut });
      setNotes('');
      setTimeout(() => setSuccessInfo(null), 5000);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="clock_panel" className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm overflow-hidden relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-dashed border-slate-100">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
            Cổng Chấm Công Điện Tử
          </span>
          <h2 className="text-xl font-bold text-slate-800 mt-1 flex items-center gap-1.5">
            <Clock className="w-5 h-5 text-slate-500" />
            Văn Phòng Chấm công
          </h2>
        </div>
        <div id="ticker_clock" className="text-right flex items-center gap-3">
          <Calendar className="w-4 h-4 text-slate-400 hidden sm:block" />
          <div className="text-sm font-medium text-slate-500 hidden sm:block">
            {time.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' })}
          </div>
          <div className="bg-slate-900 text-emerald-400 font-mono text-xl font-semibold px-4 py-1.5 rounded-xl shadow-inner border border-slate-800">
            {time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Actions side */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            {currentEmp ? (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-100 text-slate-500 font-bold">
                  {currentEmp.name.charAt(0)}
                </span>
                <div>
                  <p className="text-xs text-slate-400 font-medium font-mono">Đang kết nối thiết bị với</p>
                  <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                    {currentEmp.name}
                    <span className="text-xs font-normal text-slate-500">({currentEmp.role})</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800 text-sm mb-4">
                Vui lòng chọn tài khoản cá nhân phía trên để sử dụng công cụ chấm công.
              </div>
            )}

            {!todayLog?.clockOut && (
              <div className="mb-4">
                <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
                  Chọn ca làm việc hôm nay
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {shifts.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedShiftId(s.id)}
                      disabled={!!todayLog}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        effectiveShiftId === s.id
                          ? 'border-emerald-600 bg-emerald-50/40 text-emerald-900 ring-1 ring-emerald-600'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      } ${todayLog ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className="block font-medium text-xs sm:text-sm">{s.name}</span>
                      <span className="block font-mono text-[10px] sm:text-xs text-slate-500 mt-1">
                        {s.startTime} - {s.endTime}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {todayLog && (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 mb-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                  Trạng thái ngày hôm nay
                </p>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm border-b border-slate-200/40 pb-2">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" /> Giờ vào (Check-in):
                    </span>
                    <span className="font-mono font-semibold text-slate-800">{todayLog.clockIn}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-500" /> Giờ ra (Check-out):
                    </span>
                    <span className={`font-mono font-semibold ${todayLog.clockOut ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                      {todayLog.clockOut || 'Chưa điểm danh ra'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {isLate && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-4 bg-amber-50/80 rounded-2xl border border-amber-200/60"
              >
                <div className="flex items-start gap-2 text-amber-800 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <span className="font-semibold">Bạn đã vào muộn hơn giờ quy định!</span> Hạn ca bắt đầu lúc{' '}
                    <span className="font-mono font-medium">{selectedShift?.startTime}</span> (+{selectedShift?.graceMinutes}m ân hạn). Hãy cung cấp lý do đi muộn.
                  </div>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi lý do đi muộn..."
                  className="w-full text-xs p-2.5 bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-slate-800"
                  rows={2}
                />
              </motion.div>
            )}

            {!isLate && !todayLog?.clockOut && (
              <div className="mb-4">
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={todayLog ? 'Ghi chú khi Check-out...' : 'Ghi chú nhanh khi Check-in (nếu có)...'}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
                />
              </div>
            )}
          </div>

          <div>
            <AnimatePresence mode="wait">
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-50 text-red-800 text-xs p-3 rounded-xl border border-red-100 flex items-center gap-2 mb-3"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}
              {successInfo && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-emerald-50 text-emerald-900 text-xs p-3.5 rounded-xl border border-emerald-100 flex items-center gap-2 mb-3"
                >
                  <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
                  <div>
                    <span className="font-semibold">
                      {successInfo.type === 'checkin' ? 'Điểm danh vào thành công!' : 'Điểm danh ra thành công!'}
                    </span>{' '}
                    Ghi nhận lúc <span className="font-mono font-medium">{successInfo.time}</span>.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleClockInAction}
              disabled={isSubmitting || !currentEmp || !isEligibleToClock || !!todayLog?.clockOut}
              className={`w-full py-4 px-6 rounded-2xl font-bold tracking-wide shadow-md transition-all text-sm flex items-center justify-center gap-2 uppercase ${
                !currentEmp
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                  : todayLog?.clockOut
                    ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed shadow-none border border-emerald-200'
                    : !isEligibleToClock
                      ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                      : todayLog
                        ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white cursor-pointer active:scale-95'
                        : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white cursor-pointer active:scale-95'
              }`}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : todayLog?.clockOut ? (
                <><CheckCircle className="w-5 h-5" /> Hôm nay đã hoàn tất hai ca</>
              ) : !isEligibleToClock ? (
                <><AlertTriangle className="w-5 h-5 animate-pulse" /> Ngoài vùng phủ sóng văn phòng</>
              ) : todayLog ? (
                <><ArrowRight className="w-5 h-5" /> Bấm để Check-out (Ra ca)</>
              ) : (
                <><Fingerprint className="w-5 h-5" /> Bấm để Check-in (Vào ca)</>
              )}
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-2 font-mono">
              *Hệ thống mã hoá dữ liệu sinh trắc học và vị trí thiết bị chuẩn SHA-256
            </p>
          </div>
        </div>

        {/* Info / Proximity side */}
        <div className="lg:col-span-5 bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-1.5 font-mono">
              <Map className="w-4 h-4 text-slate-400" /> Thiết bị & Vị trí làm việc
            </h3>
            <div className="space-y-4">
              {/* GPS */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/50 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-mono">TỌA ĐỘ HIỆN TẠI</span>
                  <span className="text-xs font-mono font-medium text-slate-700">
                    {coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : 'Đang lấy...'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={triggerRealGPS}
                  disabled={isLocating}
                  className="text-[10px] font-semibold text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100"
                >
                  {isLocating ? 'Đang quét...' : 'Dùng GPS Thật'}
                </button>
              </div>

              {/* Distance */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/50 shadow-xs">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">KHOẢNG CÁCH HQ CHẤM CÔNG</span>
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {distance !== null ? `${distance} mét` : 'Chưa định vị'}
                    </span>
                  </div>
                  {isWithinRadius ? (
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Hợp lệ
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Quá xa ({officeConfig.radius}m)
                    </span>
                  )}
                </div>
              </div>

              {/* WiFi */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/50 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-mono">SÓNG WIFI VĂN PHÒNG</span>
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Wifi className="w-4 h-4 text-slate-400" />
                    {simulateWifi ? officeConfig.wifiSsid : 'WiFi khác'}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simulateWifi}
                    onChange={() => setSimulateWifi(!simulateWifi)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>
            </div>
          </div>

          {/* GPS Simulator */}
          <div className="mt-5 pt-4 border-t border-slate-200/50">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2.5 font-mono">
              Trình Giả Lập Trải Nghiệm
            </h4>
            <div className="bg-emerald-50/40 rounded-xl p-3 border border-emerald-100 flex flex-col gap-2">
              <p className="text-[10px] text-emerald-800 leading-normal mb-1">
                Do chạy trong môi trường thử nghiệm AI, bạn có thể chuyển đổi các trạng thái giả lập:
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 flex items-center gap-1">
                  <CornerDownRight className="w-3.5 h-3.5 text-slate-400" /> Giả lập Đứng tại văn phòng:
                </span>
                <button
                  onClick={() => handleToggleSimulateGps(true)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                    simulateInOfficeGps ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                >
                  Bật (Trong bán kính)
                </button>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 flex items-center gap-1">
                  <CornerDownRight className="w-3.5 h-3.5 text-slate-400" /> Giả lập Ngoài văn phòng:
                </span>
                <button
                  onClick={() => handleToggleSimulateGps(false)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                    !simulateInOfficeGps ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                >
                  Bật (Quá xa)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
