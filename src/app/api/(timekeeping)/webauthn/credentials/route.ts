import { NextRequest, NextResponse } from 'next/server';
import { webAuthnCredentialModel } from '@/app/lib/models/webAuthnCredential.model';

// GET /api/webauthn/credentials?employeeId=xxx → lấy danh sách credential của nhân viên
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ success: false, message: 'Thiếu employeeId' }, { status: 400 });
    }

    const credentials = await webAuthnCredentialModel.findByEmployeeId(employeeId);

    return NextResponse.json({
      success: true,
      data: credentials.map(c => ({
        id: c.id,
        credentialID: c.credentialID,
        credentialDeviceType: c.credentialDeviceType,
        credentialBackedUp: c.credentialBackedUp,
        transports: c.transports,
        counter: c.counter,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    console.error('Lỗi lấy credentials:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
