import { NextResponse, NextRequest } from 'next/server';
import { employeeModel, timeRecordModel, leaveRequestModel } from '@/app/lib/models';
import type { TodayAttendanceRow } from '@/app/lib/models/timeRecord.model';

export interface DashboardStatsResponse {
  totalEmployees: number;
  todayCheckedIn: number;
  todayLate: number;
  todayAbsent: number;
  pendingLeaves: number;
  weeklyData: Array<{
    date: string;
    label: string;
    checkedIn: number;
    late: number;
    absent: number;
  }>;
  topLateEmployees: Array<{
    employeeId: string;
    name: string;
    role: string;
    lateCount: number;
    totalLateMinutes: number;
  }>;
  notCheckedInToday: Array<{
    employeeId: string;
    name: string;
    role: string;
  }>;
  todayAttendance: TodayAttendanceRow[];
  monthlyOnTimeRate: number;
  monthlyLateRate: number;
  monthlyAbsentRate: number;
  avgWorkHoursThisWeek: number;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Default dates if not provided
    const today = new Date().toISOString().split('T')[0];
    const startOfWeek = (() => {
      const d = new Date();
      d.setDate(d.getDate() - d.getDay() + 1);
      return d.toISOString().split('T')[0];
    })();
    const startOfMonth = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    })();

    // For backward compatibility or if no filter is provided, we use month-to-date for rates and week for top late
    const queryStart = startDate || startOfWeek; // Default to this week for the chart
    const queryEnd = endDate || today;
    const rateStart = startDate || startOfMonth;

    // ── Phase 1: Lấy base data (nhân viên active + tên) ──────────────────────
    const [activeCount, namesMap, pendingLeaves] = await Promise.all([
      employeeModel.countActive(),
      employeeModel.findAllNamesMap(),
      leaveRequestModel.countPending(),
    ]);

    const allEmployeeIds = Array.from(namesMap.keys());
    const totalEmployees = activeCount;

    // Giới hạn queryEnd cho các truy vấn theo ngày cụ thể (không thể check-in cho ngày tương lai)
    const dailyQueryEnd = queryEnd > today ? today : queryEnd;

    // ── Phase 2: Song song các query analytics ───────────────────────────────
    const [periodRecords, weeklyData, topLateEmployees, monthlyRates, notCheckedInToday, todayAttendance] =
      await Promise.all([
        timeRecordModel.findByDateRange(queryStart, dailyQueryEnd),
        timeRecordModel.getDailyStats(totalEmployees, queryStart, queryEnd),
        timeRecordModel.getTopLateInPeriod(5, namesMap, queryStart, queryEnd),
        timeRecordModel.getPeriodRates(totalEmployees, rateStart, queryEnd),
        timeRecordModel.getNotCheckedInByDate(allEmployeeIds, namesMap, dailyQueryEnd),
        timeRecordModel.getFullAttendanceByDate(allEmployeeIds, namesMap, dailyQueryEnd),
      ]);

    // ── Tính stats trong kỳ từ periodRecords ───────────────────────────────────
    const uniquePeriodRecords = new Map<string, { clockIn: boolean, lateMinutes: number }>();
    periodRecords.forEach(r => {
      const eId = r.employeeId ? r.employeeId.toString() : String(r.employeeId);
      const key = `${eId}_${r.date}`;
      const existing = uniquePeriodRecords.get(key);
      const hasClockIn = !!r.clockIn;
      const lateMins = (r.lateMinutes as number) || 0;
      if (!existing) {
        uniquePeriodRecords.set(key, { clockIn: hasClockIn, lateMinutes: lateMins });
      } else {
        if (hasClockIn) existing.clockIn = true;
        if (lateMins > 0) existing.lateMinutes = Math.max(existing.lateMinutes, lateMins);
      }
    });

    let todayCheckedIn = 0;
    let todayLate = 0;
    Array.from(uniquePeriodRecords.values()).forEach(v => {
      if (v.clockIn) todayCheckedIn++;
      if (v.lateMinutes > 0) todayLate++;
    });

    // Tính số ngày có record để ước lượng slots (nếu rỗng mặc định 1)
    const days = periodRecords.length > 0 ? (new Set(periodRecords.map(r => r.date)).size) : 1;
    const todayAbsent = Math.max(0, (totalEmployees * days) - todayCheckedIn);

    const response: DashboardStatsResponse = {
      totalEmployees,
      todayCheckedIn,
      todayLate,
      todayAbsent,
      pendingLeaves,
      weeklyData,
      topLateEmployees,
      notCheckedInToday,
      todayAttendance,
      monthlyOnTimeRate: monthlyRates.onTimeRate,
      monthlyLateRate: monthlyRates.lateRate,
      monthlyAbsentRate: monthlyRates.absentRate,
      avgWorkHoursThisWeek: monthlyRates.avgWorkHoursThisWeek,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[dashboard-stats] Error:', error);
    return NextResponse.json(
      { error: 'Không thể lấy dữ liệu tổng quan', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
