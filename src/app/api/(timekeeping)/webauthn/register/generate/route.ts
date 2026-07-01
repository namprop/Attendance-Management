import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { employeeModel } from '@/app/lib/models';
import { webAuthnCredentialModel } from '@/app/lib/models/webAuthnCredential.model';
import { ObjectId } from 'mongodb';

// RP ID should match your domain. For localhost, use 'localhost'
const rpID = process.env.NEXT_PUBLIC_WEBAUTHN_RPID || 'localhost';
const rpName = 'Chấm công Timekeeping';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ success: false, message: 'Thiếu employeeId' }, { status: 400 });
    }

    const employee = await employeeModel.findById(employeeId);
    if (!employee) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy nhân viên' }, { status: 404 });
    }

    // Lấy các thiết bị đã đăng ký của nhân viên này để tránh đăng ký trùng
    const userCredentials = await webAuthnCredentialModel.findByEmployeeId(employeeId);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new Uint8Array(Buffer.from(employee.id)), // Convert ID to Uint8Array
      userName: employee.employeeCode || employee.id, // Username hiển thị lúc chọn Passkey
      userDisplayName: employee.fullName || employee.name, // Tên đầy đủ
      attestationType: 'none',
      excludeCredentials: userCredentials.map((cred) => ({
        id: cred.credentialID,
        type: 'public-key',
        transports: cred.transports as ('internal' | 'usb' | 'nfc' | 'ble' | 'hybrid')[],
      })),
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'discouraged', // KHÔNG dùng Passkey (Google), ép buộc dùng phần cứng vân tay thực tế
      },
    });

    // Lưu challenge vào DB để verify ở bước sau
    await employeeModel.updateById(employeeId, { currentChallenge: options.challenge });

    return NextResponse.json({ success: true, data: options });
  } catch (error) {
    console.error('Lỗi generateRegistrationOptions:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
