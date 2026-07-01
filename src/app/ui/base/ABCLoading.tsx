import React from 'react';
import { ABCLogo } from './abc-logo';export const ABCLoading = () => {
  return (
    <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center bg-transparent opacity-0 animate-[fadeIn_0.5s_ease-in-out_forwards]">
      {/* Brand Icon Pulse */}
      <div className="relative w-16 h-16 mb-5 flex items-center justify-center">
        {/* Background glow */}
        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
        
        {/* Outer spinner */}
        <div className="absolute inset-0 border-4 border-slate-100/60 rounded-full" />
        <div className="absolute inset-0 border-4 border-t-blue-600 border-r-blue-400 rounded-full animate-spin" />
        
        {/* Center Logo */}
        <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center shadow-sm z-10 p-2">
          <ABCLogo className="text-[14px] animate-pulse" />
        </div>
      </div>
      
      {/* Brand Text */}
      <span className="text-[11px] text-blue-600 font-extrabold uppercase tracking-[0.2em] font-mono mb-1.5 animate-pulse">
        Chấm công Timekeeping HQ
      </span>
      <span className="text-xs text-slate-500 font-medium">
        Đang nạp dữ liệu hệ thống...
      </span>
    </div>
  );
};
