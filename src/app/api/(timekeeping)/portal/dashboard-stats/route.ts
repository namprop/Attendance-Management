import { NextResponse, NextRequest } from 'next/server';
import { timeRecordModel, leaveRequestModel } from '@/app/lib/models';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const employeeIdsParam = searchParams.getAll('employeeIds');
    const qMonth = searchParams.get('month');
    const qYear = searchParams.get('year');

    if (!employeeId && employeeIdsParam.length === 0) {
      return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 });
    }

    const lookupIds = employeeIdsParam.length > 0 ? employeeIdsParam : [employeeId].filter(Boolean) as string[];

    const todayObj = new Date();
    const targetYear = qYear ? parseInt(qYear, 10) : todayObj.getFullYear();
    const targetMonth = qMonth ? parseInt(qMonth, 10) : todayObj.getMonth() + 1;

    const startOfMonth = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const endOfMonthDate = new Date(targetYear, targetMonth, 0);
    const endOfMonth = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(endOfMonthDate.getDate()).padStart(2, '0')}`;
    const today = todayObj.toISOString().split('T')[0];

    // Fetch records for this month for this employee
    const monthRecords = await timeRecordModel.findByDateRange(startOfMonth, endOfMonth, lookupIds);
    
    let totalWorkedDays = 0;
    let lateMinutes = 0;
    let overtimeMinutes = 0;

    monthRecords.forEach(r => {
      if (r.clockIn) {
        totalWorkedDays++;
      }
      if (r.lateMinutes) {
        lateMinutes += Number(r.lateMinutes);
      }
      if (r.overtimeMinutes) {
        overtimeMinutes += Number(r.overtimeMinutes);
      }
    });

    const leaveFilters: Record<string, unknown> = { status: 'Approved' };
    const validObjectIds = lookupIds.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));
    const stringIds = lookupIds.map(String);
    const numberIds = lookupIds.map(Number).filter(n => !isNaN(n));
    
    leaveFilters.$or = [
      { employeeId: { $in: validObjectIds } },
      { employeeId: { $in: stringIds } },
      { employeeId: { $in: numberIds } }
    ];
    const approvedLeaves = await leaveRequestModel.findMany({ filters: leaveFilters });
    
    let usedLeaveDays = 0;
    approvedLeaves.data.forEach((l: { startDate: string | Date; endDate: string | Date }) => {
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      usedLeaveDays += diffDays;
    });

    const standardDaysStr = `${totalWorkedDays}/26`;
    const leaveBalance = Math.max(0, 12 - usedLeaveDays);

    // Recent History (last 5 records)
    const recentHistory = monthRecords.slice(0, 5).map(r => {
      const dateObj = new Date(r.date);
      const dateStr = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
      const dayOfWeek = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][dateObj.getDay()];
      
      let status = "Đúng giờ";
      const rLate = (r.lateMinutes as number) || 0;
      const rEarly = (r.earlyMinutes as number) || 0;

      if (rLate > 0) status = `Đi muộn ${rLate}p`;
      else if (rEarly > 0) status = `Về sớm ${rEarly}p`;
      
      return {
        id: String(r._id) || Math.random().toString(),
        date: `${r.date === today ? 'Hôm nay' : dayOfWeek}, ${dateStr}`,
        in: r.clockIn || "--:--",
        out: r.clockOut || "--:--",
        status,
        isLate: rLate > 0 || rEarly > 0
      };
    });

    const estimatedSalary = totalWorkedDays * 300000;
    const latePenalty = lateMinutes * 2000;
    const overtimeBonus = (overtimeMinutes / 60) * 50000;
    const totalIncome = estimatedSalary + overtimeBonus - latePenalty;

    return NextResponse.json({
      success: true,
      data: {
        standardDays: standardDaysStr,
        lateMinutes,
        overtimeHours: Math.round((overtimeMinutes / 60) * 10) / 10,
        leaveBalance: `${leaveBalance} ngày`,
        recentHistory,
        estimatedSalary,
        latePenalty,
        overtimeBonus,
        totalIncome
      }
    });

  } catch (error) {
    console.error('Failed to get portal dashboard stats', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
