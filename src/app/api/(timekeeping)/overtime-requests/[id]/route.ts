import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';

export const dynamic = 'force-dynamic';

const COLLECTION = 'overtime-requests-timekeeping';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'ID không hợp lệ' }, { status: 400 });
    }

    const body = await req.json();
    const now  = new Date();

    const update: Record<string, unknown> = { updatedAt: now };

    if (body.status)       update.status     = body.status;
    if (body.resolvedBy)   update.resolvedBy  = body.resolvedBy;
    if (body.status && body.status !== 'pending') update.resolvedAt = now.toISOString();

    // Cập nhật thông tin nội dung nếu chỉnh sửa đơn
    if (body.date)          update.date          = body.date;
    if (body.overtimeStart) update.overtimeStart  = body.overtimeStart;
    if (body.overtimeEnd)   update.overtimeEnd    = body.overtimeEnd;
    if (body.reason)        update.reason         = body.reason;
    if (body.overtimeType)  update.overtimeType   = body.overtimeType;
    if (body.workMode)      update.workMode       = body.workMode;
    if (body.actualMinutes !== undefined) update.actualMinutes = Number(body.actualMinutes);

    if (body.overtimeStart && body.overtimeEnd) {
      const [sh, sm] = String(body.overtimeStart).split(':').map(Number);
      const [eh, em] = String(body.overtimeEnd).split(':').map(Number);
      update.plannedMinutes = (eh * 60 + em) - (sh * 60 + sm);
    }

    const { db } = await connectToDatabase();
    const result = await db.collection(COLLECTION).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: 'after' },
    );

    if (!result) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy đơn tăng ca' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Cập nhật thành công', data: result });
  } catch (error) {
    console.error('[overtime-requests/[id]] PUT error', error);
    return NextResponse.json({ success: false, message: 'Lỗi cập nhật đơn tăng ca' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'ID không hợp lệ' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy đơn tăng ca' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Đã xóa đơn tăng ca' });
  } catch (error) {
    console.error('[overtime-requests/[id]] DELETE error', error);
    return NextResponse.json({ success: false, message: 'Lỗi xóa đơn tăng ca' }, { status: 500 });
  }
}
