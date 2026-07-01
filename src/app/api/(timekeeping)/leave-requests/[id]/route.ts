import { NextResponse } from 'next/server';
import { ObjectId, type Db, type Document, type Filter } from 'mongodb';
import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';
import type { LeaveRequest } from '@/app/interface/timekeeping';
import { serializeLeaveRequest } from '../route';

const COLLECTION_NAME = 'leaves-timekeeping';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const MANAGER_LABEL = 'Quản lý';

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
);

const getCookieValue = (cookieHeader: string | null, key: string) => (
  cookieHeader
    ?.split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${key}=`))
    ?.slice(key.length + 1)
);

const getInfoUserFromCookie = (req: Request) => {
  const rawValue = getCookieValue(req.headers.get('cookie'), 'info_user');
  if (!rawValue) return {};

  try {
    return asRecord(JSON.parse(decodeURIComponent(rawValue)));
  } catch {
    try {
      return asRecord(JSON.parse(rawValue));
    } catch {
      return {};
    }
  }
};

const getText = (record: Record<string, unknown> | Document | null | undefined, key: string) => {
  const value = record?.[key];
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  return '';
};

const uniqueTexts = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const resolveApproverName = async (db: Db, body: Record<string, unknown>, req: Request) => {
  const approver = {
    ...getInfoUserFromCookie(req),
    ...asRecord(body.approver),
  };
  const userFilters: Filter<Document>[] = [];
  const userId = getText(approver, 'id');
  const username = getText(approver, 'username');
  const name = getText(approver, 'name');

  if (userId) {
    const numericUserId = Number(userId);
    if (!Number.isNaN(numericUserId)) userFilters.push({ id: numericUserId });
    userFilters.push({ id: userId });
    if (ObjectId.isValid(userId)) userFilters.push({ _id: new ObjectId(userId) });
  }
  if (username) userFilters.push({ username });
  if (name) userFilters.push({ name });

  const user = userFilters.length > 0
    ? await db.collection('Users').findOne({ $or: userFilters })
    : null;

  const employeeLookupValues = uniqueTexts([
    getText(approver, 'employeeCode'),
    getText(approver, 'employeeId'),
    getText(user, 'employeeCode'),
    getText(user, 'employeeId'),
  ]);
  const employeeFilters: Filter<Document>[] = [];
  const objectIds = employeeLookupValues.filter(ObjectId.isValid).map((value) => new ObjectId(value));

  if (employeeLookupValues.length > 0) {
    employeeFilters.push(
      { employeeCode: { $in: employeeLookupValues } },
      { id: { $in: employeeLookupValues } },
    );
  }
  if (objectIds.length > 0) employeeFilters.push({ _id: { $in: objectIds } });

  const employee = employeeFilters.length > 0
    ? await db.collection('employees-timekeeping').findOne({ $or: employeeFilters })
    : null;

  return getText(employee, 'fullName') || getText(employee, 'name') || MANAGER_LABEL;
};

export async function PUT(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json() as Record<string, unknown>;
    const { db } = await connectToDatabase();
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };

    // Handle update content (Edit) instead of resolve status
    if (!body.status && (body.type || body.startDate || body.endDate || body.reason)) {
      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (body.type) updateData.type = body.type;
      if (body.startDate) updateData.startDate = body.startDate;
      if (body.endDate) updateData.endDate = body.endDate;
      if (body.reason !== undefined) updateData.reason = body.reason;
      if (body.requestedMinutes !== undefined) updateData.requestedMinutes = body.requestedMinutes;

      await db.collection(COLLECTION_NAME).updateOne(filter, { $set: updateData });
      const updatedData = await db.collection(COLLECTION_NAME).findOne(filter);
      return NextResponse.json({
        data: updatedData ? serializeLeaveRequest(updatedData) : null,
        message: 'Cập nhật đơn nghỉ phép thành công',
      });
    }

    const statusRaw = String(body.status || '').toLowerCase();
    const validStatuses = ['approved', 'rejected'] as const;
    type ValidStatus = typeof validStatuses[number];

    if (!validStatuses.includes(statusRaw as ValidStatus)) {
      return NextResponse.json({ message: 'Trạng thái hoặc dữ liệu cập nhật không hợp lệ' }, { status: 400 });
    }

    const status = statusRaw as ValidStatus;

    const resolvedBy = await resolveApproverName(db, body, req);

    await db.collection(COLLECTION_NAME).updateOne(filter, {
      $set: {
        status,
        resolvedAt: new Date().toISOString(),
        resolvedBy,
        managerSignature: body.managerSignature || undefined,
        digitalSignature: body.digitalSignature || undefined,
        rejectReason: body.rejectReason || undefined,
        updatedAt: new Date(),
      },
    });

    const updated = await db.collection(COLLECTION_NAME).findOne(filter);
    if (!updated) {
      return NextResponse.json({ message: 'Không tìm thấy đơn nghỉ phép' }, { status: 404 });
    }

    if (status === 'approved' && (updated.type === 'arrive_late' || updated.type === 'leave_early')) {
      const empIdStr = updated.employeeId instanceof ObjectId ? updated.employeeId.toString() : String(updated.employeeId);

      const updateFields: Record<string, string | number | boolean | Date> = { updatedAt: new Date() } as Record<string, string | number | boolean | Date>;
      if (updated.type === 'arrive_late') {
        updateFields.lateReasonApproved = true;
        if (updated.requestedMinutes) updateFields.lateRequestedMinutes = updated.requestedMinutes;
      }
      if (updated.type === 'leave_early') {
        updateFields.earlyReasonApproved = true;
        if (updated.requestedMinutes) updateFields.earlyRequestedMinutes = updated.requestedMinutes;
      }

      await db.collection('time_records-timekeeping').updateMany(
        {
          $or: [{ employeeId: empIdStr }, { employeeId: new ObjectId(empIdStr) }],
          date: { $gte: updated.startDate, $lte: updated.endDate }
        },
        {
          $set: updateFields
        }
      );
    }

    return NextResponse.json({
      data: serializeLeaveRequest(updated),
      message: status === 'approved' ? 'Đã phê duyệt đơn nghỉ phép' : 'Đã từ chối đơn nghỉ phép',
    });
  } catch (error) {
    console.error('Failed to update leave request', error);
    return NextResponse.json({ message: 'Lỗi cập nhật đơn nghỉ phép' }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { db } = await connectToDatabase();
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };

    const existing = await db.collection(COLLECTION_NAME).findOne(filter);
    if (!existing) {
      return NextResponse.json({ message: 'Không tìm thấy đơn nghỉ phép để xóa' }, { status: 404 });
    }

    await db.collection(COLLECTION_NAME).deleteOne(filter);

    return NextResponse.json({
      success: true,
      message: 'Xóa đơn nghỉ phép thành công',
    });
  } catch (error) {
    console.error('Failed to delete leave request', error);
    return NextResponse.json({ message: 'Lỗi khi xóa đơn nghỉ phép' }, { status: 500 });
  }
}
