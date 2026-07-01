"use client";
import React, { useState, useMemo } from "react";
import { TableBase, Column } from "@/app/ui/base/table";
import { InfoOrderData } from "@/app/data/interface/transaction";
import dayjs from "dayjs";
import { TitleBase } from "@/app/ui/base/tittle";

import { calculateInvoiceDue, calculateInvoiceFinalDue, calculateInvoicePaid, calculatePrestige, useDashboardData } from "./hooks/useDashboardData";
import { DashboardStats } from "./components/DashboardStats";
import { CustomerCharts } from "./components/CustomerCharts";
import { DashboardFilters, FilterState } from "./components/DashboardFilters";
import { CustomerRevenueTable } from "./components/CustomerRevenueTable";
import { TopDebtorTable } from "./components/TopDebtorTable";

export default function Page() {
  const [activeTab, setActiveTab] = useState<"invoice" | "customer">("customer");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const [invoicePagination, setInvoicePagination] = useState({ current: 1, pageSize: 10 });
  const [customerPagination, setCustomerPagination] = useState({ current: 1, pageSize: 10 });

  const [filters, setFilters] = useState<FilterState>({
    search: "",
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

  const { invoices, customerRevenues, customerTotal, loading, refetch } = useDashboardData(
    filters.dateRange,
    filters.dateField,
    customerPagination,
    {
      search: filters.search,
      customerId: filters.customerId,
      group: filters.group,
    }
  );

  const filteredCustomers = useMemo(() => {
    const normalize = (v?: string) => String(v || "").trim().toLowerCase();

    const result = customerRevenues
      .map((customer) => {
        let matchedInvoices = Array.isArray(customer.invoices) ? [...customer.invoices] : [];

        if (filters.typedelivery.length > 0) {
          matchedInvoices = matchedInvoices.filter((inv) =>
            filters.typedelivery.includes(String(inv.typedelivery || "").trim())
          );
        }

        if (filters.statusInvoice.length > 0) {
          matchedInvoices = matchedInvoices.filter((inv) =>
            filters.statusInvoice.includes(String(inv.statusInvoice || "").trim())
          );
        }

        if (filters.isHanoiSaigon) {
          matchedInvoices = matchedInvoices.filter((inv) => inv.isHanoiSaigon === true);
        }

        if (filters.customertype.length > 0) {
          matchedInvoices = matchedInvoices.filter((inv) =>
            filters.customertype.includes(String(inv.typeCustormer || ""))
          );
        }

        if (filters.saleschanel.length > 0) {
          matchedInvoices = matchedInvoices.filter((inv) =>
            filters.saleschanel.includes(String(inv.saleschanel || "").trim())
          );
        }

        if (filters.dealerLevel.length > 0) {
          matchedInvoices = matchedInvoices.filter((inv) =>
            filters.dealerLevel.includes(String(inv.dealerLevel || ""))
          );
        }

        if (filters.seller.length > 0) {
          matchedInvoices = matchedInvoices.filter((inv) =>
            filters.seller.includes(String(inv.seller || "").trim())
          );
        }

        const totalRevenue = matchedInvoices.reduce(
          (sum, inv) => sum + calculateInvoiceFinalDue(inv),
          0
        );

        const totalPaid = matchedInvoices.reduce((sum, inv) => sum + calculateInvoicePaid(inv), 0);

        // Tiền còn lại: tổng thô giống bảng invoice, nhưng không cộng các đơn trả thừa (âm)
        const totalDebt = matchedInvoices.reduce((sum, inv) => {
          const debt = calculateInvoiceFinalDue(inv) - calculateInvoicePaid(inv);
          return sum + (debt > 0 ? debt : 0);
        }, 0);

        let firstTransactionTs: number | null = null;
        matchedInvoices.forEach((inv) => {
          const dateStr =
            (inv.orderDateTime || inv.createDate || inv.createdAt) as string | undefined;
          if (!dateStr) return;
          const ts = dayjs(dateStr).valueOf();
          if (Number.isFinite(ts)) {
            firstTransactionTs =
              firstTransactionTs === null ? ts : Math.min(firstTransactionTs, ts);
          }
        });

        const daysInDebt =
          totalDebt > 0 && firstTransactionTs !== null
            ? dayjs().diff(dayjs(firstTransactionTs), "day")
            : 0;

        const debtRatio = totalRevenue > 0 ? (totalDebt / totalRevenue) * 100 : 0;

        return {
          ...customer,
          invoices: matchedInvoices,
          totalRevenue,
          totalPaid,
          totalDebt,
          orderCount: matchedInvoices.length,
          prestige: calculatePrestige(totalDebt, totalRevenue),
          firstTransactionDate:
            firstTransactionTs !== null ? dayjs(firstTransactionTs).toISOString() : undefined,
          daysInDebt,
          debtRatio,
        };
      })
      .filter((customer) => {
        if (customer.invoices.length === 0) return false;

        if (filters.customerId && customer.id !== filters.customerId) return false;

        if (filters.search) {
          const q = normalize(filters.search);
          const name = normalize(customer.name);
          const phone = normalize(customer.phone);
          const id = normalize(customer.id);

          if (!name.includes(q) && !phone.includes(q) && !id.includes(q)) {
            return false;
          }
        }

        if (filters.prestige.length > 0 && !filters.prestige.includes(customer.prestige.label)) {
          return false;
        }

        if (filters.group.length > 0 && !filters.group.includes(String(customer.group || ""))) {
          return false;
        }

        return true;
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return result;
  }, [customerRevenues, filters]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (filters.dealerLevel.length > 0 && !filters.dealerLevel.includes(String(inv.dealerLevel || ""))) return false;
      if (filters.saleschanel.length > 0 && !filters.saleschanel.includes(String(inv.saleschanel || "").trim())) return false;
      if (filters.customertype.length > 0 && !filters.customertype.includes(String(inv.typeCustormer || ""))) return false;
      if (filters.seller.length > 0 && !filters.seller.includes(String(inv.seller || "").trim())) return false;
      if (filters.typedelivery.length > 0 && !filters.typedelivery.includes(String(inv.typedelivery || "").trim())) return false;
      if (filters.statusInvoice.length > 0 && !filters.statusInvoice.includes(String(inv.statusInvoice || "").trim())) return false;
      if (filters.isHanoiSaigon && inv.isHanoiSaigon !== true) return false;
      return true;
    });
  }, [
    invoices,
    filters.dealerLevel,
    filters.saleschanel,
    filters.customertype,
    filters.seller,
    filters.typedelivery,
    filters.statusInvoice,
    filters.isHanoiSaigon,
  ]);

  const invoiceColumns: Column<InfoOrderData>[] = [
    {
      title: "Mã hóa đơn",
      dataIndex: "id",
      width: 150,
    },
    {
      title: "Khách hàng",
      dataIndex: "customerName",
    },
    {
      title: "Người bán",
      dataIndex: "seller",
      width: 160,
      render: (val) => String(val || "---"),
    },
    {
      title: "Ngày thực tế",
      dataIndex: "dateInvoice",
      width: 150,
      render: (val) => val ? dayjs(val as string).format("DD/MM/YYYY HH:mm") : "",
    },
    {
      title: "Ngày tạo",
      dataIndex: "orderDateTime",
      width: 150,
      render: (val) => val ? dayjs(val as string).format("DD/MM/YYYY HH:mm") : "",
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalProduct",
      width: 150,
      render: (_, record) => calculateInvoiceDue(record).toLocaleString("vi-VN") + " đ",
      className: "text-right font-semibold",
    },
    {
      title: "Trạng thái",
      dataIndex: "statusInvoice",
      width: 150,
      render: (val) => {
        let color = "text-gray-600";
        if (val === "Đã thanh toán" || val === "Hoàn thành") color = "text-green-600";
        if (val === "Hủy") color = "text-red-600";
        if (val === "Chờ xử lý") color = "text-orange-600";
        return <span className={color}>{val as string}</span>;
      }
    },
    {
      title: "Người tạo",
      dataIndex: "createdByName",
      width: 150,
    },
  ];

  const totalInvoiceRevenue = filteredInvoices.reduce((sum, item) => sum + calculateInvoiceDue(item), 0);

  return (
    <div className="p-3 md:p-4 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6">
        <TitleBase>Quản lý doanh thu bán hàng</TitleBase>
        <div className="flex w-full md:w-auto items-stretch gap-2">
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="md:hidden inline-flex items-center justify-center min-h-11 px-4 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition shadow-sm"
          >
            Bộ lọc
          </button>
          <button
            onClick={refetch}
            className="inline-flex flex-1 md:flex-none items-center justify-center min-h-11 px-4 md:px-5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow"
          >
            {loading ? "Đang tải..." : "Làm mới dữ liệu"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap border-b border-gray-300 mb-6">
        <button
          className={`py-2 px-4 md:px-6 font-semibold uppercase text-xs md:text-sm border-b-2 transition ${activeTab === "customer" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          onClick={() => setActiveTab("customer")}
        >
          Doanh Thu & Uy Tín Khách Hàng
        </button>
        <button
          className={`py-2 px-4 md:px-6 font-semibold uppercase text-xs md:text-sm border-b-2 transition ${activeTab === "invoice" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          onClick={() => setActiveTab("invoice")}
        >
          Hóa Đơn Tổng Hợp
        </button>
      </div>

      {activeTab === "customer" && (
        <div className="animate-fade-in">
          <div className="hidden md:block">
            <DashboardFilters filters={filters} setFilters={setFilters} customers={customerRevenues} />
          </div>

          <div className={`fixed inset-0 z-50 md:hidden transition ${isMobileFilterOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
            <div
              className={`absolute inset-0 bg-black/40 transition-opacity ${isMobileFilterOpen ? "opacity-100" : "opacity-0"}`}
              onClick={() => setIsMobileFilterOpen(false)}
            />
            <div className={`absolute left-0 top-0 h-full w-[90%] max-w-[380px] bg-white shadow-2xl overflow-y-auto transition-transform duration-300 ${isMobileFilterOpen ? "translate-x-0" : "-translate-x-full"}`}>
              <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-800">Bộ lọc</h3>
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700"
                >
                  Đóng
                </button>
              </div>
              <div className="px-3 pb-4">
                <DashboardFilters filters={filters} setFilters={setFilters} customers={customerRevenues} />
              </div>
            </div>
          </div>

          <DashboardStats invoices={filteredInvoices} />

          <CustomerCharts data={filteredCustomers} />

          <CustomerRevenueTable
            data={filteredCustomers}
            loading={loading}
            pagination={{
              current: customerPagination.current,
              pageSize: customerPagination.pageSize,
              total: customerTotal,
            }}
            onPageChange={(page, pageSize) =>
              setCustomerPagination({ current: page, pageSize })
            }
          />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-5">
            <TopDebtorTable data={filteredCustomers} />
          </div>
        </div>
      )}

      {activeTab === "invoice" && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6 mb-6">
            <div className="bg-white p-4 md:p-6 rounded-lg shadow border border-gray-100">
              <h3 className="text-gray-500 text-sm font-medium uppercase">Tổng số hóa đơn</h3>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mt-2 break-words">{filteredInvoices.length}</p>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-lg shadow border border-gray-100">
              <h3 className="text-gray-500 text-sm font-medium uppercase">Doanh thu tạm tính</h3>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600 mt-2 break-words">{totalInvoiceRevenue.toLocaleString("vi-VN")} đ</p>
            </div>
            <div className="col-span-2 xl:col-span-1 bg-white p-4 md:p-6 rounded-lg shadow border border-gray-100 flex items-center justify-center text-gray-400 text-sm md:text-base">
              Dữ liệu từ Hóa đơn
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-700">Danh sách hóa đơn gần đây</h3>
            </div>
            <TableBase
              columns={invoiceColumns}
              data={filteredInvoices}
              rowKey="id"
              loading={loading}
              pagination={{
                current: invoicePagination.current,
                pageSize: invoicePagination.pageSize,
                total: filteredInvoices.length,
                onPageChange: (page, pageSize) =>
                  setInvoicePagination({ current: page, pageSize }),
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

