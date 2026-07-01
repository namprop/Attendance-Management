"use client";

import React, { useEffect, useState, useRef } from "react";
import { Clock, CalendarCheck, TrendingUp, AlertCircle, CheckCircle2, ChevronRight, XCircle, Wifi, Loader2, Banknote, ShieldAlert, ArrowDownCircle, CheckCircle, QrCode, Download, UserCircle } from "lucide-react";
import Link from "next/link";
import { DatePicker, Modal, Button, QRCode, message } from "antd";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";
import { usePortalUser } from "../portal-context";
import { QrEmployeeCardModal } from "../components/QrEmployeeCard";

dayjs.extend(relativeTime);
dayjs.locale('vi');

interface RecentHistoryRecord {
  id: string | number;
  date: string;
  in: string;
  out: string;
  status: string;
  isLate: boolean;
}

interface DashboardData {
  standardDays: string;
  lateMinutes: number;
  overtimeHours: number;
  leaveBalance: string;
  recentHistory: RecentHistoryRecord[];
  estimatedSalary?: number;
  latePenalty?: number;
  overtimeBonus?: number;
  totalIncome?: number;
}

export default function PortalDashboard() {
  const { displayName, employee, employeeCode, authUser, isLoading: isUserLoading } = usePortalUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(dayjs());

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [departments, setDepartments] = useState<{ id?: string; _id?: string; name: string }[]>([]);
  const [branches, setBranches] = useState<{ id?: string; _id?: string; name: string }[]>([]);
  const [announcements, setAnnouncements] = useState<{ id: string; title: string; createdAt: string; type: string }[]>([]);
  const [isAnnouncementsLoading, setIsAnnouncementsLoading] = useState(true);
  const qrCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/departments-timekeeping').then(res => res.json()).then(data => setDepartments(data.data || []));
    fetch('/api/branch-timekeeping').then(res => res.json()).then(data => setBranches(data.data || []));
    fetch('/api/v1/portal/announcements?limit=5')
      .then(res => res.json())
      .then(json => setAnnouncements(json.data || []))
      .catch(() => setAnnouncements([]))
      .finally(() => setIsAnnouncementsLoading(false));
  }, []);

  useEffect(() => {
    if (isUserLoading) return;
    const employeeLookupIds = Array.from(new Set([
      employee?.id,
      employeeCode,
      employee?.employeeCode,
      authUser?.employeeId,
      authUser?._id,
    ].filter((value): value is string => Boolean(value))));

    if (employeeLookupIds.length === 0) {
      const t = setTimeout(() => setIsLoading(false), 0);
      return () => clearTimeout(t);
    }
    const month = selectedDate.month() + 1;
    const year = selectedDate.year();

    const params = new URLSearchParams({
      month: String(month),
      year: String(year)
    });
    employeeLookupIds.forEach(id => params.append('employeeIds', id));

    fetch(`/api/portal/dashboard-stats?${params.toString()}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) setData(json.data);
      })
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, [employee, authUser, isUserLoading, selectedDate]);

  const stats = [
    { title: "Công chuẩn tháng", value: data?.standardDays || "0/26", icon: CalendarCheck, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Đi muộn (Phút)", value: data?.lateMinutes?.toString() || "0", icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50" },
    { title: "Làm thêm (Giờ)", value: data?.overtimeHours?.toString() || "0", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Nghỉ phép còn lại", value: data?.leaveBalance || "0 ngày", icon: Clock, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  const recentHistory = data?.recentHistory || [];

  if (isLoading || isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Đang tải dữ liệu của bạn...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Xin chào, {displayName}! 👋</h2>
          <p className="text-sm text-slate-500 mt-1">Chúc bạn một ngày làm việc hiệu quả và tràn đầy năng lượng.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-600 hidden sm:inline-block">Chọn tháng:</span>
          <DatePicker 
            picker="month" 
            format="MM/YYYY" 
            value={selectedDate} 
            onChange={(date) => {
              if (date) {
                setIsLoading(true);
                setSelectedDate(date);
              }
            }}
            allowClear={false}
            className="w-32 rounded-xl border-slate-200 font-semibold shadow-sm text-slate-700 hover:border-blue-400 focus:border-blue-500 py-2 cursor-pointer"
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="group relative bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 overflow-hidden">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-2xl -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-150`} />
              <div className="flex items-center gap-5 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color} shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={26} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500">{stat.title}</p>
                  <p className="text-2xl font-black text-slate-800 tracking-tight mt-0.5">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Finance Grid */}
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6">
        <div className="flex items-center gap-2 mb-6">
          <Banknote className="text-blue-600 w-6 h-6" />
          <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">Tài chính & Thu nhập (Dự kiến)</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 flex flex-col justify-between group hover:bg-blue-50/50 hover:border-blue-100 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <CheckCircle size={16} />
              </div>
              <span className="text-sm font-semibold text-slate-500">Lương cơ bản</span>
            </div>
            <p className="text-xl font-bold text-slate-800">{data?.estimatedSalary?.toLocaleString() || '0'} ₫</p>
          </div>

          <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 flex flex-col justify-between group hover:bg-orange-50/50 hover:border-orange-100 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                <ShieldAlert size={16} />
              </div>
              <span className="text-sm font-semibold text-slate-500">Phạt đi muộn</span>
            </div>
            <p className="text-xl font-bold text-orange-600">-{data?.latePenalty?.toLocaleString() || '0'} ₫</p>
          </div>

          <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 flex flex-col justify-between group hover:bg-emerald-50/50 hover:border-emerald-100 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <ArrowDownCircle size={16} className="rotate-180" />
              </div>
              <span className="text-sm font-semibold text-slate-500">Lương làm thêm</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">+{data?.overtimeBonus?.toLocaleString() || '0'} ₫</p>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 border border-blue-500 flex flex-col justify-between relative overflow-hidden shadow-md group">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                <Banknote size={16} />
              </div>
              <span className="text-sm font-semibold text-blue-100">Tổng thu nhập</span>
            </div>
            <p className="text-2xl font-black text-white relative z-10">{data?.totalIncome?.toLocaleString() || '0'} ₫</p>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent History */}
        <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
          <div className="p-6 border-b border-slate-100/50 flex items-center justify-between bg-white/30">
            <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">Lịch sử chấm công gần đây</h3>
            <Link href="/portal/history" className="text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
              Xem tất cả <ChevronRight size={16} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100/50">
            {recentHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-400">Chưa có dữ liệu chấm công tháng này.</div>
            ) : (
              recentHistory.map((record: RecentHistoryRecord) => (
                <div key={record.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 group cursor-pointer relative">
                  {/* Left: Date & Status */}
                  <div className="flex items-center gap-4 sm:min-w-[180px]">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105 ${record.isLate ? 'bg-orange-50 text-orange-500 border border-orange-100' : 'bg-emerald-50 text-emerald-500 border border-emerald-100'}`}>
                      {record.isLate ? <AlertCircle size={20} strokeWidth={2.5} /> : <CheckCircle2 size={20} strokeWidth={2.5} />}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-800 text-[14px] sm:text-[15px] tracking-tight">{record.date}</p>
                      <div className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md mt-1 ${record.isLate ? 'bg-orange-100/50 text-orange-600' : 'bg-emerald-100/50 text-emerald-600'}`}>
                        {record.status}
                      </div>
                    </div>
                  </div>

                  {/* Right: Time Flow */}
                  <div className="flex-1 flex items-center justify-between sm:justify-end gap-2 sm:gap-4 bg-slate-50 sm:bg-transparent rounded-xl p-3 sm:p-0 border border-slate-100 sm:border-none">
                    <div className="flex flex-col items-center sm:items-end w-[80px]">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Vào ca</span>
                      <span className="font-mono font-bold text-slate-700 bg-white sm:bg-slate-50/80 px-2.5 py-1.5 rounded-lg border border-slate-200/60 shadow-sm block w-full text-center">
                        {record.in}
                      </span>
                    </div>

                    {/* Connecting Line */}
                    <div className="flex-1 max-w-[60px] sm:max-w-[100px] flex items-center justify-center px-1">
                      <div className="w-full h-px bg-slate-200 relative flex items-center justify-center">
                        <div className="absolute bg-slate-50 sm:bg-white px-1 text-slate-300">
                          <ChevronRight size={14} />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center sm:items-start w-[80px]">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Tan ca</span>
                      <span className="font-mono font-bold text-slate-700 bg-white sm:bg-slate-50/80 px-2.5 py-1.5 rounded-lg border border-slate-200/60 shadow-sm block w-full text-center">
                        {record.out}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Center */}
        <div className="space-y-5 sm:space-y-6">
          {/* Online Check-in Card */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <Wifi className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg m-0 tracking-tight">Chấm công Online</h3>
                <p className="text-emerald-50 text-xs font-medium m-0 opacity-90">Khai báo qua GPS hoặc IP</p>
              </div>
            </div>
            <Link
              href="/portal/online-checkin"
              className="inline-flex items-center justify-center w-full bg-white/95 backdrop-blur-sm text-emerald-700 font-extrabold text-[15px] py-3 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_15px_rgba(0,0,0,0.15)] hover:bg-white transition-all duration-300 relative z-10"
            >
              Chấm công ngay <ChevronRight size={18} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg shadow-blue-600/20 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            <h3 className="font-extrabold text-xl mb-1.5 relative z-10 tracking-tight">Cần nghỉ phép?</h3>
            <p className="text-blue-100 text-sm mb-5 relative z-10 font-medium opacity-90 leading-relaxed">Tạo đơn xin nghỉ, làm việc từ xa hoặc đi trễ dễ dàng.</p>
            <Link href="/portal/requests" className="inline-flex items-center justify-center w-full bg-white/95 backdrop-blur-sm text-blue-700 font-extrabold text-[15px] py-3 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_15px_rgba(0,0,0,0.15)] hover:bg-white transition-all duration-300 relative z-10">
              Tạo đơn ngay <ChevronRight size={18} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* QR Card Feature */}
          <div className="bg-gradient-to-br from-purple-600 to-fuchsia-600 rounded-3xl p-6 text-white shadow-lg shadow-purple-500/20 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg m-0 tracking-tight">Thẻ Nhân Viên</h3>
                <p className="text-purple-50 text-xs font-medium m-0 opacity-90">Xem & tải mã QR định danh</p>
              </div>
            </div>
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="inline-flex items-center justify-center w-full bg-white/95 backdrop-blur-sm text-purple-700 font-extrabold text-[15px] py-3 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_15px_rgba(0,0,0,0.15)] hover:bg-white transition-all duration-300 relative z-10"
            >
              Xem thẻ ngay <ChevronRight size={18} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6">
             <h3 className="font-extrabold text-slate-800 text-lg mb-5 tracking-tight flex items-center gap-2">
               <span className="w-2 h-6 bg-blue-500 rounded-full inline-block"></span>
               Thông báo từ HR
             </h3>
             <div className="space-y-4">
               <div className="group cursor-pointer">
                 <p className="text-[15px] font-bold text-slate-700 group-hover:text-blue-600 transition-colors leading-snug">Nhắc nhở cập nhật Face ID góc nghiêng.</p>
                 <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400 mt-1.5 flex items-center gap-1.5"><Clock size={12} /> 2 giờ trước</p>
               </div>
               <div className="h-px bg-slate-100/80 w-full"></div>
               <div className="group cursor-pointer">
                 <p className="text-[15px] font-bold text-slate-700 group-hover:text-blue-600 transition-colors leading-snug">Lịch nghỉ lễ Quốc khánh 2/9 năm 2026.</p>
                 <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400 mt-1.5 flex items-center gap-1.5"><Clock size={12} /> 1 ngày trước</p>
               </div>
             </div>
          </div>
        </div>
      </div>

      <QrEmployeeCardModal
        open={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        employee={employee}
        displayName={displayName}
        departments={departments}
        branches={branches}
      />

    </div>
  );
}
