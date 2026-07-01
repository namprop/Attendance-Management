"use client";

import React from "react";
import Link from "next/link";
import { FileRecord } from "@/app/data/interface/file";
import ZoomImageViewer from "../base/zoom-img";

interface FileRecordInfoCardProps {
    record: FileRecord;
}

// Helper format ngày (giống component search trước đó)
const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return dateString.split(' ')[0];
};

export const FileRecordInfoCard: React.FC<FileRecordInfoCardProps> = ({ record }) => {
    if (!record) return null;

    // Ưu tiên lấy ảnh từ filedemo (ảnh mẫu)
    const file = record.originalfile?.[0];

    // Xử lý logic link ảnh (Mega.nz hoặc URL thường)
    const imageUrl = file?.url || "";

    return (
        <div className="border border-gray-200 rounded-md bg-white">
            <p className="font-semibold py-2 px-2 border-b border-gray-100 bg-gray-50 text-gray-700">
                Thông tin bản ghi
            </p>

            <div className="p-2">
                <div className="block border border-gray-200 p-2 rounded-md hover:bg-blue-50 transition cursor-pointer group">
                    <Link
                        // Thay đổi đường dẫn tới trang chi tiết bản ghi của bạn
                        href={`/file/${record.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <p className="font-bold text-gray-800 text-sm capitalize group-hover:text-blue-600 transition-colors">
                            {record.id || "Chưa đặt tên"}
                        </p>

                        <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">
                            <span className="font-medium text-gray-700">#{record.productname}</span>
                            {" | "}
                            {record.idcustomer ? `KH: ${record.idcustomer}` : "Khách lẻ"}
                            {" | "}
                            Size: {record.length || 0}x{record.width || 0}x{record.height || 0}
                            {" | "}
                            {formatDate(record.createdAt)}
                            {" | "}
                            <span className="italic">Người tạo: {record.createdBy}</span>
                        </p>
                    </Link>
                </div>

                {/* Phần hiển thị ảnh demo nếu có */}
                {(imageUrl || file?.key) && (
                    <div className="mt-2">
                        {imageUrl ? (
                            <div className="overflow-hidden rounded border border-gray-200">
                                <ZoomImageViewer src={imageUrl} className="w-full h-auto object-contain max-h-[200px]" />
                            </div>
                        ) : (
                            <span className="text-blue-600 text-xs break-all">{file?.key}</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
