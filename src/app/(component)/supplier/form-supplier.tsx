"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { InputBase } from "@/app/ui/base/input";
import { SelectBase } from "@/app/ui/base/select";
import { InputAreaBase } from "@/app/ui/base/textarea";
import { Supplier } from "@/app/data/dataSupplier";
import dayjs, { Dayjs } from "dayjs";
import { DatePicker } from "antd";

// --- INTERFACES BỔ SUNG ---
interface RawAddressOption {
  _id?: string | { $oid: string };
  id?: string | number;
  code?: string | number;
  value?: string | number;
  label?: string;
  name?: string;
  region?: string;
  region_code?: string | number;
  parent_code?: string | number;
  province_code?: string | number;
  mien?: string;
  area?: string;
}

const statusOptions = [
  { value: "Đang hoạt động", label: "Đang hoạt động" },
  { value: "Ngừng hoạt động", label: "Ngừng hoạt động" },
];

interface SupplierFormProps {
  initialData: Supplier;
  onChange: (data: Supplier) => void;
  isCreate?: boolean;
}

// --- HELPER ---
const getOptionValue = (opt: RawAddressOption): string => {
  if (opt.code !== undefined && opt.code !== null) return String(opt.code);
  if (opt.value !== undefined && opt.value !== null) return String(opt.value);
  if (opt.id !== undefined && opt.id !== null) return String(opt.id);
  if (opt._id) {
    return typeof opt._id === 'string' ? opt._id : opt._id.$oid;
  }
  return "";
};

export const SupplierForm = ({ initialData, onChange, isCreate = false }: SupplierFormProps) => {
  const [formData, setFormData] = useState<Supplier>(initialData);

  // --- STATE CHO ĐỊA CHÍNH ---
  const [rawRegions, setRawRegions] = useState<RawAddressOption[]>([]);
  const [rawProvinces, setRawProvinces] = useState<RawAddressOption[]>([]);
  const [rawWards, setRawWards] = useState<RawAddressOption[]>([]);

  useEffect(() => {
    setFormData({
      ...initialData,
      createDate: initialData.createDate || dayjs().toISOString(),
    });
  }, [initialData]);

  // --- API: LẤY DANH SÁCH ĐỊA CHÍNH ---
  const getListOptions = useCallback(async () => {
    try {
      const res = await fetch("/api/customer/option-list", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const result = await res.json();

      if (result.data) {
        const regions = Array.isArray(result.data.optionRegions?.data) ? result.data.optionRegions.data : [];
        const provinces = Array.isArray(result.data.optionProvinces?.data) ? result.data.optionProvinces.data : [];
        const wards = Array.isArray(result.data.optionWards?.data) ? result.data.optionWards.data : [];

        setRawRegions(regions);
        setRawProvinces(provinces);
        setRawWards(wards);
      }
    } catch (error) {
      console.error("Lỗi lấy option list:", error);
    }
  }, []);

  useEffect(() => {
    getListOptions();
  }, [getListOptions]);

  // --- LOGIC LỌC DATA (Derived State) ---

  // 1. KHU VỰC
  const derivedRegions = useMemo(() => {
    if (!Array.isArray(rawRegions)) return [];
    return rawRegions.map((r) => ({
      label: r.label || r.name || "",
      value: getOptionValue(r)
    }));
  }, [rawRegions]);

  // 2. TỈNH / THÀNH (Lọc theo formData.area)
  const derivedProvinces = useMemo(() => {
    if (!Array.isArray(rawProvinces) || rawProvinces.length === 0) return [];
    if (!formData.area) return []; // Chưa chọn khu vực thì chưa hiện tỉnh

    return rawProvinces
      .filter((p) => {
        const regionField = p.region || p.region_code || p.parent_code || p.mien || p.area;
        return String(regionField) === String(formData.area);
      })
      .map((p) => ({
        label: p.name || p.label || "",
        value: getOptionValue(p)
      }));
  }, [rawProvinces, formData.area]);

  // 3. PHƯỜNG / XÃ (Lọc theo formData.province)
  const derivedWards = useMemo(() => {
    if (!formData.province) return [];
    if (!Array.isArray(rawWards)) return [];

    return rawWards
      .filter((w) => {
        const parentId = w.province_code || w.parent_code;
        return String(parentId) === String(formData.province);
      })
      .map((w) => ({
        label: w.name || w.label || "",
        value: getOptionValue(w)
      }));
  }, [rawWards, formData.province]);


  // --- HANDLERS ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);
    onChange(updated);
  };

  const handleSelectChange = (field: keyof Supplier, value: string | number | undefined) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onChange(updated);
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const updated = { ...formData, note: value };
    setFormData(updated);
    onChange(updated);
  };

  return (
    <div className="bg-white p-6 space-y-6">
      <h2 className="text-xl font-bold text-blue-600 border-b pb-2">
        Thông tin nhà cung cấp
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="text-sm font-semibold text-gray-700">Tên nhà cung cấp</label>
          <InputBase name="name" placeholder="Tên nhà cung cấp" value={formData.name} onChange={handleInputChange} />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">Số điện thoại</label>
          <InputBase name="phone" placeholder="Số điện thoại" value={formData.phone} onChange={handleInputChange} />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">Email</label>
          <InputBase name="email" placeholder="Email" value={formData.email} onChange={handleInputChange} />
        </div>

        {/* --- KHỐI CHỌN ĐỊA CHÍNH (KHU VỰC / TỈNH / XÃ) --- */}
        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-3 rounded border border-gray-100">

          {/* 1. KHU VỰC */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Khu vực</label>
            <SelectBase
              allowClear
              showSearch
              placeholder="Chọn khu vực"
              value={formData.area || undefined}
              options={derivedRegions}
              onChange={(v) => {
                // Reset Tỉnh và Xã khi đổi Khu vực
                const updated = { ...formData, area: v, province: undefined, ward: undefined };
                setFormData(updated);
                onChange(updated);
              }}
              className="h-10 w-full p-1!"
            />
          </div>

          {/* 2. TỈNH / THÀNH */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Tỉnh/Thành</label>
            <SelectBase
              allowClear
              showSearch
              placeholder={formData.area ? "Chọn tỉnh/thành" : "Chọn khu vực trước"}
              value={formData.province as string || undefined}
              options={derivedProvinces}
              onChange={(v) => {
                // Reset Xã khi đổi Tỉnh
                const updated = { ...formData, province: v, ward: undefined };
                setFormData(updated);
                onChange(updated);
              }}
              disabled={!formData.area}
              className="h-10 w-full p-1!"
            />
          </div>

          {/* 3. PHƯỜNG / XÃ */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Phường/Xã</label>
            <SelectBase
              allowClear
              showSearch
              placeholder={formData.province ? "Chọn phường/xã" : "Chọn tỉnh trước"}
              value={formData.ward as string || undefined}
              options={derivedWards}
              onChange={(v) => handleSelectChange("ward", v)}
              disabled={!formData.province}
              className="h-10 w-full p-1!"
            />
          </div>

        </div>
        {/* ------------------------------------------------ */}

        <div className="md:col-span-3">
          <label className="text-sm font-semibold text-gray-700">Địa chỉ chi tiết (Số nhà, đường...)</label>
          <InputBase name="address" placeholder="Địa chỉ chi tiết" value={formData.address} onChange={handleInputChange} />
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700">Công ty</label>
          <InputBase name="company" placeholder="Công ty" value={formData.company} onChange={handleInputChange} />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">Mã số thuế</label>
          <InputBase name="taxcode" placeholder="Mã số thuế" value={formData.taxcode} onChange={handleInputChange} />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">Trạng thái</label>
          <SelectBase
            placeholder="Chọn trạng thái"
            options={statusOptions}
            value={formData.status}
            onChange={(value) => handleSelectChange("status", value as string)}
            className=" w-full p-1!"
          />
        </div>

        <div className="md:col-span-3">
          <label className="text-sm font-semibold text-gray-700">Ghi chú</label>
          <InputAreaBase
            placeholder="Nhập ghi chú..."
            value={formData.note}
            onChange={handleNoteChange}
            className="border border-gray-300 rounded p-2"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">Ngày tạo</label>
          <DatePicker
            format="DD/MM/YYYY"
            className="w-full h-[33px] px-3 py-2 border border-gray-300 rounded"
            value={formData.createDate ? dayjs(formData.createDate) : null}
            onChange={(date: Dayjs | null) =>
              setFormData((prev) => ({
                ...prev,
                createDate: date?.toISOString() || "",
              }))
            }
            disabled={isCreate}
          />
        </div>
      </div>
    </div>
  );
};
