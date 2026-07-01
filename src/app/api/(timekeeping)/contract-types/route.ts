import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';

const COLLECTION = 'contract_types';

export async function GET(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';

    const query: Record<string, unknown> = {};
    if (activeOnly) query.isActive = true;

    const types = await db.collection(COLLECTION)
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ data: types, success: true });
  } catch (error) {
    console.error('Lỗi lấy danh sách loại hợp đồng:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server nội bộ' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();
    const { action } = body;

    // ── Thêm mới ──
    if (action === 'add') {
      const { name, description, templateId, isActive } = body;

      if (!name?.trim()) {
        return NextResponse.json({ success: false, message: 'Tên loại hợp đồng không được trống' }, { status: 400 });
      }

      const newType = {
        name: name.trim(),
        description: description?.trim() || '',
        templateId: templateId || null,
        isActive: isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection(COLLECTION).insertOne(newType);
      return NextResponse.json({
        success: true,
        message: 'Tạo loại hợp đồng thành công',
        data: { _id: result.insertedId, ...newType },
      }, { status: 201 });
    }

    // ── Cập nhật ──
    if (action === 'edit') {
      const { _id, name, description, templateId, isActive } = body;

      if (!_id || !ObjectId.isValid(_id)) {
        return NextResponse.json({ success: false, message: 'ID không hợp lệ' }, { status: 400 });
      }
      if (!name?.trim()) {
        return NextResponse.json({ success: false, message: 'Tên loại không được trống' }, { status: 400 });
      }

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
        name: name.trim(),
        description: description?.trim() || '',
        templateId: templateId || null,
      };
      if (isActive !== undefined) updateData.isActive = isActive;

      await db.collection(COLLECTION).updateOne(
        { _id: new ObjectId(_id) },
        { $set: updateData }
      );

      return NextResponse.json({ success: true, message: 'Cập nhật loại hợp đồng thành công' });
    }

    // ── Xóa ──
    if (action === 'delete') {
      const { _id } = body;

      if (!_id || !ObjectId.isValid(_id)) {
        return NextResponse.json({ success: false, message: 'ID không hợp lệ' }, { status: 400 });
      }

      await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(_id) });
      return NextResponse.json({ success: true, message: 'Đã xóa loại hợp đồng' });
    }

    // ── Toggle active ──
    if (action === 'toggle') {
      const { _id, isActive } = body;

      if (!_id || !ObjectId.isValid(_id)) {
        return NextResponse.json({ success: false, message: 'ID không hợp lệ' }, { status: 400 });
      }

      await db.collection(COLLECTION).updateOne(
        { _id: new ObjectId(_id) },
        { $set: { isActive: !isActive, updatedAt: new Date() } }
      );

      return NextResponse.json({ success: true, message: `Đã ${!isActive ? 'kích hoạt' : 'tắt'} loại hợp đồng` });
    }

    return NextResponse.json({ success: false, message: 'Action không hợp lệ' }, { status: 400 });

  } catch (error) {
    console.error('Lỗi xử lý loại hợp đồng:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server nội bộ' }, { status: 500 });
  }
}
