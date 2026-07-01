import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subscription, role } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu subscription không hợp lệ' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('push_subscriptions-timekeeping');

    // Sử dụng upsert: nếu endpoint đã tồn tại thì cập nhật, chưa có thì thêm mới.
    // Việc này tránh tạo ra nhiều bản ghi trùng lặp cho cùng một thiết bị/trình duyệt.
    await collection.updateOne(
      { 'subscription.endpoint': subscription.endpoint },
      { 
        $set: {
          subscription,
          role,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, message: 'Đăng ký nhận thông báo thành công' });
  } catch (error) {
    console.error('Lỗi khi lưu push subscription:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
}
