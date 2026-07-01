"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MapPin, ChevronRight, Loader2, Building2, Wifi, Search, ChevronDown, Check } from "lucide-react";

interface LocationItem {
  _id: string;
  locationName: string;
  locationSlug: string;
  branchId?: string;
  branchName?: string;
}

export default function KioskSelectPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

  useEffect(() => {
    // Auto-route if already configured
    const token = localStorage.getItem("kiosk_device_token");
    const savedSlug = localStorage.getItem("kiosk_location_slug");

    if (token && savedSlug) {
      router.replace(`/kiosk/${savedSlug}`);
      return;
    }

    const fetchLocations = async () => {
      try {
        const res = await fetch("/api/v1/kiosk/locations");
        const data = await res.json();
        if (res.ok && data.data) {
          setLocations(data.data);
        } else {
          setError(data.message || "Không thể tải danh sách cơ sở.");
        }
      } catch {
        setError("Mất kết nối máy chủ.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLocations();
  }, []);

  const handleSelect = (slug: string) => {
    router.push(`/kiosk/${slug}`);
  };

  const branches = Array.from(new Set(locations.map(loc => loc.branchId).filter(Boolean)));
  const getBranchName = (branchId: string) => {
    if (branchId === "all") return "Tất cả chi nhánh";
    return locations.find(loc => loc.branchId === branchId)?.branchName || branchId;
  };

  const filteredLocations = locations.filter(loc => {
    const matchSearch = loc.locationName.toLowerCase().includes(searchTerm.toLowerCase()) || loc.locationSlug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBranch = selectedBranch === "all" || loc.branchId === selectedBranch;
    return matchSearch && matchBranch;
  });

  return (
    <div className="w-full min-h-screen flex flex-col items-center py-12 px-6 bg-slate-900 relative overflow-x-hidden overflow-y-auto">
      {/* Background Decorators */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-linear-to-b from-blue-900/20 to-transparent pointer-events-none" />
      <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-600/5 blur-[120px] pointer-events-none" />

      {/* Logo */}
      <div className="z-10 mb-10 flex flex-col items-center">
        <div className="bg-slate-950/40 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/5 shadow-2xl flex flex-col items-center">
          <Image
            src="/images/hupuna-xanh.png"
            alt="Hupuna Logo"
            width={160}
            height={50}
            className="mb-1"
            priority
          />
          <div className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-bold opacity-80">
            Enterprise Timekeeping
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="z-10 text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Chọn Cơ Sở Chấm Công</h1>
        <p className="text-slate-400 text-sm">Vui lòng chọn cơ sở để khởi động thiết bị Hupuna Chấm Công</p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="z-10 flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-blue-400" />
          <p className="text-slate-400 text-sm animate-pulse">Đang tải danh sách cơ sở...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="z-10 bg-red-950/40 border border-red-500/30 rounded-2xl p-6 max-w-md text-center">
          <Wifi size={40} className="text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-semibold text-lg mb-1">Lỗi kết nối</p>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      )}

      {/* Location List */}
      {!isLoading && !error && (
        <div className="z-10 w-full max-w-lg flex flex-col items-center">

          {/* Filters */}
          <div className="w-full flex gap-3 mb-4 z-50">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Tìm kiếm cơ sở..."
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl py-2.5 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                style={{ paddingLeft: '40px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {branches.length > 0 && (
              <div className="relative min-w-[160px]">
                <button
                  type="button"
                  onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                  className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl py-2.5 px-4 text-sm text-white hover:border-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all flex items-center justify-between"
                >
                  <span className="truncate pr-2">{getBranchName(selectedBranch)}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isBranchDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isBranchDropdownOpen && (
                  <>
                    {/* Backdrop to close dropdown */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsBranchDropdownOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-full min-w-[180px] bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 py-1">
                      <button
                        onClick={() => {
                          setSelectedBranch("all");
                          setIsBranchDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between
                          ${selectedBranch === "all" ? 'bg-blue-500/10 text-blue-400 font-medium' : 'text-slate-300 hover:bg-slate-700/50'}`}
                      >
                        Tất cả chi nhánh
                        {selectedBranch === "all" && <Check className="w-4 h-4" />}
                      </button>

                      {branches.map(branchId => (
                        <button
                          key={branchId as string}
                          onClick={() => {
                            setSelectedBranch(branchId as string);
                            setIsBranchDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between
                            ${selectedBranch === branchId ? 'bg-blue-500/10 text-blue-400 font-medium' : 'text-slate-300 hover:bg-slate-700/50'}`}
                        >
                          <span className="truncate pr-2">{getBranchName(branchId as string)}</span>
                          {selectedBranch === branchId && <Check className="w-4 h-4 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* List Content */}
          <div className="w-full space-y-3 pb-12">
            {locations.length === 0 ? (
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8 text-center">
                <Building2 size={48} className="text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Chưa có cơ sở nào được thiết lập.</p>
                <p className="text-slate-500 text-xs mt-1">Vui lòng liên hệ quản trị viên để thêm cơ sở.</p>
              </div>
            ) : filteredLocations.length === 0 ? (
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8 text-center">
                <Search size={48} className="text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Không tìm thấy cơ sở nào phù hợp.</p>
              </div>
            ) : (
              filteredLocations.map((loc) => (
                <button
                  key={loc._id}
                  onClick={() => handleSelect(loc.locationSlug)}
                  className="w-full group flex items-center gap-4 p-5 bg-slate-800/40 hover:bg-slate-800/70 
                  border border-slate-700/50 hover:border-blue-500/40 rounded-2xl 
                  transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]
                  hover:-translate-y-0.5 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0
                  group-hover:bg-blue-500/20 group-hover:border-blue-500/40 transition-all">
                    <MapPin size={22} className="text-blue-400" />
                  </div>

                  <div className="flex-1 text-left">
                    <h3 className="text-white font-bold text-base group-hover:text-blue-300 transition-colors">
                      {loc.locationName}
                    </h3>
                    <p className="text-slate-500 text-xs font-mono mt-0.5">
                      /{loc.locationSlug}
                    </p>
                  </div>

                  <ChevronRight
                    size={20}
                    className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all"
                  />
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none">
        <p className="text-slate-600 text-xs">
          Hupuna Chấm Công &bull; Thiết lập thiết bị
        </p>
      </div>
    </div>
  );
}
