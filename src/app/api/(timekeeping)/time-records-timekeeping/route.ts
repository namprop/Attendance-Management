import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { addRow, getAllRows, getCollection } from '@/app/lib/monggodb/mongoDBCRUD';
import type { TimeRecordTimekeeping } from '@/app/interface/timekeeping';
import {
  ensureTimeRecordIndexes as ensureTimeRecordServiceIndexes,
  getTimeRecordsList,
} from '@/app/lib/timekeeping/timeRecordsService';

const COLLECTION_NAME = 'time_records-timekeeping';
let indexPromise: Promise<void> | null = null;

type DocumentType = Omit<TimeRecordTimekeeping, '_id'> & {
  _id?: ObjectId;
} & Record<string, unknown>;

type SortOrder = 'asc' | 'desc';
type SortOption = { field: keyof DocumentType; order?: SortOrder };

type TimeRecordRequestBody = Partial<Omit<TimeRecordTimekeeping, '_id'>> & {
  action?: unknown;
  _id?: unknown;
  approvedBy?: unknown;
  detailEndDate?: unknown;
  detailStartDate?: unknown;
  endDate?: unknown;
  filters?: unknown;
  limit?: unknown;
  page?: unknown;
  pageSize?: unknown;
  search?: unknown;
  selectedBranchId?: unknown;
  selectedBranchIds?: unknown;
  selectedDeptId?: unknown;
  selectedDeptIds?: unknown;
  selectedGroupId?: unknown;
  selectedGroupIds?: unknown;
  selectedLocationId?: unknown;
  selectedLocationIds?: unknown;
  skip?: unknown;
  sort?: unknown;
  startDate?: unknown;
} & Record<string, unknown>;

const DEFAULT_SORT: SortOption[] = [
  { field: 'date', order: 'desc' },
  { field: 'clockIn', order: 'desc' },
  { field: 'createdAt', order: 'desc' },
  { field: '_id', order: 'desc' },
];

const SORTABLE_FIELDS = new Set<keyof DocumentType>([
  '_id',
  'clockIn',
  'clockOut',
  'createdAt',
  'date',
  'deviceType',
  'earlyMinutes',
  'employeeId',
  'lateMinutes',
  'shiftId',
  'updatedAt',
]);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const getString = (value: unknown): string | undefined => (
  typeof value === 'string' ? value.trim() : undefined
);

const getStringArray = (value: unknown, fallback?: unknown): string[] | undefined => {
  const source = value ?? fallback;
  if (Array.isArray(source)) {
    const values = source
      .map((item) => getString(item))
      .filter((item): item is string => Boolean(item));
    return values.length > 0 ? values : undefined;
  }

  const stringValue = getString(source);
  return stringValue ? [stringValue] : undefined;
};

const getNullableString = (value: unknown): string | null => {
  const stringValue = getString(value);
  return stringValue || null;
};

const getNumber = (value: unknown, fallback = 0): number => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const getBoolean = (value: unknown, fallback = false): boolean => (
  typeof value === 'boolean' ? value : fallback
);

const getListNumber = (value: unknown): number | undefined => (
  typeof value === 'number' && Number.isFinite(value) ? value : undefined
);

const getSearchParamValues = (searchParams: URLSearchParams, names: string[]): string[] => {
  const values = names.flatMap((name) => searchParams.getAll(name))
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(values));
};

const getMongoLookupValues = (values: string[]): Array<string | ObjectId> => {
  const seen = new Set<string>();
  const lookupValues: Array<string | ObjectId> = [];

  values.forEach((value) => {
    const stringKey = `string:${value}`;
    if (!seen.has(stringKey)) {
      seen.add(stringKey);
      lookupValues.push(value);
    }

    if (ObjectId.isValid(value)) {
      const objectIdKey = `objectId:${value}`;
      if (!seen.has(objectIdKey)) {
        seen.add(objectIdKey);
        lookupValues.push(new ObjectId(value));
      }
    }
  });

  return lookupValues;
};

const getPositiveInteger = (value: unknown, fallback: number, max?: number): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  const integer = Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
  const positive = integer > 0 ? integer : fallback;
  return max ? Math.min(positive, max) : positive;
};

const ensureTimeRecordIndexes = async () => {
  indexPromise ??= (async () => {
    await ensureTimeRecordServiceIndexes();
  })();

  await indexPromise;
};

const parseSort = (value: unknown): SortOption[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  const parsed = value.reduce<SortOption[]>((acc, item) => {
    if (!isRecord(item) || typeof item.field !== 'string') return acc;

    const field = item.field as keyof DocumentType;
    if (!SORTABLE_FIELDS.has(field)) return acc;

    const order = item.order === 'asc' || item.order === 'desc' ? item.order : 'desc';
    acc.push({ field, order });
    return acc;
  }, []);

  return parsed.length > 0 ? parsed : undefined;
};

const getErrorMessage = (error: unknown) => (
  error instanceof Error ? error.message : 'Server error'
);

export async function GET(req: Request) {
  try {
    await ensureTimeRecordIndexes();
    const { searchParams } = new URL(req.url);
    const employeeIds = getSearchParamValues(searchParams, [
      'employeeId',
      'employeeIds',
      'employeeCode',
      'employeeCodes',
    ]);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = getPositiveInteger(searchParams.get('page'), 1);
    const limit = getPositiveInteger(searchParams.get('limit') || searchParams.get('pageSize'), 50, 200);
    const skip = (page - 1) * limit;
    const status = searchParams.get('status');

    const filters: Record<string, unknown> = {};
    if (employeeIds.length > 0) {
      const employeeLookupValues = getMongoLookupValues(employeeIds);
      filters.$or = [
        { employeeId: { $in: employeeLookupValues } },
        { employeeCode: { $in: employeeIds } },
      ];
    }
    if (startDate || endDate) {
      const dateFilter: Record<string, unknown> = {};
      if (startDate) dateFilter.$gte = startDate;
      if (endDate) dateFilter.$lte = endDate;
      filters.date = dateFilter;
    }
    
    if (status === 'late_early') {
      const lateEarlyCond = {
        $or: [
          { lateMinutes: { $gt: 0 } },
          { earlyMinutes: { $gt: 0 } }
        ]
      };
      if (filters.$or) {
        filters.$and = [ { $or: filters.$or }, lateEarlyCond ];
        delete filters.$or;
      } else {
        filters.$or = lateEarlyCond.$or;
      }
    } else if (status === 'on_time') {
      filters.lateMinutes = { $lte: 0, $type: 'number' };
      filters.earlyMinutes = { $lte: 0, $type: 'number' };
      filters.clockIn = { $ne: null };
      filters.clockOut = { $ne: null };
    } else if (status === 'absent') {
      filters.clockIn = null;
      filters.clockOut = null;
    }

    const result = await getAllRows<DocumentType>(COLLECTION_NAME, {
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      skip,
      limit,
      sort: DEFAULT_SORT,
    });

    return NextResponse.json({ data: result.data, total: result.total, page, pageSize: limit });
  } catch (error: unknown) {
    console.error(`Failed to read ${COLLECTION_NAME} collection`, error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TimeRecordRequestBody;
    const action = getString(body.action);
    await ensureTimeRecordIndexes();

    if (action === 'add' || !action) {
      const employeeId = getString(body.employeeId);
      const date = getString(body.date);
      const deviceType = getString(body.deviceType) || 'Web';

      if (!employeeId || !date) {
        return NextResponse.json({ success: false, message: 'Thiếu thông tin bắt buộc (employeeId, date)' }, { status: 400 });
      }

      if (deviceType.includes('Online')) {
        const { connectToDatabase } = await import('@/app/lib/monggodb/connectToDatabase');
        const { checkOnlineCheckinPermission } = await import('@/app/lib/timekeeping/onlineCheckinService');
        const { db } = await connectToDatabase();
        const check = await checkOnlineCheckinPermission(db, employeeId, date);
        if (!check.allowed) {
          return NextResponse.json({ success: false, message: `Từ chối chấm công online: ${check.reason}` }, { status: 403 });
        }
      }

      const newDoc: DocumentType = {
        employeeId,
        date,
        clockIn: getNullableString(body.clockIn),
        clockOut: getNullableString(body.clockOut),
        shiftId: getNullableString(body.shiftId),
        locationId: getNullableString(body.locationId),
        deviceType,
        gpsMatched: getBoolean(body.gpsMatched, true),
        lateMinutes: getNumber(body.lateMinutes),
        earlyMinutes: getNumber(body.earlyMinutes),
        lateReason: getString(body.lateReason) || '',
        reasonApproved: getBoolean(body.reasonApproved),
        lateReasonApproved: getBoolean(body.lateReasonApproved),
        earlyReasonApproved: getBoolean(body.earlyReasonApproved),
        notes: getString(body.notes) || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const added = await addRow<DocumentType>(COLLECTION_NAME, newDoc);
      return NextResponse.json({ success: true, data: { _id: added, ...newDoc } });
    }

    if (action === 'edit') {
      const id = getString(body._id);
      if (!id) {
        return NextResponse.json({ success: false, message: 'Missing _id' }, { status: 400 });
      }

      const { action: _action, _id: _id, ...rawUpdateFields } = body;
      void _action;
      void _id;

      const collection = await getCollection<DocumentType>(COLLECTION_NAME);
      const queryId = new ObjectId(id);
      const current = await collection.findOne({ _id: queryId });

      if (current) {
        const isOnlineCheckout = 
          getString(body.deviceType)?.includes('Online') || 
          getString(current.deviceType)?.includes('Online');

        if (isOnlineCheckout) {
          const { connectToDatabase } = await import('@/app/lib/monggodb/connectToDatabase');
          const { checkOnlineCheckinPermission } = await import('@/app/lib/timekeeping/onlineCheckinService');
          const { db } = await connectToDatabase();
          const check = await checkOnlineCheckinPermission(db, current.employeeId as string, current.date as string);
          if (!check.allowed) {
            return NextResponse.json({ success: false, message: `Từ chối kết công online: ${check.reason}` }, { status: 403 });
          }
        }

        const updateFields: Partial<DocumentType> & Record<string, unknown> = {
          ...rawUpdateFields,
          updatedAt: new Date(),
        };

        await collection.updateOne(
          { _id: queryId },
          { $set: updateFields },
        );
        return NextResponse.json({ success: true, message: 'Cập nhật thành công' });
      }
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    }

    if (action === 'delete') {
      const id = getString(body._id);
      if (!id) {
        return NextResponse.json({ success: false, message: 'Missing _id' }, { status: 400 });
      }

      const collection = await getCollection<DocumentType>(COLLECTION_NAME);
      const result = await collection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount > 0) {
        return NextResponse.json({ success: true, message: 'Xóa thành công' });
      }
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    }

    if (action === 'list') {
      const page = getPositiveInteger(body.page, 1);
      const limit = getPositiveInteger(body.pageSize ?? body.limit, 50, 200);
      const explicitSkip = getListNumber(body.skip);
      const result = await getTimeRecordsList({
        page,
        pageSize: limit,
        skip: explicitSkip,
        startDate: getString(body.startDate),
        endDate: getString(body.endDate),
        detailStartDate: getString(body.detailStartDate),
        detailEndDate: getString(body.detailEndDate),
        selectedBranchIds: getStringArray(body.selectedBranchIds, body.selectedBranchId),
        selectedLocationIds: getStringArray(body.selectedLocationIds, body.selectedLocationId),
        selectedGroupIds: getStringArray(body.selectedGroupIds, body.selectedGroupId),
        selectedDeptIds: getStringArray(body.selectedDeptIds, body.selectedDeptId),
        filters: isRecord(body.filters) ? { ...body.filters } : undefined,
        search: getString(body.search),
        sort: parseSort(body.sort) || DEFAULT_SORT,
      });
      return NextResponse.json({
        success: true,
        data: result.data,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        attendanceRequestSync: result.attendanceRequestSync,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    console.error(`Failed to process ${COLLECTION_NAME} POST`, error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
