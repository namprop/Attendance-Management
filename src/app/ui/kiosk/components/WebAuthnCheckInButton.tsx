"use client";

import React, { useState } from "react";
import { Fingerprint, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";

interface WebAuthnCheckInButtonProps {
  onSuccess?: (data: {
    fullName: string;
    employeeCode: string;
    action: string;
    shiftName?: string;
    lateMinutes?: number;
    earlyMinutes?: number;
  }) => void;
  onError?: (message: string) => void;
  speakVi?: (text: string) => void;
  playBeep?: (type: "success" | "error" | "start") => void;
  onBeforeAuth?: () => void;
  onAfterAuth?: () => void;
}

export default function WebAuthnCheckInButton({
  onSuccess,
  onError,
  speakVi,
  playBeep,
  onBeforeAuth,
  onAfterAuth,
}: WebAuthnCheckInButtonProps) {
  const [status, setStatus] = useState<"IDLE" | "SCANNING" | "SUCCESS" | "ERROR">("IDLE");
  const [message, setMessage] = useState("");

  const handleWebAuthnCheckIn = async () => {
    if (status === "SCANNING") return;

    setStatus("SCANNING");
    setMessage("Đang tạo phiên xác thực...");
    playBeep?.("start");

    try {
      // 1. Lấy challenge từ server
      const genRes = await fetch("/api/webauthn/auth/generate");
      const genData = await genRes.json();

      if (!genData.success) {
        throw new Error(genData.message || "Lỗi tạo phiên xác thực");
      }

      setMessage("Vui lòng quét vân tay / Face ID...");
      speakVi?.("Vui lòng quét vân tay hoặc khuôn mặt của bạn");

      onBeforeAuth?.();

      // 2. Trình duyệt hiện popup quét vân tay / Windows Hello / Touch ID
      const authResponse = await startAuthentication({ optionsJSON: genData.data });
      
      onAfterAuth?.();

      setMessage("Đang xác thực...");

      // 3. Gửi lên server để verify + ghi chấm công
      const verifyRes = await fetch("/api/webauthn/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authenticationResponse: authResponse }),
      });

      const verifyData = await verifyRes.json();

      if (verifyData.success) {
        setStatus("SUCCESS");
        setMessage(verifyData.message || "Chấm công thành công!");
        playBeep?.("success");

        const d = verifyData.data;
        if (d) {
          const actionText = d.action === "CHECK_IN" ? "vào" : "ra";
          const shiftText = d.shiftName ? ` ${d.shiftName}` : " ca";
          let speakText = `Chấm công ${actionText}${shiftText} thành công!`;
          if (d.action === "CHECK_IN" && d.lateMinutes > 0) {
            speakText += ` Bạn đi muộn ${d.lateMinutes} phút.`;
          } else if (d.action === "CHECK_OUT" && d.earlyMinutes > 0) {
            speakText += ` Bạn về sớm ${d.earlyMinutes} phút.`;
          }
          speakVi?.(speakText);
          onSuccess?.(d);
        }

        // Auto reset sau 4 giây
        setTimeout(() => {
          setStatus("IDLE");
          setMessage("");
        }, 4000);
      } else {
        throw new Error(verifyData.message || "Xác thực thất bại");
      }
    } catch (err: unknown) {
      onAfterAuth?.();
      setStatus("ERROR");
      playBeep?.("error");

      let errMsg = "Lỗi xác thực";
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          errMsg = "Bạn đã huỷ hoặc không xác nhận";
        } else if (err.name === "InvalidStateError") {
          errMsg = "Thiết bị chưa đăng ký vân tay";
        } else {
          errMsg = err.message;
        }
      }

      setMessage(errMsg);
      speakVi?.(errMsg);
      onError?.(errMsg);

      setTimeout(() => {
        setStatus("IDLE");
        setMessage("");
      }, 3000);
    }
  };

  // IDLE state
  if (status === "IDLE") {
    return (
      <button
        onClick={handleWebAuthnCheckIn}
        className="
          group relative flex items-center gap-3 px-6 py-4 rounded-2xl
          bg-emerald-500/10 border border-emerald-500/30
          hover:bg-emerald-500/20 hover:border-emerald-400/60
          active:scale-95 transition-all duration-200
          text-emerald-300 font-bold text-base
          animate-in fade-in zoom-in-95 duration-300
        "
      >
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
          <Fingerprint className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="text-left">
          <p className="text-sm font-bold text-emerald-300 leading-tight">Chấm công Vân tay</p>
          <p className="text-[10px] text-emerald-500/70 font-normal">WebAuthn · Passkey</p>
        </div>
      </button>
    );
  }

  // SCANNING state
  if (status === "SCANNING") {
    return (
      <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-300 leading-tight">Đang xác thực...</p>
          <p className="text-[10px] text-emerald-500/70 font-normal animate-pulse">{message}</p>
        </div>
      </div>
    );
  }

  // SUCCESS state
  if (status === "SUCCESS") {
    return (
      <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 animate-in fade-in zoom-in-95 duration-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/30 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-300 leading-tight">Thành công!</p>
          <p className="text-[10px] text-emerald-400/80 font-normal">{message}</p>
        </div>
      </div>
    );
  }

  // ERROR state
  return (
    <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-red-500/10 border border-red-500/30 animate-in fade-in zoom-in-95 duration-300 shake">
      <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
        <XCircle className="w-5 h-5 text-red-400" />
      </div>
      <div>
        <p className="text-sm font-bold text-red-300 leading-tight">Thất bại</p>
        <p className="text-[10px] text-red-400/70 font-normal">{message}</p>
      </div>
    </div>
  );
}
