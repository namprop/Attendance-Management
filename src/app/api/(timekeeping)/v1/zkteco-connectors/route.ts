import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/app/lib/monggodb/mongoDBCRUD';

export async function GET(request: Request) {
  try {
    const collection = await getCollection('ZktecoConnectors');
    const { searchParams } = new URL(request.url);
    
    // Tìm kiếm
    const search = searchParams.get('search');
    let query: Record<string, unknown> = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { connectorUrl: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    const branchId = searchParams.get('branchId');
    if (branchId) query.branchId = branchId;

    const connectors = await collection.find(query).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ success: true, data: connectors });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data.name || !data.connectorUrl || !data.branchId) {
      return NextResponse.json({ success: false, message: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const collection = await getCollection('ZktecoConnectors');
    
    // Check trùng URL
    const existing = await collection.findOne({ connectorUrl: data.connectorUrl });
    if (existing) {
        return NextResponse.json({ success: false, message: 'Connector URL này đã tồn tại' }, { status: 400 });
    }

    const newConnector = {
      ...data,
      status: 'ONLINE', // Giả định online lúc mới thêm
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastPing: new Date().toISOString(),
    };
    
    const result = await collection.insertOne(newConnector);
    return NextResponse.json({ success: true, message: 'Thêm Cổng Trung Chuyển thành công', data: { _id: result.insertedId, ...newConnector } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { _id, ...updateFields } = data;
    
    if (!_id) {
      return NextResponse.json({ success: false, message: 'Thiếu ID Cổng' }, { status: 400 });
    }

    const collection = await getCollection('ZktecoConnectors');
    
    updateFields.updatedAt = new Date().toISOString();
    
    const result = await collection.updateOne(
      { _id: new ObjectId(_id) },
      { $set: updateFields }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy Cổng' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, message: 'Cập nhật Cổng thành công' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const data = await request.json();
    const { _id } = data;
    
    if (!_id) {
      return NextResponse.json({ success: false, message: 'Thiếu ID Cổng' }, { status: 400 });
    }

    const collection = await getCollection('ZktecoConnectors');
    
    const result = await collection.deleteOne({ _id: new ObjectId(_id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy Cổng' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, message: 'Đã xóa Cổng' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
