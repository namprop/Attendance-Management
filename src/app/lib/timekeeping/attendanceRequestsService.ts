import { ObjectId, type Document, type Filter } from 'mongodb';
import type {
  AttendanceRequest,
  AttendanceRequestStatus,
  AttendanceRequestType,
} from '@/app/interface/timekeeping';
import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';
import type { AttendanceSyntheticStatus, TimeRecordsListRow } from '@/app/lib/timekeeping/timeRecordsService';

export const ATTENDANCE_REQUESTS_COLLECTION = 'attendance_requests-timekeeping';
let indexPromise: Promise<void> | null = null;

type AttendanceRequestDocument = Omit<AttendanceRequest, 'id'> & {
  _id?: ObjectId;
} & Record<string, unknown>;

export interface AttendanceRequestListParams {
  page?: number;
  pageSize?: number;
  status?: AttendanceRequestStatus | '';
  requestType?: AttendanceRequestType | '';
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface AttendanceRequestSyncResult {
  scanned: number;
  created: number;
  matched: number;
}

const AUTO_REQUEST_STATUS_MAP: Partial<Record<AttendanceSyntheticStatus, AttendanceRequestType>> = {
  missing_checkin: 'forgot_checkin',
  missing_checkout: 'forgot_checkout',
};

const AUTO_REQUEST_REASONS: Record<AttendanceRequestType, string> = {
  forgot_checkin: 'Hệ thống phát hiện thiếu giờ vào sau giờ chốt công.',
  forgot_checkout: 'Hệ thống phát hiện thiếu giờ ra/kết công sau giờ chốt công.',
  online_checkin: 'Yêu cầu chấm công online.',
  time_adjustment: 'Yêu cầu điều chỉnh giờ công.',
};

const ALLOWED_STATUSES: AttendanceRequestStatus[] = ['Pending', 'Approved', 'Rejected', 'Expired'];
const ALLOWED_TYPES: AttendanceRequestType[] = [
  'forgot_checkin',
  'forgot_checkout',
  'online_checkin',
  'time_adjustment',
];

const normalizeStatus = (value: unknown): AttendanceRequestStatus => {
  const status = String(value || '').toLowerCase();
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  if (status === 'expired') return 'Expired';
  return 'Pending';
};

const normalizeRequestType = (value: unknown): AttendanceRequestType | null => {
  const rawType = String(value || '').trim();
  const requestType = rawType as AttendanceRequestType;
  return ALLOWED_TYPES.includes(requestType) ? requestType : null;
};

const toDateString = (value: unknown) => {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  return text;
};

const toIsoString = (value: unknown) => {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const cleanString = (value: unknown) => {
  const text = String(value || '').trim();
  return text || undefined;
};

const getRowRequestType = (row: TimeRecordsListRow): AttendanceRequestType | null => {
  const status = row.rowStatus || row.syntheticStatus;
  return status ? AUTO_REQUEST_STATUS_MAP[status] || null : null;
};

const getTimeRecordId = (row: TimeRecordsListRow) => {
  if (row.isSynthetic || String(row._id || '').startsWith('synthetic-')) return null;
  return String(row._id || '').trim() || null;
};

export const serializeAttendanceRequest = (doc: Document): AttendanceRequest => {
  const id = doc._id instanceof ObjectId ? doc._id.toString() : String(doc.id || doc._id || '');

  return {
    id,
    employeeId: String(doc.employeeId || ''),
    employeeCode: cleanString(doc.employeeCode),
    employeeName: cleanString(doc.employeeName),
    date: toDateString(doc.date),
    shiftId: doc.shiftId === null ? null : cleanString(doc.shiftId),
    shiftName: cleanString(doc.shiftName),
    timeRecordId: doc.timeRecordId === null ? null : cleanString(doc.timeRecordId),
    requestType: normalizeRequestType(doc.requestType) || 'time_adjustment',
    status: normalizeStatus(doc.status),
    source: cleanString(doc.source),
    currentCheckIn: doc.currentCheckIn === null ? null : cleanString(doc.currentCheckIn),
    currentCheckOut: doc.currentCheckOut === null ? null : cleanString(doc.currentCheckOut),
    requestedCheckIn: doc.requestedCheckIn === null ? null : cleanString(doc.requestedCheckIn),
    requestedCheckOut: doc.requestedCheckOut === null ? null : cleanString(doc.requestedCheckOut),
    reason: cleanString(doc.reason),
    adminNote: cleanString(doc.adminNote),
    detectedAt: toIsoString(doc.detectedAt),
    requestedAt: toIsoString(doc.requestedAt),
    resolvedAt: toIsoString(doc.resolvedAt),
    resolvedBy: cleanString(doc.resolvedBy),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : toIsoString(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : toIsoString(doc.updatedAt),
  };
};

export async function ensureAttendanceRequestIndexes() {
  indexPromise ??= (async () => {
    const { db } = await connectToDatabase();
    const collection = db.collection<AttendanceRequestDocument>(ATTENDANCE_REQUESTS_COLLECTION);

    await Promise.all([
      collection.createIndex(
        { employeeId: 1, date: 1, requestType: 1 },
        { name: 'uniq_attendance_request_employee_date_type', unique: true },
      ),
      collection.createIndex({ status: 1, date: -1 }, { name: 'idx_attendance_request_status_date' }),
      collection.createIndex({ source: 1, detectedAt: -1 }, { name: 'idx_attendance_request_source_detected' }),
    ]);
  })();

  await indexPromise;
}

export async function syncAttendanceRequestsFromRows(
  rows: TimeRecordsListRow[],
): Promise<AttendanceRequestSyncResult> {
  await ensureAttendanceRequestIndexes();
  const { db } = await connectToDatabase();
  const collection = db.collection<AttendanceRequestDocument>(ATTENDANCE_REQUESTS_COLLECTION);
  const now = new Date();
  const nowIso = now.toISOString();

  let scanned = 0;
  let created = 0;
  let matched = 0;

  for (const row of rows) {
    const requestType = getRowRequestType(row);
    const employeeId = String(row.employeeCode || row.employeeId || '').trim();
    const date = String(row.date || '').trim();
    if (!requestType || !employeeId || !date) continue;

    scanned += 1;
    const updateResult = await collection.updateOne(
      { employeeId, date, requestType },
      {
        $set: {
          employeeCode: row.employeeCode || employeeId,
          employeeName: row.employeeName || employeeId,
          shiftId: row.shiftId || null,
          shiftName: row.shiftName || '',
          timeRecordId: getTimeRecordId(row),
          currentCheckIn: row.clockIn || null,
          currentCheckOut: row.clockOut || null,
          updatedAt: now,
        },
        $setOnInsert: {
          employeeId,
          date,
          requestType,
          status: 'Pending',
          source: 'auto_cutoff',
          reason: AUTO_REQUEST_REASONS[requestType],
          detectedAt: nowIso,
          requestedAt: nowIso,
          createdAt: now,
        },
      },
      { upsert: true },
    );

    created += updateResult.upsertedCount || 0;
    matched += updateResult.matchedCount || 0;
  }

  return { scanned, created, matched };
}

export async function listAttendanceRequests(params: AttendanceRequestListParams = {}) {
  await ensureAttendanceRequestIndexes();
  const { db } = await connectToDatabase();
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
  const match = {} as Filter<AttendanceRequestDocument>;

  if (params.status && ALLOWED_STATUSES.includes(params.status)) {
    match.status = params.status;
  }

  if (params.requestType && ALLOWED_TYPES.includes(params.requestType)) {
    match.requestType = params.requestType;
  } else {
    (match as Record<string, unknown>).requestType = { $nin: ['unexcused_absence', 'missing_both'] };
  }

  if (params.employeeId?.trim()) {
    match.employeeId = params.employeeId.trim();
  }

  if (params.startDate || params.endDate) {
    match.date = {
      ...(params.startDate ? { $gte: params.startDate } : {}),
      ...(params.endDate ? { $lte: params.endDate } : {}),
    };
  }

  if (params.search?.trim()) {
    const keyword = params.search.trim();
    match.$or = [
      { employeeName: { $regex: keyword, $options: 'i' } },
      { employeeCode: { $regex: keyword, $options: 'i' } },
      { employeeId: { $regex: keyword, $options: 'i' } },
    ];
  }

  const countMatch = { ...match };
  delete countMatch.status;

  const [total, pendingCount, approvedCount, rejectedCount] = await Promise.all([
    db.collection<AttendanceRequestDocument>(ATTENDANCE_REQUESTS_COLLECTION).countDocuments(match),
    db.collection<AttendanceRequestDocument>(ATTENDANCE_REQUESTS_COLLECTION).countDocuments({ ...countMatch, status: 'Pending' }),
    db.collection<AttendanceRequestDocument>(ATTENDANCE_REQUESTS_COLLECTION).countDocuments({ ...countMatch, status: 'Approved' }),
    db.collection<AttendanceRequestDocument>(ATTENDANCE_REQUESTS_COLLECTION).countDocuments({ ...countMatch, status: 'Rejected' }),
  ]);
  const docs = await db.collection<AttendanceRequestDocument>(ATTENDANCE_REQUESTS_COLLECTION)
    .find(match)
    .sort({ date: -1, detectedAt: -1, _id: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  return {
    data: docs.map(serializeAttendanceRequest),
    total,
    pendingCount,
    approvedCount,
    rejectedCount,
    page,
    pageSize,
  };
}
