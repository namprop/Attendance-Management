import { NextResponse, NextRequest } from 'next/server';
import { employeeModel, timeRecordModel } from '@/app/lib/models';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const search = (searchParams.get('search') || '').toLowerCase();
    const statusFilter = searchParams.get('status') || 'all';

    // 1. Get all active employees and records for the date
    const namesMap = await employeeModel.findAllNamesMap();
    const allEmployeeIds = Array.from(namesMap.keys());
    const fullAttendance = await timeRecordModel.getFullAttendanceByDate(allEmployeeIds, namesMap, date);

    // 2. Filter data
    const filtered = fullAttendance.filter((row) => {
      const matchSearch = row.name.toLowerCase().includes(search) || row.role.toLowerCase().includes(search);
      const matchStatus = statusFilter === 'all' || row.status === statusFilter;
      return matchSearch && matchStatus;
    });

    // 3. Paginate
    const total = filtered.length;
    const data = filtered.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({ success: true, data, total });
  } catch (error) {
    console.error('[dashboard-attendance] Error:', error);
    return NextResponse.json({ success: false, message: 'Lỗi tải dữ liệu chấm công' }, { status: 500 });
  }
}
