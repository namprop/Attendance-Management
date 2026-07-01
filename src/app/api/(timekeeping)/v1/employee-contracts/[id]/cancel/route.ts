import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';

const COLLECTION = 'employee_contracts';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'ID không hợp lệ' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const body = await req.json();

    if (!body.cancelReason) {
      return NextResponse.json({ success: false, message: 'Vui lòng cung cấp lý do hủy hợp đồng' }, { status: 400 });
    }

    const contract = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
    if (!contract) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy hợp đồng' }, { status: 404 });
    }

    if (contract.status !== 'ACTIVE' && contract.status !== 'DRAFT') {
      return NextResponse.json({ success: false, message: 'Chỉ có thể hủy hợp đồng đang hiệu lực hoặc hợp đồng nháp' }, { status: 400 });
    }

    await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: 'CANCELLED', 
          cancelReason: body.cancelReason,
          cancelledAt: new Date(),
          updatedAt: new Date()
        } 
      }
    );

    return NextResponse.json({ success: true, message: 'Hủy hợp đồng thành công' });
  } catch (error) {
    console.error('Lỗi hủy hợp đồng nhân viên:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server nội bộ' }, { status: 500 });
  }
}
