"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ShieldAlert, Loader2, ShieldCheck, Monitor } from "lucide-react";
import { useSearchParams } from "next/navigation";

const FaceScanner = dynamic(() => import("@/app/ui/kiosk/FaceScanner"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
      <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-12 shadow-2xl max-w-md w-full">
        <div className="w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
          <Loader2 size={36} className="animate-spin text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Đang tải máy quét...</h2>
        <p className="text-slate-400 text-sm animate-pulse">Vui lòng đợi thiết lập camera...</p>
      </div>
    </div>
  ),
});

import { publicIpv4 } from 'public-ip';

interface KioskGatewayProps {
  locationSlug: string;
}

interface DeviceInfo {
  deviceName: string;
  locationName: string;
  requireGps?: boolean;
}

type GatewayStatus = "CHECKING" | "NEEDS_TOKEN" | "VERIFIED" | "DENIED" | "ERROR";

export default function KioskGateway({ locationSlug }: KioskGatewayProps) {
  const [status, setStatus] = useState<GatewayStatus>("CHECKING");
  const [message, setMessage] = useState("Đang xác thực thiết bị...");
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [clientIp, setClientIp] = useState<string>("");
  const [inputToken, setInputToken] = useState("");
  const [verifiedToken, setVerifiedToken] = useState("");
  const searchParams = useSearchParams();

  const verifyDevice = async () => {
    // Tránh lỗi setState đồng bộ của React Compiler
    await Promise.resolve();
    try {
      setMessage("Đang xác minh thông tin kết nối...");

      // Xử lý OTP Kích hoạt từ QR Code URL: ?setup=OTP_TOKEN
      const setupOtp = searchParams.get("setup");
      if (setupOtp) {
        setMessage("Đang kết nối thiết bị qua mã QR an toàn...");
        try {
          const pairRes = await fetch("/api/v1/kiosk/verify-pairing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ locationSlug, pairingToken: setupOtp }),
          });
          const pairData = await pairRes.json();
          if (pairRes.ok && pairData.data?.deviceToken) {
            // Lưu token thực tế
            localStorage.setItem("kiosk_device_token", pairData.data.deviceToken);
            // Xóa setup otp khỏi URL để tránh F5 bị lỗi và bảo mật lịch sử web
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            setStatus("ERROR");
            setMessage(pairData.message || "Mã kết nối QR không hợp lệ hoặc đã hết hạn.");
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          }
        } catch (e) {
          console.error("Lỗi verify pairing:", e);
        }
      }

      // Bước 1: Lấy public IP bằng thư viện
      setMessage("Đang lấy thông tin thiết bị...");

      let ip = "";
      try {
        ip = await publicIpv4({ fallbackUrls: ["https://ifconfig.me/ip"] });
        setClientIp(ip);
      } catch (err) {
        console.error("Lỗi lấy IP:", err);
        setStatus("ERROR");
        setMessage("Không thể xác định IP thiết bị. Vui lòng kiểm tra kết nối mạng.");
        return;
      }

      // Bước 2: Kiểm tra Token trong localStorage
      const token = localStorage.getItem("kiosk_device_token");
      if (!token) {
        setStatus("NEEDS_TOKEN");
        setMessage("Vui lòng nhập Mã Thiết Bị (Device Token) để kích hoạt Kiosk này.");
        return;
      }

      // Bước 3: Gọi API verify
      setMessage("Đang xác thực với hệ thống...");

      const res = await fetch("/api/v1/kiosk/verify-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationSlug, clientIp: ip, deviceToken: token }),
      });

      const data = await res.json();

      if (res.ok && data.data?.verified) {
        setVerifiedToken(token || "");
        localStorage.setItem("kiosk_location_slug", locationSlug);
        setDeviceInfo({
          deviceName: data.data.deviceName,
          locationName: data.data.locationName,
          requireGps: data.data.requireGps,
        });
        setStatus("VERIFIED");
        setMessage(data.message);
      } else {
        setStatus("DENIED");
        setMessage(data.message || "Thiết bị không được phép truy cập.");
      }
    } catch {
      setStatus("ERROR");
      setMessage("Mất kết nối máy chủ. Vui lòng thử lại.");
    }
  };

  useEffect(() => {
    // Đưa vào macro-task để React Compiler không bắt lỗi sync setState
    const timer = setTimeout(() => {
      verifyDevice();
    }, 0);
    return () => clearTimeout(timer);
  }, [locationSlug]);

  const handleSaveToken = () => {
    if (!inputToken.trim()) return;
    localStorage.setItem("kiosk_device_token", inputToken.trim());
    setStatus("CHECKING");
    verifyDevice();
  };

  // Trạng thái ĐANG KIỂM TRA
  if (status === "CHECKING") {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-12 shadow-2xl max-w-md w-full">
          <div className="w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
            <Loader2 size={36} className="animate-spin text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Xác thực thiết bị</h2>
          <p className="text-slate-400 text-sm animate-pulse">{message}</p>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Monitor size={14} />
            <span>Đang kiểm tra quyền truy cập...</span>
          </div>
        </div>
      </div>
    );
  }

  // Trạng thái YÊU CẦU NHẬP TOKEN
  if (status === "NEEDS_TOKEN") {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-amber-500/20 p-8 shadow-2xl max-w-md w-full">
          <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={36} className="text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-amber-400 mb-2">Cài đặt Thiết bị</h2>
          <p className="text-slate-400 text-sm mb-6">{message}</p>

          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Ví dụ: kiosk-1234-abcd"
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-amber-500 transition-colors text-center font-mono"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
            />
            <button
              onClick={handleSaveToken}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 rounded-xl transition-colors"
            >
              Kích hoạt thiết bị
            </button>
          </div>
          <p className="text-slate-500 text-xs mt-4">
            Mã thiết bị có thể lấy trong trang Quản lý Kiosk.
          </p>
        </div>
      </div>
    );
  }

  // Trạng thái BỊ TỪ CHỐI
  if (status === "DENIED" || status === "ERROR") {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-red-500/20 p-12 shadow-2xl max-w-md w-full">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={36} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-red-400 mb-2">
            {status === "DENIED" ? "Truy cập bị từ chối" : "Lỗi hệ thống"}
          </h2>
          <p className="text-slate-400 text-sm mb-4">{message}</p>

          {clientIp && (
            <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50 mb-4">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                IP thiết bị hiện tại
              </span>
              <span className="text-sm font-mono text-slate-300 font-bold">{clientIp}</span>
            </div>
          )}

          <p className="text-slate-500 text-xs leading-relaxed mb-6">
            Vui lòng liên hệ quản trị viên để đăng ký thiết bị này
            vào hệ thống chấm công.
          </p>

          <button
            onClick={() => {
              localStorage.removeItem("kiosk_device_token");
              setInputToken("");
              setStatus("NEEDS_TOKEN");
              setMessage("Vui lòng nhập Mã Thiết Bị (Device Token) để kích hoạt Kiosk này.");
            }}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-lg transition-colors border border-slate-600"
          >
            Nhập lại mã Token khác
          </button>

          <button
            onClick={() => window.location.reload()}
            className="mt-4 block mx-auto px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // Trạng thái ĐÃ XÁC THỰC → Hiện FaceScanner
  return (
    <div className="w-full flex-1 flex flex-col min-h-0 justify-center">
      <FaceScanner locationSlug={locationSlug} deviceInfo={deviceInfo} deviceToken={verifiedToken} />
    </div>
  );
}

