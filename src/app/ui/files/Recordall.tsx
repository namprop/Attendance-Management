"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FileRecord } from "@/app/data/interface/file";
import { WithPermission } from "@/app/service/permissions/permission-gate";
import { cookieBase } from "@/app/utils/cookie";
import { User } from "@/app/data/dataUser";

export default function InfoDisplay() {
    const pathname = usePathname();
    const [data, setData] = useState<FileRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const user_info = cookieBase.get<User>("info_user");
    const recordId = pathname.split("/").pop();

    useEffect(() => {
        if (!recordId) return;

        const fetchData = async () => {
            try {
                const res = await fetch("/api/files/filemanage", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "read",
                        collectionName: "FileManage",
                        field: "id",
                        value: recordId,
                    }),
                });

                const result = await res.json();
                if (result.data && result.data.length > 0) {
                    setData(result.data[0]);
                }
            } catch (error) {
                console.error("Lỗi khi tải dữ liệu:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [recordId]);

    if (loading) return <div className="text-center py-8">Đang tải dữ liệu...</div>;
    if (!data)
        return (
            <div className="text-center py-8 text-red-500">
                Không tìm thấy dữ liệu cho bản ghi <b>{recordId}</b>
            </div>
        );

    const customerInfo = [
        { label: "Mã khách hàng:", value: data.idcustomer },
        { label: "Tên khách hàng:", value: data.name },
        { label: "Khu vực:", value: data.area },
        { label: "Phân loại KH:", value: data.typecustomer },
        { label: "Loại sản xuất:", value: data.productiontype },
        { label: "Ghi chú:", value: data.note },
    ];

    const productInfo = [
        { label: "Mã sản phẩm:", value: data.idoder },
        { label: "Loại sản phẩm:", value: data.ProType },
        { label: "Tên sản phẩm:", value: data.productname },
        { label: "Kích thước (cm):", value: data.size },
        { label: "Trạng thái sản phẩm:", value: data.status },
        { label: "Links đơn hàng:", value: data.orderLink },
        ...(data.ProType === "HỘP SÓNG THƯỜNG" || data.ProType === "HỘP OFFSET"
            ? [{ label: "Loại hộp:", value: data.productId }]
            : []),
    ];

    interface TableRowData {
        label: string;
        value: string | number | null | undefined;
    }

    interface TableSectionProps {
        title: string;
        data: TableRowData[];
    }

    const TableSection = ({ title, data }: TableSectionProps) => (
        <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
            <div className="px-4 py-3 bg-blue-50 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-200 text-[15px]">
                    <thead className="bg-blue-50">
                        <tr>
                            <th className="border border-gray-200 p-2 w-[50px] text-center font-semibold text-gray-700">
                                STT
                            </th>
                            <th className="border border-gray-200 p-2 w-[180px] text-left font-semibold text-gray-700">
                                Thông tin
                            </th>
                            <th className="border border-gray-200 p-2 text-left font-semibold text-gray-700">
                                Nội dung
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, idx) => (
                            <tr key={idx}>
                                <td className="border border-gray-200 p-2 text-center text-gray-800">
                                    {idx + 1}
                                </td>
                                <td className="border border-gray-200 p-2 text-gray-700 font-medium">
                                    {row.label}
                                </td>
                                <td className="border border-gray-200 p-2 text-gray-900">
                                    {row.label === "Links đơn hàng:" && row.value ? (
                                        <a
                                            href={String(row.value)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                            {row.value}
                                        </a>
                                    ) : (
                                        row.value ?? "---"
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );


    return (
        <div className="p-6 bg-white rounded-xl shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <WithPermission roleId={Number(user_info?.role)} permission="Sales">
                    <TableSection title="Thông tin khách hàng" data={customerInfo} />
                </WithPermission>

                <TableSection title="Thông tin sản phẩm" data={productInfo} />
            </div>
        </div>
    );
}
