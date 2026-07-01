"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { FileRecord } from "@/app/data/interface/file";

// Định nghĩa kiểu dữ liệu cho Khách hàng (bạn có thể chuyển vào file interface riêng)
interface Customer {
    id: string;
    name: string; // Hoặc field tên khách hàng trong DB của bạn (ví dụ: fullname, companyName...)
}

type Props = {
    onSelectRecord?: (record: FileRecord) => void;
    className?: string;
    classNameContent?: string;
};

// Hàm xử lý ngày tháng dạng chuỗi "28/11/2025 10:42:03"
const formatDisplayDate = (dateString?: string) => {
    if (!dateString) return "";
    // Nếu chuỗi đã là dạng dd/mm/yyyy hh:mm:ss, ta chỉ cần lấy phần đầu
    // Tách bằng khoảng trắng để lấy "28/11/2025"
    return dateString.split(' ')[0];
};

export const FileRecordSearch: React.FC<Props> = ({
    onSelectRecord,
    className,
    classNameContent
}) => {
    const [search, setSearch] = useState("");
    const [dataRecords, setDataRecords] = useState<FileRecord[]>([]);
    
    // State lưu danh sách khách hàng dạng Map để tra cứu nhanh: { "id_khach": "Ten Khach" }
    const [customerMap, setCustomerMap] = useState<Record<string, string>>({});
    
    const [showDropdown, setShowDropdown] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // 1. Fetch danh sách khách hàng khi component mount
    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const response = await fetch("/api/customer", {
                    method: "POST",
                    body: JSON.stringify({
                        action: "read", // Giả định API customer cũng dùng action read
                        // Thêm các tham số khác nếu cần để lấy all hoặc list rút gọn
                    }),
                });
                const data = await response.json();
                
                // Chuyển mảng khách hàng thành Object/Map để tra cứu theo ID cho nhanh
                if (data.data && Array.isArray(data.data)) {
                    const map: Record<string, string> = {};
                    data.data.forEach((cus: Customer) => {
                        // Lưu ý: kiểm tra đúng field tên khách hàng (vd: cus.name, cus.fullName...)
                        map[cus.id] = cus.name; 
                    });
                    setCustomerMap(map);
                }
            } catch (error) {
                console.error("Lỗi lấy danh sách khách hàng:", error);
            }
        };

        fetchCustomers();
    }, []);

    // 2. Fetch danh sách File
    const fetchRecordList = async (term: string) => {
        try {
            const response = await fetch("/api/files/filemanage", {
                method: "POST",
                body: JSON.stringify({
                    action: "read",
                    search: term,
                    skip: 0,
                    limit: 10,
                }),
            });
            const data = await response.json();
            setDataRecords(data.data || []);
        } catch (error) {
            console.error("Error fetching records:", error);
            setDataRecords([]);
        }
    };

    // Xử lý click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filter client-side
    const filteredRecords = dataRecords.filter((record) => {
        const productName = record.productname || "";
        const id = record.id || "";
        const searchTerm = search.toLowerCase();
        return productName.toLowerCase().includes(searchTerm) || id.toLowerCase().includes(searchTerm);
    });

    return (
        <div ref={containerRef} className={`w-full max-w-md ${className}`}>
            <div className="flex min-h-[40px] max-h-[40px] w-full rounded-full border-1 border-gray-300 py-0.5 px-1.5 bg-white">
                <Image src={"/icons/search-icon.svg"} alt="search" width={18} height={18} />
                <input
                    value={search}
                    onChange={(e) => {
                        const val = e.target.value;
                        setSearch(val);
                        fetchRecordList(val);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    type="search"
                    placeholder="Tìm kiếm bản ghi (Tên, Mã)..."
                    className="w-full px-2 outline-none text-sm"
                />
            </div>
            {showDropdown && (
                <ul className={`absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-[80vh] overflow-y-auto ${classNameContent}`}>
                    {filteredRecords.length > 0 ? (
                        filteredRecords.map((record) => (
                            <li
                                key={record.id}
                                className="px-4 py-2 hover:bg-blue-100 cursor-pointer border-b border-gray-100 last:border-0"
                                onMouseDown={() => {
                                    setSearch(record.productname || "");
                                    setShowDropdown(false);
                                    if (onSelectRecord) {
                                        onSelectRecord(record);
                                    }
                                }}
                            >
                                <div className="flex flex-col gap-1">
                                    {/* Dòng 1: ID Bản ghi - Tên khách hàng (Tra cứu từ Map) */}
                                    <p className="font-semibold text-gray-900 text-sm">
                                        #{record.id} <span className="font-normal text-gray-600">- {customerMap[record.idcustomer || ""] || record.idcustomer || "Khách lạ"}</span>
                                    </p>

                                    {/* Dòng 2: Tên File | Ngày tạo | Người tạo */}
                                    <p className="text-[12px] text-gray-500 flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-blue-600">{record.productname}</span>
                                        <span>|</span>
                                        {/* Sử dụng hàm formatDisplayDate mới */}
                                        <span>{formatDisplayDate(record.createdAt)}</span>
                                        <span>|</span>
                                        <span className="italic">
                                            {record.createdBy || "N/A"}
                                        </span>
                                    </p>
                                </div>
                            </li>
                        ))
                    ) : (
                        <li className="px-4 py-3 text-sm text-gray-500 text-center">
                            {search ? "Không tìm thấy bản ghi nào" : "Nhập để tìm kiếm..."}
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
};
