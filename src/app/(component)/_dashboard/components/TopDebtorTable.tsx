import React, { useState, useMemo } from "react";
import { CustomerRevenue } from "../hooks/useDashboardData";
import { TableBase, Column } from "@/app/ui/base/table";

export function TopDebtorTable({ data }: { data: CustomerRevenue[] }) {
  const [tab, setTab] = useState<"MOST" | "LONGEST">("MOST");
  const [currentPage, setCurrentPage] = useState(1);

  const sortedData = useMemo(() => {
    const debtors = data.filter(c => c.totalDebt !== 0);
    const arr = [...debtors];

    if (tab === "MOST") {
      arr.sort((a, b) => b.totalDebt - a.totalDebt);
    } else {
      arr.sort((a, b) => b.daysInDebt - a.daysInDebt);
    }

    return arr.slice(0, Math.max(10, Math.ceil(debtors.length * 0.2)));
  }, [data, tab]);

  const columns: Column<CustomerRevenue>[] = [
    {
      title: "Mã khách hàng",
      dataIndex: "id",
      width: 150,
      render: (val) => <span className="font-semibold text-gray-700">{val as string}</span>
    },
    {
      title: "Tên khách hàng",
      dataIndex: "name",
      render: (val) => <div>{(val as string) || "---"}</div>
    },
    {
      title: "Số ngày chưa trả",
      dataIndex: "daysInDebt",
      width: 150,
      render: (val) => {
        const days = Number(val) || 0;
        return <span className={days > 90 ? "text-red-500 font-bold" : "text-gray-700"}>
          {days > 0 ? `> ${days}` : days}
        </span>;
      }
    },
    {
      title: "Tiền chưa trả",
      dataIndex: "totalDebt",
      width: 150,
      className: "text-right",
      render: (val) => {
        const debt = Number(val) || 0;
        return <span className={`font-bold ${debt > 0 ? "text-red-600" : "text-green-600"}`}>
          {debt.toLocaleString("vi-VN")} đ
        </span>;
      }
    },
    // {
    //   title: "Giá trị nợ/Doanh thu thuần",
    //   dataIndex: "debtRatio",
    //   width: 220,
    //   className: "text-right text-gray-500",
    //   render: (val, record: CustomerRevenue) => {
    //     if (record.totalRevenue === 0) return "--%";
    //     return `${Number(val).toFixed(2)}%`;
    //   }
    // }
  ];

  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow border border-gray-100 mb-6 font-sans">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-6">
        <h3 className="text-base md:text-lg font-bold text-gray-800">Top khách hàng còn tiền chưa trả {tab === "MOST" ? "nhiều nhất" : "lâu nhất"}</h3>
        {/* <button className="text-blue-500 text-sm hover:underline font-medium">Chi tiết</button> */}
      </div>

      <div className="flex items-center gap-4 md:gap-6 mb-4 border-b border-gray-200 overflow-x-auto">
        <button
          className={`pb-2 font-semibold text-sm transition-colors ${tab === "MOST" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => { setTab("MOST"); setCurrentPage(1); }}
        >
          Nhiều nhất
        </button>
        <button
          className={`pb-2 font-semibold text-sm transition-colors ${tab === "LONGEST" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => { setTab("LONGEST"); setCurrentPage(1); }}
        >
          Lâu nhất
        </button>
      </div>

      <TableBase
        columns={columns}
        data={sortedData}
        rowKey="id"
        isSTT={false}
        pagination={{
          current: currentPage,
          pageSize: 10,
          total: sortedData.length,
          showSizeChanger: false,
          onPageChange: (page) => setCurrentPage(page)
        }}
      />
    </div>
  );
}

