import { NextRequest, NextResponse } from 'next/server';
import { ObjectId, UpdateFilter, Document } from 'mongodb';
import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ── GET /api/v1/employees/[id]/contracts ──────────────────────────────────────
// Lấy toàn bộ lịch sử hợp đồng của một nhân viên
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'ID nhân viên không hợp lệ' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const employee = await db.collection('employees-timekeeping').findOne(
      { _id: new ObjectId(id) },
      { projection: { contracts: 1, fullName: 1, employeeCode: 1 } }
    );

    if (!employee) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy nhân viên' }, { status: 404 });
    }

    const contracts = employee.contracts || [];

    // Enrich với templateName
    const templateIds = contracts
      .map((c: { templateId?: string }) => c.templateId)
      .filter((tid: unknown) => tid && ObjectId.isValid(String(tid)));

    let templateMap: Map<string, string> = new Map();
    if (templateIds.length > 0) {
      const templates = await db.collection('contract_templates')
        .find({ _id: { $in: templateIds.map((tid: string) => new ObjectId(tid)) } })
        .project({ _id: 1, templateName: 1, contractType: 1 })
        .toArray();
      templateMap = new Map(templates.map(t => [t._id.toString(), t.templateName as string]));
    }

    const enriched = contracts.map((c: Record<string, unknown>) => ({
      ...c,
      _id: c._id?.toString(),
      templateName: c.templateId ? (templateMap.get(String(c.templateId)) || 'N/A') : 'N/A',
    }));

    // Sort mới nhất lên đầu
    enriched.sort((a: { signedDate?: string }, b: { signedDate?: string }) =>
      new Date(b.signedDate || 0).getTime() - new Date(a.signedDate || 0).getTime()
    );

    return NextResponse.json({
      success: true,
      data: enriched,
      employee: {
        _id: employee._id.toString(),
        fullName: employee.fullName,
        employeeCode: employee.employeeCode,
      },
    });
  } catch (error) {
    console.error('Lỗi lấy lịch sử hợp đồng:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server nội bộ' }, { status: 500 });
  }
}

// ── POST /api/v1/employees/[id]/contracts ─────────────────────────────────────
// Ký hợp đồng mới (hoặc gia hạn). Tự động EXPIRED hợp đồng ACTIVE cũ.
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'ID nhân viên không hợp lệ' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const body = await req.json();

    const { contractNumber, templateId, signedDate, customValues } = body;

    if (!contractNumber?.trim()) {
      return NextResponse.json({ success: false, message: 'Số hợp đồng không được trống' }, { status: 400 });
    }
    if (!templateId || !ObjectId.isValid(templateId)) {
      return NextResponse.json({ success: false, message: 'Mẫu hợp đồng không hợp lệ' }, { status: 400 });
    }

    // Kiểm tra nhân viên tồn tại
    const employee = await db.collection('employees-timekeeping').findOne({ _id: new ObjectId(id) });
    if (!employee) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy nhân viên' }, { status: 404 });
    }

    // Tự động EXPIRED hợp đồng ACTIVE cũ
    await db.collection('employees-timekeeping').updateOne(
      { _id: new ObjectId(id), 'contracts.status': 'ACTIVE' },
      {
        $set: {
          'contracts.$[elem].status': 'EXPIRED',
          'contracts.$[elem].updatedAt': new Date(),
        },
      },
      { arrayFilters: [{ 'elem.status': 'ACTIVE' }] }
    );

    const startDate = customValues?.start_date || signedDate || new Date().toISOString().substring(0, 10);
    const endDate = customValues?.end_date || '';

    const newContract = {
      _id: new ObjectId(),
      contractNumber: contractNumber.trim(),
      templateId: new ObjectId(templateId),
      signedDate: signedDate || new Date().toISOString().substring(0, 10),
      startDate,
      endDate,
      status: 'ACTIVE',
      customValues: customValues || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Thêm hợp đồng mới + đồng bộ lương nếu có
    const $setFields: Record<string, unknown> = { updatedAt: new Date() };

    // Đồng bộ baseSalary nếu customValues có base_salary
    if (customValues?.base_salary) {
      $setFields.baseSalary = Number(customValues.base_salary) || 0;
    }

    const updateOp = {
      $push: { contracts: newContract },
      $set: $setFields,
    };

    await db.collection('employees-timekeeping').updateOne(
      { _id: new ObjectId(id) },
      updateOp as unknown as UpdateFilter<Document>
    );

    return NextResponse.json({
      success: true,
      message: `Đã ký hợp đồng ${contractNumber} thành công`,
      data: {
        ...newContract,
        _id: newContract._id.toString(),
        templateId: newContract.templateId.toString(),
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Lỗi ký hợp đồng mới:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server nội bộ' }, { status: 500 });
  }
}
