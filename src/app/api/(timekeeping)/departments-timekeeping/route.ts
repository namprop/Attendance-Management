import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { addRow, getAllRows, getCollection } from '@/app/lib/monggodb/mongoDBCRUD';
import type { DepartmentTimekeeping } from '@/app/interface/timekeeping';

const COLLECTION_NAME = 'departments_timekeeping';

type DocumentType = Omit<DepartmentTimekeeping, '_id'> & { _id?: ObjectId } & Record<string, unknown>;

export async function GET() {
  try {
    const result = await getAllRows<DocumentType>(COLLECTION_NAME, {
      sort: { field: '_id', order: 'asc' },
    });

    const [locCol, groupCol] = await Promise.all([
      getCollection('locations-timekeeping'),
      getCollection('department_groups_timekeeping'),
    ]);

    const [locs, groups] = await Promise.all([
      locCol.find({}).toArray(),
      groupCol.find({}).toArray(),
    ]);

    const locMap = new Map();
    locs.forEach(l => locMap.set(l._id.toString(), l.locationName));

    const groupMap = new Map();
    groups.forEach(g => groupMap.set(g._id.toString(), g.name));

    const mappedData = result.data.map(item => ({
      ...item,
      id: item._id ? item._id.toString() : (item.id || ''),
      locationName: locMap.get(item.locationId ? String(item.locationId) : '') || 'Chưa phân bổ',
      departmentGroupName: groupMap.get(item.departmentGroupTimekeepingId ? String(item.departmentGroupTimekeepingId) : '') || 'Chưa phân bổ',
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
      const departmentObjectId = new ObjectId();
      const newDoc: Partial<DocumentType> = {
        _id: departmentObjectId,
        locationId: body.locationId && ObjectId.isValid(body.locationId) ? new ObjectId(body.locationId) : body.locationId || '',
        departmentGroupTimekeepingId: body.departmentGroupTimekeepingId && ObjectId.isValid(body.departmentGroupTimekeepingId) ? new ObjectId(body.departmentGroupTimekeepingId) : body.departmentGroupTimekeepingId || '',
        code: body.code || '',
        name: body.name || '',
        shortName: body.shortName || '',
        shortCode: body.shortCode || '',
        isActive: body.isActive ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Check for duplicate code
      const existing = await getAllRows<DocumentType>(COLLECTION_NAME, { filters: { code: body.code || '' } });
      if (existing.total > 0 && body.code) {
        return NextResponse.json(
          { success: false, message: "Mã Phòng ban (Slug) đã tồn tại. Vui lòng chọn tên/mã khác." },
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
      const { _id, locationId, departmentGroupTimekeepingId, code, name, shortName, shortCode, isActive } = body;
      
      const collection = await getCollection<DocumentType>(COLLECTION_NAME);
      const queryFilter = ObjectId.isValid(_id) 
        ? { $or: [{ _id: new ObjectId(_id) }, { id: String(_id) }] } 
        : { id: String(_id) };
      
      const current = await collection.findOne(queryFilter);
      if (current) {
        await collection.updateOne(
          queryFilter,
          {
            $set: {
              locationId: locationId !== undefined ? (locationId && ObjectId.isValid(locationId) ? new ObjectId(locationId) : locationId) : current.locationId,
              departmentGroupTimekeepingId: departmentGroupTimekeepingId !== undefined ? (departmentGroupTimekeepingId && ObjectId.isValid(departmentGroupTimekeepingId) ? new ObjectId(departmentGroupTimekeepingId) : departmentGroupTimekeepingId) : current.departmentGroupTimekeepingId,
              code: code ?? current.code,
              name: name ?? current.name,
              shortName: shortName ?? current.shortName,
              shortCode: shortCode ?? current.shortCode,
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
        ? { $or: [{ _id: new ObjectId(_id) }, { id: String(_id) }] } 
        : { id: String(_id) };
        
      const result = await collection.deleteOne(queryFilter);
      
      if (result.deletedCount > 0) {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    }

    if (action === 'list') {
      const result = await getAllRows<DocumentType>(COLLECTION_NAME, {
        sort: { field: '_id', order: 'asc' },
      });

      const [locCol, groupCol] = await Promise.all([
        getCollection('locations-timekeeping'),
        getCollection('department_groups_timekeeping'),
      ]);

      const [locs, groups] = await Promise.all([
        locCol.find({}).toArray(),
        groupCol.find({}).toArray(),
      ]);

      const locMap = new Map();
      locs.forEach(l => locMap.set(l._id.toString(), l.locationName));

      const groupMap = new Map();
      groups.forEach(g => groupMap.set(g._id.toString(), g.name));

      const mappedData = result.data.map(item => ({
        ...item,
        id: item._id ? item._id.toString() : (item.id || ''),
        locationName: locMap.get(item.locationId ? String(item.locationId) : '') || 'Chưa phân bổ',
        departmentGroupName: groupMap.get(item.departmentGroupTimekeepingId ? String(item.departmentGroupTimekeepingId) : '') || 'Chưa phân bổ',
      }));

      return NextResponse.json({ success: true, data: mappedData, total: result.total });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400   });
  } catch (error) {
    console.error(`Failed to process ${COLLECTION_NAME} POST`, error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 });
  }
}
