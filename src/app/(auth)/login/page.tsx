"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { cookieBase } from "@/app/utils/cookie";
import { ABCLogo } from "@/app/ui/base/abc-logo";
import { AlertCircle, Lock, User, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username || !password) {
      setError("Vui lòng nhập đầy đủ tài khoản và mật khẩu");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/local-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Đăng nhập thất bại");
      }

      // Set cookies
      cookieBase.set("info_user", data.data.info_user);
      document.cookie = `accessToken=${data.data.accessToken}; path=/`;

      // Redirect to dashboard
      window.location.href = "/dashboard";
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fastLogin = (usr: string, pass: string) => {
    setUsername(usr);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-[40vh] bg-blue-600 rounded-b-[40px] pointer-events-none" />
      
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl z-10 p-8 m-4">
        <div className="flex justify-center mb-8">
          <ABCLogo className="text-5xl" />
        </div>

        <h2 className="text-2xl font-bold text-slate-800 text-center mb-2">Đăng nhập</h2>
        <p className="text-slate-500 text-center mb-8 text-sm">
          Phiên bản thử nghiệm (Local Auth)
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-red-600 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="mt-0.5">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tài khoản</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="h-5 w-5" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Nhập username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-5 w-5" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Nhập mật khẩu"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 mt-6"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            Đăng nhập
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-500 text-center mb-3">Tài khoản kiểm thử nhanh:</p>
          <div className="flex gap-2">
            <button
              onClick={() => fastLogin('admin', 'password')}
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
            >
              Admin
            </button>
            <button
              onClick={() => fastLogin('nhanvien', 'password')}
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
            >
              Nhân viên
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
