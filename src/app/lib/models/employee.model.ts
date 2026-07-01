import { z } from 'zod';
import { Document, ObjectId } from 'mongodb';
import { BaseRepository } from '@/app/lib/monggodb/BaseRepository';
import type { Employee } from '@/app/interface/timekeeping';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const ObjectIdStringSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID tham chiếu không hợp lệ');


export const EmployeeCreateSchema = z.object({
  employeeCode: z.string().min(1, 'Mã nhân viên không được trống'),
  fullName: z.string().min(1, 'Tên không được trống'),
  name: z.string().optional(),
  role: z.string().min(1, 'Chức vụ không được trống'),
  employeeType: z.enum(['full_time', 'part_time']).default('full_time'),
  hasContract: z.boolean().optional().default(true),
  contractTypeId: z.string().optional().default(''),
  email: z.string().email('Email không hợp lệ').or(z.literal('')).optional().default(''),
  phone: z.string().optional().default(''),
  gender: z.string().optional().default('Nam'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'Active', 'Inactive']).default('ACTIVE'),
  avatar: z.string().optional().default('User'),
  branchId: ObjectIdStringSchema.or(z.literal('')).optional().default(''),
  locationId: ObjectIdStringSchema,
  deptGroupId: ObjectIdStringSchema.or(z.literal('')).optional().default(''),
  departmentId: ObjectIdStringSchema.or(z.literal('')).optional().default(''),
  identityCard: z.string().optional().default(''),
  dateOfBirth: z.string().optional().default(''),
  joinDate: z.string().optional().default(''),
  bankAccount: z.string().optional().default(''),
  address: z.string().optional().default(''),
  enrollNumber: z.string().optional().default(''),
  unaccentedName: z.string().optional().default(''),
  cardNo: z.string().optional().default(''),
  devicePassword: z.string().optional().default(''),
  devicePrivilege: z.string().optional().default('Nhân viên'),
  isEnabled: z.boolean().optional().default(true),
  nativePlace: z.string().optional().default(''),
  ethnicity: z.string().optional().default('Kinh'),
  nationality: z.string().optional().default('Việt Nam'),
  currentChallenge: z.string().optional().default(''),
});

export const EmployeeUpdateSchema = EmployeeCreateSchema.partial().omit({ employeeCode: true });

export type EmployeeCreate = z.infer<typeof EmployeeCreateSchema>;
export type EmployeeUpdate = z.infer<typeof EmployeeUpdateSchema>;

// ─── Repository ───────────────────────────────────────────────────────────────

class EmployeeRepository extends BaseRepository<Employee, EmployeeCreate> {
  protected readonly collectionName = 'employees-timekeeping';
  protected readonly createSchema = EmployeeCreateSchema;
  protected readonly updateSchema = EmployeeUpdateSchema;

  protected serialize(doc: Document): Employee {
    return {
      ...doc,
      _id: this.stringifyId(doc),
      id: this.stringifyId(doc),
      name: (doc.fullName as string) || (doc.name as string) || '',
      locationId: doc.locationId instanceof ObjectId ? doc.locationId.toString() : doc.locationId,
      branchId: doc.branchId instanceof ObjectId ? doc.branchId.toString() : doc.branchId,
      departmentId: doc.departmentId instanceof ObjectId ? doc.departmentId.toString() : doc.departmentId,
      deptGroupId: doc.deptGroupId instanceof ObjectId ? doc.deptGroupId.toString() : doc.deptGroupId,
    } as Employee;
  }

  /** Chuyển đổi foreign keys thành ObjectId thật trước khi lưu vào DB */
  private mapForeignKeys(data: EmployeeCreate | EmployeeUpdate): Record<string, unknown> {
    const result: Record<string, unknown> = { ...data };
    if (typeof result.locationId === 'string' && result.locationId !== '') result.locationId = new ObjectId(result.locationId);
    if (typeof result.branchId === 'string' && result.branchId !== '') result.branchId = new ObjectId(result.branchId);
    if (typeof result.departmentId === 'string' && result.departmentId !== '') result.departmentId = new ObjectId(result.departmentId);
    if (typeof result.deptGroupId === 'string' && result.deptGroupId !== '') result.deptGroupId = new ObjectId(result.deptGroupId);
    return result;
  }

  // Override create để xử lý convert ObjectId
  async create(input: unknown): Promise<Employee> {
    const validated = this.createSchema.parse(input);
    const doc = this.mapForeignKeys(validated);
    const col = await this.getCollection();
    const insertDoc = { ...doc, createdAt: new Date(), updatedAt: new Date() };
    const result = await col.insertOne(insertDoc as Document);
    const inserted = await col.findOne({ _id: result.insertedId });
    return this.serialize(inserted!);
  }

  // Override updateById để xử lý convert ObjectId
  async updateById(id: string, input: unknown): Promise<Employee | null> {
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

  /** Tìm nhân viên theo mã */
  async findByCode(code: string): Promise<Employee | null> {
    return this.findOne({ employeeCode: code });
  }

  /** Danh sách nhân viên đang hoạt động */
  async findActiveEmployees(): Promise<Employee[]> {
    const result = await this.findMany({
      filters: { status: { $in: ['ACTIVE', 'Active'] } },
      sort: { fullName: 1 },
    });
    return result.data;
  }

  /** Đếm số nhân viên đang hoạt động */
  async countActive(): Promise<number> {
    return this.count({ status: { $in: ['ACTIVE', 'Active'] } });
  }

  /** Nhân viên theo cơ sở */
  async findByLocation(locationId: string): Promise<Employee[]> {
    const result = await this.findMany({ filters: { locationId } });
    return result.data;
  }

  /** Lấy tất cả tên + id nhân viên (dùng cho dashboard join) */
  async findAllNamesMap(): Promise<Map<string, { name: string; role: string; employeeType: string }>> {
    const col = await this.getCollection();
    const docs = await col
      .find({}, { projection: { _id: 1, fullName: 1, name: 1, role: 1, employeeType: 1 } })
      .toArray();
    const map = new Map<string, { name: string; role: string; employeeType: string }>();
    for (const d of docs) {
      map.set(this.stringifyId(d), {
        name: (d.fullName as string) || (d.name as string) || '',
        role: (d.role as string) || '',
        employeeType: (d.employeeType as string) || '',
      });
    }
    return map;
  }
}

export const employeeModel = new EmployeeRepository();
