"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FileRecord } from "@/app/data/interface/file";

// Định nghĩa props, nó sẽ nhận customerId
interface FileListProps {
  customerId: string;
}

export const FileListByCustomer: React.FC<FileListProps> = ({ customerId }) => {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Chỉ tải dữ liệu nếu customerId tồn tại
    if (!customerId) {
      setLoading(false);
      return;
    }

    const getFilesByCustomer = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/files/filemanage", {
          method: "POST",
          body: JSON.stringify({
            action: "read",
            skip: 0,
            limit: 0, // Lấy tất cả
            filters: {
              idcustomer: customerId,
            },
            sort: { field: "_id", order: "desc" },
          }),
        });
        const result = await res.json();
        if (result.data) {
          setFiles(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch files:", error);
      } finally {
        setLoading(false);
      }
    };

    getFilesByCustomer();
  }, [customerId]); // Chạy lại khi customerId thay đổi

  // --- Render ---
  if (loading) {
    return <div>Đang tải danh sách file...</div>;
  }

  if (files.length === 0) {
    return <div className='p-4 bg-white rounded-md shadow'>Chưa có file nào được tạo cho khách hàng này.</div>;
  }
  return (
    <div className="space-y-4">
      {files.map((file) => (
        <Link
          key={file.id}
          href={`/file/${file.id}`} // Link đến trang chi tiết file
          className="block! rounded-lg! shadow-md! bg-white! hover:bg-blue-50! transition-shadow! duration-150! focus:outline-none! focus:ring-1! focus:ring-offset-1! focus:ring-indigo-500!"
          aria-label={`Mở file ${file.name || file.id}`}
          target="_blank"
        >
          <div className="flex items-center justify-between p-4">
            <div className="flex-1 min-w-0">
              {/* Hàng trên: ID và Tên file */}
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-600">Mã bản ghi:</span>
                <div className="text-sm font-semibold text-blue-700">{file.id}</div>
                <span className="font-semibold text-gray-600">Tên sản phẩm:</span>
                <div className="truncate text-md font-semibold text-gray-900">
                  {file.productname || "(Chưa có tên)"}
                </div>
              </div>

              {/* Hàng dưới: Thông tin thêm */}
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-gray-600">Loại SP:</span>
                  <span>{file.ProType ?? "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-gray-600">Kích thước:</span>
                  <span>{file.size ?? "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-gray-600">Ngày tạo:</span>
                  <span>{file.createdAt ?? "-"}</span>
                </div>
              </div>
            </div>

            {/* Mũi tên */}
            <div className="ml-4 shrink-0">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};
