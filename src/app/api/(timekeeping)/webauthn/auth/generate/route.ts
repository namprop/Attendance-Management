import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { employeeModel } from '@/app/lib/models';
import { webAuthnCredentialModel } from '@/app/lib/models/webAuthnCredential.model';
import { webAuthnChallengeModel } from '@/app/lib/models/webAuthnChallenge.model';

const rpID = process.env.NEXT_PUBLIC_WEBAUTHN_RPID || 'localhost';

export async function GET() {
  try {
    // Lấy TOÀN BỘ vân tay đã đăng ký trong hệ thống
    const result = await webAuthnCredentialModel.findMany({});
    const allCredentials = result.data || [];
    const allowCredentials = allCredentials.map(cred => ({
      id: cred.credentialID,
      type: 'public-key' as const,
      transports: cred.transports as ('internal' | 'usb' | 'nfc' | 'ble' | 'hybrid')[],
    }));

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'required',
      allowCredentials, // Nạp danh sách vào đây để trình duyệt tự quét và đối chiếu
    });
    // Lưu challenge vào DB (hết hạn sau 5 phút)
    await webAuthnChallengeModel.create({
      challenge: options.challenge,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    return NextResponse.json({ success: true, data: options });
  } catch (error) {
    console.error('Lỗi generateAuthenticationOptions:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
