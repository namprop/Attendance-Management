import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { employeeModel } from '@/app/lib/models';
import { webAuthnCredentialModel } from '@/app/lib/models/webAuthnCredential.model';
import { webAuthnChallengeModel } from '@/app/lib/models/webAuthnChallenge.model';
import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';
import { ObjectId } from 'mongodb';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import {
  buildCheckInPayload,
  buildCheckOutPayload,
  getEmployeeGroup,
  getEmployeeWorkType,
} from '@/app/lib/timekeeping/attendanceService';
import type { ShiftConfig, Employee } from '@/app/interface/timekeeping';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Ho_Chi_Minh');

const rpID = process.env.NEXT_PUBLIC_WEBAUTHN_RPID || 'localhost';
const expectedOrigin = process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN || 'http://localhost:3007';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { authenticationResponse } = body;

    if (!authenticationResponse) {
      return NextResponse.json({ success: false, message: 'Thiếu dữ liệu' }, { status: 400 });
    }

    // 1. Tìm credential trong DB dựa trên ID mà thiết bị gửi lên
    const credentialID = authenticationResponse.id;
    const credential = await webAuthnCredentialModel.findByCredentialId(credentialID);

    if (!credential) {
      return NextResponse.json({ success: false, message: 'Vân tay chưa được đăng ký trên hệ thống' }, { status: 404 });
    }

    // 2. Tìm Employee
    const employee = await employeeModel.findById(credential.employeeId);
    if (!employee) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy nhân viên' }, { status: 404 });
    }

    // 3. Lấy challenge gốc
    // Trình duyệt gửi lên clientDataJSON chứa challenge dạng base64url
    // Để verify auth thì cần truyền expectedChallenge. Tuy nhiên ta lưu tất cả các challenge được generate vào DB
    // Vì SimpleWebAuthn cần expectedChallenge, nên ta có thể bỏ qua check DB ở đây và truyền chính challenge
    // từ response. Tức là ta giải mã nó trước. Hoặc đọc challenge tương ứng trong DB.
    
    // Tạm thời lấy challenge gần nhất được tạo hoặc ta phải decode clientDataJSON để lấy challenge
    const clientDataJSON = Buffer.from(authenticationResponse.response.clientDataJSON, 'base64url').toString('utf-8');
    const clientData = JSON.parse(clientDataJSON);
    const challengeBase64 = clientData.challenge;
    
    const validChallenge = await webAuthnChallengeModel.findByChallenge(challengeBase64);
    if (!validChallenge || new Date(validChallenge.expiresAt) < new Date()) {
      return NextResponse.json({ success: false, message: 'Phiên chấm công đã hết hạn. Hãy load lại trang.' }, { status: 400 });
    }

    // 4. Verify với thư viện
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: authenticationResponse,
        expectedChallenge: validChallenge.challenge,
        expectedOrigin,
        expectedRPID: rpID,
        credential: {
          id: credential.credentialID,
          publicKey: Buffer.from(credential.credentialPublicKey, 'base64url'),
          counter: credential.counter,
          transports: credential.transports as ('internal' | 'usb' | 'nfc' | 'ble' | 'hybrid')[],
        },
      });
    } catch (error) {
      console.error('Verify Auth failed:', error);
      return NextResponse.json({ success: false, message: 'Xác minh thất bại', error: String(error) }, { status: 400 });
    }

    if (!verification.verified) {
      return NextResponse.json({ success: false, message: 'Vân tay không khớp' }, { status: 400 });
    }

    // Cập nhật counter chống replay attack
    await webAuthnCredentialModel.updateById(credential.id, { counter: verification.authenticationInfo.newCounter });

    // Xóa challenge đã dùng
    // await webAuthnChallengeModel.deleteById(validChallenge.id);

    // 5. Ghi log chấm công
    const { db } = await connectToDatabase();
    const now = dayjs().tz('Asia/Ho_Chi_Minh').toDate();
    const dateStr = dayjs(now).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
    const timeStr = dayjs(now).tz('Asia/Ho_Chi_Minh').format('HH:mm:ss');

    // Lưu bằng chứng vào collection log
    await db.collection('attendance_logs-timekeeping').insertOne({
      employeeCode: employee.employeeCode,
      locationId: 'WEB_AUTHN', // Hoặc có thể parse nếu Kiosk
      locationSlug: 'web-authn',
      scanTime: now,
      businessDate: dateStr,
      authMode: 'WEBAUTHN_BIOMETRIC',
      gpsLocation: null,
      isLocationValid: true,
      createdAt: now,
    });

    // 6. Xử lý Check In / Check Out logic
    const typedEmployee = employee as unknown as Employee;
    const employeeGroup = getEmployeeGroup(typedEmployee);
    const employeeWorkType = getEmployeeWorkType(typedEmployee);
    const shifts = await db.collection<ShiftConfig>('shift_configs-timekeeping').find({ isActive: true }).toArray();

    // Tìm record gần nhất trong 14 tiếng
    const fourteenHoursAgo = dayjs(now).tz('Asia/Ho_Chi_Minh').subtract(14, 'hour').toDate();
    const recentRecords = await db.collection('time_records-timekeeping')
      .find({
        employeeId: employee.employeeCode,
        createdAt: { $gte: fourteenHoursAgo }
      })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    const latestRecord = recentRecords.length > 0 ? recentRecords[0] : null;
    const isCheckOut = Boolean(latestRecord?.clockIn && !latestRecord.clockOut);

    let checkAction = '';
    let lateMins = 0;
    let earlyMins = 0;
    let currentShiftName = '';

    if (!isCheckOut || !latestRecord) {
      // CHECK IN MỚI
      const payload = buildCheckInPayload({
        employeeId: employee.employeeCode || employee.id,
        date: dateStr,
        timeStr,
        deviceType: 'WebAuthn/FaceID',
        shifts,
        employeeGroup,
        employeeWorkType,
        employeeDepartmentGroupId: employee.deptGroupId || employee.departmentGroupId,
        employeeBranchId: employee.branchId?.toString(),
        employeeLocationId: employee.locationId?.toString(),
        employeeDepartmentId: employee.departmentId?.toString(),
      });

      checkAction = 'CHECK_IN';
      lateMins = payload.lateMinutes;

      const matchedShift = shifts.find((s) => s._id?.toString() === payload.shiftId?.toString());
      currentShiftName = matchedShift ? matchedShift.name : '';

      await db.collection('time_records-timekeeping').insertOne({
        employeeId: payload.employeeId,
        date: payload.date,
        clockIn: payload.clockIn,
        clockOut: payload.clockOut,
        shiftId: payload.shiftId,
        deviceType: payload.deviceType,
        gpsMatched: true,
        lateMinutes: payload.lateMinutes,
        earlyMinutes: payload.earlyMinutes,
        reasonApproved: payload.reasonApproved,
        locationId: 'WEB_AUTHN',
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // CHECK OUT
      const payload = buildCheckOutPayload({
        recordId: latestRecord._id.toString(),
        timeStr,
        clockInTime: latestRecord.clockIn,
        existingShiftId: latestRecord.shiftId,
        shifts,
        employeeGroup,
        employeeWorkType,
        employeeId: employee.employeeCode || employee.id,
        employeeDepartmentGroupId: employee.deptGroupId || employee.departmentGroupId,
        employeeBranchId: employee.branchId?.toString(),
        employeeLocationId: employee.locationId?.toString(),
        employeeDepartmentId: employee.departmentId?.toString(),
      });

      checkAction = 'CHECK_OUT';
      earlyMins = payload.earlyMinutes;

      const matchedShift = shifts.find(
        (s) => s._id?.toString() === payload.shiftId?.toString() || s.code === payload.shiftId
      );
      currentShiftName = matchedShift ? matchedShift.name : '';

      await db.collection('time_records-timekeeping').updateOne(
        { _id: new ObjectId(latestRecord._id) },
        {
          $set: {
            clockOut: payload.clockOut,
            shiftId: payload.shiftId,
            ...(payload.lateMinutes !== undefined ? { lateMinutes: payload.lateMinutes } : {}),
            earlyMinutes: payload.earlyMinutes,
            updatedAt: now,
          }
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Chấm công thành công! (${checkAction})`,
      data: { 
        fullName: employee.fullName || employee.name,
        employeeCode: employee.employeeCode,
        action: checkAction, 
        lateMinutes: lateMins, 
        earlyMinutes: earlyMins, 
        shiftName: currentShiftName 
      }
    });

  } catch (error) {
    console.error('Lỗi Verify Auth WebAuthn:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
