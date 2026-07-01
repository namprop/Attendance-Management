"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Column, TableBase } from "@/app/ui/base/table";
import { TitleBase } from "@/app/ui/base/tittle";
import { ModalBase } from "@/app/ui/base/modal";
import { Supplier } from "@/app/data/dataSupplier";
import { cookieBase } from "@/app/utils/cookie";
import { User } from "@/app/data/dataUser";
import dayjs from "dayjs";
import { message } from "antd";
import Image from "next/image";
import IconEdit from "@public/icons/edit-item.svg";
import IconDelete from "@public/icons/delete-item.svg";

import { SupplierForm } from "./form-supplier";

const EditModalWrapper = ({
  record,
  onConfirm
}: {
  record: Supplier;
  onConfirm: (updatedData: Supplier) => void;
}) => {
  const [formData, setFormData] = useState<Supplier>(record);

  // Reset form nếu record thay đổi
  useEffect(() => {
    setFormData(record);
  }, [record]);

  return (
    <ModalBase
      onOk={() => onConfirm(formData)}
      title="Cập nhật nhà cung cấp"
      contentBtn={
        <div className="cursor-pointer">
          <Image src={IconEdit} alt="Edit" width={18} height={18} />
        </div>
      }
      btnClassName="text-white !p-1 hover:bg-gray-200 flex-none"
      okText="Cập nhật"
      className="w-[1000px]!"
    >
      <SupplierForm
        initialData={formData}
        onChange={(updated) => setFormData(updated)}
      />
    </ModalBase>
  );
};

// --- MAIN COMPONENT ---
export default function SupplierListClient() {
  const [data, setData] = useState<Supplier[]>([]);
  const [userMap, setUserMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const currentUserInfo = cookieBase.get<User>("info_user");

  const [newSupplier, setNewSupplier] = useState<Supplier>({
    id: "", name: "", phone: "", email: "", address: "", taxcode: 0,
    company: "", status: "Đang hoạt động", creator: "", note: "",
    createDate: dayjs().toISOString(),
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  // --- API: Lấy Users ---
  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionName: "User", action: "read", skip: 0, limit: 1000, filters: {}
        }),
      });
      const result = await res.json();
      if (res.ok) {
        const users = (result.data || result.items || []) as User[];
        const map: Record<number, string> = {};
        users.forEach((u: User) => {
          if (u.id) map[Number(u.id)] = (u.fullName as string) || u.name || "Unknown";
        });
        setUserMap(map);
      }
    } catch (error) {
      console.error("Lỗi user:", error);
    }
  };

  // --- API: Lấy Suppliers ---
  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/supplier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionName: "Supplier",
          action: "read",
          skip: (page - 1) * pageSize,
          limit: pageSize,
          filters: {},
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setData(Array.isArray(result.data) ? result.data : (result.items || []));
        setTotal(result.total || result.count || 0);
      } else {
        message.error("Lỗi tải dữ liệu");
      }
    } catch (error) {
      console.error("Lỗi fetch:", error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // --- API: Thêm mới ---
  const handleAddSupplier = async () => {
    if (!newSupplier.name) {
      message.warning("Vui lòng nhập tên");
      return;
    }
    const creatorId = currentUserInfo?.id ? Number(currentUserInfo.id) : 0;
    const payloadData = { ...newSupplier, creator: creatorId };

    try {
      const res = await fetch("/api/supplier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionName: "Supplier", action: "create", data: payloadData,
        }),
      });
      if (res.ok) {
        message.success("Thêm thành công!");
        setNewSupplier({
          id: "", name: "", phone: "", email: "", address: "", taxcode: 0,
          company: "", status: "Đang hoạt động", creator: "", note: "",
          createDate: dayjs().toISOString(),
        });
        fetchSuppliers();
      } else {
        message.error("Thêm thất bại");
      }
    } catch (e) {
      message.error("Lỗi hệ thống");
    }
  };

  // --- API: Cập nhật (Sửa) ---
  const handleUpdateSupplier = async (updatedRecord: Supplier) => {
    try {
      const res = await fetch("/api/supplier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionName: "Supplier",
          action: "update",
          field: "id",
          value: updatedRecord.id,
          data: updatedRecord,
        }),
      });

      if (res.ok) {
        message.success("Cập nhật thành công!");
        fetchSuppliers(); // Load lại bảng
      } else {
        message.error("Cập nhật thất bại");
      }
    } catch (error) {
      console.error("Lỗi update:", error);
      message.error("Lỗi kết nối");
    }
  };

  // --- API: Xóa ---
  const handleDelete = async (id: string | number) => {
    try {
      const res = await fetch("/api/supplier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionName: "Supplier", action: "delete", id: id,
        }),
      });
      if (res.ok) {
        message.success("Xóa thành công!");
        if (data.length === 1 && page > 1) setPage(page - 1);
        else fetchSuppliers();
      } else {
        message.error("Xóa thất bại");
      }
    } catch (e) {
      message.error("Lỗi kết nối");
    }
  };

  const columns: Column<Supplier>[] = [
    { title: "Mã nhà cung cấp", dataIndex: "id", width: 150 },
    { title: "Tên nhà cung cấp", dataIndex: "name", width: 250 },
    { title: "Số điện thoại", dataIndex: "phone" },
    { title: "Email", dataIndex: "email" },
    { title: "Địa chỉ", dataIndex: "address" },
    { title: "Mã số thuế", dataIndex: "taxcode" },
    {
      title: "Người tạo",
      dataIndex: "creator",
      render: (value: unknown) => {
        const userId = Number(value);
        return userMap[userId] || (value ? `User #${value}` : "Hệ thống");
      }
    },
    {
      title: "Ngày tạo",
      dataIndex: "createDate",
      render: (val: unknown) => val ? dayjs(val as string).format("DD/MM/YYYY") : ""
    },
    { title: "Ghi chú", dataIndex: "note" },
    {
      title: "Thao tác",
      render: (_, record: Supplier) => (
        <div className="flex items-center gap-2">
          <EditModalWrapper
            record={record}
            onConfirm={handleUpdateSupplier}
          />

          <ModalBase
            contentBtn={
              <div className="cursor-pointer">
                <Image src={IconDelete} alt="delete" width={18} height={18} />
              </div>
            }
            btnClassName="text-white !p-1 hover:bg-gray-200 flex-none"
            onOk={() => handleDelete(record.id || "")}
            okText="Xóa"
            title="Xác nhận"
            okType="danger"
          >
            Bạn có chắc muốn xóa nhà cung cấp <b>{record.name}</b>?
          </ModalBase>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <TitleBase>Quản lý nhà cung cấp</TitleBase>

        <ModalBase
          btnClassName="text-white !p-2 bg-green-500 hover:bg-green-600"
          onOk={handleAddSupplier}
          okText="Thêm nhà cung cấp"
          title="Thêm nhà cung cấp"
          className="w-[1000px]!"
          contentBtn={<div>+ Thêm Nhà cung cấp</div>}
        >
          <SupplierForm
            initialData={newSupplier}
            onChange={(updated) => setNewSupplier(updated)}
            isCreate={true}
          />
        </ModalBase>
      </div>

      <div className="bg-white px-5 py-9 rounded shadow-lg">
        <TableBase
          columns={columns}
          data={data}
          loading={loading}
          rowKey="id"
          pagination={{
            current: page, pageSize, total, onPageChange: setPage,
          }}
        />
      </div>
    </div>
  );
}
