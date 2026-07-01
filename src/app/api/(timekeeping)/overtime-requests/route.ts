import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';
import type { OvertimeRequest } from '@/app/interface/timekeeping';

export const dynamic = 'force-dynamic';

const COLLECTION = 'overtime-requests-timekeeping';

/** Tính số phút giữa hai chuỗi HH:mm */
function calcMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function serialize(doc: Record<string, unknown>): OvertimeRequest {
  const id = doc._id instanceof ObjectId ? doc._id.toString() : String(doc._id || doc.id || '');
  return {
    ...doc,
    _id: id,
    id,
    employeeId:     String(doc.employeeId || ''),
    employeeCode:   String(doc.employeeCode || ''),
    employeeName:   String(doc.employeeName || ''),
    department:     String(doc.department || ''),
    departmentId:   String(doc.departmentId || ''),
    branchId:       String(doc.branchId || ''),
    locationId:     String(doc.locationId || ''),
    date:           String(doc.date || ''),
    overtimeStart:  String(doc.overtimeStart || ''),
    overtimeEnd:    String(doc.overtimeEnd || ''),
    plannedMinutes: Number(doc.plannedMinutes || 0),
    overtimeType:   doc.overtimeType ? String(doc.overtimeType) : undefined,
    workMode:       doc.workMode ? String(doc.workMode) as 'online' | 'offline' : undefined,
    reason:         String(doc.reason || ''),
    status:         (doc.status as OvertimeRequest['status']) || 'pending',
    actualMinutes:  doc.actualMinutes !== undefined ? Number(doc.actualMinutes) : undefined,
    resolvedBy:     doc.resolvedBy ? String(doc.resolvedBy) : undefined,
    resolvedAt:     doc.resolvedAt ? String(doc.resolvedAt) : undefined,
    requestedAt:    String(doc.requestedAt || doc.createdAt || ''),
    createdAt:      doc.createdAt ? String(doc.createdAt) : undefined,
    updatedAt:      doc.updatedAt ? String(doc.updatedAt) : undefined,
  } as OvertimeRequest;
}

export async function GET(req: Request) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const page     = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    const search   = (searchParams.get('search') || '').trim();
    const status   = searchParams.get('status') || '';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate   = searchParams.get('toDate') || '';
    const employeeId = searchParams.get('employeeId') || '';

    const and: Record<string, unknown>[] = [];

    if (fromDate || toDate) {
      const range: Record<string, string> = {};
      if (fromDate) range.$gte = fromDate;
      if (toDate)   range.$lte = toDate;
      and.push({ date: range });
    }
    if (status)     and.push({ status: { $regex: `^${status}$`, $options: 'i' } });
    if (employeeId) and.push({ $or: [{ employeeId }, { employeeCode: employeeId }] });
    if (search) {
      and.push({
        $or: [
          { employeeName: { $regex: search, $options: 'i' } },
          { employeeCode: { $regex: search, $options: 'i' } },
          { reason:       { $regex: search, $options: 'i' } },
        ],
      });
    }

    const match = and.length > 0 ? { $and: and } : {};
    const total = await db.collection(COLLECTION).countDocuments(match);
    const docs  = await db.collection(COLLECTION)
      .find(match)
      .sort({ date: -1, requestedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();

    return NextResponse.json({
      success: true,
      data: docs.map(d => serialize(d as Record<string, unknown>)),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('[overtime-requests] GET error', error);
    return NextResponse.json({ success: false, message: 'Lỗi tải danh sách tăng ca' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      employeeId, employeeCode, employeeName,
      department, departmentId, branchId, locationId,
      date, overtimeStart, overtimeEnd, reason,
      status = 'pending', overtimeType, workMode,
    } = body;

    if (!employeeId || !date || !overtimeStart || !overtimeEnd || !reason) {
      return NextResponse.json({ success: false, message: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const plannedMinutes = calcMinutes(String(overtimeStart), String(overtimeEnd));
    if (plannedMinutes <= 0) {
      return NextResponse.json({ success: false, message: 'Giờ kết thúc phải sau giờ bắt đầu' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const now = new Date();
    const doc = {
      employeeId:     String(employeeId),
      employeeCode:   String(employeeCode || employeeId),
      employeeName:   String(employeeName || ''),
      department:     String(department || ''),
      departmentId:   String(departmentId || ''),
      branchId:       String(branchId || ''),
      locationId:     String(locationId || ''),
      date:           String(date),
      overtimeStart:  String(overtimeStart),
      overtimeEnd:    String(overtimeEnd),
      plannedMinutes,
      overtimeType:   overtimeType ? String(overtimeType) : '1',
      workMode:       workMode ? String(workMode) : 'offline',
      reason:         String(reason),
      status:         status as OvertimeRequest['status'],
      requestedAt:    now.toISOString(),
      createdAt:      now,
      updatedAt:      now,
    };

    const result   = await db.collection(COLLECTION).insertOne(doc);
    const inserted = await db.collection(COLLECTION).findOne({ _id: result.insertedId });

    return NextResponse.json({
      success: true,
      message: 'Tạo đơn tăng ca thành công',
      data: inserted ? serialize(inserted as Record<string, unknown>) : null,
    });
  } catch (error) {
    console.error('[overtime-requests] POST error', error);
    return NextResponse.json({ success: false, message: 'Lỗi tạo đơn tăng ca' }, { status: 500 });
  }
}
