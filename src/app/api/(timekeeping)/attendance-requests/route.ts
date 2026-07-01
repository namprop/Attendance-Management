import { NextResponse } from 'next/server';
import type { AttendanceRequestStatus, AttendanceRequestType } from '@/app/interface/timekeeping';
import {
  listAttendanceRequests,
  syncAttendanceRequestsFromRows,
} from '@/app/lib/timekeeping/attendanceRequestsService';

const getPositiveInteger = (value: string | null, fallback: number, max?: number) => {
  const parsed = Number(value);
  const integer = Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
  const positive = integer > 0 ? integer : fallback;
  return max ? Math.min(positive, max) : positive;
};

const getErrorMessage = (error: unknown) => (
  error instanceof Error ? error.message : 'Server error'
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const result = await listAttendanceRequests({
      page: getPositiveInteger(searchParams.get('page'), 1),
      pageSize: getPositiveInteger(searchParams.get('pageSize') || searchParams.get('limit'), 20, 100),
      status: (searchParams.get('status') || '') as AttendanceRequestStatus | '',
      requestType: (searchParams.get('requestType') || '') as AttendanceRequestType | '',
      employeeId: searchParams.get('employeeId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      search: searchParams.get('search') || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to list attendance requests', error);
    return NextResponse.json({ data: [], message: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = String(body.action || '').trim();

    if (action === 'sync') {
      const rows = Array.isArray(body.rows) ? body.rows : [];
      const sync = await syncAttendanceRequestsFromRows(rows);
      return NextResponse.json({ success: true, sync });
    }

    return NextResponse.json({ message: 'Action không hợp lệ' }, { status: 400 });
  } catch (error) {
    console.error('Failed to process attendance request action', error);
    return NextResponse.json({ message: getErrorMessage(error) }, { status: 500 });
  }
}
