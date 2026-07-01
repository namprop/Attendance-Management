import { z } from 'zod';
import { Document, ObjectId } from 'mongodb';
import { BaseRepository } from '@/app/lib/monggodb/BaseRepository';
import type { Attendance } from '@/app/interface/timekeeping';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const ObjectIdStringSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID tham chiếu không hợp lệ');

const ShiftSchema = z.object({
  shiftId: ObjectIdStringSchema.or(z.literal('')).default(''),
  name: z.string().default(''),
  startTime: z.string().default(''),
  endTime: z.string().default(''),
  standardHours: z.number().default(8),
});

const OvertimeSchema = z.object({
  tc1: z.number().default(0),
  tc2: z.number().default(0),
  tc3: z.number().default(0),
});

export const AttendanceCreateSchema = z.object({
  userId: ObjectIdStringSchema,
  date: z.string().or(z.date()),
  employeeType: z.string().default('full_time'),
  salaryType: z.string().default('daily'),
  shift: ShiftSchema.default({ shiftId: '', name: '', startTime: '', endTime: '', standardHours: 8 }),
  checkIn: z.string().optional().default(''),
  checkOut: z.string().optional().default(''),
  checkInAt: z.string().or(z.date()).optional(),
  checkOutAt: z.string().or(z.date()).optional(),
  workHours: z.number().default(0),
  standardHours: z.number().default(8),
  workUnit: z.number().default(0),
  payableHours: z.number().default(0),
  lateMinutes: z.number().int().min(0).default(0),
  earlyLeaveMinutes: z.number().int().min(0).default(0),
  overtime: OvertimeSchema.default({ tc1: 0, tc2: 0, tc3: 0 }),
  workPlus: z.number().default(0),
  khPlus: z.number().default(0),
  status: z.enum(['present', 'absent', 'leave', 'late', 'incomplete']).or(z.string()).default('present'),
  attendanceSource: z.enum(['machine', 'qr', 'manual']).or(z.string()).default('machine'),
  note: z.string().optional().default(''),
  calculatedSalary: z.number().default(0),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
});

export const AttendanceUpdateSchema = AttendanceCreateSchema.partial().omit({ userId: true });

export type AttendanceCreate = z.infer<typeof AttendanceCreateSchema>;
export type AttendanceUpdate = z.infer<typeof AttendanceUpdateSchema>;

// ─── Repository ───────────────────────────────────────────────────────────────

class AttendanceRepository extends BaseRepository<Attendance, AttendanceCreate> {
  protected readonly collectionName = 'attendance';
  protected readonly createSchema = AttendanceCreateSchema;
  protected readonly updateSchema = AttendanceUpdateSchema;

  protected serialize(doc: Document): Attendance {
    const shift = doc.shift ? { ...(doc.shift as Record<string, unknown>) } : undefined;
    if (shift && shift.shiftId instanceof ObjectId) shift.shiftId = shift.shiftId.toString();

    return {
      ...doc,
      _id: this.stringifyId(doc),
      userId: doc.userId instanceof ObjectId ? doc.userId.toString() : doc.userId,
      shift,
    } as unknown as Attendance;
  }

  private mapForeignKeys(data: AttendanceCreate | Partial<AttendanceCreate>): Record<string, unknown> {
    const result: Record<string, unknown> = { ...data };
    if (typeof result.userId === 'string' && result.userId !== '') result.userId = new ObjectId(result.userId);
    const shift = result.shift as Record<string, unknown> | undefined;
    if (shift && typeof shift.shiftId === 'string' && shift.shiftId !== '') {
      result.shift = { ...shift, shiftId: new ObjectId(shift.shiftId) };
    }
    return result;
  }

  async create(input: unknown): Promise<Attendance> {
    const validated = this.createSchema.parse(input);
    const doc = this.mapForeignKeys(validated);
    const col = await this.getCollection();
    const insertDoc = { ...doc, createdAt: new Date(), updatedAt: new Date() };
    const result = await col.insertOne(insertDoc as Document);
    const inserted = await col.findOne({ _id: result.insertedId });
    return this.serialize(inserted!);
  }

  async updateById(id: string, input: unknown): Promise<Attendance | null> {
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

  /** Attendance theo tháng & năm */
  async findByMonth(month: number, year: number): Promise<Attendance[]> {
    const result = await this.findMany({ filters: { month, year }, sort: { date: -1 } });
    return result.data;
  }

  /** Attendance của một nhân viên theo tháng */
  async findByEmployeeAndMonth(userId: string, month: number, year: number): Promise<Attendance[]> {
    if (!ObjectId.isValid(userId)) return [];
    const result = await this.findMany({ filters: { userId: new ObjectId(userId), month, year }, sort: { date: 1 } });
    return result.data;
  }

  /** Tổng hợp theo nhân viên trong tháng */
  async getSummaryByEmployee(month: number, year: number) {
    const result = await this.aggregate<{
      _id: string | ObjectId;
      totalWorkHours: number;
      presentDays: number;
      lateDays: number;
      absentDays: number;
    }>([
      { $match: { month, year } },
      {
        $group: {
          _id: '$userId',
          totalWorkHours: { $sum: '$workHours' },
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          lateDays: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          absentDays: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return result.map(r => ({
      ...r,
      _id: r._id instanceof ObjectId ? r._id.toString() : String(r._id)
    }));
  }
}

export const attendanceModel = new AttendanceRepository();
