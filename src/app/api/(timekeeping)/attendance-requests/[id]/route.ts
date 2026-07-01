import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import type { AttendanceRequestStatus } from '@/app/interface/timekeeping';
import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';
import {
  ATTENDANCE_REQUESTS_COLLECTION,
  serializeAttendanceRequest,
} from '@/app/lib/timekeeping/attendanceRequestsService';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const getString = (value: unknown) => String(value || '').trim();

const getErrorMessage = (error: unknown) => (
  error instanceof Error ? error.message : 'Server error'
);

export async function PUT(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const status = getString(body.status) as AttendanceRequestStatus;

    if (status !== 'Approved' && status !== 'Rejected' && status !== 'Expired') {
      return NextResponse.json({ message: 'Trạng thái không hợp lệ' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
    const now = new Date();

    const updateData: Record<string, unknown> = {
      status,
      requestedCheckIn: body.requestedCheckIn ?? null,
      requestedCheckOut: body.requestedCheckOut ?? null,
      adminNote: getString(body.adminNote),
      resolvedAt: now.toISOString(),
      resolvedBy: getString(body.resolvedBy) || 'admin',
      updatedAt: now,
    };

    if (body.requestType) updateData.requestType = body.requestType;
    if (body.currentCheckIn !== undefined) updateData.currentCheckIn = body.currentCheckIn || null;
    if (body.currentCheckOut !== undefined) updateData.currentCheckOut = body.currentCheckOut || null;

    await db.collection(ATTENDANCE_REQUESTS_COLLECTION).updateOne(filter, {
      $set: updateData,
    });

    const updated = await db.collection(ATTENDANCE_REQUESTS_COLLECTION).findOne(filter);
    if (!updated) {
      return NextResponse.json({ message: 'Không tìm thấy yêu cầu xử lý công' }, { status: 404 });
    }

    return NextResponse.json({
      data: serializeAttendanceRequest(updated),
      message: status === 'Approved' ? 'Đã duyệt yêu cầu xử lý công' : 'Đã cập nhật yêu cầu xử lý công',
    });
  } catch (error) {
    console.error('Failed to update attendance request', error);
    return NextResponse.json({ message: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { db } = await connectToDatabase();
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };

    const result = await db.collection(ATTENDANCE_REQUESTS_COLLECTION).deleteOne(filter);
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ message: 'Không tìm thấy yêu cầu xử lý công' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Đã xóa yêu cầu xử lý công thành công' });
  } catch (error) {
    console.error('Failed to delete attendance request', error);
    return NextResponse.json({ message: getErrorMessage(error) }, { status: 500 });
  }
}
