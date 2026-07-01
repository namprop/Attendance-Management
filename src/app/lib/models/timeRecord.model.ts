import { z } from 'zod';
import { Document, ObjectId } from 'mongodb';
import { BaseRepository } from '@/app/lib/monggodb/BaseRepository';
import type { TimeRecordTimekeeping } from '@/app/interface/timekeeping';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeeklyDayStat {
  date: string;       // YYYY-MM-DD
  label: string;      // e.g. "T2", "T3"
  checkedIn: number;
  late: number;
  absent: number;
}

export interface TopLateEmployee {
  employeeId: string;
  name: string;
  role: string;
  lateCount: number;
  totalLateMinutes: number;
}

export interface MonthlyRates {
  onTimeRate: number;   // %
  lateRate: number;     // %
  absentRate: number;   // %
  avgWorkHoursThisWeek: number;
}

export interface NotCheckedInEmployee {
  employeeId: string;
  name: string;
  role: string;
}

export interface TodayAttendanceRow {
  employeeId: string;
  name: string;
  role: string;
  employeeType?: string;
  clockIn: string | null;
  clockOut: string | null;
  lateMinutes: number;
  deviceType: string;
  status: 'on_time' | 'late' | 'absent';
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const ObjectIdStringSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID tham chiếu không hợp lệ');

export const TimeRecordCreateSchema = z.object({
  employeeId: ObjectIdStringSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date phải có dạng YYYY-MM-DD'),
  clockIn: z.string().nullable().optional().default(null),
  clockOut: z.string().nullable().optional().default(null),
  shiftId: ObjectIdStringSchema.nullable().optional().default(null),
  locationId: ObjectIdStringSchema.nullable().optional().default(null),
  deviceType: z.enum(['Web', 'FaceID', 'WiFi']).default('Web'),
  gpsMatched: z.boolean().default(true),
  lateMinutes: z.number().int().min(0).default(0),
  earlyMinutes: z.number().int().min(0).default(0),
  lateReason: z.string().optional().default(''),
  reasonApproved: z.boolean().default(false),
  notes: z.string().optional().default(''),
});

export const TimeRecordUpdateSchema = TimeRecordCreateSchema.partial().omit({ employeeId: true, date: true });

export type TimeRecordCreate = z.infer<typeof TimeRecordCreateSchema>;
export type TimeRecordUpdate = z.infer<typeof TimeRecordUpdateSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getViDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][day];
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function getStartOfWeek(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1); // Monday
  return d.toISOString().split('T')[0];
}

function getStartOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// ─── Repository ───────────────────────────────────────────────────────────────

class TimeRecordRepository extends BaseRepository<TimeRecordTimekeeping, TimeRecordCreate> {
  protected readonly collectionName = 'time_records-timekeeping';
  protected readonly createSchema = TimeRecordCreateSchema;
  protected readonly updateSchema = TimeRecordUpdateSchema;

  protected serialize(doc: Document): TimeRecordTimekeeping {
    return {
      ...doc,
      _id: this.stringifyId(doc),
      employeeId: doc.employeeId instanceof ObjectId ? doc.employeeId.toString() : doc.employeeId,
      shiftId: doc.shiftId instanceof ObjectId ? doc.shiftId.toString() : doc.shiftId,
      locationId: doc.locationId instanceof ObjectId ? doc.locationId.toString() : doc.locationId,
    } as TimeRecordTimekeeping;
  }

  private mapForeignKeys(data: TimeRecordCreate | Partial<TimeRecordCreate>): Record<string, unknown> {
    const result: Record<string, unknown> = { ...data };
    if (typeof result.employeeId === 'string' && result.employeeId !== '') result.employeeId = new ObjectId(result.employeeId);
    if (typeof result.shiftId === 'string' && result.shiftId !== '') result.shiftId = new ObjectId(result.shiftId);
    if (typeof result.locationId === 'string' && result.locationId !== '') result.locationId = new ObjectId(result.locationId);
    return result;
  }

  async create(input: unknown): Promise<TimeRecordTimekeeping> {
    const validated = this.createSchema.parse(input);
    const doc = this.mapForeignKeys(validated);
    const col = await this.getCollection();
    const insertDoc = { ...doc, createdAt: new Date(), updatedAt: new Date() };
    const result = await col.insertOne(insertDoc as Document);
    const inserted = await col.findOne({ _id: result.insertedId });
    return this.serialize(inserted!);
  }

  async updateById(id: string, input: unknown): Promise<TimeRecordTimekeeping | null> {
    if (!ObjectId.isValid(id)) return null;
    const validated = this.updateSchema.parse(input);
    const doc = this.mapForeignKeys(validated);
    const col = await this.getCollection();
    const $set: Record<string, unknown> = { ...doc, updatedAt: new Date() };
    delete $set['_id'];
    await col.updateOne({ _id: new ObjectId(id) }, { $set });
    const updated = await col.findOne({ _id: new ObjectId(id) });
    return updated ? this.serialize(updated) : null;
  }

  /** Log của 1 nhân viên theo ngày */
  async findByEmployeeAndDate(employeeId: string, date: string): Promise<TimeRecordTimekeeping | null> {
    if (!ObjectId.isValid(employeeId)) return null;
    return this.findOne({ employeeId: new ObjectId(employeeId), date });
  }

  /** Log theo khoảng ngày, có thể filter theo nhân viên */
  async findByDateRange(
    startDate: string,
    endDate: string,
    employeeId?: string | string[],
  ): Promise<TimeRecordTimekeeping[]> {
    const filters: Record<string, unknown> = {
      date: { $gte: startDate, $lte: endDate },
    };
    
    if (employeeId) {
      const idsArr = Array.isArray(employeeId) ? employeeId : [employeeId];
      const validObjectIds = idsArr.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));
      const stringIds = idsArr.map(String);
      const numberIds = idsArr.map(Number).filter(n => !isNaN(n));
      
      filters.$or = [
        { employeeId: { $in: validObjectIds } },
        { employeeId: { $in: stringIds } },
        { employeeId: { $in: numberIds } }
      ];
    }
    
    const result = await this.findMany({ filters, sort: { date: -1 } });
    return result.data;
  }

  /** Lấy tất cả log của ngày hôm nay */
  async getTodayRecords(): Promise<TimeRecordTimekeeping[]> {
    const today = new Date().toISOString().split('T')[0];
    const result = await this.findMany({ filters: { date: today } });
    return result.data;
  }

  /**
   * Thống kê 7 ngày gần nhất
   * Cần truyền vào tổng số nhân viên để tính absent
   */
  async getDailyStats(totalEmployees: number, startDate: string, endDate: string): Promise<WeeklyDayStat[]> {
    const col = await this.getCollection();
    const records = await col
      .find({ date: { $gte: startDate, $lte: endDate } })
      .toArray();

    const days: string[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
      days.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return days.map((date) => {
      const dayRecs = records.filter((r) => r.date === date);
      
      // Lọc bỏ trùng lặp nhân viên trong cùng 1 ngày (do dữ liệu test)
      const uniqueEmpMap = new Map<string, { clockIn: boolean, lateMinutes: number }>();
      dayRecs.forEach(r => {
        const eId = r.employeeId instanceof ObjectId ? r.employeeId.toString() : String(r.employeeId);
        const existing = uniqueEmpMap.get(eId);
        const hasClockIn = !!r.clockIn;
        const lateMins = (r.lateMinutes as number) || 0;
        
        if (!existing) {
          uniqueEmpMap.set(eId, { clockIn: hasClockIn, lateMinutes: lateMins });
        } else {
          if (hasClockIn) existing.clockIn = true;
          if (lateMins > 0) existing.lateMinutes = Math.max(existing.lateMinutes, lateMins);
        }
      });

      let checkedIn = 0;
      let late = 0;
      Array.from(uniqueEmpMap.values()).forEach(v => {
        if (v.clockIn) checkedIn++;
        if (v.lateMinutes > 0) late++;
      });

      const absent = Math.max(0, totalEmployees - checkedIn);
      return { date, label: getViDayLabel(date), checkedIn, late, absent };
    });
  }

  /**
   * Top N nhân viên đi muộn nhiều nhất trong tuần này
   * Cần truyền vào namesMap để join tên
   */
  async getTopLateInPeriod(
    limit: number,
    namesMap: Map<string, { name: string; role: string; employeeType?: string }>,
    startDate: string,
    endDate: string,
  ): Promise<TopLateEmployee[]> {
    const results = await this.aggregate<{ _id: string | ObjectId; lateCount: number; totalLateMinutes: number }>([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          lateMinutes: { $gt: 0 },
        },
      },
      // Bước trung gian: Lấy ra lần đi muộn nhất trong ngày để tránh duplicate test records
      {
        $group: {
          _id: { employeeId: '$employeeId', date: '$date' },
          maxLateMinutes: { $max: '$lateMinutes' }
        }
      },
      // Bước tổng hợp: Đếm số ngày đi muộn và tổng thời gian đi muộn
      {
        $group: {
          _id: '$_id.employeeId',
          lateCount: { $sum: 1 },
          totalLateMinutes: { $sum: '$maxLateMinutes' },
        },
      },
      { $sort: { lateCount: -1, totalLateMinutes: -1 } },
      { $limit: limit },
    ]);

    return results.map((r) => {
      const eId = r._id instanceof ObjectId ? r._id.toString() : String(r._id);
      return {
        employeeId: eId,
        name: namesMap.get(eId)?.name ?? eId,
        role: namesMap.get(eId)?.role ?? '',
        lateCount: r.lateCount,
        totalLateMinutes: r.totalLateMinutes,
      };
    });
  }

  /**
   * Tỉ lệ đúng giờ / muộn / vắng trong tháng hiện tại
   * Cần tổng nhân viên để tính absent
   */
  async getPeriodRates(totalEmployees: number, startDate: string, endDate: string): Promise<MonthlyRates> {
    const col = await this.getCollection();
    const records = await col
      .find({ date: { $gte: startDate, $lte: endDate } })
      .toArray();

    // Số ngày làm việc trong kỳ (không tính các ngày ở tương lai)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    const endLimit = end > now ? now : end;

    let workDays = 0;
    const cursor = new Date(start);
    while (cursor <= endLimit) {
      const dow = cursor.getDay();
      if (dow !== 0 && dow !== 6) workDays++; // bỏ T7+CN
      cursor.setDate(cursor.getDate() + 1);
    }

    const totalSlots = workDays * totalEmployees || 1;
    
    // Lọc bỏ trùng lặp nhân viên trong cùng 1 ngày (do dữ liệu test)
    const uniqueRecordsMap = new Map<string, { clockIn: boolean, lateMinutes: number }>();
    records.forEach(r => {
      const eId = r.employeeId instanceof ObjectId ? r.employeeId.toString() : String(r.employeeId);
      const key = `${eId}_${r.date}`;
      const existing = uniqueRecordsMap.get(key);
      const hasClockIn = !!r.clockIn;
      const lateMins = (r.lateMinutes as number) || 0;
      
      if (!existing) {
        uniqueRecordsMap.set(key, { clockIn: hasClockIn, lateMinutes: lateMins });
      } else {
        if (hasClockIn) existing.clockIn = true;
        if (lateMins > 0) existing.lateMinutes = Math.max(existing.lateMinutes, lateMins);
      }
    });

    let checkedIn = 0;
    let late = 0;
    Array.from(uniqueRecordsMap.values()).forEach(v => {
      if (v.clockIn) checkedIn++;
      if (v.lateMinutes > 0) late++;
    });
    const absent = Math.max(0, totalSlots - checkedIn);

    // Tính giờ làm TB trong kỳ
    const weekRecs = records.filter((r) => r.clockIn && r.clockOut);
    let avgWorkHours = 0;
    if (weekRecs.length > 0) {
      const totalMinutes = weekRecs.reduce((acc, r) => {
        const [ih, im] = (r.clockIn as string).split(':').map(Number);
        const [oh, om] = (r.clockOut as string).split(':').map(Number);
        return acc + Math.max(0, oh * 60 + om - (ih * 60 + im));
      }, 0);
      avgWorkHours = Math.round((totalMinutes / weekRecs.length / 60) * 10) / 10;
    }

    return {
      onTimeRate: Math.round(((checkedIn - late) / totalSlots) * 100),
      lateRate: Math.round((late / totalSlots) * 100),
      absentRate: Math.round((absent / totalSlots) * 100),
      avgWorkHoursThisWeek: avgWorkHours,
    };
  }

  /**
   * Danh sách nhân viên chưa check-in hôm nay
   * Cần truyền employeeIds để diff
   */
  async getNotCheckedInByDate(
    allEmployeeIds: string[],
    namesMap: Map<string, { name: string; role: string; employeeType?: string }>,
    targetDate: string,
  ): Promise<NotCheckedInEmployee[]> {
    const col = await this.getCollection();
    const todayRecs = await col
      .find({ date: targetDate, clockIn: { $ne: null } })
      .toArray();

    const checkedInIds = new Set(todayRecs.map((r) => r.employeeId instanceof ObjectId ? r.employeeId.toString() : String(r.employeeId)));

    return allEmployeeIds
      .filter((id) => !checkedInIds.has(id))
      .map((id) => ({
        employeeId: id,
        name: namesMap.get(id)?.name ?? id,
        role: namesMap.get(id)?.role ?? '',
      }));
  }
  /**
   * Full attendance list hôm nay — merge employees + records
   * Trả về TẤT CẢ nhân viên, kể cả chưa check-in
   */
  async getFullAttendanceByDate(
    allEmployeeIds: string[],
    namesMap: Map<string, { name: string; role: string; employeeType?: string }>,
    targetDate: string,
  ): Promise<TodayAttendanceRow[]> {
    const col = await this.getCollection();
    const todayRecs = await col.find({ date: targetDate }).toArray();

    const recMap = new Map<string, typeof todayRecs[0]>();
    for (const r of todayRecs) {
      const eId = r.employeeId instanceof ObjectId ? r.employeeId.toString() : String(r.employeeId);
      recMap.set(eId, r);
    }

    return allEmployeeIds.map((id) => {
      const rec = recMap.get(id);
      const empInfo = namesMap.get(id);
      const clockIn = (rec?.clockIn as string) || null;
      const clockOut = (rec?.clockOut as string) || null;
      const lateMinutes = (rec?.lateMinutes as number) || 0;
      let status: 'on_time' | 'late' | 'absent';
      if (!clockIn) status = 'absent';
      else if (lateMinutes > 0) status = 'late';
      else status = 'on_time';

      return {
        employeeId: id,
        name: empInfo?.name ?? id,
        role: empInfo?.role ?? '',
        employeeType: empInfo?.employeeType ?? '',
        clockIn,
        clockOut,
        lateMinutes,
        deviceType: (rec?.deviceType as string) || '',
        status,
      };
    });
  }
}

export const timeRecordModel = new TimeRecordRepository();
