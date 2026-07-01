"use client";

import { useLocationStore } from "@/app/store/locationStore";
import { DropdownBase } from "../base/dropdown";
import { useEffect, useMemo, useState } from "react";
import { cookieBase } from "@/app/utils/cookie";
import { User } from "@/app/data/dataUser";
import { usePermissionLoaded } from "@/app/service/permissions/PermissionProvider";
import { BranchTimekeeping, KioskLocation } from "@/app/interface/timekeeping";

export default function LocationSelector() {
    // Để hạn chế break code, ta sử dụng state `location` làm BranchId và `branchId` làm LocationId
    const { location: currentBranchId, setLocation: setCurrentBranchId, branchId: currentLocationId, setBranchId: setCurrentLocationId, hasHydrated } = useLocationStore();
    const permissionsLoaded = usePermissionLoaded();

    const [branches, setBranches] = useState<BranchTimekeeping[]>([]);
    const [locations, setLocations] = useState<KioskLocation[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Fetch Branches (Chi nhánh Timekeeping)
    useEffect(() => {
        if (!hasHydrated) return;
        const fetchBranches = async () => {
            try {
                const response = await fetch("/api/branch-timekeeping");
                const res = await response.json();
                if (res?.data) {
                    setBranches(res.data);
                }
            } catch (error) {
                console.error("Failed to fetch branches", error);
            }
        };
        fetchBranches();
    }, [hasHydrated]);

    // Fetch Locations (Điểm chấm công Kiosk)
    useEffect(() => {
        if (!hasHydrated) return;
        const fetchLocations = async () => {
            try {
                const response = await fetch("/api/v1/kiosk/locations");
                const res = await response.json();
                if (res?.data) {
                    setLocations(res.data);
                }
            } catch (error) {
                console.error("Failed to fetch locations", error);
            } finally {
                setIsLoaded(true);
            }
        };
        fetchLocations();
    }, [hasHydrated]);

    const filteredLocations = useMemo(() => {
        if (!currentBranchId) return [];
        return locations.filter(loc => String(loc.branchId) === String(currentBranchId));
    }, [locations, currentBranchId]);

    // Auto-select logic
    useEffect(() => {
        if (!isLoaded || branches.length === 0) return;
        
        // Nếu chưa chọn Branch, tự động chọn branch đầu tiên
        if (!currentBranchId) {
            const firstBranch = branches[0];
            setCurrentBranchId(String(firstBranch.id || firstBranch._id || ""));
            return;
        }

        // Nếu branch hiện tại không có trong danh sách, reset về branch đầu
        const branchExists = branches.some(b => String(b.id || b._id) === String(currentBranchId));
        if (!branchExists) {
            setCurrentBranchId(String(branches[0].id || branches[0]._id || ""));
            return;
        }
    }, [isLoaded, branches, currentBranchId, setCurrentBranchId]);

    useEffect(() => {
        if (!isLoaded || !currentBranchId) return;

        // Nếu chưa chọn Location, hoặc Location đang chọn không nằm trong Branch này
        if (filteredLocations.length > 0) {
            if (!currentLocationId) {
                setCurrentLocationId(String(filteredLocations[0]._id));
            } else {
                const locExists = filteredLocations.some(l => String(l._id) === String(currentLocationId));
                if (!locExists) {
                    setCurrentLocationId(String(filteredLocations[0]._id));
                }
            }
        } else if (currentLocationId) {
             // Branch này không có location nào, xoá locationId
             setCurrentLocationId("");
        }
    }, [isLoaded, currentBranchId, filteredLocations, currentLocationId, setCurrentLocationId]);

    const branchName = branches.find(b => String(b.id || b._id) === String(currentBranchId))?.name || "Chọn Chi nhánh";
    const locationName = filteredLocations.find(l => String(l._id) === String(currentLocationId))?.locationName || "Chọn Điểm chấm công";

    if (!permissionsLoaded || !hasHydrated) return null;

    return (
        <div className="flex items-center gap-2">
            {/* Dropdown 1: Chi nhánh */}
            {branches.length > 1 ? (
                <DropdownBase
                    classNameBtn="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                    iconBtn={
                        <div className="flex flex-col sm:flex-row items-center gap-0 sm:gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 shrink-0"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                            <span className="sm:hidden text-[9px] font-semibold text-gray-500 leading-tight truncate max-w-[36px]">{branchName}</span>
                            <span className="hidden sm:inline text-sm font-semibold text-gray-700">{branchName}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hidden sm:block text-gray-500"><path d="m6 9 6 6 6-6"/></svg>
                        </div>
                    }
                    classNameContent="w-56 py-2 mt-1 shadow-lg rounded-lg"
                    className="relative"
                >
                    <ul className="flex flex-col max-h-90 overflow-auto">
                        {branches.map((b) => {
                            const id = String(b.id || b._id);
                            return (
                                <li
                                    key={id}
                                    onClick={() => {
                                        if (currentBranchId === id) return;
                                        setCurrentBranchId(id);
                                        setTimeout(() => window.location.reload(), 50);
                                    }}
                                    className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors ${currentBranchId === id ? "font-bold text-blue-600 bg-blue-50" : "text-gray-700"}`}
                                >
                                    {b.name}
                                </li>
                            );
                        })}
                    </ul>
                </DropdownBase>
            ) : (
                <div className="flex flex-col sm:flex-row items-center gap-0 sm:gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 shrink-0"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    <span className="sm:hidden text-[9px] font-semibold text-gray-500 leading-tight truncate max-w-[36px]">{branchName}</span>
                    <span className="hidden sm:inline text-sm font-semibold text-gray-700">{branchName}</span>
                </div>
            )}

            {/* Dropdown 2: Điểm chấm công */}
            <DropdownBase
                classNameBtn="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                iconBtn={
                    <div className="flex flex-col sm:flex-row items-center gap-0 sm:gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 shrink-0"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span className="sm:hidden text-[9px] font-semibold text-gray-500 leading-tight truncate max-w-[36px]">{locationName}</span>
                        <span className="hidden sm:inline text-sm font-semibold text-gray-700">{locationName}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hidden sm:block text-gray-500"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                }
                classNameContent="w-56 py-2 mt-1 shadow-lg rounded-lg"
                className="relative"
            >
                <ul className="flex flex-col max-h-90 overflow-auto">
                    {filteredLocations.map((loc) => (
                        <li
                            key={String(loc._id)}
                            onClick={() => {
                                if (currentLocationId === String(loc._id)) return;
                                setCurrentLocationId(String(loc._id));
                                setTimeout(() => window.location.reload(), 50);
                            }}
                            className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors ${currentLocationId === String(loc._id) ? "font-bold text-blue-600 bg-blue-50" : "text-gray-700"}`}
                        >
                            {loc.locationName}
                        </li>
                    ))}
                    {filteredLocations.length === 0 && (
                        <li className="px-4 py-2 text-sm text-gray-500">Chưa có điểm chấm công</li>
                    )}
                </ul>
            </DropdownBase>
        </div>
    );
}
