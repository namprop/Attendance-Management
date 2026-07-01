"use client";

import React, { useRef } from "react";
import { QRCode, Button, Modal, message } from "antd";
import { QrCode, Download, UserCircle, MapPin, Building2, CalendarDays } from "lucide-react";
import dayjs from "dayjs";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
export interface QrEmployee {
  id?: string;
  _id?: string;
  fullName?: string;
  name?: string;
  employeeCode?: string;
  role?: string;
  avatar?: string | { type?: string } | null;
  departmentId?: string;
  branchId?: string;
  dateOfBirth?: string;
}

interface Department {
  id?: string;
  _id?: string;
  name: string;
}

interface Branch {
  id?: string;
  _id?: string;
  name: string;
}

interface QrEmployeeCardModalProps {
  open: boolean;
  onClose: () => void;
  employee: QrEmployee | null;
  displayName: string;
  departments: Department[];
  branches: Branch[];
}

function renderAvatarPreview(avatarObj: string | { type?: string } | null | undefined) {
  const avatarType = typeof avatarObj === "string" ? avatarObj : (avatarObj?.type || "User");
  const emojiMap: Record<string, string> = {
    Zap: "⚡", Heart: "❤️", Palette: "🎨", Coffee: "☕", Sparkles: "✨",
  };
  const gradientMap: Record<string, string> = {
    Zap: "from-amber-200 to-orange-400",
    Heart: "from-pink-300 to-rose-500",
    Palette: "from-purple-300 to-indigo-500",
    Coffee: "from-stone-400 to-stone-700",
    Sparkles: "from-cyan-300 to-blue-600",
  };
  if (emojiMap[avatarType]) {
    return (
      <div className={`w-full h-full bg-gradient-to-br ${gradientMap[avatarType]} flex items-center justify-center`}>
        <span className="text-3xl">{emojiMap[avatarType]}</span>
      </div>
    );
  }
  if (avatarType && avatarType.startsWith("data:")) {
    return <img src={avatarType} alt="avatar" className="w-full h-full object-cover" />;
  }
  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-500">
      <UserCircle size={40} strokeWidth={1} />
    </div>
  );
}

/** Thẻ nhân viên compact — dùng ref để chụp PDF */
export function QrCardContent({
  cardRef,
  employee,
  displayName,
  departments,
  branches,
}: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  employee: QrEmployee;
  displayName: string;
  departments: Department[];
  branches: Branch[];
}) {
  const deptName = departments.find(
    (d) => d.id === employee.departmentId || d._id === employee.departmentId
  )?.name || "—";

  const branchName = branches.find(
    (b) => b.id === employee.branchId || b._id === employee.branchId
  )?.name || "—";

  const empId = employee.id || (employee as QrEmployee & { _id?: string })._id || "";
  const fullName = employee.fullName || (employee as QrEmployee & { name?: string }).name || displayName;

  return (
    <div
      ref={cardRef}
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden w-full shadow-sm mb-4"
    >
      {/* ── Header gradient ── */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-4 pt-4 pb-10 relative">
        {/* Lanyard hole */}
        <div className="w-12 h-2.5 bg-white/30 rounded-full mx-auto mb-3 backdrop-blur-sm border border-white/20" />
        <p className="text-white font-black text-xl tracking-[0.25em] uppercase text-center drop-shadow-sm">
          HUPUNA
        </p>
      </div>

      {/* ── Avatar overlapping header ── */}
      <div className="flex justify-center -mt-9 mb-3 relative z-10">
        <div className="w-16 h-16 rounded-full border-[3px] border-white shadow-md overflow-hidden bg-slate-100 shrink-0">
          {renderAvatarPreview(employee.avatar)}
        </div>
      </div>

      {/* ── Name + code + role ── */}
      <div className="text-center px-4 mb-3">
        <h3 className="text-base font-extrabold text-slate-800 uppercase leading-tight tracking-wide">
          {fullName}
        </h3>
        <p className="text-xs font-bold text-blue-600 tracking-widest mt-0.5">
          {employee.employeeCode}
        </p>
        <span className="inline-block mt-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-3 py-0.5 rounded-full border border-slate-200">
          {employee.role || "Nhân viên"}
        </span>
      </div>

      {/* ── Info + QR side by side ── */}
      <div className="flex items-stretch gap-3 px-4 pb-4">
        {/* Info column */}
        <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 p-3 flex flex-col gap-2.5 justify-center">
          {employee.dateOfBirth && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                <CalendarDays size={10} /> Ngày sinh
              </span>
              <span className="text-[12px] font-bold text-slate-700">
                {dayjs(employee.dateOfBirth).format("DD/MM/YYYY")}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1">
              <Building2 size={10} /> Bộ phận
            </span>
            <span className="text-[12px] font-bold text-slate-700 leading-snug">
              {deptName}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1">
              <MapPin size={10} /> Cơ sở
            </span>
            <span className="text-[12px] font-bold text-slate-700 leading-snug">
              {branchName}
            </span>
          </div>
        </div>


        {/* QR column */}
        <div className="flex flex-col items-center justify-center bg-white border border-slate-100 rounded-xl p-2 shadow-sm shrink-0">
          <QRCode
            value={`HUPUNA_EMP_ID:${empId}`}
            size={108}
            color="#0f172a"
            bordered={false}
            type="canvas"
          />
          <p className="text-[9px] text-slate-400 mt-1 text-center leading-tight">
            Quét để xác thực
          </p>
        </div>
      </div>
    </div>
  );
}

/** Modal bao ngoài */
export function QrEmployeeCardModal({
  open,
  onClose,
  employee,
  displayName,
  departments,
  branches,
}: QrEmployeeCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!cardRef.current || !employee) return;
    try {
      message.loading({ content: "Đang tạo thẻ PDF...", key: "pdf-gen" });
      const canvas = await html2canvas(cardRef.current, {
        scale: 4,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);
      pdf.save(`TheNhanVien_${employee.employeeCode || "QR"}.pdf`);
      message.success({ content: "Đã tải thẻ thành công!", key: "pdf-gen" });
    } catch (err) {
      console.error("PDF Generation Error:", err);
      message.error({
        content: "Lỗi khi tạo file PDF: " + (err instanceof Error ? err.message : String(err)),
        key: "pdf-gen",
      });
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <QrCode className="w-4 h-4 text-purple-600" />
          <span className="font-semibold text-slate-800 text-sm">Thẻ Nhân Viên</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={360}
      centered
      destroyOnHidden
      styles={{ body: { padding: "16px" } }}
    >
      {employee && (
        <div className="flex flex-col w-full gap-3">
          <QrCardContent
            cardRef={cardRef}
            employee={employee}
            displayName={displayName}
            departments={departments}
            branches={branches}
          />
          <Button
            type="primary"
            icon={<Download className="w-4 h-4" />}
            onClick={handleDownloadPDF}
            className="w-full bg-blue-600 hover:bg-blue-700 border-none h-10 rounded-xl shadow-sm text-sm font-semibold"
          >
            Tải về máy (PDF)
          </Button>
        </div>
      )}
    </Modal>
  );
}
