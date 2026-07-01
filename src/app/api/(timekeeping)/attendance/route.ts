import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { addRow, getAllRows, getCollection } from '@/app/lib/monggodb/mongoDBCRUD';
import type { Attendance } from '@/app/interface/timekeeping';

const COLLECTION_NAME = 'attendance';

type DocumentType = Omit<Attendance, '_id'> & { _id?: ObjectId } & Record<string, unknown>;

export async function GET() {
  try {
    const result = await getAllRows<DocumentType>(COLLECTION_NAME, {
      sort: { field: '_id', order: 'desc' },
    });

    return NextResponse.json({ data: result.data, total: result.total });
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
      const newDoc: Partial<DocumentType> = {
        userId: body.userId || '',
        date: body.date ? new Date(body.date) : new Date(),
        employeeType: body.employeeType || '',
        salaryType: body.salaryType || '',
        shift: body.shift || {
          shiftId: '',
          name: '',
          startTime: '',
          endTime: '',
          standardHours: 8,
        },
        checkIn: body.checkIn || '',
        checkOut: body.checkOut || '',
        checkInAt: body.checkInAt ? new Date(body.checkInAt) : undefined,
        checkOutAt: body.checkOutAt ? new Date(body.checkOutAt) : undefined,
        workHours: body.workHours || 0,
        standardHours: body.standardHours || 8,
        workUnit: body.workUnit || 0,
        payableHours: body.payableHours || 0,
        lateMinutes: body.lateMinutes || 0,
        earlyLeaveMinutes: body.earlyLeaveMinutes || 0,
        overtime: body.overtime || { tc1: 0, tc2: 0, tc3: 0 },
        workPlus: body.workPlus || 0,
        khPlus: body.khPlus || 0,
        status: body.status || 'present',
        attendanceSource: body.attendanceSource || 'machine',
        note: body.note || '',
        calculatedSalary: body.calculatedSalary || 0,
        month: body.month || new Date().getMonth() + 1,
        year: body.year || new Date().getFullYear(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const added = await addRow<DocumentType>(COLLECTION_NAME, newDoc as DocumentType);
      return NextResponse.json({ success: true, data: added });
    }

    if (action === 'edit') {
      const { _id, ...updateFields } = body;
      
      const collection = await getCollection<DocumentType>(COLLECTION_NAME);
      const queryId = new ObjectId(_id);
      
      const current = await collection.findOne({ _id: queryId });
      if (current) {
        // Prepare update object, handling dates properly
        const $set: any = { ...updateFields, updatedAt: new Date() };
        if ($set.date) $set.date = new Date($set.date);
        if ($set.checkInAt) $set.checkInAt = new Date($set.checkInAt);
        if ($set.checkOutAt) $set.checkOutAt = new Date($set.checkOutAt);

        // Remove system fields from update payload if any
        delete $set.action;
        delete $set._id;

        await collection.updateOne(
          { _id: queryId },
          { $set }
        );
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    }

    if (action === 'delete') {
      const { _id } = body;
      if (!_id) return NextResponse.json({ success: false, message: 'Missing _id' }, { status: 400 });

      const collection = await getCollection<DocumentType>(COLLECTION_NAME);
      const result = await collection.deleteOne({ _id: new ObjectId(_id) });
      
      if (result.deletedCount > 0) {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    }

    if (action === 'list') {
      const result = await getAllRows<DocumentType>(COLLECTION_NAME, {
        sort: { field: '_id', order: 'desc' },
      });
      return NextResponse.json({ success: true, data: result.data, total: result.total });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error(`Failed to process ${COLLECTION_NAME} POST`, error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
