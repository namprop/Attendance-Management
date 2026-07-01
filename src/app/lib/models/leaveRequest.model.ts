import { z } from 'zod';
import { Document, ObjectId } from 'mongodb';
import { BaseRepository } from '@/app/lib/monggodb/BaseRepository';
import type { LeaveRequest, Employee } from '@/app/interface/timekeeping';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const ObjectIdStringSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID tham chiếu không hợp lệ');

export const LeaveRequestCreateSchema = z.object({
  employeeId: ObjectIdStringSchema,
  type: z.enum(['annual', 'sick', 'personal', 'unpaid', 'overtime', 'arrive_late', 'leave_early']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate phải có dạng YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate phải có dạng YYYY-MM-DD'),
  requestedMinutes: z.number().positive('Số phút phải lớn hơn 0').optional(),
  reason: z.string().min(1, 'Lý do không được trống'),
  status: z.enum(['Pending', 'Approved', 'Rejected']).default('Pending'),
  requestedAt: z.string().default(() => new Date().toISOString()),
  resolvedAt: z.string().optional(),
  resolvedBy: z.string().optional(),
});

export const LeaveRequestUpdateSchema = LeaveRequestCreateSchema.partial().omit({ employeeId: true });

export type LeaveRequestCreate = z.infer<typeof LeaveRequestCreateSchema>;
export type LeaveRequestUpdate = z.infer<typeof LeaveRequestUpdateSchema>;

// Định nghĩa type chứa chi tiết Employee (do aggregation pipeline gán object vào trường employeeId)
export type LeaveRequestWithDetails = Omit<LeaveRequest, 'employeeId'> & {
  employeeId: Employee | null;
};

// ─── Repository ───────────────────────────────────────────────────────────────

class LeaveRequestRepository extends BaseRepository<LeaveRequest, LeaveRequestCreate> {
  protected readonly collectionName = 'leaves-timekeeping';
  protected readonly createSchema = LeaveRequestCreateSchema;
  protected readonly updateSchema = LeaveRequestUpdateSchema;

  protected serialize(doc: Document): LeaveRequest {
    return {
      ...doc,
      _id: this.stringifyId(doc),
      id: (doc.id as string) || this.stringifyId(doc),
      employeeId: doc.employeeId instanceof ObjectId ? doc.employeeId.toString() : doc.employeeId,
    } as unknown as LeaveRequest;
  }

  private mapForeignKeys(data: LeaveRequestCreate | Partial<LeaveRequestCreate>): Record<string, unknown> {
    const result: Record<string, unknown> = { ...data };
    if (typeof result.employeeId === 'string' && result.employeeId !== '') result.employeeId = new ObjectId(result.employeeId);
    return result;
  }

  async create(input: unknown): Promise<LeaveRequest> {
    const validated = this.createSchema.parse(input);
    const doc = this.mapForeignKeys(validated);
    const col = await this.getCollection();
    const insertDoc = { ...doc, createdAt: new Date(), updatedAt: new Date() };
    const result = await col.insertOne(insertDoc as Document);
    const inserted = await col.findOne({ _id: result.insertedId });
    return this.serialize(inserted!);
  }

  async updateById(id: string, input: unknown): Promise<LeaveRequest | null> {
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

  /** Đơn đang chờ duyệt */
  async findPending(): Promise<LeaveRequest[]> {
    const result = await this.findMany({
      filters: { status: 'Pending' },
      sort: { requestedAt: -1 },
    });
    return result.data;
  }

  private getDetailsPipeline(matchFilter: Record<string, unknown>) {
    return [
      { $match: matchFilter },
      { $sort: { requestedAt: -1 } },
      {
        $lookup: {
          from: 'employees-timekeeping',
          localField: 'employeeId',
          foreignField: '_id',
          as: 'employeeId'
        }
      },
      { $unwind: { path: '$employeeId', preserveNullAndEmptyArrays: true } },
      {
        $addFields: { id: { $toString: '$_id' } }
      }
    ];
  }

  async findPendingWithDetails(): Promise<LeaveRequestWithDetails[]> {
    const col = await this.getCollection();
    return col.aggregate<LeaveRequestWithDetails>(this.getDetailsPipeline({ status: 'Pending' })).toArray();
  }

  /** Đơn của một nhân viên */
  async findByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    if (!ObjectId.isValid(employeeId)) return [];
    const result = await this.findMany({
      filters: { employeeId: new ObjectId(employeeId) },
      sort: { requestedAt: -1 },
    });
    return result.data;
  }

  async findByEmployeeWithDetails(employeeId: string): Promise<LeaveRequestWithDetails[]> {
    if (!ObjectId.isValid(employeeId)) return [];
    const col = await this.getCollection();
    return col.aggregate<LeaveRequestWithDetails>(this.getDetailsPipeline({ employeeId: new ObjectId(employeeId) })).toArray();
  }

  /** Đếm đơn chờ duyệt */
  async countPending(): Promise<number> {
    return this.count({ status: { $regex: '^pending$', $options: 'i' } });
  }

  /** Approve/Reject đơn */
  async resolve(id: string, status: 'Approved' | 'Rejected', resolvedBy: string): Promise<LeaveRequest | null> {
    return this.updateById(id, {
      status,
      resolvedAt: new Date().toISOString(),
      resolvedBy,
    });
  }
}

export const leaveRequestModel = new LeaveRequestRepository();
