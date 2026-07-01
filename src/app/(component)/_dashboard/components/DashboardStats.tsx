import React from "react";
import { InfoOrderData } from "@/app/data/interface/transaction";
import { calculateInvoiceDue, calculateInvoiceFinalDue, calculateInvoicePaid } from "../hooks/useDashboardData";

interface DashboardStatsProps {
  invoices: InfoOrderData[];
}

export function DashboardStats({ invoices }: DashboardStatsProps) {
  const formatMoney = (value: number) => `${Math.ceil(value).toLocaleString("vi-VN")} đ`;

  // Tổng doanh số = tiền hàng - giảm giá (không tính phí, VAT)
  const totalRevenue = invoices.reduce((sum, inv) => sum + calculateInvoiceDue(inv), 0);

  const totalPaid = invoices.reduce((sum, inv) => sum + calculateInvoicePaid(inv), 0);

  // Tiền còn lại = tổng cột (totalDue - codAmount) giống bảng invoice, nhưng không cộng các đơn trả thừa (âm)
  const totalDebt = invoices.reduce((sum, inv) => {
    const debt = calculateInvoiceFinalDue(inv) - calculateInvoicePaid(inv);
    return sum + (debt > 0 ? debt : 0);
  }, 0);

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-6 mb-6">
      <div className="bg-white p-4 md:p-6 rounded-lg shadow border border-gray-100">
        <h3 className="text-gray-500 text-[11px] md:text-sm font-medium uppercase mb-1 md:mb-2">Tổng hóa đơn</h3>
        <p className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-800 break-words">{invoices.length.toLocaleString("vi-VN")}</p>
        <p className="hidden md:block text-sm text-gray-400 mt-2">Tổng số hóa đơn theo bộ lọc</p>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow border border-gray-100">
        <h3 className="text-gray-500 text-[11px] md:text-sm font-medium uppercase mb-1 md:mb-2">Tổng Doanh Thu</h3>
        <p className="text-lg sm:text-2xl md:text-3xl font-bold text-blue-600 break-words">{formatMoney(totalRevenue)}</p>
        <p className="hidden md:block text-sm text-gray-400 mt-2">Tổng số tiền hóa đơn</p>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow border border-gray-100">
        <h3 className="text-gray-500 text-[11px] md:text-sm font-medium uppercase mb-1 md:mb-2">Tổng Đã Thu</h3>
        <p className="text-lg sm:text-2xl md:text-3xl font-bold text-green-600 break-words">{formatMoney(totalPaid)}</p>
        <p className="hidden md:block text-sm text-gray-400 mt-2">Số tiền thực tế đã thu</p>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow border border-gray-100">
        <h3 className="text-gray-500 text-[11px] md:text-sm font-medium uppercase mb-1 md:mb-2">Tiền Chưa Trả</h3>
        <p className="text-lg sm:text-2xl md:text-3xl font-bold text-red-600 break-words">{formatMoney(totalDebt)}</p>
        <p className="hidden md:block text-sm text-gray-400 mt-2">Tổng khoản chưa thanh toán</p>
      </div>
    </div>
  );
}
