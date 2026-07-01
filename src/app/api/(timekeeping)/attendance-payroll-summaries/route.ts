import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";

const PAYROLL_SUMMARIES_COLLECTION = "attendance_payroll_summaries-timekeeping";

interface PayrollSummaryInput {
  employeeCode?: unknown;
  employeeName?: unknown;
  departmentName?: unknown;
  employeeType?: unknown;
  salaryUnit?: unknown;
  periodFrom?: unknown;
  periodTo?: unknown;
  periodLabel?: unknown;
  workTotal?: unknown;
  onlineTotal?: unknown;
  offlineTotal?: unknown;
  overtimeTotal?: unknown;
  manualAdjusted?: unknown;
  manualAdjustmentCount?: unknown;
  days?: unknown;
  totalCalculatedHours?: unknown;
  totalCalculatedOnlineHours?: unknown;
  totalCalculatedOfflineHours?: unknown;
}

const getString = (value: unknown) => (
  typeof value === "string" ? value.trim() : ""
);

const getNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", ".").replace("h", ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normalizeSummary = (
  summary: PayrollSummaryInput,
  fallbackPeriodFrom: string,
  fallbackPeriodTo: string,
  fallbackPeriodLabel: string,
) => {
  const employeeCode = getString(summary.employeeCode);
  const periodFrom = getString(summary.periodFrom) || fallbackPeriodFrom;
  const periodTo = getString(summary.periodTo) || fallbackPeriodTo;
  const workTotal = getNumber(summary.workTotal);
  const onlineTotal = getNumber(summary.onlineTotal);

  return {
    employeeCode,
    employeeName: getString(summary.employeeName),
    departmentName: getString(summary.departmentName) || "Chung",
    employeeType: getString(summary.employeeType) || "full_time",
    salaryUnit: getString(summary.salaryUnit) || "workday",
    periodFrom,
    periodTo,
    periodLabel: getString(summary.periodLabel) || fallbackPeriodLabel,
    workTotal,
    onlineTotal,
    offlineTotal: Math.max(0, getNumber(summary.offlineTotal) || workTotal - onlineTotal),
    overtimeTotal: getNumber(summary.overtimeTotal),
    totalCalculatedHours: getString(summary.totalCalculatedHours),
    totalCalculatedOnlineHours: getString(summary.totalCalculatedOnlineHours),
    totalCalculatedOfflineHours: getString(summary.totalCalculatedOfflineHours),
    manualAdjusted: Boolean(summary.manualAdjusted),
    manualAdjustmentCount: getNumber(summary.manualAdjustmentCount),
    days: Array.isArray(summary.days) ? summary.days : [],
  };
};

export async function GET(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const periodFrom = getString(searchParams.get("periodFrom"));
    const periodTo = getString(searchParams.get("periodTo"));
    const employeeCodes = getString(searchParams.get("employeeCodes"))
      .split(",")
      .map((code) => code.trim())
      .filter(Boolean);

    const filters: Record<string, unknown> = {};
    if (periodFrom) filters.periodFrom = periodFrom;
    if (periodTo) filters.periodTo = periodTo;
    if (employeeCodes.length > 0) filters.employeeCode = { $in: employeeCodes };

    const summaries = await db
      .collection(PAYROLL_SUMMARIES_COLLECTION)
      .find(filters)
      .sort({ departmentName: 1, employeeName: 1 })
      .toArray();

    return NextResponse.json({
      data: summaries.map((item) => ({ ...item, _id: item._id.toString() })),
      message: "Lấy dữ liệu xuất công thành công",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi lấy dữ liệu xuất công", error: errorMessage },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();
    const periodFrom = getString(body.periodFrom);
    const periodTo = getString(body.periodTo);
    const periodLabel = getString(body.periodLabel);
    const exportedBy = getString(body.exportedBy) || "system";
    const summaries: PayrollSummaryInput[] = Array.isArray(body.summaries) ? body.summaries : [];

    if (!periodFrom || !periodTo || summaries.length === 0) {
      return NextResponse.json(
        { data: null, message: "Thiếu kỳ công hoặc danh sách nhân viên để xuất công" },
        { status: 400 },
      );
    }

    const now = new Date();
    const normalizedSummaries = summaries
      .map((summary: PayrollSummaryInput) => normalizeSummary(summary, periodFrom, periodTo, periodLabel))
      .filter((summary) => summary.employeeCode);

    if (normalizedSummaries.length === 0) {
      return NextResponse.json(
        { data: null, message: "Không có nhân viên hợp lệ để xuất công" },
        { status: 400 },
      );
    }

    const collection = db.collection(PAYROLL_SUMMARIES_COLLECTION);
    // Remove unique constraint on index creation to avoid errors with existing duplicate data.
    // In the future, a cleanup script can remove duplicates and re-apply a unique index.
    await collection.createIndex({ employeeCode: 1, periodFrom: 1 });

    const result = await collection.bulkWrite(
      normalizedSummaries.map((summary) => ({
        updateOne: {
          filter: {
            employeeCode: summary.employeeCode,
            periodFrom: summary.periodFrom,
          },
          update: {
            $set: {
              ...summary,
              exportedBy,
              exportedAt: now,
              updatedAt: now,
            },
            $setOnInsert: {
              createdAt: now,
            },
          },
          upsert: true,
        },
      })),
    );

    return NextResponse.json({
      data: {
        collection: PAYROLL_SUMMARIES_COLLECTION,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount,
        exportedCount: normalizedSummaries.length,
      },
      message: "Xuất công thành công",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi xuất công", error: errorMessage },
      { status: 500 },
    );
  }
}
