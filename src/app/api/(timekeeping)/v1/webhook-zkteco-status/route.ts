import { NextResponse } from 'next/server';
import { getCollection } from '@/app/lib/monggodb/mongoDBCRUD';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('x-api-key') || req.headers.get('token');
    const expectedToken = process.env.HARDWARE_WEBHOOK_SECRET || 'HUPUNA_2026_SECURE_KEY';

    if (authHeader?.replace('Bearer ', '') !== expectedToken) {
      return NextResponse.json({ success: false, message: 'Từ chối truy cập. Token không hợp lệ hoặc thiếu Token.' }, { status: 401 });
    }

    const body = await req.json();
    const { event, connectorId, deviceIp, devicePort, isOnline, errorMsg } = body;

    console.log(`[WEBHOOK-STATUS] Nhận: event=${event} connectorId=${connectorId} deviceIp=${deviceIp} devicePort=${devicePort} isOnline=${isOnline}`);

    if (event !== 'device_status_change') {
      return NextResponse.json({ success: false, message: 'Sai loại sự kiện' }, { status: 400 });
    }

    if (!connectorId || !deviceIp) {
      return NextResponse.json({ success: false, message: 'Thiếu connectorId hoặc deviceIp' }, { status: 400 });
    }

    const devicesCol = await getCollection('ZktecoDevices');
    const connectorsCol = await getCollection('ZktecoConnectors');

    // Resolve connectorId: tìm theo code (local ID của edge node) hoặc _id (MongoDB ObjectId)
    let cloudConnectorId: string = connectorId;
    const connector = await connectorsCol.findOne({
      $or: [
        { code: connectorId },
        ...(ObjectId.isValid(connectorId) ? [{ _id: new ObjectId(connectorId) }] : [])
      ]
    });

    if (connector) {
      cloudConnectorId = connector._id.toString();
      console.log(`[WEBHOOK-STATUS] Resolved connectorId: "${connectorId}" → "${cloudConnectorId}"`);
    } else {
      // Connector chưa được sync hoặc code chưa được lưu — vẫn tiếp tục với ID gốc
      console.warn(`[WEBHOOK-STATUS] Không tìm thấy connector với code/id="${connectorId}". Thử khớp trực tiếp.`);
    }

    const updateFields: Record<string, unknown> = { isOnline: !!isOnline };
    if (isOnline) {
      updateFields.lastHeartbeat = new Date();
    } else if (errorMsg) {
      updateFields.lastErrorMessage = errorMsg;
      updateFields.lastErrorTime = new Date();
    }

    const updateQuery: Record<string, unknown> = { $set: updateFields };
    if (isOnline) {
      updateQuery.$unset = { lastErrorMessage: '', lastErrorTime: '' };
    }

    // Xây dựng điều kiện connectorId: khớp cả string lẫn ObjectId để tránh type mismatch trong DB
    const connectorIdFilter = ObjectId.isValid(cloudConnectorId)
      ? { $in: [cloudConnectorId, new ObjectId(cloudConnectorId)] }
      : cloudConnectorId;

    // Bỏ port khỏi filter chính — port là optional, device không có field này vẫn phải được update
    const result = await devicesCol.updateOne(
      {
        connectorId: connectorIdFilter,
        $or: [{ ipAddress: deviceIp }, { ip: deviceIp }],
        ...(devicePort ? { port: Number(devicePort) } : {}),
      },
      updateQuery
    );

    if (result.matchedCount === 0) {
      // Fallback: thử lại không có điều kiện port (thiết bị cũ hoặc thêm thủ công không có port)
      const fallbackResult = await devicesCol.updateOne(
        {
          connectorId: connectorIdFilter,
          $or: [{ ipAddress: deviceIp }, { ip: deviceIp }],
        },
        updateQuery
      );

      if (fallbackResult.matchedCount === 0) {
        console.error(
          `[WEBHOOK-STATUS] ❌ Không tìm thấy device nào. connectorId="${cloudConnectorId}" ip="${deviceIp}" port=${devicePort}`
        );
        return NextResponse.json({
          success: false,
          message: 'Không tìm thấy thiết bị phù hợp để cập nhật trạng thái',
          debug: { cloudConnectorId, deviceIp, devicePort },
        }, { status: 404 });
      }

      console.log(`[WEBHOOK-STATUS] ✅ Fallback match (no port): matched=${fallbackResult.matchedCount} modified=${fallbackResult.modifiedCount}`);
      return NextResponse.json({
        success: true,
        message: 'Cập nhật trạng thái thành công (fallback)',
        matchedCount: fallbackResult.matchedCount,
        modifiedCount: fallbackResult.modifiedCount,
      });
    }

    console.log(`[WEBHOOK-STATUS] ✅ matched=${result.matchedCount} modified=${result.modifiedCount}`);
    return NextResponse.json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: unknown) {
    console.error('[WEBHOOK-STATUS] Lỗi server:', error);
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Lỗi server' }, { status: 500 });
  }
}
