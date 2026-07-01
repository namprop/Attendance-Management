import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/app/lib/monggodb/mongoDBCRUD';

export async function GET(request: Request) {
  try {
    const collection = await getCollection('ZktecoDevices');
    const { searchParams } = new URL(request.url);
    
    // Tìm kiếm
    const search = searchParams.get('search');
    let query: Record<string, unknown> = {};
    if (search) {
      query = {
        $or: [
          { deviceName: { $regex: search, $options: 'i' } },
          { ipAddress: { $regex: search, $options: 'i' } },
          { ip: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    // Filter by branch or location if provided
    const branchId = searchParams.get('branchId');
    if (branchId) query.branchId = branchId;
    const locationId = searchParams.get('locationId');
    if (locationId) query.locationId = locationId;

    const devices = await collection.find(query).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ success: true, data: devices });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data.deviceName || !data.connectorUrl || !data.ipAddress || !data.locationId) {
      return NextResponse.json({ success: false, message: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const collection = await getCollection('ZktecoDevices');
    
    const newDevice = {
      ...data,
      status: data.status || 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const result = await collection.insertOne(newDevice);
    return NextResponse.json({ success: true, message: 'Thêm thiết bị thành công', data: { _id: result.insertedId, ...newDevice } });
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
      return NextResponse.json({ success: false, message: 'Thiếu ID thiết bị' }, { status: 400 });
    }

    const collection = await getCollection('ZktecoDevices');
    
    updateFields.updatedAt = new Date().toISOString();
    
    const result = await collection.updateOne(
      { _id: new ObjectId(_id) },
      { $set: updateFields }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy thiết bị' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, message: 'Cập nhật thiết bị thành công' });
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
      return NextResponse.json({ success: false, message: 'Thiếu ID thiết bị' }, { status: 400 });
    }

    const collection = await getCollection('ZktecoDevices');
    
    const result = await collection.deleteOne({ _id: new ObjectId(_id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy thiết bị' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, message: 'Đã xóa thiết bị' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
