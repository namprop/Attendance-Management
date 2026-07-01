import React, { useMemo } from "react";
import { CustomerRevenue } from "../hooks/useDashboardData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

interface CustomerChartsProps {
  data: CustomerRevenue[];
}

const PRESTIGE_COLORS: Record<string, string> = {
  "VIP": "#9333ea",       // purple-600
  "Tốt": "#16a34a",       // green-600
  "Trung bình": "#ea580c",// orange-600
  "Rủi ro": "#dc2626",    // red-600
  "Chưa có hóa đơn": "#9ca3af" // gray-400
};

export function CustomerCharts({ data }: CustomerChartsProps) {
  const top10Customers = useMemo(() => {
    // Sắp xếp doanh thu giảm dần và lấy top 10
    const sorted = [...data].sort((a, b) => b.totalRevenue - a.totalRevenue);
    return sorted.slice(0, 10).map((c) => ({
      name: c.name || c.id || "Không tên",
      totalRevenue: c.totalRevenue,
      totalDebt: c.totalDebt,
    }));
  }, [data]);

  const prestigeData = useMemo(() => {
    const defaultData = [
      { name: "VIP", value: 0 },
      { name: "Tốt", value: 0 },
      { name: "Trung bình", value: 0 },
      { name: "Rủi ro", value: 0 },
      { name: "Chưa có hóa đơn", value: 0 },
    ];

    data.forEach(c => {
      const match = defaultData.find(d => d.name === c.prestige.label);
      if (match) {
        match.value += 1;
      }
    });

    return defaultData.filter(d => d.value > 0);
  }, [data]);

  const customTooltipFormatter = (value: number | string | readonly (string | number)[] | undefined) => {
    if (typeof value === 'number') {
      return value.toLocaleString("vi-VN") + " đ";
    }
    return value ? value.toString() + " đ" : "";
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 mb-6">
      <div className="bg-white p-4 md:p-6 rounded-lg shadow border border-gray-100">
        <h3 className="text-gray-700 text-lg font-semibold mb-6">Top 10 Khách Hàng (Theo Doanh Thu)</h3>
        <div className="w-full h-[320px] md:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={top10Customers}
              margin={{ top: 5, right: 16, left: 4, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#6B7280' }}
                angle={-45}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickFormatter={(val) => `${(val / 1000000).toFixed(0)}tr`}
              />
              <Tooltip formatter={customTooltipFormatter} cursor={{ fill: '#F3F4F6' }} />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="totalRevenue" name="Doanh Thu" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="totalDebt" name="Tiền còn lại khác chưa trả" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow border border-gray-100">
        <h3 className="text-gray-700 text-lg font-semibold mb-6">Phân Bổ Uy Tín Khách Hàng</h3>
        <div className="w-full h-[320px] md:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={prestigeData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              >
                {prestigeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PRESTIGE_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
