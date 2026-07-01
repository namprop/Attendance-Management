import { NextRequest, NextResponse } from 'next/server';
import { webAuthnCredentialModel } from '@/app/lib/models/webAuthnCredential.model';

// DELETE /api/webauthn/credentials/[id] → xóa 1 credential
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Thiếu ID credential' }, { status: 400 });
    }

    await webAuthnCredentialModel.deleteById(id);

    return NextResponse.json({ success: true, message: 'Đã xóa vân tay thành công' });
  } catch (error) {
    console.error('Lỗi xóa credential:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
