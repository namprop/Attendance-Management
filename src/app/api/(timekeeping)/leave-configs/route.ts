import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';

const COLLECTION_NAME = 'leave_configs';

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const config = await db.collection(COLLECTION_NAME).findOne({});
    
    if (!config) {
      // Return default config if none exists
      return NextResponse.json({
        data: {
          allowPastDates: false,
          maxPastDays: 0,
          allowFutureDates: true,
          maxFutureDays: 30,
          requireHandover: false,
          requireApprovalLevels: 1,
          maxLeaveDaysPerMonth: 0,
          allowHalfDayLeave: true,
          limitLateEarlyMinutes: 120,
        }
      });
    }

    return NextResponse.json({ data: config });
  } catch (error) {
    console.error('Lỗi khi lấy cấu hình đơn xin nghỉ:', error);
    return NextResponse.json({ error: 'Lỗi server nội bộ' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();

    const updateData = {
      allowPastDates: body.allowPastDates ?? false,
      maxPastDays: body.maxPastDays ?? 0,
      allowFutureDates: body.allowFutureDates ?? true,
      maxFutureDays: body.maxFutureDays ?? 30,
      requireHandover: body.requireHandover ?? false,
      requireApprovalLevels: body.requireApprovalLevels ?? 1,
      maxLeaveDaysPerMonth: body.maxLeaveDaysPerMonth ?? 0,
      allowHalfDayLeave: body.allowHalfDayLeave ?? true,
      limitLateEarlyMinutes: body.limitLateEarlyMinutes ?? 120,
      updatedAt: new Date(),
    };

    const existing = await db.collection(COLLECTION_NAME).findOne({});

    if (existing) {
      await db.collection(COLLECTION_NAME).updateOne(
        { _id: existing._id },
        { $set: updateData }
      );
    } else {
      await db.collection(COLLECTION_NAME).insertOne({
        ...updateData,
        createdAt: new Date(),
      });
    }

    const newConfig = await db.collection(COLLECTION_NAME).findOne({});

    return NextResponse.json({ 
      success: true, 
      message: 'Cập nhật cấu hình thành công',
      data: newConfig 
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật cấu hình đơn xin nghỉ:', error);
    return NextResponse.json({ error: 'Lỗi server nội bộ' }, { status: 500 });
  }
}
