import React from "react";

interface PhoneSpoofModalProps {
  onRetry: () => void;
  onClose: () => void;
}

export default function PhoneSpoofModal({ onRetry, onClose }: PhoneSpoofModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900/95 p-6 rounded-xl shadow-2xl border border-orange-500/30 max-w-sm w-full text-center">
        <h2 className="text-xl font-bold text-amber-400 mb-3">
          Phát hiện ảnh giả
        </h2>
        <p className="text-slate-300 mb-4">
          Hệ thống nhận diện thấy hình ảnh có vẻ được chụp từ màn hình hoặc điện thoại.
          Vui lòng quay lại sử dụng camera thực tế để tiếp tục.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-500 transition"
          >
            Thử lại
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
