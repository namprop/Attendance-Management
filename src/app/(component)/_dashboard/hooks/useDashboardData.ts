import { useState, useEffect, useCallback } from "react";
import { InfoOrderData } from "@/app/data/interface/transaction";
import { Customer } from "@/app/data/interface/customer";
import { useToast } from "@/app/ui/base/toast";
import { useLocationStore } from "@/app/store/locationStore";
import dayjs, { Dayjs } from "dayjs";

export interface PrestigeStats {
  score: number;
  label: "VIP" | "Tốt" | "Trung bình" | "Rủi ro" | "Chưa có hóa đơn";
  color: string;
}

export interface CustomerRevenue extends Customer {
  totalRevenue: number;
  totalPaid: number;
  totalDebt: number;
  orderCount: number;
  invoices: InfoOrderData[];
  prestige: PrestigeStats;
  firstTransactionDate?: string;
  daysInDebt: number;
  debtRatio: number;
}

export interface MonthlyTrendData {
  month: string;
  revenue: number;
  debt: number;
}

export interface CustomerPaginationParams {
  current: number;
  pageSize: number;
}

export interface CustomerQueryParams {
  search?: string;
  customerId?: string;
  group?: string[];
}

export const calculateInvoiceDue = (invoice: InfoOrderData): number => {
  const totalProduct = Number(invoice.totalProduct) || 0;
  const discount = Number(invoice.discount) || 0;
  return Math.max(0, totalProduct - discount);
};

export const calculateInvoiceFinalDue = (invoice: InfoOrderData): number => {
  const totalDue = Number(invoice.totalDue) || 0;
  if (totalDue > 0) return totalDue;
  return (Number(invoice.totalProduct) || 0) - (Number(invoice.discount) || 0) + (Number(invoice.extraFee) || 0) + (Number(invoice.vatAmount) || 0);
};

export const calculatePrestige = (totalDebt: number, totalRevenue: number): PrestigeStats => {
  if (totalRevenue === 0) return { score: 0, label: "Chưa có hóa đơn", color: "text-gray-400" };
  const ratio = totalDebt / totalRevenue;

  if (totalDebt <= 0 || ratio < 0.05) return { score: 100, label: "VIP", color: "text-purple-600" };
  if (ratio <= 0.20) return { score: 80, label: "Tốt", color: "text-green-600" };
  if (ratio <= 0.50) return { score: 50, label: "Trung bình", color: "text-orange-600" };
  return { score: 20, label: "Rủi ro", color: "text-red-600" };
};

export const calculateInvoicePaid = (
  invoice: InfoOrderData,
): number => {
  return Number(invoice.codAmount) || 0;
};

export function useDashboardData(
  dateRange?: [Dayjs | null, Dayjs | null] | null,
  dateField: "orderDateTime" | "dateInvoice" = "dateInvoice",
  customerPagination: CustomerPaginationParams = { current: 1, pageSize: 10 },
  customerQuery: CustomerQueryParams = {}
) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<InfoOrderData[]>([]);
  const [customerRevenues, setCustomerRevenues] = useState<CustomerRevenue[]>([]);
  const [customerTotal, setCustomerTotal] = useState<number>(0);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const showToast = useToast();
  const { location, branchId } = useLocationStore();
  const customerPage = customerPagination.current;
  const customerPageSize = customerPagination.pageSize;
  const customerSearch = customerQuery.search || "";
  const customerId = customerQuery.customerId || "";
  const customerGroupKey = (customerQuery.group || []).join("|");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const customerGroupValues = customerGroupKey ? customerGroupKey.split("|") : [];
      const invoiceResRaw = await fetch("/api/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "read",
          skip: 0,
          limit: 0,
          filters: {
            location, branch: branchId,
            statusInvoice: { $in: ["Đã hoàn thành", "Đang xử lý"] },
            is_split_parent: { $ne: true },
            ...(dateRange && dateRange[0] && dateRange[1]
              ? {
                [dateField]: {
                  $gte: dateRange[0].startOf("day").toISOString(),
                  $lte: dateRange[1].endOf("day").toISOString(),
                },
              }
              : {}),
            $and: [
              { $or: [{ approve: true }, { approveEdit: true }] },
              { approve: { $ne: false } },
              { approveEdit: { $ne: false } }
            ]
          },
          sort: { field: "orderDateTime", order: "desc" },
        }),
      }).then(r => r.json());

      const invoiceData = Array.isArray(invoiceResRaw) ? invoiceResRaw : (invoiceResRaw?.data || null);
      if (!Array.isArray(invoiceData)) {
        showToast({ type: "error", message: "Định dạng dữ liệu không hợp lệ khi tải thông tin Dashboard" });
        setInvoices([]);
        setCustomers([]);
        setCustomerRevenues([]);
        setCustomerTotal(0);
        return;
      }

      const normalize = (v?: string) => String(v || "").trim();
      const statsByCustomerId = new Map<string, { totalRevenue: number }>();
      for (const inv of invoiceData) {
        const cid = normalize(inv.customerId) || normalize(inv.idcustomer);
        if (!cid) continue;
        const current = statsByCustomerId.get(cid) || { totalRevenue: 0 };
        current.totalRevenue += calculateInvoiceFinalDue(inv);
        statsByCustomerId.set(cid, current);
      }

      const rankedCustomerIds = Array.from(statsByCustomerId.entries())
        .sort((a, b) => b[1].totalRevenue - a[1].totalRevenue)
        .map(([cid]) => cid);

      const baseCustomerIds = customerId
        ? rankedCustomerIds.filter((id) => id === customerId)
        : rankedCustomerIds;

      let eligibleSortedIds = baseCustomerIds;

      if (customerSearch || customerGroupValues.length > 0) {
        const matchingCustomerRes = await fetch("/api/customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "read",
            search: customerSearch || undefined,
            skip: 0,
            limit: 0,
            filters: {
              ...(baseCustomerIds.length > 0 ? { id: { $in: baseCustomerIds } } : { id: "__NO_MATCH__" }),
              ...(customerGroupValues.length > 0 ? { group: { $in: customerGroupValues } } : {}),
            },
          }),
        }).then((r) => r.json());

        const matchingCustomers = Array.isArray(matchingCustomerRes)
          ? matchingCustomerRes
          : (matchingCustomerRes?.data || []);

        const matchingIdSet = new Set(
          Array.isArray(matchingCustomers)
            ? matchingCustomers.map((c: Customer) => normalize(c.id)).filter(Boolean)
            : []
        );

        eligibleSortedIds = baseCustomerIds.filter((id) => matchingIdSet.has(id));
      }

      const customerTotalCount = eligibleSortedIds.length;
      const start = Math.max(0, (customerPage - 1) * customerPageSize);
      const pagedCustomerIds = eligibleSortedIds.slice(start, start + customerPageSize);

      const customerResRaw = await fetch("/api/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "read",
          skip: 0,
          limit: 0,
          filters: {
            ...(pagedCustomerIds.length > 0 ? { id: { $in: pagedCustomerIds } } : { id: "__NO_MATCH__" }),
          },
        }),
      }).then((r) => r.json());

      const customerDataRaw = Array.isArray(customerResRaw) ? customerResRaw : (customerResRaw?.data || null);
      const customerMap = new Map(
        (Array.isArray(customerDataRaw) ? customerDataRaw : []).map((c: Customer) => [normalize(c.id), c])
      );
      const customerData = pagedCustomerIds
        .map((id) => customerMap.get(id))
        .filter(Boolean) as Customer[];

      if (Array.isArray(invoiceData) && Array.isArray(customerData)) {
        setInvoices(invoiceData);
        setCustomers(customerData);
        setCustomerTotal(customerTotalCount);

        // Compute Monthly Trend (12 Months)
        const trendMap: Record<string, { revenue: number; debt: number }> = {};
        for (let i = 11; i >= 0; i--) {
          trendMap[dayjs().subtract(i, 'month').format('MM/YYYY')] = { revenue: 0, debt: 0 };
        }
        invoiceData.forEach(inv => {
          const dateStr = inv.orderDateTime || inv.createDate || inv.createdAt;
          if (dateStr) {
            const m = dayjs(dateStr as string).format('MM/YYYY');
            if (trendMap[m]) {
              const due = calculateInvoiceFinalDue(inv);
              const paid = calculateInvoicePaid(inv);
              trendMap[m].revenue += due;
              trendMap[m].debt += ((due - paid) > 0 ? (due - paid) : 0);
            }
          }
        });
        setMonthlyTrend(Object.keys(trendMap).map(m => ({ month: m, revenue: trendMap[m].revenue, debt: trendMap[m].debt })));

        const phoneToCustomerId = new Map<string, string>();
        const statsByCustomer = new Map<string, {
          invoices: InfoOrderData[];
          totalRevenue: number;
          totalPaid: number;
          totalDebt: number;
          firstTransactionTs: number | null;
        }>();

        customerData.forEach((cust) => {
          const custId = normalize(cust.id);
          if (!custId) return;
          statsByCustomer.set(custId, {
            invoices: [],
            totalRevenue: 0,
            totalPaid: 0,
            totalDebt: 0,
            firstTransactionTs: null,
          });
          const phone = normalize(cust.phone);
          if (phone && !phoneToCustomerId.has(phone)) {
            phoneToCustomerId.set(phone, custId);
          }
        });

        for (const inv of invoiceData) {
          const customerIdFromInvoice =
            normalize(inv.customerId) ||
            normalize(inv.idcustomer) ||
            phoneToCustomerId.get(normalize(inv.customerPhone)) ||
            "";

          if (!customerIdFromInvoice) continue;
          const stat = statsByCustomer.get(customerIdFromInvoice);
          if (!stat) continue;

          stat.invoices.push(inv);
          stat.totalRevenue += calculateInvoiceFinalDue(inv);
          stat.totalPaid += calculateInvoicePaid(inv);
          const invoiceDebt = calculateInvoiceFinalDue(inv) - calculateInvoicePaid(inv);
          stat.totalDebt += invoiceDebt > 0 ? invoiceDebt : 0;

          const dateStr = (inv.orderDateTime || inv.createDate || inv.createdAt) as string | undefined;
          if (dateStr) {
            const ts = dayjs(dateStr).valueOf();
            if (Number.isFinite(ts)) {
              stat.firstTransactionTs = stat.firstTransactionTs === null ? ts : Math.min(stat.firstTransactionTs, ts);
            }
          }
        }

        const mappedData: CustomerRevenue[] = customerData.map((cust) => {
          const custId = normalize(cust.id);
          const stat = custId ? statsByCustomer.get(custId) : undefined;
          const totalRev = stat?.totalRevenue || 0;
          const totalPd = stat?.totalPaid || 0;
          const custInvoices = stat?.invoices || [];
          const debt = stat?.totalDebt || 0;
          const firstTxDate = stat?.firstTransactionTs ? dayjs(stat.firstTransactionTs) : null;
          const daysInDebt = (debt > 0 && firstTxDate) ? dayjs().diff(firstTxDate, 'day') : 0;
          const debtRatio = totalRev > 0 ? (debt / totalRev) * 100 : 0;

          return {
            ...cust,
            totalRevenue: totalRev,
            totalPaid: totalPd,
            totalDebt: debt,
            orderCount: custInvoices.length,
            invoices: custInvoices,
            prestige: calculatePrestige(debt, totalRev),
            firstTransactionDate: firstTxDate ? firstTxDate.toISOString() : undefined,
            daysInDebt,
            debtRatio,
          };
        });

        // Tự động sắp xếp Khách Hàng theo Tổng Doanh Thu giảm dần luôn
        mappedData.sort((a, b) => b.totalRevenue - a.totalRevenue);

        setCustomerRevenues(mappedData);
      } else {
        showToast({ type: "error", message: "Định dạng dữ liệu không hợp lệ khi tải thông tin Dashboard" });
      }
    } catch (error) {
      console.error(error);
      showToast({ type: "error", message: "Lỗ tải dữ liệu khách hàng & hóa đơn" });
    } finally {
      setLoading(false);
    }
  }, [
    showToast,
    location,
    branchId,
    dateRange,
    dateField,
    customerPage,
    customerPageSize,
    customerSearch,
    customerId,
    customerGroupKey,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    invoices,
    customers,
    customerRevenues,
    customerTotal,
    monthlyTrend,
    loading,
    refetch: () => fetchData(),
  };
}
