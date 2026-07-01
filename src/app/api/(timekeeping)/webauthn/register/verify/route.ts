import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { employeeModel } from '@/app/lib/models';
import { webAuthnCredentialModel } from '@/app/lib/models/webAuthnCredential.model';

const rpID = process.env.NEXT_PUBLIC_WEBAUTHN_RPID || 'localhost';
const expectedOrigin = process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN || 'http://localhost:3007';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, registrationResponse } = body;

    if (!employeeId || !registrationResponse) {
      return NextResponse.json({ success: false, message: 'Thiếu dữ liệu' }, { status: 400 });
    }

    const employee = await employeeModel.findById(employeeId);
    if (!employee || !employee.currentChallenge) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy session đăng ký' }, { status: 400 });
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: registrationResponse,
        expectedChallenge: employee.currentChallenge,
        expectedOrigin,
        expectedRPID: rpID,
      });
    } catch (error) {
      console.error('Verify failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return NextResponse.json({ success: false, message: `Lỗi: ${errorMessage}` }, { status: 400 });
    }

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo;

      // Lưu credential vào database
      await webAuthnCredentialModel.create({
        employeeId: employee.id,
        credentialID: credential.id,
        credentialPublicKey: Buffer.from(credential.publicKey).toString('base64url'),
        counter: credential.counter,
        credentialDeviceType,
        credentialBackedUp,
        transports: registrationResponse.response.transports || [],
      });

      // Clear the challenge
      await employeeModel.updateById(employeeId, { currentChallenge: '' });

      return NextResponse.json({ success: true, message: 'Đăng ký thành công' });
    }

    return NextResponse.json({ success: false, message: 'Xác thực không hợp lệ' }, { status: 400 });
  } catch (error) {
    console.error('Lỗi verifyRegistrationResponse:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
