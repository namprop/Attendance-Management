import { NextRequest, NextResponse } from 'next/server';
import { ObjectId, UpdateFilter, Document } from 'mongodb';
import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';

interface RouteContext {
  params: Promise<{ id: string; contractId: string }>;
}

const VALID_STATUSES = ['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'];

// ── PATCH /api/v1/employees/[id]/contracts/[contractId] ───────────────────────
// Đổi trạng thái một hợp đồng cụ thể
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id, contractId } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'ID nhân viên không hợp lệ' }, { status: 400 });
    }
    if (!ObjectId.isValid(contractId)) {
      return NextResponse.json({ success: false, message: 'ID hợp đồng không hợp lệ' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const body = await req.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({
        success: false,
        message: `Trạng thái không hợp lệ. Cho phép: ${VALID_STATUSES.join(', ')}`,
      }, { status: 400 });
    }

    const result = await db.collection('employees-timekeeping').updateOne(
      {
        _id: new ObjectId(id),
        'contracts._id': new ObjectId(contractId),
      },
      {
        $set: {
          'contracts.$.status': status,
          'contracts.$.updatedAt': new Date(),
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy hợp đồng' }, { status: 404 });
    }

    const statusLabels: Record<string, string> = {
      DRAFT: 'Nháp',
      ACTIVE: 'Đang hiệu lực',
      EXPIRED: 'Hết hạn',
      TERMINATED: 'Đã thanh lý',
    };

    return NextResponse.json({
      success: true,
      message: `Hợp đồng đã chuyển sang trạng thái "${statusLabels[status] || status}"`,
    });

  } catch (error) {
    console.error('Lỗi đổi trạng thái hợp đồng:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server nội bộ' }, { status: 500 });
  }
}

// ── DELETE /api/v1/employees/[id]/contracts/[contractId] ──────────────────────
// Xóa hẳn một hợp đồng (chỉ dùng cho HĐ DRAFT)
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id, contractId } = await params;

    if (!ObjectId.isValid(id) || !ObjectId.isValid(contractId)) {
      return NextResponse.json({ success: false, message: 'ID không hợp lệ' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Chỉ cho phép xóa HĐ ở trạng thái DRAFT
    const employee = await db.collection('employees-timekeeping').findOne(
      { _id: new ObjectId(id), 'contracts._id': new ObjectId(contractId) },
      { projection: { 'contracts.$': 1 } }
    );

    if (!employee) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy hợp đồng' }, { status: 404 });
    }

    const contract = employee.contracts?.[0];
    if (contract && contract.status !== 'DRAFT') {
      return NextResponse.json({
        success: false,
        message: 'Chỉ có thể xóa hợp đồng ở trạng thái Nháp (DRAFT). Hãy chuyển sang Thanh lý nếu muốn kết thúc HĐ.',
      }, { status: 400 });
    }

    await db.collection('employees-timekeeping').updateOne(
      { _id: new ObjectId(id) },
      { $pull: { contracts: { _id: new ObjectId(contractId) } } } as unknown as UpdateFilter<Document>
    );

    return NextResponse.json({ success: true, message: 'Đã xóa hợp đồng nháp' });

  } catch (error) {
    console.error('Lỗi xóa hợp đồng:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server nội bộ' }, { status: 500 });
  }
}
