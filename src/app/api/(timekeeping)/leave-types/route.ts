import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';

const COLLECTION_NAME = 'leave_types';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';

    const { db } = await connectToDatabase();
    
    const query = activeOnly ? { isActive: true } : {};
    
    const types = await db.collection(COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ data: types });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách hình thức xin nghỉ:', error);
    return NextResponse.json({ error: 'Lỗi server nội bộ' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();

    const { action } = body;

    if (action === 'add') {
      // Check duplicate code
      const existing = await db.collection(COLLECTION_NAME).findOne({ code: body.code });
      if (existing) {
        return NextResponse.json({ success: false, message: 'Mã hình thức đã tồn tại' }, { status: 409 });
      }

      const newType = {
        name: body.name,
        code: body.code,
        description: body.description || '',
        isPaid: body.isPaid ?? false,
        requireProof: body.requireProof ?? false,
        maxDaysPerYear: body.maxDaysPerYear || 0,
        allowNegativeBalance: body.allowNegativeBalance ?? false,
        noticePeriodDays: body.noticePeriodDays || 0,
        maxConsecutiveDays: body.maxConsecutiveDays || 0,
        requireProofForDays: body.requireProofForDays || 0,
        applicableBranches: body.applicableBranches || [],
        applicableLocations: body.applicableLocations || [],
        applicableGroups: body.applicableGroups || [],
        applicableDepartments: body.applicableDepartments || [],
        isActive: body.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection(COLLECTION_NAME).insertOne(newType);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Thêm mới thành công',
        data: { _id: result.insertedId, ...newType }
      });
    }

    if (action === 'edit') {
      const { _id, ...updateFields } = body;
      
      if (!_id || !ObjectId.isValid(_id)) {
        return NextResponse.json({ success: false, message: 'ID không hợp lệ' }, { status: 400 });
      }

      // Check duplicate code excluding current
      if (updateFields.code) {
        const existing = await db.collection(COLLECTION_NAME).findOne({ 
          code: updateFields.code,
          _id: { $ne: new ObjectId(_id) }
        });
        if (existing) {
          return NextResponse.json({ success: false, message: 'Mã hình thức đã tồn tại' }, { status: 409 });
        }
      }

      // Remove unwanted fields
      delete updateFields.action;
      delete updateFields.createdAt;
      updateFields.updatedAt = new Date();

      await db.collection(COLLECTION_NAME).updateOne(
        { _id: new ObjectId(_id) },
        { $set: updateFields }
      );

      return NextResponse.json({ success: true, message: 'Cập nhật thành công' });
    }

    if (action === 'delete') {
      const { _id } = body;
      
      if (!_id || !ObjectId.isValid(_id)) {
        return NextResponse.json({ success: false, message: 'ID không hợp lệ' }, { status: 400 });
      }

      await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(_id) });
      
      return NextResponse.json({ success: true, message: 'Xóa thành công' });
    }

    return NextResponse.json({ success: false, message: 'Action không hợp lệ' }, { status: 400 });

  } catch (error) {
    console.error('Lỗi khi xử lý hình thức xin nghỉ:', error);
    return NextResponse.json({ error: 'Lỗi server nội bộ' }, { status: 500 });
  }
}
