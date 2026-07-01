"use client";

import React, { useState, useEffect } from "react";
import { Column, TableBase } from "@/app/ui/base/table";
import Image from "next/image";
import IconDelete from "@public/icons/delete-item.svg";
import IconSearch from "@public/icons/search-icon.svg";
import { ModalBase } from "@/app/ui/base/modal";
import { ButtonBase } from "@/app/ui/base/button";
import BaseFilter from "@/app/ui/base/filter";
import DateSinglePicker from "@/app/ui/base/date-picker";
import { SearchBase } from "@/app/ui/search/search";
import { useRouter } from "next/navigation";
import dayjs, { Dayjs } from "dayjs";
import { QRBase } from "../base/qr";
import { getDomain } from "@/app/utils/getDomain";
import { FileRecord } from "@/app/data/interface/file";
import { WithPermission } from "@/app/service/permissions/permission-gate";
import { cookieBase } from "@/app/utils/cookie";
import { User } from "@/app/data/dataUser";
import { areaOptions, fakeTypeProductsFile } from "@/app/data/dataTypeProducfile";
import { SelectBase } from "../base/select";

export default function FileManagerTable() {
    const router = useRouter();
    const [data, setData] = useState<FileRecord[]>([]);
    const [valueSearch, setValueSearch] = useState("");
    const [filters, setFilters] = useState<{
        createdAt?: Dayjs | null;
        ProType?: string;   // loại sản phẩm
        area?: string;      // khu vực
    }>({});
    const [active, setActive] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [totalData, setTotalData] = useState(0);
    const [loading, setLoading] = useState(true);
    const user_info = cookieBase.get<User>("info_user");

    type FilterParams = {
        createdAt?: Dayjs | null;
        ProType?: string;   // loại sản phẩm
        area?: string;      // khu vực
    };
    interface FileManageResponse {
        data?: FileRecord[];
        total?: number;
        error?: string;
    }

    const loadData = async (
        page: number,
        pageSize: number,
        search: string = "",
        filter?: FilterParams
    ): Promise<void> => {
        try {
            const role = Number(user_info?.role);
            const isAdmin = role === 0 || role === 1 || role === 6 || role === 8 || role === 9;

            const queryFilters: Record<string, unknown> = {
                isFix: true,
                complete: true,
            };

            // --- Phân quyền ---
            if (!isAdmin) {
                if (role === 41) {
                    queryFilters.$or = [
                        { createdByRole: "41" },
                        { createdByRole: "4" },
                    ];
                } else {
                    queryFilters.createdBy = user_info?.name;
                }
            }

            // --- Lọc theo ngày ---
            if (filter?.createdAt) {
                const selected = dayjs(filter.createdAt);
                queryFilters.createdAt = {
                    $gte: selected.startOf("day").format("DD/MM/YYYY HH:mm:ss"),
                    $lte: selected.endOf("day").format("DD/MM/YYYY HH:mm:ss"),
                };
            }
            // --- Lọc theo loại sản phẩm ---
            if (filter?.ProType && filter.ProType !== "") {
                const typeObj = fakeTypeProductsFile.find((item) => item.value === filter.ProType);
                const labelToQuery = typeObj ? typeObj.label : filter.ProType;
                queryFilters.ProType = labelToQuery;
            }

            // --- Lọc theo khu vực ---
            if (filter?.area && filter.area !== "") {
                const areaObj = areaOptions.find((item) => item.value === filter.area);
                const labelToQuery = areaObj ? areaObj.label : filter.area;
                queryFilters.area = labelToQuery;
            }

            // --- Tìm kiếm ---
            const searchConditions: Record<string, unknown>[] = [];
            if (search.trim() !== "") {
                const regex = { $regex: search.trim(), $options: "i" };
                searchConditions.push(
                    { id: regex },
                    { idcustomer: regex },
                    { name: regex },
                    { area: regex },
                    { idoder: regex },
                    { ProType: regex },
                    { size: regex },
                    { typecustomer: regex }
                );
            }

            if (searchConditions.length > 0) {
                queryFilters.$or = queryFilters.$or
                    ? [...(queryFilters.$or as Record<string, unknown>[]), ...searchConditions]
                    : searchConditions;
            }

            const res = await fetch("/api/files/filemanage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "read",
                    collectionName: "FileManage",
                    skip: (page - 1) * pageSize,
                    limit: pageSize,
                    filters: queryFilters,
                    sort: { field: "_id", order: "desc" },
                }),
            });

            const result: FileManageResponse = await res.json();

            if (!res.ok || result.error) {
                console.error("Lỗi tải dữ liệu:", result.error);
                setLoading(false);
                return;
            }

            setData(result.data || []);
            setTotalData(result.total || 0);
            setLoading(false);
        } catch (err) {
            console.error("Lỗi gọi API:", err);
            setLoading(false);
        }
    };


    useEffect(() => {
        loadData(page, pageSize, valueSearch, filters);
    }, [page, pageSize]);

    const handleApplyFilters = (newFilters: FilterParams) => {
        setActive(true);
        setFilters(newFilters);
        setPage(1);
        loadData(1, pageSize, valueSearch, newFilters);
        setLoading(true);
    };

    const handleClearFilter = () => {
        setFilters({ createdAt: null, ProType: "", area: "" });
        setActive(false);
        setPage(1);
        loadData(1, pageSize, valueSearch, {});
        setLoading(true);

    };

    const onRangeChangeDate = (date: Dayjs | null) => {
        setFilters((prev) => ({ ...prev, createdAt: date }));
    };

    const onSearch = (keyword: string) => {
        setValueSearch(keyword);
        setPage(1);
        loadData(1, pageSize, keyword, filters);
        setLoading(true);

    };
    const userRole = Number(user_info?.role);


    const baseColumns: Column<FileRecord>[] = [
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
        { title: "Mã sản phẩm", dataIndex: "idoder" },
        { title: "Loại sản phẩm", dataIndex: "ProType" },
        {
            title: "Kích thước (cm)",
            dataIndex: "size",
            render: (value: unknown, record: FileRecord) => {
                const size = (value as string) || "";
                if (!size) return "";

                let parts = size.split("x");

                // Nếu TEM NHÃN → bỏ chiều cao
                if (record.ProType === "TEM NHÃN") {
                    parts = parts.slice(0, 2);
                }

                // Bỏ phần rỗng hoặc 0
                parts = parts.filter((p) => p && p !== "0");

                return parts.join("x");
            },
        },
        { title: "Người tạo", dataIndex: "createdBy" },
        { title: "Ghi chú", dataIndex: "note" },
        {
            title: "Thao tác",
            render: (_, record) => (
                <div className="flex flex-col justify-center items-center gap-2">
                    <WithPermission roleId={userRole} permission="delete_record">
                        <ModalBase
                            contentBtn={<Image src={IconDelete} alt="Delete" width={18} height={18} />}
                            btnClassName="text-white !p-1 hover:bg-gray-200"
                            onOk={async () => {
                                try {
                                    const res = await fetch("/api/files/filemanage", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            action: "delete",
                                            collectionName: "FileManage",
                                            field: "id",
                                            value: record.id,
                                        }),
                                    });
                                    const result = await res.json();
                                    if (result.success) {
                                        alert(`Đã xóa bản ghi ${record.id} thành công!`);
                                        loadData(page, pageSize, valueSearch, filters);
                                    } else {
                                        alert("Xóa thất bại!");
                                    }
                                } catch (error) {
                                    console.error("Lỗi xóa bản ghi:", error);
                                }
                            }}
                            okText="Xóa"
                            title="Xác nhận"
                            okType="danger"
                        >
                            Bạn có chắc muốn xóa bản ghi <b>{record.idcustomer}</b>?
                        </ModalBase>
                    </WithPermission>
                </div>
            ),
        },
    ];

    // 🧩 Các cột chỉ dành cho Sales
    const salesColumns: Column<FileRecord>[] = [
        { title: "Mã khách hàng", dataIndex: "idcustomer" },
        { title: "Tên khách hàng", dataIndex: "name", width: 150 },
        { title: "Khu vực", dataIndex: "area" },
        { title: "Phân loại khách hàng", dataIndex: "typecustomer" },
    ];

    // 🔸 Hàm check quyền đơn giản
    const checkPermission = (roleId: number, permission: string) => {
        const rolePermissions: Record<number, string[]> = {
            0: ["Admin", "Sales", "delete_record"],
            1: ["Sales"],
            31: ["Sales"],
            3: ["Sales"],
            6: ["Sales"],

        };

        return rolePermissions[roleId]?.includes(permission) ?? false;
    };
    let columns = [...baseColumns];

    if (checkPermission(userRole, "Sales")) {
        columns = [
            baseColumns[0],          // Mã QR bản ghi
            baseColumns[1],          // Mã bản ghi
            ...salesColumns,         // Các cột sales
            ...baseColumns.slice(2), // Các cột còn lại
        ];
    }



    return (
        <div className="w-full">
            <div className="bg-white p-4 rounded shadow-lg ">
                <div className="flex flex-wrap justify-between items-center mb-4 ">
                    {/* --- Nhóm 2 select lọc bên trái --- */}
                    <div className="flex items-center gap-3">
                        {/* Loại sản phẩm */}
                        <div className="flex items-center gap-2 w-70">
                            <label className="text-gray-500 whitespace-nowrap">Loại sản phẩm:</label>
                            <SelectBase
                                isSort={false}
                                className="h-8.75! w-45! border border-gray-200 rounded"
                                value={filters.ProType || ""}
                                options={[
                                    { label: "Tất cả", value: "" },
                                    ...fakeTypeProductsFile,
                                ]}
                                onChange={(value) => {
                                    setFilters((prev) => ({ ...prev, ProType: value }));
                                    const newFilters = { ...filters, ProType: value };
                                    handleApplyFilters(newFilters);
                                }}
                            />
                        </div>

                        {/* Khu vực */}
                        <div className="flex items-center gap-2 w-40">
                            <label className="text-gray-500 whitespace-nowrap">Khu vực:</label>
                            <SelectBase
                                isSort={false}
                                className="h-8.75! w-45 border border-gray-200 rounded"
                                value={filters.area || ""}
                                options={[
                                    { label: "Tất cả", value: "" },
                                    ...areaOptions,
                                ]}
                                onChange={(value) => {
                                    setFilters((prev) => ({ ...prev, area: value }));
                                    const newFilters = { ...filters, area: value };
                                    handleApplyFilters(newFilters);
                                }}
                            />
                        </div>
                    </div>

                    {/* --- Nhóm bộ lọc khác + tìm kiếm bên phải --- */}
                    <div className="flex flex-wrap items-center gap-2">
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
                                placeholder="Tìm theo tên, mã bản ghi, khu vực, ..."
                            />
                            <ButtonBase className="p-2! hover:bg-gray-100 rounded-full" onClick={() => onSearch(valueSearch)}>
                                <Image src={IconSearch} alt="" width={20} height={20} />
                            </ButtonBase>
                        </div>
                    </div>
                </div>
                <TableBase
                    columns={columns}
                    data={data}
                    loading={loading}
                    rowKey="id"
                    pagination={{
                        current: page,
                        pageSize: pageSize,
                        total: totalData,
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
