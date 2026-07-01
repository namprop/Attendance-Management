import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import type { Filter } from 'mongodb';
import { getCollection } from '@/app/lib/monggodb/mongoDBCRUD';
import type { ShiftConfig } from '@/app/interface/timekeeping';

const COLLECTION_NAME = 'shift_configs-timekeeping';

type ShiftConfigDocument = Omit<ShiftConfig, '_id'> & { _id?: ObjectId } & Record<string, unknown>;

function readString(source: Record<string, unknown>, key: keyof ShiftConfig, fallback = '') {
  const value = source[key];
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function readBoolean(source: Record<string, unknown>, key: keyof ShiftConfig, fallback = true) {
  const value = source[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return fallback;
}

function readStringArray(source: Record<string, unknown>, key: keyof ShiftConfig, fallback: string[] = []) {
  const value = source[key];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (value === null || value === undefined) return fallback;
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function readObjectIdArray(source: Record<string, unknown>, key: keyof ShiftConfig, fallback: (string | ObjectId)[] = []) {
  const arr = readStringArray(source, key, fallback as string[]);
  return arr.map(id => ObjectId.isValid(id) ? new ObjectId(id) : id);
}

function orderShiftConfigDocument(doc: ShiftConfigDocument): ShiftConfigDocument {
  return {
    ...(doc._id ? { _id: doc._id } : {}),
    id: doc.id,
    code: doc.code,
    name: doc.name,
    branchIds: doc.branchIds || [],
    locationIds: doc.locationIds || [],
    departmentGroupIds: doc.departmentGroupIds || [],
    departmentIds: doc.departmentIds || [],
    assignedEmployeeCodes: doc.assignedEmployeeCodes || [],
    startTime: doc.startTime,
    endTime: doc.endTime,
    crossDayCount: doc.crossDayCount,
    breakStartTime: doc.breakStartTime,
    breakEndTime: doc.breakEndTime,
    totalMinutes: doc.totalMinutes,
    workUnit: doc.workUnit,
    validCheckInStart: doc.validCheckInStart,
    validCheckInEnd: doc.validCheckInEnd,
    validCheckOutStart: doc.validCheckOutStart,
    validCheckOutEnd: doc.validCheckOutEnd,
    noCheckOutMinutes: doc.noCheckOutMinutes,
    noCheckInMinutes: doc.noCheckInMinutes,
    displayOrder: doc.displayOrder,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function buildShiftConfigDocument(
  body: Record<string, unknown>,
  options: { id: string; current?: ShiftConfigDocument },
): ShiftConfigDocument {
  const { id, current } = options;

  return orderShiftConfigDocument({
    id,
    code: readString(body, 'code', current?.code || '').trim(),
    name: readString(body, 'name', current?.name || '').trim(),
    branchIds: readObjectIdArray(body, 'branchIds', current?.branchIds || []) as string[],
    locationIds: readObjectIdArray(body, 'locationIds', current?.locationIds || []) as string[],
    departmentGroupIds: readObjectIdArray(body, 'departmentGroupIds', current?.departmentGroupIds || []) as string[],
    departmentIds: readObjectIdArray(body, 'departmentIds', current?.departmentIds || []) as string[],
    assignedEmployeeCodes: readStringArray(body, 'assignedEmployeeCodes', current?.assignedEmployeeCodes || []),
    startTime: readString(body, 'startTime', current?.startTime || '').trim(),
    endTime: readString(body, 'endTime', current?.endTime || '').trim(),
    crossDayCount: readString(body, 'crossDayCount', current?.crossDayCount || '0').trim(),
    breakStartTime: readString(body, 'breakStartTime', current?.breakStartTime || '').trim(),
    breakEndTime: readString(body, 'breakEndTime', current?.breakEndTime || '').trim(),
    totalMinutes: readString(body, 'totalMinutes', current?.totalMinutes || '0').trim(),
    workUnit: readString(body, 'workUnit', current?.workUnit || '1').trim(),
    validCheckInStart: readString(body, 'validCheckInStart', current?.validCheckInStart || '').trim(),
    validCheckInEnd: readString(body, 'validCheckInEnd', current?.validCheckInEnd || '').trim(),
    validCheckOutStart: readString(body, 'validCheckOutStart', current?.validCheckOutStart || '').trim(),
    validCheckOutEnd: readString(body, 'validCheckOutEnd', current?.validCheckOutEnd || '').trim(),
    noCheckOutMinutes: readString(body, 'noCheckOutMinutes', current?.noCheckOutMinutes || '0').trim(),
    noCheckInMinutes: readString(body, 'noCheckInMinutes', current?.noCheckInMinutes || '0').trim(),
    displayOrder: readString(body, 'displayOrder', current?.displayOrder || '1').trim(),
    isActive: readBoolean(body, 'isActive', current?.isActive ?? true),
    createdAt: current?.createdAt || new Date(),
    updatedAt: new Date(),
  });
}

function serializeShiftConfig(doc: ShiftConfigDocument): ShiftConfig {
  return {
    _id: doc._id?.toString(),
    id: doc.id,
    code: doc.code,
    name: doc.name,
    branchIds: (doc.branchIds || []).map(id => id?.toString() || ''),
    locationIds: (doc.locationIds || []).map(id => id?.toString() || ''),
    departmentGroupIds: (doc.departmentGroupIds || []).map(id => id?.toString() || ''),
    departmentIds: (doc.departmentIds || []).map(id => id?.toString() || ''),
    assignedEmployeeCodes: doc.assignedEmployeeCodes || [],
    startTime: doc.startTime,
    endTime: doc.endTime,
    crossDayCount: doc.crossDayCount,
    breakStartTime: doc.breakStartTime,
    breakEndTime: doc.breakEndTime,
    totalMinutes: doc.totalMinutes,
    workUnit: doc.workUnit,
    validCheckInStart: doc.validCheckInStart,
    validCheckInEnd: doc.validCheckInEnd,
    validCheckOutStart: doc.validCheckOutStart,
    validCheckOutEnd: doc.validCheckOutEnd,
    noCheckOutMinutes: doc.noCheckOutMinutes,
    noCheckInMinutes: doc.noCheckInMinutes,
    displayOrder: doc.displayOrder,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function sortShiftConfigs(a: ShiftConfigDocument, b: ShiftConfigDocument) {
  const orderA = Number(a.displayOrder);
  const orderB = Number(b.displayOrder);
  const safeOrderA = Number.isFinite(orderA) ? orderA : Number.MAX_SAFE_INTEGER;
  const safeOrderB = Number.isFinite(orderB) ? orderB : Number.MAX_SAFE_INTEGER;

  return safeOrderA - safeOrderB || Number(a.id) - Number(b.id) || a.code.localeCompare(b.code);
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json();
  return typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
}

function resolveObjectId(value: string) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

function getLookupFilter(source: Record<string, unknown>): { filter?: Filter<ShiftConfigDocument>; error?: string } {
  const mongoId = readString(source, '_id').trim();
  if (mongoId) {
    const objectId = resolveObjectId(mongoId);
    if (!objectId) return { error: 'Invalid _id' };
    return { filter: { _id: objectId } };
  }

  const id = readString(source, 'id').trim();
  if (id) return { filter: { id } };

  return { error: 'Missing _id or id' };
}

async function ensureSequentialIdsAndFieldOrder() {
  const collection = await getCollection<ShiftConfigDocument>(COLLECTION_NAME);
  const docs = (await collection.find({}).toArray()).sort(sortShiftConfigs);
  const usedIds = new Set<string>();
  let nextId = 1;

  for (const doc of docs) {
    const existingId = typeof doc.id === 'string' ? doc.id.trim() : '';
    let assignedId = existingId;

    if (existingId && !usedIds.has(existingId)) {
      usedIds.add(existingId);
      const numericId = Number(existingId);
      if (Number.isFinite(numericId) && numericId >= nextId) nextId = numericId + 1;
    } else {
      while (usedIds.has(String(nextId))) nextId += 1;
      assignedId = String(nextId);
      usedIds.add(assignedId);
      nextId += 1;
    }

    await collection.replaceOne(
      { _id: doc._id },
      orderShiftConfigDocument({
        ...doc,
        id: assignedId,
        updatedAt: assignedId === existingId ? doc.updatedAt : new Date(),
      }),
    );
  }
}

async function getNextSequentialId() {
  await ensureSequentialIdsAndFieldOrder();

  const collection = await getCollection<ShiftConfigDocument>(COLLECTION_NAME);
  const docs = await collection.find({}).toArray();
  const maxId = docs.reduce((max, item) => {
    const numericId = Number(item.id);
    return Number.isFinite(numericId) ? Math.max(max, numericId) : max;
  }, 0);

  return String(maxId + 1);
}

async function findDuplicateCode(code: string, excludedObjectId?: ObjectId) {
  const collection = await getCollection<ShiftConfigDocument>(COLLECTION_NAME);
  const filter: Filter<ShiftConfigDocument> = excludedObjectId
    ? { code, _id: { $ne: excludedObjectId } }
    : { code };

  return collection.findOne(filter);
}

export async function GET() {
  try {
    await ensureSequentialIdsAndFieldOrder();

    const collection = await getCollection<ShiftConfigDocument>(COLLECTION_NAME);
    const data = (await collection.find({}).toArray()).sort(sortShiftConfigs);

    return NextResponse.json({
      success: true,
      data: data.map(serializeShiftConfig),
      total: data.length,
    });
  } catch (error) {
    console.error(`Failed to read ${COLLECTION_NAME} collection`, error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const payload = buildShiftConfigDocument(body, { id: await getNextSequentialId() });

    if (!payload.code || !payload.name) {
      return NextResponse.json({ success: false, message: 'Missing code or name' }, { status: 400 });
    }

    const duplicate = await findDuplicateCode(payload.code);
    if (duplicate) {
      return NextResponse.json({ success: false, message: 'Shift code already exists' }, { status: 409 });
    }

    const collection = await getCollection<ShiftConfigDocument>(COLLECTION_NAME);
    const result = await collection.insertOne(payload);
    const added = await collection.findOne({ _id: result.insertedId });

    return NextResponse.json({
      success: true,
      data: added ? serializeShiftConfig(added) : serializeShiftConfig({ ...payload, _id: result.insertedId }),
    });
  } catch (error) {
    console.error(`Failed to create ${COLLECTION_NAME} document`, error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await readJsonBody(request);
    const lookup = getLookupFilter(body);

    if (!lookup.filter) {
      return NextResponse.json({ success: false, message: lookup.error }, { status: 400 });
    }

    const collection = await getCollection<ShiftConfigDocument>(COLLECTION_NAME);
    const current = await collection.findOne(lookup.filter);

    if (!current?._id) {
      return NextResponse.json({ success: false, message: 'Shift config not found' }, { status: 404 });
    }

    const payload = buildShiftConfigDocument(body, { id: current.id, current });
    const duplicate = await findDuplicateCode(payload.code, current._id);
    if (duplicate) {
      return NextResponse.json({ success: false, message: 'Shift code already exists' }, { status: 409 });
    }

    await collection.replaceOne(
      { _id: current._id },
      orderShiftConfigDocument({
        ...payload,
        _id: current._id,
      }),
    );

    const updated = await collection.findOne({ _id: current._id });

    return NextResponse.json({
      success: true,
      data: updated ? serializeShiftConfig(updated) : undefined,
    });
  } catch (error) {
    console.error(`Failed to update ${COLLECTION_NAME} document`, error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deleteAll = searchParams.get('deleteAll') === 'true';

    const collection = await getCollection<ShiftConfigDocument>(COLLECTION_NAME);
    if (deleteAll) {
      await collection.deleteMany({});
      return NextResponse.json({ success: true });
    }

    const lookup = getLookupFilter({
      _id: searchParams.get('_id') || '',
      id: searchParams.get('id') || '',
    });

    if (!lookup.filter) {
      return NextResponse.json({ success: false, message: lookup.error }, { status: 400 });
    }

    const result = await collection.deleteOne(lookup.filter);

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, message: 'Shift config not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Failed to delete ${COLLECTION_NAME} document`, error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
