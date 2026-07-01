import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';

const COLLECTION = 'employee_contracts';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'ID không hợp lệ' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const contract = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });

    if (!contract) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy hợp đồng' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: contract });
  } catch (error) {
    console.error('Lỗi lấy chi tiết hợp đồng nhân viên:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server nội bộ' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'ID không hợp lệ' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true, message: 'Xóa hợp đồng thành công' });
  } catch (error) {
    console.error('Lỗi xóa hợp đồng nhân viên:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server nội bộ' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'ID không hợp lệ' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const body = await req.json();

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.status) updateData.status = body.status;
    if (body.startDate) updateData.startDate = new Date(body.startDate);
    if (body.endDate) updateData.endDate = new Date(body.endDate);
    if (body.filledData) updateData.filledData = body.filledData;
    if (body.employeeSignature !== undefined) updateData.employeeSignature = body.employeeSignature;
    if (body.managerSignature !== undefined) updateData.managerSignature = body.managerSignature;
    if (body.cancelReason !== undefined) updateData.cancelReason = body.cancelReason;

    // Nếu cập nhật thành ACTIVE, ta phải đổi HĐ cũ thành EXPIRED
    if (body.status === 'ACTIVE') {
      const existing = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
      if (existing) {
        await db.collection(COLLECTION).updateMany(
          { employeeId: existing.employeeId, status: 'ACTIVE', _id: { $ne: new ObjectId(id) } },
          { $set: { status: 'EXPIRED', updatedAt: new Date() } }
        );
      }
    }

    await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    return NextResponse.json({ success: true, message: 'Cập nhật hợp đồng thành công' });
  } catch (error) {
    console.error('Lỗi cập nhật hợp đồng nhân viên:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server nội bộ' }, { status: 500 });
  }
}
