import React from "react";
import { TableBase, Column } from "@/app/ui/base/table";
import { CustomerRevenue, calculateInvoiceFinalDue } from "../hooks/useDashboardData";
import { InfoOrderData } from "@/app/data/interface/transaction";
import dayjs from "dayjs";

interface CustomerRevenueTableProps {
  data: CustomerRevenue[];
  loading: boolean;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  onPageChange: (page: number, pageSize: number) => void;
}

export function CustomerRevenueTable({ data, loading, pagination, onPageChange }: CustomerRevenueTableProps) {
  const columns: Column<CustomerRevenue>[] = [
    {
      title: "Khách Hàng",
      dataIndex: "name",
      render: (val, record) => (
        <div>
          <p className="font-semibold text-gray-800">{val as string || "Không tên"}</p>
          <p className="text-sm text-gray-500">{record.phone || "Không có SĐT"}</p>
        </div>
      )
    },
    {
      title: "Tổng Cần Thu",
      dataIndex: "totalRevenue",
      width: 150,
      render: (val) => <span className="text-blue-600 font-semibold">{Number(val).toLocaleString("vi-VN")} đ</span>,
      className: "text-right",
    },
    {
      title: "Đã Thanh Toán",
      dataIndex: "totalPaid",
      width: 150,
      render: (val) => <span className="text-green-600 font-semibold">{Number(val).toLocaleString("vi-VN")} đ</span>,
      className: "text-right",
    },
    {
      title: "Tiền còn lại khác chưa trả",
      dataIndex: "totalDebt",
      width: 150,
      render: (val) => {
        const debt = Number(val) || 0;
        return <span className={`font-semibold ${debt > 0 ? "text-red-500" : "text-yellow-600"}`}>
          {debt.toLocaleString("vi-VN")} đ
        </span>;
      },
      className: "text-right",
    },
    {
      title: "Uy Tín",
      dataIndex: "prestige",
      width: 150,
      render: (_, record) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 ${record.prestige.color}`}>
          {record.prestige.label}
        </span>
      ),
      className: "text-center",
    },
    {
      title: "Số HĐ",
      dataIndex: "orderCount",
      width: 100,
      className: "text-center",
      render: (val) => <div className="text-center">{Number(val)}</div>,
    }
  ];

  const expandedRowRender = (record: CustomerRevenue) => {
    if (!record.invoices || record.invoices.length === 0) {
      return <p className="text-gray-400 p-2">Khách hàng chưa có hóa đơn nào.</p>;
    }

    const invColumns: Column<InfoOrderData>[] = [
      { title: "Mã Hóa Đơn", dataIndex: "id" },
      {
        title: "Ngày",
        dataIndex: "createdAt",
        render: (v) => v ? dayjs(v as string).format("DD/MM/YYYY HH:mm") : "-"
      },
      {
        title: "Trạng Thái",
        dataIndex: "statusInvoice",
        render: (val) => {
          let color = "text-gray-600";
          if (val === "Đã thanh toán" || val === "Hoàn thành") color = "text-green-600";
          if (val === "Hủy") color = "text-red-600";
          if (val === "Chờ xử lý") color = "text-orange-600";
          return <span className={`text-xs font-semibold ${color}`}>{val as string}</span>
        }
      },
      {
        title: "Thanh Toán Đủ?",
        dataIndex: "typeTransaction",
        render: (v) => v === "2" ? "Đủ" : "1 Phần/Chưa"
      },
      {
        title: "Chi Phí HĐ",
        dataIndex: "totalProduct",
        className: "text-right text-gray-700",
        render: (_, record) => calculateInvoiceFinalDue(record).toLocaleString("vi-VN") + " đ"
      }
    ];

    return (
      <div className="bg-gray-50 p-4 border rounded shadow-inner">
        <h4 className="font-semibold text-gray-600 mb-2">Danh sách Hóa Đơn của: {record.name}</h4>
        <TableBase
          columns={invColumns}
          data={record.invoices}
          rowKey="id"
          isSTT={true}
        />
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-base md:text-lg font-semibold text-gray-700">Phân Tích Chi Tiết Khách Hàng</h3>
      </div>
      <div className="overflow-x-auto">
        {/* Assumes TableBase supports antd's standard props like expandable. If not, this might be ignored, in which case we should just display static. */}
        <TableBase
          columns={columns}
          data={data}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            onPageChange,
          }}
          isSTT={true}
          // @ts-expect-error antd bypass
          expandable={{ expandedRowRender }}
        />
      </div>
    </div>
  );
}

