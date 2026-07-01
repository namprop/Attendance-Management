import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { addRow, getAllRows } from '@/app/lib/monggodb/mongoDBCRUD';
import type { BranchTimekeeping } from '@/app/interface/timekeeping';
import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';

const COLLECTION_NAME = 'branch-timekeeping';

type BranchTimekeepingDocument = Omit<BranchTimekeeping, '_id' | 'id'> & { _id?: ObjectId | string; id?: string } & Record<string, unknown>;

export async function GET() {
  try {
    const result = await getAllRows<BranchTimekeepingDocument>(COLLECTION_NAME, {
      sort: { field: '_id', order: 'asc' },
    });

    const mappedData = result.data.map(item => ({
      ...item,
      id: item._id ? item._id.toString() : '',
    }));

    return NextResponse.json({ data: mappedData, total: result.total });
  } catch (error) {
    console.error('Failed to read branch-timekeeping collection', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'add' || !action) {
      const branchObjectId = new ObjectId();

      let generatedCode = body.code || '';
      if (!generatedCode && body.name) {
        generatedCode = body.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');
      }

      // Check for duplicate code
      const existing = await getAllRows<BranchTimekeepingDocument>(COLLECTION_NAME, { filters: { code: generatedCode } });
      if (existing.total > 0) {
        return NextResponse.json(
          { success: false, message: "Mã Chi nhánh (Slug) đã tồn tại. Vui lòng chọn tên khác." },
          { status: 409 }
        );
      }

      const newBranch: BranchTimekeepingDocument = {
        _id: branchObjectId,
        code: generatedCode,
        name: body.name || '',
        shortCode: body.shortCode || '',
        location: body.location || '',
        status: body.status || 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Tự động drop unique index id_1 cũ để tránh lỗi trùng lặp id null
      const { db } = await connectToDatabase();
      await db.collection(COLLECTION_NAME).dropIndex("id_1").catch(() => {});

      const addedId = await addRow<BranchTimekeepingDocument>(COLLECTION_NAME, newBranch);
      return NextResponse.json({ success: true, data: { ...newBranch, _id: addedId } });
    }

    if (action === 'edit') {
      const { _id, code, name, shortCode, location, status } = body;
      const { db } = await connectToDatabase();
      if (!_id) return NextResponse.json({ success: false, message: 'Missing _id' }, { status: 400 });

      const filter = ObjectId.isValid(_id) 
        ? { $or: [{ _id: new ObjectId(_id) }, { id: String(_id) }] }
        : { id: String(_id) };

      const current = await db.collection(COLLECTION_NAME).findOne(filter);
      if (current) {
        await db.collection(COLLECTION_NAME).updateOne(
          { _id: current._id },
          {
            $set: {
              code: code ?? current.code,
              name: name ?? current.name,
              shortCode: shortCode ?? current.shortCode,
              location: location ?? current.location,
              status: status ?? current.status,
              updatedAt: new Date().toISOString(),
            }
          }
        );
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: false, message: 'Branch not found' }, { status: 404 });
    }

    if (action === 'delete') {
      const { _id } = body;
      const { db } = await connectToDatabase();
      if (!_id) return NextResponse.json({ success: false, message: 'Missing _id' }, { status: 400 });

      const filter = ObjectId.isValid(_id) 
        ? { $or: [{ _id: new ObjectId(_id) }, { id: String(_id) }] }
        : { id: String(_id) };

      const current = await db.collection(COLLECTION_NAME).findOne(filter);
      if (current) {
        // 1. Tìm tất cả các location thuộc chi nhánh này
        const branchIdsForFilter = [current._id, current._id.toString(), current.id].filter(Boolean);
        const targetLocations = await db.collection("locations-timekeeping").find({
          branchId: { $in: branchIdsForFilter }
        }).toArray();

        const locationIds = targetLocations.map(l => l._id);
        const locationStringIds = targetLocations.map(l => l._id?.toString()).filter(Boolean);
        const locationOldIds = targetLocations.map(l => l.id).filter(Boolean);
        const allLocationIds = Array.from(new Set([...locationIds, ...locationStringIds, ...locationOldIds]));

        // 2. Xóa các phòng ban (departments) thuộc các cơ sở này
        if (allLocationIds.length > 0) {
          await db.collection("departments_timekeeping").deleteMany({
            locationId: { $in: allLocationIds }
          });
          // 3. Xóa các khối cụm (department groups) thuộc các cơ sở này
          await db.collection("department_groups_timekeeping").deleteMany({
            locationId: { $in: allLocationIds }
          });
        }
        
        // 4. Xóa các cơ sở (locations) thuộc chi nhánh này
        await db.collection("locations-timekeeping").deleteMany({
          branchId: { $in: branchIdsForFilter }
        });

        // 5. Xóa chính chi nhánh
        await db.collection(COLLECTION_NAME).deleteOne({ _id: current._id });
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: false, message: 'Branch not found' }, { status: 404 });
    }

    if (action === 'list') {
      const result = await getAllRows<BranchTimekeepingDocument>(COLLECTION_NAME, {
        sort: { field: '_id', order: 'asc' },
      });
      const mappedData = result.data.map(item => ({
        ...item,
        id: item._id ? item._id.toString() : '',
      }));
      return NextResponse.json({ success: true, data: mappedData, total: result.total });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Failed to process branch-timekeeping POST', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
