"use client";

import React, { useState, useEffect } from "react";
import { User, Mail, Phone, MapPin, Briefcase, Calendar, ShieldCheck, Edit3, Camera, Save, Landmark, CreditCard, FileText, Activity, Fingerprint, QrCode } from "lucide-react";
import dayjs from "dayjs";
import { InputBase } from "@/app/ui/base/input";
import { ButtonBase } from "@/app/ui/base/button";
import { usePortalUser } from "../../portal-context";
import { message } from "antd";
import { QrEmployeeCardModal } from "../../components/QrEmployeeCard";

export interface ProfileFormData {
  phone: string;
  email: string;
  address: string;
  gender: string;
  dateOfBirth: string;
  nativePlace: string;
  ethnicity: string;
  nationality: string;
  identityCard: string;
  bankAccount: string;
  bankName: string;
  taxCode: string;
  avatar?: string;
}

export default function PortalProfile() {
  const { employee, employeeCode, roleLabel, displayName, isLoading, refreshEmployee } = usePortalUser();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<ProfileFormData | null>(null);

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [departments, setDepartments] = useState<{ id?: string; _id?: string; name: string }[]>([]);
  const [branches, setBranches] = useState<{ id?: string; _id?: string; name: string }[]>([]);

  useEffect(() => {
    fetch('/api/departments-timekeeping').then(res => res.json()).then(data => setDepartments(data.data || []));
    fetch('/api/branch-timekeeping').then(res => res.json()).then(data => setBranches(data.data || []));
  }, []);



  const createContactForm = () => ({
    phone: employee?.phone || "",
    email: employee?.email || "",
    address: employee?.address || "",
    gender: employee?.gender || "Nam",
    dateOfBirth: employee?.dateOfBirth || "",
    nativePlace: employee?.nativePlace || "",
    ethnicity: employee?.ethnicity || "Kinh",
    nationality: employee?.nationality || "Việt Nam",
    identityCard: employee?.identityCard || "",
    bankAccount: employee?.bankAccount || "",
    bankName: employee?.bankName || "",
    taxCode: employee?.taxCode || "",
    avatar: employee?.avatar || "",
  });

  const handleToggleEdit = () => {
    if (isEditing) {
      setIsEditing(false);
      return;
    }
    setFormData(createContactForm());
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormData(null);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        message.error("Kích thước ảnh không được vượt quá 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateFormData('avatar', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formData) return;
    setIsSaving(true);
    try {
      // Chú ý: Gửi thêm employeeId (hoặc _id) từ state hiện tại để Backend tự nhận dạng (fallback)
      const res = await fetch(`/api/v1/portal/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          employeeId: employee?.id || employee?._id
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi cập nhật hồ sơ");
      
      message.success("Cập nhật hồ sơ thành công!");
      setIsEditing(false);
      await refreshEmployee();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Đã có lỗi xảy ra";
      message.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const updateFormData = (field: keyof ProfileFormData, value: string) => {
    setFormData((current: ProfileFormData | null) => ({
      ...(current || createContactForm()),
      [field]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const contactData = formData || createContactForm();
  const avatarUrl = (isEditing && formData?.avatar) ? formData.avatar : (employee?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix");
  const departmentName = employee?.departmentName || "Chưa cập nhật";
  const joinDateStr = employee?.joinDate ? dayjs(employee.joinDate).format("DD/MM/YYYY") : "Chưa cập nhật";
  const statusLabel = employee?.status === "ACTIVE" ? "Đang làm việc" : "Nghỉ việc";

  const renderField = (label: string, fieldKey: string, type = "text", readOnly = false, value?: string) => {
    const isEditableField = !readOnly && isEditing;
    const key = fieldKey as keyof ProfileFormData;
    const displayValue = value || contactData[key];

    return (
      <div className="flex flex-col gap-1.5 w-full">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {label}
        </label>
        {isEditableField ? (
          <InputBase 
            type={type} 
            value={contactData[key]}
            onChange={(e) => updateFormData(key, e.target.value)}
            className="w-full text-sm font-medium bg-white/60 border-slate-200/60 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl px-4 py-2.5 shadow-sm"
          />
        ) : (
          <div className="text-sm font-medium text-slate-800 pb-2 border-b border-slate-100 min-h-[32px] flex items-end">
            {displayValue || <span className="text-slate-300 font-normal italic">Chưa cập nhật</span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-10">
      
      {/* Header (No Box) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-4 sm:mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Hồ sơ cá nhân</h2>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">Quản lý thông tin lý lịch của bạn</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {isEditing ? (
            <>
              <ButtonBase onClick={handleCancelEdit} disabled={isSaving} className="flex-1 sm:flex-none px-4 sm:px-5 py-2 bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-sm rounded-lg font-semibold transition-all text-sm">
                Hủy bỏ
              </ButtonBase>
              <ButtonBase onClick={handleSave} disabled={isSaving} className="flex-1 sm:flex-none px-4 sm:px-5 py-2 bg-blue-600 text-white hover:bg-blue-700 shadow-sm rounded-lg font-semibold flex items-center justify-center gap-2 transition-all text-sm">
                {isSaving ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div> : <Save size={16} />}
                Lưu hồ sơ
              </ButtonBase>
            </>
          ) : (
            <ButtonBase onClick={handleToggleEdit} className="w-full sm:w-auto px-4 sm:px-5 py-2 bg-blue-600 text-white hover:bg-blue-700 shadow-sm rounded-lg font-semibold flex items-center justify-center gap-2 transition-all text-sm">
              <Edit3 size={16} /> Cập nhật thông tin
            </ButtonBase>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        
        {/* Left Column: Avatar & Quick Info */}
        <div className="lg:col-span-4 space-y-4 sm:space-y-6">
          
          {/* Avatar Card (Minimalist) */}
          <div className="bg-white rounded-[1.5rem] sm:rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden p-5 sm:p-8 text-center group transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
            <div className="relative inline-block mb-3 sm:mb-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-100 ring-4 ring-slate-50 overflow-hidden relative mx-auto shadow-sm">
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              {isEditing && (
                <>
                  <input 
                    type="file" 
                    id="avatar-upload" 
                    hidden 
                    accept="image/*" 
                    onChange={handleAvatarUpload}
                  />
                  <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full text-white flex items-center justify-center border-2 border-white shadow-md hover:bg-blue-700 transition-transform hover:scale-105 cursor-pointer">
                    <Camera size={14} />
                  </label>
                </>
              )}
            </div>
            
            <h3 className="text-xl font-bold text-slate-900">{displayName}</h3>
            <p className="text-sm font-medium text-slate-500 mt-1 mb-4">{roleLabel}</p>
            
            <div className="flex justify-center items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                <User size={14} /> {employeeCode}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                <ShieldCheck size={14} /> {statusLabel}
              </span>
            </div>

            <button
              onClick={() => setIsQrModalOpen(true)}
              className="mt-5 w-full bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <QrCode size={18} /> Xem Thẻ Nhân Viên QR
            </button>
          </div>

          {/* Công việc & Lương (Read-only) */}
          <div className="bg-white rounded-[1.5rem] sm:rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-5 sm:p-8 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 sm:mb-6 flex items-center gap-2">
              <Briefcase size={16} className="text-slate-400" />
              Công việc & Mức lương
            </h3>
            
            <div className="space-y-3 sm:space-y-5">
              {renderField("Chức danh", "role", "text", true, roleLabel)}
              {renderField("Loại hợp đồng", "employeeType", "text", true, (() => {
                const t = employee?.employeeType;
                if (t === 'part_time') return 'Bán thời gian (Part-time)';
                if (t === 'probation') return 'Thử việc (Probation)';
                if (t === 'intern') return 'Thực tập (Intern)';
                return 'Chính thức (Full-time)';
              })())}
              {renderField("Phòng ban", "department", "text", true, departmentName)}
              {renderField("Khối / Cụm", "deptGroupName", "text", true, employee?.deptGroupName || "Chưa cập nhật")}
              {renderField("Cơ sở làm việc", "location", "text", true, employee?.locationName || "Chưa cập nhật")}
              {renderField("Ngày gia nhập", "joinDate", "text", true, joinDateStr)}
              {renderField("Lương cứng (VND)", "baseSalary", "text", true, employee?.baseSalary ? employee.baseSalary.toLocaleString() : "Bảo mật")}
            </div>
            
            {isEditing && (
              <div className="mt-6 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5">
                <ShieldCheck className="text-slate-400 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-slate-600 font-medium leading-relaxed">Thông tin công việc do Nhân sự quản lý. Bạn không thể thay đổi.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Editable Forms */}
        <div className="lg:col-span-8 space-y-4 sm:space-y-6">
          
          {/* Thông tin cá nhân & Liên hệ */}
          <div className={`bg-white rounded-[1.5rem] sm:rounded-3xl border ${isEditing ? 'border-blue-200 shadow-lg ring-4 ring-blue-50' : 'border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]'} p-5 sm:p-8 transition-all duration-500`}>
            <div className="flex items-center justify-between mb-4 sm:mb-8 pb-3 sm:pb-4 border-b border-slate-100">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                <User size={16} className="text-slate-400 sm:w-[18px] sm:h-[18px]" />
                Thông tin cá nhân
              </h3>
              {isEditing && <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md">Chế độ sửa</span>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 sm:gap-y-6">
              {renderField("Họ và tên", "fullName", "text", true, displayName)}
              {renderField("Giới tính", "gender")}
              {renderField("Ngày sinh", "dateOfBirth", "date")}
              {renderField("Số điện thoại", "phone")}
              {renderField("Email cá nhân", "email", "email")}
              {renderField("Quê quán", "nativePlace")}
              {renderField("Dân tộc", "ethnicity")}
              {renderField("Số CCCD/CMND", "identityCard")}
              {renderField("Quốc tịch", "nationality")}
              <div className="sm:col-span-2">
                {renderField("Địa chỉ hiện tại", "address")}
              </div>
            </div>
          </div>

          {/* Thông tin Thanh toán */}
          <div className={`bg-white rounded-[1.5rem] sm:rounded-3xl border ${isEditing ? 'border-blue-200 shadow-lg ring-4 ring-blue-50' : 'border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]'} p-5 sm:p-8 transition-all duration-500`}>
            <div className="flex items-center justify-between mb-4 sm:mb-8 pb-3 sm:pb-4 border-b border-slate-100">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                <Landmark size={16} className="text-slate-400 sm:w-[18px] sm:h-[18px]" />
                Ngân hàng & Thuế
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 sm:gap-y-6">
              {renderField("Tên Ngân hàng", "bankName")}
              {renderField("Số Tài khoản", "bankAccount")}
              {renderField("Mã số thuế cá nhân", "taxCode")}
            </div>
          </div>

          {/* Cấu hình máy chấm công Wise Eye */}
          <div className={`bg-white rounded-[1.5rem] sm:rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-5 sm:p-8 transition-all duration-500`}>
            <div className="flex items-center justify-between mb-4 sm:mb-8 pb-3 sm:pb-4 border-b border-slate-100">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                <Fingerprint size={16} className="text-emerald-500 sm:w-[18px] sm:h-[18px]" />
                Máy chấm công
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 sm:gap-y-6">
              {renderField("Mã chấm công trên máy", "enrollNumber", "text", true, employee?.enrollNumber || "Chưa cấp")}
              {renderField("Tên không dấu trên máy", "unaccentedName", "text", true, employee?.unaccentedName || "Chưa cấp")}
              {renderField("Mã số thẻ từ", "cardNo", "text", true, employee?.cardNo || "Chưa cấp")}
              {renderField("Mã PIN thiết bị", "devicePassword", "text", true, employee?.devicePassword ? "******" : "Chưa cấp")}
              {renderField("Phân quyền", "devicePrivilege", "text", true, employee?.devicePrivilege || "Nhân viên")}
              {renderField("Trạng thái quét vân tay", "isEnabled", "text", true, employee?.isEnabled === false ? "Cấm chấm công" : "Cho phép")}
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

