import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';

const COLLECTION = 'online_checkin_settings-timekeeping';

const getString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const getBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

export async function GET(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = getString(searchParams.get('id'));

    if (id && ObjectId.isValid(id)) {
      const doc = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
      if (!doc) {
        return NextResponse.json({ data: null, message: 'Không tìm thấy cấu hình' }, { status: 404 });
      }
      return NextResponse.json({ data: { ...doc, _id: doc._id.toString() } });
    }

    const settings = await db
      .collection(COLLECTION)
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      data: settings.map((s) => ({ ...s, _id: s._id.toString() })),
      message: 'Lấy danh sách cấu hình thành công',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi không xác định';
    return NextResponse.json({ data: null, message: 'Lỗi server', error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();

    const enabled = getBoolean(body.enabled, true);
    // scope: 'all' | 'specific'
    const scope = getString(body.scope) || 'all';
    // employeeCodes: string[] – chỉ dùng khi scope === 'specific'
    const employeeCodes: string[] = Array.isArray(body.employeeCodes)
      ? body.employeeCodes.map((c: unknown) => getString(c)).filter(Boolean)
      : [];
    // dateMode: 'always' | 'range' | 'dates'
    const dateMode = getString(body.dateMode) || 'always';
    const dateFrom = getString(body.dateFrom);
    const dateTo = getString(body.dateTo);
    const dates: string[] = Array.isArray(body.dates)
      ? body.dates.map((d: unknown) => getString(d)).filter(Boolean)
      : [];
    const label = getString(body.label);
    const createdBy = getString(body.createdBy) || 'admin';

    const now = new Date();
    const newDoc = {
      enabled,
      scope,
      employeeCodes,
      dateMode,
      dateFrom,
      dateTo,
      dates,
      label,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection(COLLECTION).insertOne(newDoc);

    return NextResponse.json({
      data: { _id: result.insertedId.toString(), ...newDoc },
      message: 'Tạo cấu hình thành công',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi không xác định';
    return NextResponse.json({ data: null, message: 'Lỗi server', error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();
    const id = getString(body._id);

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ data: null, message: 'Thiếu _id hợp lệ' }, { status: 400 });
    }

    const updateFields: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.enabled === 'boolean') updateFields.enabled = body.enabled;
    if (body.scope) updateFields.scope = getString(body.scope);
    if (Array.isArray(body.employeeCodes)) {
      updateFields.employeeCodes = body.employeeCodes.map((c: unknown) => getString(c)).filter(Boolean);
    }
    if (body.dateMode) updateFields.dateMode = getString(body.dateMode);
    if (body.dateFrom !== undefined) updateFields.dateFrom = getString(body.dateFrom);
    if (body.dateTo !== undefined) updateFields.dateTo = getString(body.dateTo);
    if (Array.isArray(body.dates)) {
      updateFields.dates = body.dates.map((d: unknown) => getString(d)).filter(Boolean);
    }
    if (body.label !== undefined) updateFields.label = getString(body.label);

    const result = await db
      .collection(COLLECTION)
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateFields },
        { returnDocument: 'after' },
      );

    if (!result) {
      return NextResponse.json({ data: null, message: 'Không tìm thấy cấu hình' }, { status: 404 });
    }

    return NextResponse.json({
      data: { ...result, _id: result._id.toString() },
      message: 'Cập nhật cấu hình thành công',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi không xác định';
    return NextResponse.json({ data: null, message: 'Lỗi server', error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = getString(searchParams.get('id'));

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ data: null, message: 'Thiếu _id hợp lệ' }, { status: 400 });
    }

    const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ data: null, message: 'Không tìm thấy cấu hình' }, { status: 404 });
    }

    return NextResponse.json({ data: null, message: 'Xóa cấu hình thành công' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi không xác định';
    return NextResponse.json({ data: null, message: 'Lỗi server', error: msg }, { status: 500 });
  }
}
