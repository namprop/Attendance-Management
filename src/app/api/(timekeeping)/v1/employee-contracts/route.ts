import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';

const COLLECTION = 'employee_contracts';

export async function GET(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    const query: Record<string, unknown> = {};
    if (employeeId) {
      // Handle both formats depending on how employeeId is stored (string or ObjectId)
      // Usually employeeId is string in MongoDB for some collections, but let's query both just in case
      // Or just string if we're consistent
      query.employeeId = employeeId;
    }

    const contracts = await db.collection(COLLECTION)
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ data: contracts, success: true });
  } catch (error) {
    console.error('Lỗi lấy danh sách hợp đồng nhân viên:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server nội bộ' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();

    const { employeeId, templateId, contractTypeId, filledData, startDate, endDate, employeeSignature, managerSignature, supplementary } = body;

    if (!employeeId || !templateId) {
      return NextResponse.json({ success: false, message: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    // Kiểm tra hợp đồng ACTIVE hiện tại (bỏ qua nếu là hợp đồng bổ sung / phụ lục)
    if (!supplementary) {
      const activeContract = await db.collection(COLLECTION).findOne({ employeeId, status: 'ACTIVE' });
      if (activeContract) {
        if (!activeContract.endDate) {
          return NextResponse.json({ success: false, message: 'Nhân viên đang có hợp đồng vô thời hạn. Vui lòng chấm dứt hợp đồng cũ trước khi tạo mới.' }, { status: 400 });
        }
        const daysLeft = (new Date(activeContract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        if (daysLeft > 60) {
          return NextResponse.json({ success: false, message: 'Nhân viên đang có hợp đồng hiệu lực. Chỉ được tạo mới khi hợp đồng cũ sắp hết hạn (<= 60 ngày) hoặc đã bị chấm dứt.' }, { status: 400 });
        }
      }
    }

    // Status: Hợp đồng bổ sung lưu thẳng status 'SUPPLEMENTARY'. Hợp đồng thường: đủ 2 chữ ký thì ACTIVE, ngược lại DRAFT
    const finalStatus = supplementary ? 'SUPPLEMENTARY' : ((employeeSignature && managerSignature) ? 'ACTIVE' : 'DRAFT');

    // Nếu tạo hợp đồng mới dạng ACTIVE và KHÔNG phải hợp đồng bổ sung, cập nhật các hợp đồng cũ thành EXPIRED
    if (finalStatus === 'ACTIVE' && !supplementary) {
      await db.collection(COLLECTION).updateMany(
        { employeeId, status: 'ACTIVE' },
        { $set: { status: 'EXPIRED', updatedAt: new Date() } }
      );
    }

    const newContract = {
      employeeId,
      templateId,
      contractTypeId: contractTypeId || null,
      filledData: filledData || {},
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      employeeSignature: employeeSignature || null,
      managerSignature: managerSignature || null,
      status: finalStatus,
      isSupplementary: !!supplementary,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection(COLLECTION).insertOne(newContract);
    return NextResponse.json({
      success: true,
      message: 'Lưu hợp đồng thành công',
      data: { _id: result.insertedId, ...newContract },
    }, { status: 201 });
  } catch (error) {
    console.error('Lỗi tạo hợp đồng nhân viên:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server nội bộ' }, { status: 500 });
  }
}