import { z } from 'zod';
import { Document } from 'mongodb';
import { BaseRepository } from '@/app/lib/monggodb/BaseRepository';
import type { ShiftConfig } from '@/app/interface/timekeeping';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const ShiftConfigCreateSchema = z.object({
  code: z.string().min(1, 'Mã ca không được trống'),
  name: z.string().min(1, 'Tên ca không được trống'),
  departmentGroupIds: z.array(z.string()).default([]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'startTime phải có dạng HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'endTime phải có dạng HH:MM'),
  crossDayCount: z.string().default('0'),
  breakStartTime: z.string().default(''),
  breakEndTime: z.string().default(''),
  totalMinutes: z.string().default('480'),
  workUnit: z.string().default('1'),
  validCheckInStart: z.string().default(''),
  validCheckInEnd: z.string().default(''),
  validCheckOutStart: z.string().default(''),
  validCheckOutEnd: z.string().default(''),
  noCheckOutMinutes: z.string().default('0'),
  noCheckInMinutes: z.string().default('0'),
  displayOrder: z.string().default('1'),
  isActive: z.boolean().default(true),
});

export const ShiftConfigUpdateSchema = ShiftConfigCreateSchema.partial().omit({ code: true });

export type ShiftConfigCreate = z.infer<typeof ShiftConfigCreateSchema>;
export type ShiftConfigUpdate = z.infer<typeof ShiftConfigUpdateSchema>;

// ─── Repository ───────────────────────────────────────────────────────────────

class ShiftConfigRepository extends BaseRepository<ShiftConfig, ShiftConfigCreate> {
  protected readonly collectionName = 'shift_configs-timekeeping';
  protected readonly createSchema = ShiftConfigCreateSchema;
  protected readonly updateSchema = ShiftConfigUpdateSchema;

  protected serialize(doc: Document): ShiftConfig {
    return {
      ...doc,
      _id: this.stringifyId(doc),
      id: (doc.id as string) || this.stringifyId(doc),
    } as ShiftConfig;
  }

  /** Tất cả ca đang hoạt động, sắp xếp theo displayOrder */
  async findActive(): Promise<ShiftConfig[]> {
    const result = await this.findMany({
      filters: { isActive: true },
      sort: { displayOrder: 1 },
    });
    return result.data;
  }

  /** Tìm ca theo mã code */
  async findByCode(code: string): Promise<ShiftConfig | null> {
    return this.findOne({ code });
  }
}

export const shiftConfigModel = new ShiftConfigRepository();
