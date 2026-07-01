import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';
import { checkOnlineCheckinPermission } from '@/app/lib/timekeeping/onlineCheckinService';

const getString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

/**
 * GET /api/online-checkin-settings/check?employeeCode=xxx&date=YYYY-MM-DD
 * Kiểm tra nhân viên có được phép chấm công online không.
 * Response: { allowed: boolean, reason?: string }
 */
export async function GET(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const employeeCode = getString(searchParams.get('employeeCode'));
    const date = getString(searchParams.get('date')) || new Date().toISOString().slice(0, 10);

    const result = await checkOnlineCheckinPermission(db, employeeCode, date);

    if (result.allowed) {
      return NextResponse.json(result);
    }
    
    return NextResponse.json(result, { status: result.reason === 'Thiếu mã nhân viên' ? 400 : 200 });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi không xác định';
    return NextResponse.json({ allowed: false, reason: 'Lỗi server', error: msg }, { status: 500 });
  }
}
