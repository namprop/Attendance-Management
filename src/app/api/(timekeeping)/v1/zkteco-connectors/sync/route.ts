import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/app/lib/monggodb/mongoDBCRUD';

export async function POST(request: Request) {
  let connectorIdToUpdate = null;
  try {
    const data = await request.json();
    const { connectorId } = data;
    connectorIdToUpdate = connectorId;

    if (!connectorId) {
      return NextResponse.json({ success: false, message: 'Thiếu connectorId' }, { status: 400 });
    }

    const connectorsCol = await getCollection('ZktecoConnectors');
    const connector = await connectorsCol.findOne({ _id: new ObjectId(connectorId) });

    if (!connector) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy Cổng' }, { status: 404 });
    }   

    // Call Connector API
    const apiKey = process.env.HARDWARE_WEBHOOK_SECRET || 'HUPUNA_2026_SECURE_KEY';
    const res = await fetch(`${connector.connectorUrl}/api/zkteco/local-devices`, {
      headers: {
        'x-api-key': apiKey,
      }
    });
    if (!res.ok) {
        throw new Error('Cổng không phản hồi hoặc URL sai');
    }

    const localData = await res.json();
    if (!localData.success) {
        throw new Error(localData.message || 'Lỗi từ Cổng');
    }

    // Lưu lại mã Cổng (code) của edge node nếu chưa có
    if (localData.connectorId && !connector.code) {
        await connectorsCol.updateOne({ _id: connector._id }, { $set: { code: localData.connectorId } });
    }

    const localDevices = localData.data || [];

    const devicesCol = await getCollection('ZktecoDevices');
    
    let syncedCount = 0;
    
    // Upsert devices
    for (const ld of localDevices) {
        const port = Number(ld.port) || 4370;
        const existing = await devicesCol.findOne({ ipAddress: ld.ip, port: port, connectorId: connectorId });
        
        if (existing) {
            // Update
            await devicesCol.updateOne(
                { _id: existing._id },
                { $set: { 
                    status: 'ACTIVE', 
                    updatedAt: new Date().toISOString() 
                }}
            );
        } else {
            // Insert
            await devicesCol.insertOne({
                deviceName: ld.name || `Máy ZKTeco (${ld.ip}:${port})`,
                connectorUrl: connector.connectorUrl,
                connectorId: connectorId,
                ipAddress: ld.ip,
                port: port,
                branchId: connector.branchId,
                branchName: connector.branchName,
                locationId: null, // Chưa có cơ sở cụ thể
                locationName: 'Chưa phân bổ',
                status: 'ACTIVE',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            syncedCount++;
        }
    }

    // Mark missing devices as OFFLINE
    const cloudDevices = await devicesCol.find({ connectorId: connectorId }).toArray();
    for (const cd of cloudDevices) {
        const stillExists = localDevices.some((ld: { ip: string; port?: number }) => ld.ip === cd.ipAddress && (Number(ld.port) || 4370) === (cd.port || 4370));
        if (!stillExists) {
            await devicesCol.updateOne(
                { _id: cd._id },
                { $set: { status: 'OFFLINE', updatedAt: new Date().toISOString() } }
            );
        }
    }

    // Update connector status
    await connectorsCol.updateOne(
        { _id: new ObjectId(connectorId) },
        { $set: { status: 'ONLINE', lastPing: new Date().toISOString() } }
    );

    return NextResponse.json({ 
        success: true, 
        message: `Đã đồng bộ thành công! Thêm mới ${syncedCount} thiết bị.`,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    
    // Nếu lỗi, đánh dấu cổng là OFFLINE
    if (connectorIdToUpdate) {
        try {
            const connectorsCol = await getCollection('ZktecoConnectors');
            await connectorsCol.updateOne(
                { _id: new ObjectId(connectorIdToUpdate) },
                { $set: { status: 'OFFLINE', lastPing: new Date().toISOString() } }
            );
        } catch(e) {}
    }

    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
