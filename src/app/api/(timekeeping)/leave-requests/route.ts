import { NextResponse } from 'next/server';
import { ObjectId, type Document } from 'mongodb';
import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';
import type { LeaveRequest } from '@/app/interface/timekeeping';

export const dynamic = 'force-dynamic';

const COLLECTION_NAME = 'leaves-timekeeping';

const toDateString = (value: unknown) => {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text : date.toISOString().slice(0, 10);
};

const normalizeStatus = (value: unknown): LeaveRequest['status'] => {
  const status = String(value || '').toLowerCase();
  if (status === 'approved') return 'approved';
  if (status === 'rejected') return 'rejected';
  return 'pending';
};

export const serializeLeaveRequest = (doc: Document): LeaveRequest => {
  const id = doc._id instanceof ObjectId ? doc._id.toString() : String(doc.id || doc._id || '');
  const employeeId = doc.employeeId instanceof ObjectId ? doc.employeeId.toString() : String(doc.employeeId || doc.employeeCode || '');
  const startDate = toDateString(doc.startDate || doc.date);
  const endDate = toDateString(doc.endDate || doc.date || doc.startDate);

  return {
    ...(doc as Record<string, unknown>),
    id,
    employeeId,
    employeeCode: String(doc.employeeCode || doc.employeeId || ''),
    employeeName: String(doc.employeeName || ''),
    employeeRole: String(doc.employeeRole || ''),
    department: String(doc.department || ''),
    departmentId: String(doc.departmentId || ''),
    branch: String(doc.branch || ''),
    branchId: String(doc.branchId || ''),
    locationId: String(doc.locationId || ''),
    deptGroupId: String(doc.deptGroupId || ''),
    phone: String(doc.phone || ''),
    address: String(doc.address || ''),
    type: String(doc.type || 'annual'),
    startDate,
    endDate,
    reason: String(doc.reason || ''),
    handoverTo: String(doc.handoverTo || ''),
    handoverDept: String(doc.handoverDept || ''),
    handoverTasks: String(doc.handoverTasks || ''),
    status: normalizeStatus(doc.status),
    requestedAt: String(doc.requestedAt || doc.createdAt || new Date().toISOString()),
    resolvedAt: doc.resolvedAt ? String(doc.resolvedAt) : undefined,
    resolvedBy: doc.resolvedBy ? String(doc.resolvedBy) : undefined,
  } as unknown as LeaveRequest;
};

export async function GET(req: Request) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)));
    const search = (searchParams.get('search') || '').trim();
    const statusFilter = searchParams.get('status') || '';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';
    const createdFrom = searchParams.get('createdFrom') || '';
    const createdTo = searchParams.get('createdTo') || '';
    const resolvedFrom = searchParams.get('resolvedFrom') || '';
    const resolvedTo = searchParams.get('resolvedTo') || '';
    const typeFilter = searchParams.get('type') || '';
    const branchFilter = searchParams.get('branch') || '';
    const locationFilter = searchParams.get('location') || '';
    const deptGroupFilter = searchParams.get('deptGroup') || '';
    const departmentFilter = searchParams.get('department') || '';

    const branchNameFilter = searchParams.get('branchName') || '';
    const departmentNameFilter = searchParams.get('departmentName') || '';

    const match: Record<string, unknown> = {};
    const andConditions: Record<string, unknown>[] = [];

    if (fromDate || toDate) {
      const dateRange: Record<string, string> = {};
      if (fromDate) dateRange.$gte = fromDate;
      if (toDate) dateRange.$lte = toDate;
      andConditions.push({ startDate: dateRange });
    }

    if (createdFrom || createdTo) {
      const createdRange: Record<string, string> = {};
      // Append time to include the full day
      if (createdFrom) createdRange.$gte = `${createdFrom}T00:00:00.000Z`;
      if (createdTo) createdRange.$lte = `${createdTo}T23:59:59.999Z`;
      andConditions.push({ 
        $or: [
          { requestedAt: createdRange },
          { createdAt: createdRange }
        ]
      });
    }

    if (resolvedFrom || resolvedTo) {
      const resolvedRange: Record<string, string> = {};
      if (resolvedFrom) resolvedRange.$gte = `${resolvedFrom}T00:00:00.000Z`;
      if (resolvedTo) resolvedRange.$lte = `${resolvedTo}T23:59:59.999Z`;
      andConditions.push({ resolvedAt: resolvedRange });
    }

    if (search) {
      andConditions.push({
        $or: [
          { employeeId: { $regex: search, $options: 'i' } },
          { employeeCode: { $regex: search, $options: 'i' } },
          { employeeName: { $regex: search, $options: 'i' } },
          { reason: { $regex: search, $options: 'i' } },
          { type: { $regex: search, $options: 'i' } },
        ]
      });
    }

    if (statusFilter) {
      andConditions.push({ status: { $regex: `^${statusFilter}$`, $options: 'i' } });
    }
    if (typeFilter) {
      andConditions.push({ type: typeFilter });
    }
    
    if (branchFilter) {
      if (branchNameFilter) {
        andConditions.push({ $or: [{ branchId: branchFilter }, { branch: branchNameFilter }] });
      } else {
        andConditions.push({ branchId: branchFilter });
      }
    }
    
    if (departmentFilter) {
      if (departmentNameFilter) {
        andConditions.push({ $or: [{ departmentId: departmentFilter }, { department: departmentNameFilter }] });
      } else {
        andConditions.push({ departmentId: departmentFilter });
      }
    }

    if (locationFilter) andConditions.push({ locationId: locationFilter });
    if (deptGroupFilter) andConditions.push({ deptGroupId: deptGroupFilter });

    if (andConditions.length > 0) {
      match.$and = andConditions;
    }

    const total = await db.collection(COLLECTION_NAME).countDocuments(match);

    const leaves = await db.collection(COLLECTION_NAME)
      .find(match)
      .sort({ requestedAt: -1, createdAt: -1, _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();

    const resolvedByCodes = [...new Set(leaves.map(l => String(l.resolvedBy || '').trim()).filter(Boolean))];
    const employeeMap: Record<string, string> = {};
    const approverMap: Record<string, string> = {};
    if (resolvedByCodes.length > 0) {
      const linkedUsers = await db.collection('Users')
        .find({
          $or: [
            { username: { $in: resolvedByCodes } },
            { name: { $in: resolvedByCodes } },
            { employeeCode: { $in: resolvedByCodes } },
          ],
        })
        .toArray();

      const linkedEmployeeValues = [
        ...resolvedByCodes,
        ...linkedUsers.flatMap(user => [
          String(user.employeeCode || '').trim(),
          String(user.employeeId || '').trim(),
        ]),
      ].filter(Boolean);
      const employeeObjectIds = linkedEmployeeValues
        .filter(ObjectId.isValid)
        .map(value => new ObjectId(value));
      const employeeFilters: Document[] = [
        { employeeCode: { $in: linkedEmployeeValues } },
        { id: { $in: linkedEmployeeValues } },
        { fullName: { $in: linkedEmployeeValues } },
        { name: { $in: linkedEmployeeValues } },
      ];
      if (employeeObjectIds.length > 0) {
        employeeFilters.push({ _id: { $in: employeeObjectIds } });
      }

      const employees = await db.collection('employees-timekeeping')
        .find({ $or: employeeFilters })
        .toArray();

      const employeeIdMap: Record<string, string> = {};
      employees.forEach(emp => {
        const displayName = String(emp.fullName || emp.name || '').trim();
        if (!displayName) return;
        if (emp.employeeCode) employeeMap[String(emp.employeeCode)] = displayName;
        if (emp.fullName) employeeMap[String(emp.fullName)] = displayName;
        if (emp.name) employeeMap[String(emp.name)] = displayName;
        if (emp.id) employeeIdMap[String(emp.id)] = displayName;
        if (emp._id) employeeIdMap[String(emp._id)] = displayName;
      });

      linkedUsers.forEach(user => {
        const displayName = employeeMap[String(user.employeeCode || '').trim()]
          || employeeIdMap[String(user.employeeId || '').trim()];
        if (!displayName) return;
        if (user.username) approverMap[String(user.username).trim()] = displayName;
        if (user.name) approverMap[String(user.name).trim()] = displayName;
        if (user.id) approverMap[String(user.id).trim()] = displayName;
        if (user._id) approverMap[String(user._id).trim()] = displayName;
      });
    }

    const data = leaves.map(l => {
      const serialized = serializeLeaveRequest(l);
      const resBy = String(serialized.resolvedBy || '').trim().toUpperCase();
      
      if (resBy === 'ADMIN') {
        serialized.resolvedBy = 'Quản trị viên';
      } else if (resBy === 'EMP002') {
        serialized.resolvedBy = 'Quản lý';
      } else if (serialized.resolvedBy && employeeMap[serialized.resolvedBy]) {
        serialized.resolvedBy = employeeMap[serialized.resolvedBy];
      } else if (serialized.resolvedBy && approverMap[serialized.resolvedBy]) {
        serialized.resolvedBy = approverMap[serialized.resolvedBy];
      } else if (serialized.resolvedBy) {
        serialized.resolvedBy = 'Quản lý';
      }
      return serialized;
    });

    return NextResponse.json({
      debugTest: "hello_from_api",
      data,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Failed to list leave requests', error);
    return NextResponse.json({ data: [], message: 'Lỗi lấy danh sách đơn nghỉ phép' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const employeeId = String(body.employeeId || '').trim();
    const type = String(body.type || '').trim();
    const startDate = String(body.startDate || '').trim();
    const endDate = String(body.endDate || '').trim();
    const reason = String(body.reason || '').trim();

    if (!employeeId || !type || !startDate || !endDate || !reason) {
      return NextResponse.json({ message: 'Thiếu thông tin tạo đơn nghỉ phép' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const doc = {
      employeeId,
      employeeCode: body.employeeCode || employeeId,
      employeeName: body.employeeName || '',
      employeeRole: body.employeeRole || '',
      department: body.department || '',
      departmentId: body.departmentId || '',
      branch: body.branch || '',
      branchId: body.branchId || '',
      locationId: body.locationId || '',
      deptGroupId: body.deptGroupId || '',
      phone: body.phone || '',
      address: body.address || '',
      type,
      startDate,
      endDate,
      requestedMinutes: body.requestedMinutes ? Number(body.requestedMinutes) : undefined,
      reason,
      handoverTo: body.handoverTo || '',
      handoverDept: body.handoverDept || '',
      handoverTasks: body.handoverTasks || '',
      status: 'pending',
      requestedAt: new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection(COLLECTION_NAME).insertOne(doc);
    const inserted = await db.collection(COLLECTION_NAME).findOne({ _id: result.insertedId });

    return NextResponse.json({
      data: inserted ? serializeLeaveRequest(inserted) : { ...doc, id: result.insertedId.toString() },
      message: 'Đã lưu đơn nghỉ phép',
    });
  } catch (error) {
    console.error('Failed to create leave request', error);
    return NextResponse.json({ message: 'Lỗi tạo đơn nghỉ phép' }, { status: 500 });
  }
}
