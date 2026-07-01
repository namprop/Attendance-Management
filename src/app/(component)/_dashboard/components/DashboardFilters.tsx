import React, { useEffect, useState } from "react";
import { Input, AutoComplete, Select } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { CustomerRevenue } from "../hooks/useDashboardData";
import {
  dealerLevel as dealerLevelOptions,
  typeCustormer as typeCustomerOptions,
  typedelivery as typeDeliveryOptions,
} from "@/app/data/interface/transaction";
import { DateRangePicker } from "@/app/ui/base/date-range-picker";

const { Search } = Input;

export interface FilterState {
  search: string;
  customerId?: string;
  prestige: string[];
  group: string[];
  customertype: string[];
  saleschanel: string[];
  dealerLevel: string[];
  seller: string[];
  typedelivery: string[];
  statusInvoice: string[];
  isHanoiSaigon: boolean;
  dateField: "orderDateTime" | "dateInvoice";
  dateRange: [Dayjs | null, Dayjs | null] | null;
}

interface DashboardFiltersProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  customers?: CustomerRevenue[];
}

export function DashboardFilters({
  filters,
  setFilters,
  customers = [],
}: DashboardFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [options, setOptions] = useState<
    { key: string; value: string; label: React.ReactNode }[]
  >([]);
  const [salesChannelOptions, setSalesChannelOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [sellerOptions, setSellerOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [sellerSearch, setSellerSearch] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchSalesChannels = async () => {
      try {
        const res = await fetch("/api/sales-channel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "read",
            skip: 0,
            limit: 0,
            sort: { field: "name", order: "asc" },
          }),
        });

        if (!res.ok) return;

        const raw = await res.json();
        const data = Array.isArray(raw) ? raw : raw?.data || [];
        if (!mounted || !Array.isArray(data)) return;

        const mapped = data
          .map((item) => ({
            label: String(item?.name || "").trim(),
            value: String(item?.name || "").trim(),
          }))
          .filter((item) => item.value);

        const unique = Array.from(
          new Map(mapped.map((item) => [item.value, item])).values()
        );

        setSalesChannelOptions(unique);
      } catch {
        setSalesChannelOptions([]);
      }
    };

    fetchSalesChannels();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchSellers = async () => {
      try {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "read",
            search: sellerSearch,
            skip: 0,
            limit: 10,
          }),
        });

        if (!res.ok) return;

        const raw = await res.json();
        const data = Array.isArray(raw) ? raw : raw?.data || [];
        if (!mounted || !Array.isArray(data)) return;

        const mapped = data
          .map((item) => ({
            label: String(item?.name || "").trim(),
            value: String(item?.name || "").trim(),
          }))
          .filter((item) => item.value);

        const unique = Array.from(
          new Map(mapped.map((item) => [item.value, item])).values()
        );

        setSellerOptions(unique);
      } catch {
        setSellerOptions([]);
      }
    };

    fetchSellers();
    return () => {
      mounted = false;
    };
  }, [sellerSearch]);

  const handleMultiChange = (
    name:
      | "prestige"
      | "group"
      | "customertype"
      | "saleschanel"
      | "dealerLevel"
      | "seller"
      | "typedelivery"
      | "statusInvoice",
    values: string[]
  ) => {
    setFilters((prev) => ({ ...prev, [name]: values }));
  };

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value, customerId: undefined }));
  };

  const handleAutoCompleteSearch = (value: string) => {
    setLocalSearch(value);

    if (!value) {
      setOptions([]);
      return;
    }

    const q = value.toLowerCase();
    const matched = customers
      .filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q)) ||
          (c.id && c.id.toLowerCase().includes(q))
      )
      .slice(0, 10);

    setOptions(
      matched.map((c) => ({
        key: c.id || "",
        value: c.name || c.id || "",
        label: (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-semibold text-gray-700">
              {c.name || "Khách hàng N/A"}
            </span>
            <span className="shrink-0 text-xs text-gray-400">
              {c.phone || c.id}
            </span>
          </div>
        ),
      }))
    );
  };

  const handleSelect = (
    value: string,
    option: { key: string; value: string; label: React.ReactNode }
  ) => {
    setLocalSearch(value);
    setFilters((prev) => ({ ...prev, search: value, customerId: option.key }));
  };

  const handleReset = () => {
    setFilters({
      search: "",
      customerId: undefined,
      prestige: [],
      group: [],
      customertype: [],
      saleschanel: [],
      dealerLevel: [],
      seller: [],
      typedelivery: [],
      statusInvoice: [],
      isHanoiSaigon: false,
      dateField: "dateInvoice",
      dateRange: [dayjs().startOf("day"), dayjs().endOf("day")],
    });
    setLocalSearch("");
    setSellerSearch("");
  };

   const handleDateChange = (dates: [Dayjs, Dayjs] | null) => {
    if (dates) {
      setFilters((prev) => ({ ...prev, dateRange: [dates[0], dates[1]] }));
    } else {
      setFilters((prev) => ({ ...prev, dateRange: null }));
    }
  };


  const labelClass = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500";
  const selectClass = "w-full [&_.ant-select-selector]:min-h-[42px] [&_.ant-select-selector]:rounded-lg";
  const cardItemClass = "min-w-0";

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-gray-800">Bộ lọc doanh thu bán hàng</h3>
          <p className="text-xs text-gray-500">
            Lọc nhanh theo thời gian, khách hàng, kênh bán, người bán
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="h-[40px] rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
        >
          Reset
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
          <div className="xl:col-span-3 md:col-span-1">
            <label className={labelClass}>Lọc theo ngày</label>
            <Select
              value={filters.dateField}
              onChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  dateField: value as "orderDateTime" | "dateInvoice",
                }))
              }
              options={[
                { label: "Ngày thực tế", value: "dateInvoice" },
                { label: "Ngày tạo", value: "orderDateTime" },
              ]}
              className={selectClass}
            />
          </div>

          <div className="xl:col-span-3 md:col-span-1">
            <label className={labelClass}>Khoảng thời gian</label>
            <DateRangePicker
              value={
                filters.dateRange && filters.dateRange[0] && filters.dateRange[1]
                  ? [filters.dateRange[0], filters.dateRange[1]]
                  : undefined
              }
              onRangeChanges={handleDateChange}
              className="h-[42px] rounded-lg"
              allowClear
            />
          </div>

          <div className="xl:col-span-6 md:col-span-2">
            <label className={labelClass}>Tìm kiếm khách hàng</label>
            <AutoComplete
              options={options}
              onSelect={handleSelect}
              onSearch={handleAutoCompleteSearch}
              value={localSearch}
              onChange={setLocalSearch}
              className="w-full border-0!"
            >
              <Search
                placeholder="Tên KH, số điện thoại, mã khách hàng..."
                onSearch={handleSearch}
                enterButton="Tìm kiếm"
                size="large"
                className="w-full [&_.ant-input]:h-10 [&_.ant-input]:rounded-l-lg [&_.ant-btn]:h-10.5 [&_.ant-btn]:rounded-r-lg"
              />
            </AutoComplete>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8">
          <div className={cardItemClass}>
            <label className={labelClass}>Độ uy tín</label>
            <Select
              mode="multiple"
              allowClear
              placeholder="Tất cả"
              value={filters.prestige}
              onChange={(values) => handleMultiChange("prestige", values)}
              options={[
                { label: "VIP", value: "VIP" },
                { label: "Tốt", value: "Tốt" },
                { label: "Trung bình", value: "Trung bình" },
                { label: "Rủi ro", value: "Rủi ro" },
                { label: "Chưa có hóa đơn", value: "Chưa có hóa đơn" },
              ]}
              className={selectClass}
            />
          </div>

          <div className={cardItemClass}>
            <label className={labelClass}>Nhóm khách hàng</label>
            <Select
              mode="multiple"
              allowClear
              placeholder="Tất cả nhóm"
              value={filters.group}
              onChange={(values) => handleMultiChange("group", values)}
              options={[
                { label: "Khách Sản Xuất", value: "Khách Sản Xuất" },
                { label: "Khách Mua Hàng Có Sẵn", value: "Khách Mua Hàng Có Sẵn" },
                { label: "Đại lý - Nhà bán hàng", value: "Đại lý - Nhà bán hàng" },
              ]}
              className={selectClass}
            />
          </div>

          <div className={cardItemClass}>
            <label className={labelClass}>Khách cũ/khách mới theo HĐ</label>
            <Select
              mode="multiple"
              allowClear
              placeholder="Tất cả"
              value={filters.customertype}
              onChange={(values) => handleMultiChange("customertype", values)}
              options={typeCustomerOptions.map((opt) => ({
                label: opt.label,
                value: String(opt.value),
              }))}
              className={selectClass}
            />
          </div>

          <div className={cardItemClass}>
            <label className={labelClass}>Kênh bán</label>
            <Select
              mode="multiple"
              allowClear
              placeholder="Tất cả"
              value={filters.saleschanel}
              onChange={(values) => handleMultiChange("saleschanel", values)}
              options={salesChannelOptions}
              className={selectClass}
            />
          </div>

          <div className={cardItemClass}>
            <label className={labelClass}>Cấp đại lý</label>
            <Select
              mode="multiple"
              allowClear
              placeholder="Tất cả cấp"
              value={filters.dealerLevel}
              onChange={(values) => handleMultiChange("dealerLevel", values)}
              options={dealerLevelOptions.map((opt) => ({
                label: opt.label,
                value: String(opt.value),
              }))}
              className={selectClass}
            />
          </div>

          <div className={cardItemClass}>
            <label className={labelClass}>Phân phối giao vận</label>
            <Select
              mode="multiple"
              allowClear
              placeholder="Tất cả"
              value={filters.typedelivery}
              onChange={(values) => handleMultiChange("typedelivery", values)}
              options={typeDeliveryOptions.map((opt) => ({
                label: opt.label,
                value: String(opt.value),
              }))}
              className={selectClass}
            />
          </div>
          <div className={cardItemClass}>
            <label className={labelClass}>Trạng thái đơn hàng</label>
            <Select
              mode="multiple"
              allowClear
              placeholder="Tất cả"
              value={filters.statusInvoice}
              onChange={(values) => handleMultiChange("statusInvoice", values)}
              options={[
                { label: "Đã hoàn thành", value: "Đã hoàn thành" },
                { label: "Đang xử lý", value: "Đang xử lý" },
                { label: "Đã tự động đối soát", value: "Đã tự động đối soát" },
              ]}
              className={selectClass}
            />
          </div>
          <div className={cardItemClass}>
            <label className={labelClass}>Tuyến vận chuyển HN-SG</label>
            <label className="flex h-[42px] cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <input
                type="checkbox"
                className="h-4 w-4 accent-red-600"
                checked={filters.isHanoiSaigon}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    isHanoiSaigon: e.target.checked,
                  }))
                }
              />
              Đơn HÀ NỘI - SÀI GÒN
            </label>
          </div>
          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-2">
            <label className={labelClass}>Người bán</label>
            <Select
              mode="multiple"
              showSearch
              allowClear
              placeholder="Tìm và chọn người bán"
              value={filters.seller}
              onChange={(values) => handleMultiChange("seller", values)}
              onSearch={setSellerSearch}
              filterOption={false}
              options={sellerOptions}
              className={selectClass}
              notFoundContent="Không có dữ liệu"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
