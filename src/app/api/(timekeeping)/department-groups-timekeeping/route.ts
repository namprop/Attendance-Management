import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { addRow, getAllRows, getCollection, updateByField } from '@/app/lib/monggodb/mongoDBCRUD';
import type { DepartmentGroupTimekeeping } from '@/app/interface/timekeeping';

const COLLECTION_NAME = 'department_groups_timekeeping';

type DocumentType = Omit<DepartmentGroupTimekeeping, '_id'> & { _id?: ObjectId | string } & Record<string, unknown>;

export async function GET() {
  try {
    const result = await getAllRows<DocumentType>(COLLECTION_NAME, {
      sort: { field: '_id', order: 'asc' },
    });

    const locCol = await getCollection('locations-timekeeping');
    const locs = await locCol.find({}).toArray();
    const locMap = new Map();
    locs.forEach(l => locMap.set(l._id.toString(), l.locationName));

    const mappedData = result.data.map(item => ({
      ...item,
      id: item._id ? item._id.toString() : '',
      locationName: locMap.get(item.locationId ? String(item.locationId) : '') || 'Chưa phân bổ',
    }));

    return NextResponse.json({ data: mappedData, total: result.total });
  } catch (error) {
    console.error(`Failed to read ${COLLECTION_NAME} collection`, error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'add' || !action) {
      const groupObjectId = new ObjectId();
      const newDoc: Partial<DocumentType> = {
        _id: groupObjectId,
        locationId: body.locationId && ObjectId.isValid(body.locationId) ? new ObjectId(body.locationId) : body.locationId || '',
        code: body.code || '',
        name: body.name || '',
        shortCode: body.shortCode || '',
        isActive: body.isActive ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Check for duplicate code
      const existing = await getAllRows<DocumentType>(COLLECTION_NAME, { filters: { code: body.code || '' } });
      if (existing.total > 0 && body.code) {
        return NextResponse.json(
          { success: false, message: "Mã Khối/Cụm (Slug) đã tồn tại. Vui lòng chọn tên/mã khác." },
          { status: 409 }
        );
      }

      // Tự động drop unique index id_1 cũ để tránh lỗi trùng lặp id null
      const collection = await getCollection<DocumentType>(COLLECTION_NAME);
      await collection.dropIndex("id_1").catch(() => {});

      const addedId = await addRow<DocumentType>(COLLECTION_NAME, newDoc as DocumentType);
      return NextResponse.json({ success: true, data: { ...newDoc, _id: addedId } });
    }

    if (action === 'edit') {
      const { _id, locationId, code, name, shortCode, isActive } = body;
      
      const collection = await getCollection<DocumentType>(COLLECTION_NAME);
      
      const queryFilter = ObjectId.isValid(_id) 
        ? { $or: [{ _id: new ObjectId(_id) }, { _id: String(_id) }] } 
        : { _id: String(_id) };
      
      const current = await collection.findOne(queryFilter);
      if (current) {
        await collection.updateOne(
          queryFilter,
          {
            $set: {
              locationId: locationId !== undefined ? (locationId && ObjectId.isValid(locationId) ? new ObjectId(locationId) : locationId) : current.locationId,
              code: code ?? current.code,
              name: name ?? current.name,
              shortCode: shortCode !== undefined ? shortCode : current.shortCode,
              isActive: isActive ?? current.isActive,
              updatedAt: new Date().toISOString(),
            }
          }
        );
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    }

    if (action === 'delete') {
      const { _id } = body;
      if (!_id) return NextResponse.json({ success: false, message: 'Missing _id' }, { status: 400 });

      const collection = await getCollection<DocumentType>(COLLECTION_NAME);
      const queryFilter = ObjectId.isValid(_id) 
        ? { $or: [{ _id: new ObjectId(_id) }, { _id: String(_id) }] } 
        : { _id: String(_id) };
        
      const current = await collection.findOne(queryFilter);
      if (current) {
        // 1. Xóa các phòng ban (departments) thuộc khối cụm này
        const deptCollection = await getCollection('departments_timekeeping');
        const groupIdsForFilter = [current._id, current._id.toString(), current.id as string | undefined].filter(Boolean);
        await deptCollection.deleteMany({
          departmentGroupTimekeepingId: { $in: groupIdsForFilter }
        });

        // 2. Xóa chính khối cụm
        const result = await collection.deleteOne({ _id: current._id });
        if (result.deletedCount > 0) {
          return NextResponse.json({ success: true });
        }
      }
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    }

    if (action === 'list') {
      const result = await getAllRows<DocumentType>(COLLECTION_NAME, {
        sort: { field: '_id', order: 'asc' },
      });

      const locCol = await getCollection('locations-timekeeping');
      const locs = await locCol.find({}).toArray();
      const locMap = new Map();
      locs.forEach(l => locMap.set(l._id.toString(), l.locationName));

      const mappedData = result.data.map(item => ({
        ...item,
        id: item._id ? item._id.toString() : '',
        locationName: locMap.get(item.locationId ? String(item.locationId) : '') || 'Chưa phân bổ',
      }));

      return NextResponse.json({ success: true, data: mappedData, total: result.total });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error(`Failed to process ${COLLECTION_NAME} POST`, error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
