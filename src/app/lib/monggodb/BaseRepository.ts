import { Filter, ObjectId, Document } from 'mongodb';
import { ZodSchema, ZodError } from 'zod';
import { connectToDatabase } from './connectToDatabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QueryOptions<TDoc> {
  filters?: Filter<TDoc>;
  sort?: Record<string, 1 | -1>;
  skip?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResult<TDoc> {
  data: TDoc[];
  total: number;
}

export class RepositoryValidationError extends Error {
  public readonly issues: ZodError['issues'];
  constructor(zodError: ZodError) {
    super('Validation failed: ' + zodError.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '));
    this.name = 'RepositoryValidationError';
    this.issues = zodError.issues;
  }
}

// ─── BaseRepository ───────────────────────────────────────────────────────────

export abstract class BaseRepository<TDoc extends object, TInput> {
  /** MongoDB collection name — subclass phải override */
  protected abstract readonly collectionName: string;

  /** Zod schema để validate input — subclass phải override (có thể là null nếu không cần) */
  protected abstract readonly createSchema: ZodSchema<TInput> | null;
  protected abstract readonly updateSchema: ZodSchema<Partial<TInput>> | null;

  /** Convert raw Mongo doc → clean output (string _id, ...) */
  protected abstract serialize(doc: Document): TDoc;

  // ─── Internal helper ──────────────────────────────────────────────────────

  protected async getCollection() {
    const { db } = await connectToDatabase();
    // Cast to Document (Record<string,unknown>) internally — TDoc can be any typed interface
    return db.collection<Document>(this.collectionName);
  }

  private validate<T>(schema: ZodSchema<T> | null, input: unknown): T {
    if (!schema) return input as T;
    const result = schema.safeParse(input);
    if (!result.success) throw new RepositoryValidationError(result.error);
    return result.data;
  }

  // ─── Read ─────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<TDoc | null> {
    if (!ObjectId.isValid(id)) return null;
    const col = await this.getCollection();
    const doc = await col.findOne({ _id: new ObjectId(id) });
    return doc ? this.serialize(doc) : null;
  }

  async findOne(filter: Filter<Document>): Promise<TDoc | null> {
    const col = await this.getCollection();
    const doc = await col.findOne(filter as Filter<Document>);
    return doc ? this.serialize(doc) : null;
  }

  async findMany(options: QueryOptions<Document> = {}): Promise<PaginatedResult<TDoc>> {
    const { filters = {}, sort = { _id: -1 }, skip = 0, limit } = options;
    const col = await this.getCollection();

    const total = await col.countDocuments(filters as Filter<Document>);
    const cursor = col.find(filters as Filter<Document>).sort(sort).skip(skip);
    if (limit) cursor.limit(limit);
    const raw = await cursor.toArray();

    return { data: raw.map((d) => this.serialize(d)), total };
  }

  async count(filter: Filter<Document> = {}): Promise<number> {
    const col = await this.getCollection();
    return col.countDocuments(filter as Filter<Document>);
  }

  async aggregate<TResult = unknown>(pipeline: Record<string, unknown>[]): Promise<TResult[]> {
    const col = await this.getCollection();
    return col.aggregate(pipeline).toArray() as Promise<TResult[]>;
  }

  // ─── Write ────────────────────────────────────────────────────────────────

  async create(input: unknown): Promise<TDoc> {
    const validated = this.validate(this.createSchema, input);
    const col = await this.getCollection();
    const doc = {
      ...(validated as Record<string, unknown>),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await col.insertOne(doc as Document);
    const inserted = await col.findOne({ _id: result.insertedId });
    if (!inserted) throw new Error('Insert failed: document not found after insert');
    return this.serialize(inserted);
  }

  async updateById(id: string, input: unknown): Promise<TDoc | null> {
    if (!ObjectId.isValid(id)) return null;
    const validated = this.validate(this.updateSchema, input);
    const col = await this.getCollection();
    const $set = { ...(validated as Record<string, unknown>), updatedAt: new Date() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete ($set as any)._id;
    await col.updateOne({ _id: new ObjectId(id) }, { $set });
    const updated = await col.findOne({ _id: new ObjectId(id) });
    return updated ? this.serialize(updated) : null;
  }

  async deleteById(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const col = await this.getCollection();
    const result = await col.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  // ─── Utility ──────────────────────────────────────────────────────────────

  /** Helper: chuyển _id ObjectId → string cho output */
  protected stringifyId(doc: Document): string {
    return doc._id instanceof ObjectId ? doc._id.toString() : String(doc._id);
  }
}
