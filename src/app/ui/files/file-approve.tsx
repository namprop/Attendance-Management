"use client";

import React, { useState, useEffect } from "react";
import { Column, TableBase } from "@/app/ui/base/table";
import Image from "next/image";
import IconSearch from "@public/icons/search-icon.svg";
import { ButtonBase } from "@/app/ui/base/button";
import BaseFilter from "@/app/ui/base/filter";
import DateSinglePicker from "@/app/ui/base/date-picker";
import { SearchBase } from "@/app/ui/search/search";
import { useRouter } from "next/navigation";
import dayjs, { Dayjs } from "dayjs";
import { QRBase } from "../base/qr";
import { getDomain } from "@/app/utils/getDomain";
import { FileRecord } from "@/app/data/interface/file";
import { cookieBase } from "@/app/utils/cookie";
import { User } from "@/app/data/dataUser";
interface FileManageResponse {
    data?: FileRecord[];
    error?: string;
}
export default function FileManagerApproveDone() {
    const router = useRouter();
    const [data, setData] = useState<FileRecord[]>([]);
    const [filteredData, setFilteredData] = useState<FileRecord[]>([]);
    const [valueSearch, setValueSearch] = useState("");
    const [filters, setFilters] = useState<{ createdAt?: Dayjs | null }>({});
    const [active, setActive] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [loading, setLoading] = useState(true);
    const user_info = cookieBase.get<User>("info_user");

    const loadData = async (page: number, pageSize: number): Promise<void> => {
        try {
            const role = Number(user_info?.role);
            const isAdmin = role === 0 || role === 1;

            const baseFilters: FileRecord = {
                isApproveDone: true,
                ...(isAdmin ? {} : { createdBy: user_info?.name }),
            };

            const res = await fetch("/api/files/filemanage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "read",
                    collectionName: "FileManage",
                    limit: pageSize,
                    sort: { createdAt: -1 },
                    filters: baseFilters,
                }),
            });

            const result: FileManageResponse = await res.json();

            if (!res.ok || result.error) {
                console.error("Lỗi tải dữ liệu:", result.error);
                return;
            }

            const records = result.data ?? [];
            setData(records);
            setFilteredData(records);
            setLoading(false);
        } catch (err) {
            console.error("Lỗi gọi API:", err);
        }
    };


    useEffect(() => {
        loadData(page, pageSize);
    }, [page, pageSize]);

    const handleApplyFilters = (newFilters: { createdAt?: Dayjs | null }) => {
        setActive(true);
        const filtered = data.filter((item) => {
            if (newFilters.createdAt && item.createdAt) {
                const createdDate = dayjs(item.createdAt, "DD/MM/YYYY HH:mm").startOf("day");
                const filterDate = dayjs(newFilters.createdAt).startOf("day");
                return createdDate.isSame(filterDate);
            }
            return true;
        });
        setFilteredData(filtered);
    };

    const handleClearFilter = () => {
        setFilters({ createdAt: null });
        setActive(false);
        setFilteredData(data);
    };

    const onRangeChangeDate = (date: Dayjs | null) => {
        setFilters((prev) => ({ ...prev, createdAt: date }));
    };

    const onSearch = (keyword: string) => {
        const lower = keyword.toLowerCase().trim();
        if (!lower) {
            setFilteredData(data);
            return;
        }
        const result = data.filter((item) => {
            const textMatch =
                item.id?.toLowerCase().includes(lower) ||
                item.idoder?.toLowerCase().includes(lower) ||
                item.name?.toLowerCase().includes(lower) ||
                item.status?.toLowerCase().includes(lower) ||
                item.length?.toString().toLowerCase().includes(lower) ||
                item.width?.toString().toLowerCase().includes(lower) ||
                item.height?.toString().toLowerCase().includes(lower) ||
                item.area?.toString().toLowerCase().includes(lower);

            return textMatch;
        });

        setFilteredData(result);
    };

    const columns: Column<FileRecord>[] = [
        {
            title: "Mã QR bản ghi",
            dataIndex: "idrecord",
            render: (_, record) => (
                <div className="flex justify-center items-center">
                    <QRBase value={`${getDomain()}/file/${record.id}`} size={100} />
                </div>
            ),
            className: "flex justify-center items-center w-full",
        },
        { title: "Mã bản ghi", dataIndex: "id", className: "text-center" },
        { title: "Mã khách hàng", dataIndex: "idcustomer" },
        { title: "Tên khách hàng", dataIndex: "name", width: 150 },
        { title: "Khu vực", dataIndex: "area" },
        { title: "Mã sản phẩm", dataIndex: "idoder" },
        { title: "Loại sản phẩm", dataIndex: "ProType" },
        { title: "Kích thước sản phẩm", dataIndex: "size" },
        { title: "Phân loại khách hàng", dataIndex: "typecustomer" },
        { title: "Người tạo", dataIndex: "createdBy" },
        { title: "Ghi chú", dataIndex: "note" },
    ];

    return (
        <div className="w-full">
            <div className="bg-white p-4 rounded shadow-lg overflow-x-auto mt-10">
                <div className="flex flex-wrap justify-end items-center mb-4 gap-2">
                    <BaseFilter onApply={() => handleApplyFilters(filters)} onClear={handleClearFilter} hasActive={active}>
                        <div className="flex justify-between items-center gap-2">
                            <label className="text-gray-500 basis-1/3">Ngày tạo:</label>
                            <div className="basis-2/3">
                                <DateSinglePicker values={filters?.createdAt} onDateChange={onRangeChangeDate} />
                            </div>
                        </div>
                    </BaseFilter>

                    <div className="flex items-center gap-2">
                        <SearchBase
                            value={valueSearch}
                            onChange={setValueSearch}
                            onEnter={onSearch}
                            placeholder="Tìm theo tên, mã bản ghi, khu vực..."
                        />
                        <ButtonBase className="!p-2 hover:bg-gray-100 rounded-full" onClick={() => onSearch(valueSearch)}>
                            <Image src={IconSearch} alt="" width={20} height={20} />
                        </ButtonBase>
                    </div>
                </div>

                <TableBase
                    columns={columns}
                    data={filteredData}
                    loading={loading}
                    rowKey="id"
                    pagination={{
                        current: page,
                        pageSize: pageSize,
                        total: filteredData.length,
                        onPageChange: (page: number, pageSize: number) => {
                            setPage(page);
                            setPageSize(pageSize);
                            setLoading(true);
                        },
                    }}
                    onRow={(record) => ({
                        onClick: () => router.push(`/file/${record.id}`),
                    })}
                />
            </div>
        </div>
    );
}
