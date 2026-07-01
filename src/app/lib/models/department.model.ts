import { z } from 'zod';
import { Document, ObjectId } from 'mongodb';
import { BaseRepository } from '@/app/lib/monggodb/BaseRepository';
import type { DepartmentGroupTimekeeping, DepartmentTimekeeping, KioskLocation } from '@/app/interface/timekeeping';

// ─── Types With Details ───────────────────────────────────────────────────────

export type DepartmentGroupWithDetails = Omit<DepartmentGroupTimekeeping, 'locationId'> & {
  locationId: KioskLocation | null;
};

export type DepartmentWithDetails = Omit<DepartmentTimekeeping, 'locationId' | 'departmentGroupTimekeepingId'> & {
  locationId: KioskLocation | null;
  departmentGroupTimekeepingId: DepartmentGroupTimekeeping | null;
};

// ─── Department Group ─────────────────────────────────────────────────────────

const ObjectIdStringSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID tham chiếu không hợp lệ');

export const DeptGroupCreateSchema = z.object({
  code: z.string().min(1, 'Mã nhóm bộ phận không được trống'),
  name: z.string().min(1, 'Tên nhóm bộ phận không được trống'),
  locationId: ObjectIdStringSchema.or(z.literal('')).optional().default(''),
  isActive: z.boolean().default(true),
});

export const DeptGroupUpdateSchema = DeptGroupCreateSchema.partial();
export type DeptGroupCreate = z.infer<typeof DeptGroupCreateSchema>;

class DepartmentGroupRepository extends BaseRepository<DepartmentGroupTimekeeping, DeptGroupCreate> {
  protected readonly collectionName = 'department_groups_timekeeping';
  protected readonly createSchema = DeptGroupCreateSchema;
  protected readonly updateSchema = DeptGroupUpdateSchema;

  protected serialize(doc: Document): DepartmentGroupTimekeeping {
    return {
      ...doc,
      _id: this.stringifyId(doc),
      locationId: doc.locationId instanceof ObjectId ? doc.locationId.toString() : doc.locationId,
    } as DepartmentGroupTimekeeping;
  }

  private mapForeignKeys(data: DeptGroupCreate | Partial<DeptGroupCreate>): Record<string, unknown> {
    const result: Record<string, unknown> = { ...data };
    if (typeof result.locationId === 'string' && result.locationId !== '') result.locationId = new ObjectId(result.locationId);
    return result;
  }

  async create(input: unknown): Promise<DepartmentGroupTimekeeping> {
    const validated = this.createSchema.parse(input);
    const doc = this.mapForeignKeys(validated);
    const col = await this.getCollection();
    const insertDoc = { ...doc, createdAt: new Date(), updatedAt: new Date() };
    const result = await col.insertOne(insertDoc as Document);
    const inserted = await col.findOne({ _id: result.insertedId });
    return this.serialize(inserted!);
  }

  async updateById(id: string, input: unknown): Promise<DepartmentGroupTimekeeping | null> {
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

  async findActive(): Promise<DepartmentGroupTimekeeping[]> {
    const result = await this.findMany({ filters: { isActive: true }, sort: { name: 1 } });
    return result.data;
  }

  async findActiveWithDetails(): Promise<DepartmentGroupWithDetails[]> {
    const col = await this.getCollection();
    return col.aggregate<DepartmentGroupWithDetails>([
      { $match: { isActive: true } },
      { $sort: { name: 1 } },
      {
        $lookup: {
          from: 'locations-timekeeping',
          localField: 'locationId',
          foreignField: '_id',
          as: 'locationId'
        }
      },
      { $unwind: { path: '$locationId', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          id: { $toString: '$_id' }
        }
      }
    ]).toArray();
  }
}

// ─── Department ───────────────────────────────────────────────────────────────

export const DepartmentCreateSchema = z.object({
  code: z.string().min(1, 'Mã bộ phận không được trống'),
  name: z.string().min(1, 'Tên bộ phận không được trống'),
  shortName: z.string().default(''),
  locationId: ObjectIdStringSchema.or(z.literal('')).optional().default(''),
  departmentGroupTimekeepingId: ObjectIdStringSchema.or(z.literal('')).optional().default(''),
  isActive: z.boolean().default(true),
});

export const DepartmentUpdateSchema = DepartmentCreateSchema.partial();
export type DepartmentCreate = z.infer<typeof DepartmentCreateSchema>;

class DepartmentRepository extends BaseRepository<DepartmentTimekeeping, DepartmentCreate> {
  protected readonly collectionName = 'departments_timekeeping';
  protected readonly createSchema = DepartmentCreateSchema;
  protected readonly updateSchema = DepartmentUpdateSchema;

  protected serialize(doc: Document): DepartmentTimekeeping {
    return {
      ...doc,
      _id: this.stringifyId(doc),
      locationId: doc.locationId instanceof ObjectId ? doc.locationId.toString() : doc.locationId,
      departmentGroupTimekeepingId: doc.departmentGroupTimekeepingId instanceof ObjectId ? doc.departmentGroupTimekeepingId.toString() : doc.departmentGroupTimekeepingId,
    } as DepartmentTimekeeping;
  }

  private mapForeignKeys(data: DepartmentCreate | Partial<DepartmentCreate>): Record<string, unknown> {
    const result: Record<string, unknown> = { ...data };
    if (typeof result.locationId === 'string' && result.locationId !== '') result.locationId = new ObjectId(result.locationId);
    if (typeof result.departmentGroupTimekeepingId === 'string' && result.departmentGroupTimekeepingId !== '') result.departmentGroupTimekeepingId = new ObjectId(result.departmentGroupTimekeepingId);
    return result;
  }

  async create(input: unknown): Promise<DepartmentTimekeeping> {
    const validated = this.createSchema.parse(input);
    const doc = this.mapForeignKeys(validated);
    const col = await this.getCollection();
    const insertDoc = { ...doc, createdAt: new Date(), updatedAt: new Date() };
    const result = await col.insertOne(insertDoc as Document);
    const inserted = await col.findOne({ _id: result.insertedId });
    return this.serialize(inserted!);
  }

  async updateById(id: string, input: unknown): Promise<DepartmentTimekeeping | null> {
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

  /** Bộ phận theo nhóm */
  async findByGroup(groupId: string): Promise<DepartmentTimekeeping[]> {
    const result = await this.findMany({
      filters: { departmentGroupTimekeepingId: groupId, isActive: true },
      sort: { name: 1 },
    });
    return result.data;
  }

  async findActive(): Promise<DepartmentTimekeeping[]> {
    const result = await this.findMany({ filters: { isActive: true }, sort: { name: 1 } });
    return result.data;
  }

  private getDetailsPipeline(matchFilter: Record<string, unknown>) {
    return [
      { $match: matchFilter },
      { $sort: { name: 1 } },
      {
        $lookup: {
          from: 'locations-timekeeping',
          localField: 'locationId',
          foreignField: '_id',
          as: 'locationId'
        }
      },
      { $unwind: { path: '$locationId', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'department_groups_timekeeping',
          localField: 'departmentGroupTimekeepingId',
          foreignField: '_id',
          as: 'departmentGroupTimekeepingId'
        }
      },
      { $unwind: { path: '$departmentGroupTimekeepingId', preserveNullAndEmptyArrays: true } },
      {
        $addFields: { id: { $toString: '$_id' } }
      }
    ];
  }

  async findByGroupWithDetails(groupId: string): Promise<DepartmentWithDetails[]> {
    if (!ObjectId.isValid(groupId)) return [];
    const col = await this.getCollection();
    return col.aggregate<DepartmentWithDetails>(this.getDetailsPipeline({ 
      departmentGroupTimekeepingId: new ObjectId(groupId), 
      isActive: true 
    })).toArray();
  }

  async findActiveWithDetails(): Promise<DepartmentWithDetails[]> {
    const col = await this.getCollection();
    return col.aggregate<DepartmentWithDetails>(this.getDetailsPipeline({ isActive: true })).toArray();
  }
}

export const departmentGroupModel = new DepartmentGroupRepository();
export const departmentModel = new DepartmentRepository();
