'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from 'antd';

export default function Unauthorized() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="relative mb-6">
        {/* Glow effect background */}
        <div className="absolute -inset-1 rounded-full bg-linear-to-r from-red-500 to-orange-500 opacity-20 blur-lg animate-pulse" />
        
        {/* Icon Container */}
        <div className="relative flex items-center justify-center w-20 h-20 bg-red-50 rounded-full border border-red-100 shadow-sm text-red-500">
          <ShieldAlert className="w-10 h-10" />
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight mb-2">
        Không có Quyền Truy Cập
      </h1>
      
      <p className="max-w-md text-slate-500 text-sm sm:text-base mb-8 leading-relaxed">
        Rất tiếc! Tài khoản của bạn không được phân quyền để truy cập vào phân hệ này. Vui lòng liên hệ với quản trị viên hệ thống để biết thêm chi tiết.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        <Button
          type="default"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => router.back()}
          className="flex items-center justify-center font-semibold h-10 px-5 rounded-lg border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-800 shadow-xs transition-all duration-200"
        >
          Quay lại trang trước
        </Button>
        
        <Button
          type="primary"
          icon={<Home className="w-4 h-4" />}
          onClick={() => router.push('/dashboard')}
          className="flex items-center justify-center font-semibold h-10 px-5 rounded-lg bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-none shadow-xs transition-all duration-200"
        >
          Về bảng điều khiển
        </Button>
      </div>
    </div>
  );
}
