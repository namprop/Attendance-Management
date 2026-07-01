import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';

const COLLECTION = 'contract_templates';

// ── GET /api/contract-templates ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';

    const query: Record<string, unknown> = {};
    if (activeOnly) query.isActive = true;

    const templates = await db.collection(COLLECTION)
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ data: templates, success: true });
  } catch (error) {
    console.error('Lỗi lấy danh sách mẫu hợp đồng:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server nội bộ' }, { status: 500 });
  }
}

// ── POST /api/contract-templates ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();
    const { action } = body;

    // ── Thêm mới template ──
    if (action === 'add') {
      const { templateName, htmlContent, sections, isActive } = body;

      if (!templateName?.trim()) {
        return NextResponse.json({ success: false, message: 'Tên mẫu hợp đồng không được trống' }, { status: 400 });
      }

      // Validate: phải có htmlContent (CKEditor mới) HOẶC sections (dữ liệu cũ)
      const hasHtml = htmlContent && typeof htmlContent === 'string' && htmlContent.trim().length > 0;
      const hasSections = Array.isArray(sections) && sections.length > 0;

      if (!hasHtml && !hasSections) {
        return NextResponse.json({ success: false, message: 'Nội dung hợp đồng không được trống' }, { status: 400 });
      }

      const newTemplate: Record<string, unknown> = {
        templateName: templateName.trim(),
        isActive: isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (hasHtml) {
        newTemplate.htmlContent = htmlContent.trim();
      }

      if (hasSections) {
        newTemplate.sections = (sections as { title: string; rawText: string }[]).map(s => ({
          title: s.title.trim(),
          rawText: s.rawText.trim(),
        }));
      }

      const result = await db.collection(COLLECTION).insertOne(newTemplate);
      return NextResponse.json({
        success: true,
        message: 'Tạo mẫu hợp đồng thành công',
        data: { _id: result.insertedId, ...newTemplate },
      }, { status: 201 });
    }

    // ── Cập nhật template ──
    if (action === 'edit') {
      const { _id, templateName, htmlContent, sections, isActive } = body;

      if (!_id || !ObjectId.isValid(_id)) {
        return NextResponse.json({ success: false, message: 'ID không hợp lệ' }, { status: 400 });
      }
      if (!templateName?.trim()) {
        return NextResponse.json({ success: false, message: 'Tên mẫu không được trống' }, { status: 400 });
      }

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
        templateName: templateName.trim(),
      };

      if (htmlContent && typeof htmlContent === 'string') {
        updateData.htmlContent = htmlContent.trim();
      }
      if (Array.isArray(sections)) {
        updateData.sections = (sections as { title: string; rawText: string }[]).map(s => ({
          title: s.title.trim(),
          rawText: s.rawText.trim(),
        }));
      }
      if (isActive !== undefined) updateData.isActive = isActive;

      await db.collection(COLLECTION).updateOne(
        { _id: new ObjectId(_id) },
        { $set: updateData }
      );

      return NextResponse.json({ success: true, message: 'Cập nhật mẫu hợp đồng thành công' });
    }

    // ── Xóa template ──
    if (action === 'delete') {
      const { _id } = body;

      if (!_id || !ObjectId.isValid(_id)) {
        return NextResponse.json({ success: false, message: 'ID không hợp lệ' }, { status: 400 });
      }

      await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(_id) });
      return NextResponse.json({ success: true, message: 'Đã xóa mẫu hợp đồng' });
    }

    // ── Toggle active ──
    if (action === 'toggle') {
      const { _id, isActive } = body;

      if (!_id || !ObjectId.isValid(_id)) {
        return NextResponse.json({ success: false, message: 'ID không hợp lệ' }, { status: 400 });
      }

      await db.collection(COLLECTION).updateOne(
        { _id: new ObjectId(_id) },
        { $set: { isActive: !isActive, updatedAt: new Date() } }
      );

      return NextResponse.json({ success: true, message: `Đã ${!isActive ? 'kích hoạt' : 'tắt'} mẫu hợp đồng` });
    }

    return NextResponse.json({ success: false, message: 'Action không hợp lệ' }, { status: 400 });

  } catch (error) {
    console.error('Lỗi xử lý mẫu hợp đồng:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server nội bộ' }, { status: 500 });
  }
}
