import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";
import { requirePermission } from "@/lib/auth-guard";
import { sendEmail } from "@/lib/sendgrid";
import { WelcomeAccountEmail } from "@/emails/WelcomeAccount";
import React from 'react';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const permError = await requirePermission(req, 'timekeeping_members_edit');
  if (permError) return permError;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { data: null, message: "ID nhân sự không hợp lệ." },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const body = await req.json();

    const {
      employeeCode,
      fullName,
      role,
      employeeType,
      email,
      avatar,
      locationId,
      phone,
      gender,
      status,
      branchId,
      deptGroupId,
      departmentId,
      identityCard,
      dateOfBirth,
      joinDate,
      bankAccount,
      address,
      enrollNumber,
      unaccentedName,
      cardNo,
      devicePassword,
      devicePrivilege,
      isEnabled,
      nativePlace,
      ethnicity,
      nationality,
      // Salary specific fields
      baseSalary,
      salaryType,
      isPayingInsurance,
      insuranceSalary,
      bankName,
      taxCode,
      salaryStructureId,
      positionId,
      // Auth specific fields
      accountAction,
      accountId,
      authRole,
      authUsername,
      linkedDevices,
      contractTypeId
    } = body;

    if (!employeeCode || !fullName || !role || !locationId) {
      return NextResponse.json(
        { data: null, message: "Thiếu thông tin bắt buộc (Mã NV, Tên, Chức vụ, Cơ sở)" },
        { status: 400 }
      );
    }

    // Check if employeeCode exists for another employee
    const existing = await db.collection("employees-timekeeping").findOne({
      employeeCode,
      _id: { $ne: new ObjectId(id) }
    });

    if (existing) {
      return NextResponse.json(
        { data: null, message: "Mã nhân viên đã được sử dụng bởi nhân sự khác." },
        { status: 409 }
      );
    }

    // Check if email exists for another employee
    if (email && email.trim()) {
      const existingEmail = await db.collection("employees-timekeeping").findOne({
        email: email.trim(),
        _id: { $ne: new ObjectId(id) }
      });
      if (existingEmail) {
        return NextResponse.json(
          { data: null, message: "Địa chỉ Email đã được sử dụng bởi nhân sự khác." },
          { status: 409 }
        );
      }
    }

    const toObjectIdSafe = (val: unknown) => {
      if (typeof val === "string" && ObjectId.isValid(val)) {
        return new ObjectId(val);
      }
      return val;
    };

    const updateFields: Record<string, unknown> = {
      employeeCode,
      fullName,
      name: fullName, // for compatibility
      role,
      employeeType: employeeType || "none",
      contractTypeId: contractTypeId || "",
      email: email || "",
      phone: phone || "",
      gender: gender || "Nam",
      status: status || "ACTIVE",
      avatar: avatar || "User",
      branchId: toObjectIdSafe(branchId) || "",
      locationId: toObjectIdSafe(locationId) || "",
      deptGroupId: toObjectIdSafe(deptGroupId) || "",
      departmentId: toObjectIdSafe(departmentId) || "",
      identityCard: identityCard || "",
      dateOfBirth: dateOfBirth || "",
      joinDate: joinDate || "",
      bankAccount: bankAccount || "",
      address: address || "",
      enrollNumber: enrollNumber || "",
      unaccentedName: unaccentedName || "",
      cardNo: cardNo || "",
      devicePassword: devicePassword || "",
      devicePrivilege: devicePrivilege || "Nhân viên",
      isEnabled: isEnabled !== undefined ? isEnabled : true,
      nativePlace: nativePlace || "",
      ethnicity: ethnicity || "Kinh",
      nationality: nationality || "Việt Nam",
      updatedAt: new Date(),
    };

    if (Array.isArray(linkedDevices)) {
      updateFields.zktecoLinkedDevices = linkedDevices;
    }

    if (baseSalary !== undefined) updateFields.baseSalary = Number(baseSalary);
    if (salaryType !== undefined) updateFields.salaryType = salaryType;
    if (isPayingInsurance !== undefined) updateFields.isPayingInsurance = isPayingInsurance;
    if (insuranceSalary !== undefined) updateFields.insuranceSalary = Number(insuranceSalary);
    if (bankName !== undefined) updateFields.bankName = bankName;
    if (taxCode !== undefined) updateFields.taxCode = taxCode;
    if (salaryStructureId !== undefined) updateFields.salaryStructureId = salaryStructureId;
    if (positionId !== undefined) updateFields.positionId = positionId;

    const result = await db.collection("employees-timekeeping").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { data: null, message: "Không tìm thấy nhân viên để cập nhật." },
        { status: 404 }
      );
    }

    // ĐỒNG BỘ CẬP NHẬT TÀI KHOẢN AUTH (Dùng HTTP API như bên Salary)
    try {
      const authUrl = process.env.AUTH_API_URL || 'http://localhost:3000';
      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': process.env.INTERNAL_API_KEY || ''
      };

      if (accountAction === 'create') {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let randomPassword = '';
        for (let i = 0; i < 10; i++) {
          randomPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const finalUsername = authUsername || employeeCode;

        // Lấy thông tin khu vực (location) từ chi nhánh (branch) của nhân viên
        let authLocation = "Hanoi"; // Mặc định
        if (branchId && ObjectId.isValid(branchId)) {
          const branchDoc = await db.collection("branch-timekeeping").findOne({ _id: new ObjectId(branchId) });
          if (branchDoc) {
            const bName = branchDoc.name || branchDoc.branchName || "";
            if (bName.toLowerCase().includes("hà nội") || bName.toLowerCase().includes("hn")) {
              authLocation = "Hanoi";
            } else if (bName.toLowerCase().includes("hồ chí minh") || bName.toLowerCase().includes("hcm") || bName.toLowerCase().includes("sài gòn") || bName.toLowerCase().includes("sg")) {
              authLocation = "Saigon";
            } else {
              authLocation = branchDoc.shortCode || bName || "Hanoi";
            }
          }
        }

        // Lấy thông tin bộ phận (department) và map sang Auth Departments
        let authDepartment = 1; // Mặc định là 1 (Ban lãnh đạo)
        if (departmentId && ObjectId.isValid(departmentId)) {
          const deptDoc = await db.collection("departments_timekeeping").findOne({ _id: new ObjectId(departmentId) });
          if (deptDoc && deptDoc.name) {
            const deptName = deptDoc.name.toLowerCase();
            let cleanDeptName = deptName;
            if (cleanDeptName.includes("hành chính") || cleanDeptName.includes("nhân sự") || cleanDeptName.includes("hcns")) {
              cleanDeptName = "hcns";
            } else if (cleanDeptName.includes("marketing") || cleanDeptName.includes("maketing")) {
              cleanDeptName = "maketing";
            } else if (cleanDeptName.includes("kế toán")) {
              cleanDeptName = "kế toán";
            } else if (cleanDeptName.includes("kho")) {
              cleanDeptName = "kho tm";
            } else if (cleanDeptName.includes("kinh doanh")) {
              cleanDeptName = "kinh doanh";
            } else if (cleanDeptName.includes("it") || cleanDeptName.includes("công nghệ thông tin")) {
              cleanDeptName = "phòng it";
            } else if (cleanDeptName.includes("ban lãnh đạo") || cleanDeptName.includes("giám đốc")) {
              cleanDeptName = "ban lãnh đạo";
            } else if (cleanDeptName.includes("quản lý")) {
              cleanDeptName = "quản lý";
            }

            try {
              const authDepts = await db.collection("Departments").find({}).toArray();
              const matchedDept = authDepts.find(d => {
                const dName = String(d.name || "").toLowerCase();
                return dName.includes(cleanDeptName) || cleanDeptName.includes(dName);
              });
              if (matchedDept && matchedDept.id !== undefined) {
                authDepartment = Number(matchedDept.id);
              }
            } catch (deptErr) {
              console.error("Lỗi lấy danh sách Departments từ Auth:", deptErr);
            }
          }
        }

        await fetch(`${authUrl}/api/users`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'create',
            data: {
              id: Date.now(), // Sinh ID dạng số cho tài khoản
              name: fullName, // Họ tên đầy đủ
              username: finalUsername,
              password: randomPassword,
              email: email || '',
              phone: phone || '', // Số điện thoại
              employeeCode: employeeCode,
              role: authRole ? Number(authRole) : 3, // Ép kiểu số
              location: authLocation, // Đồng bộ location
              department: authDepartment, // Đồng bộ bộ phận
              typeAccount: "individuals", // Mặc định loại tài khoản là cá nhân
              company: "Hupuna Group", // Mặc định công ty là Hupuna Group
              level: 0, // Mặc định cấp tài khoản là Thường
              cash: 0, // Mặc định số dư là 0
              bankAccount: [], // Mặc định danh sách tài khoản ngân hàng rỗng
              status: 1,
              createdAt: new Date().toISOString(), // Ngày tạo tài khoản
              updatedAt: new Date().toISOString() // Ngày cập nhật tài khoản
            }
          })
        }).catch(err => console.error('Lỗi khi fetch tạo user:', err));

        if (email) {
          try {
            const reactElement = WelcomeAccountEmail({
              employeeName: fullName,
              username: finalUsername,
              password: randomPassword,
              loginUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://auth.hunacloud.net'
            });
            await sendEmail({
              to: email,
              subject: 'Thông tin tài khoản Hupuna Workspace',
              reactElement: reactElement as React.ReactElement
            });
            console.log('Đã gửi email thông báo tài khoản tới', email);
          } catch (err) {
            console.error('Lỗi gửi email tạo tài khoản:', err);
          }
        }

      } else if (accountAction === 'link' && accountId) {
        // Unlink old user first
        await fetch(`${authUrl}/api/users`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'update',
            field: 'employeeCode',
            value: employeeCode,
            data: { employeeCode: null }
          })
        }).catch(err => console.error('Lỗi unlink cũ:', err));

        // Link new
        await fetch(`${authUrl}/api/users`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'update',
            field: accountId.length === 24 ? '_id' : 'id',
            value: accountId.length === 24 ? accountId : Number(accountId),
            data: { employeeCode: employeeCode }
          })
        }).catch(err => console.error('Lỗi link mới:', err));

      } else if (accountAction === 'none') {
        // Unlink any user
        await fetch(`${authUrl}/api/users`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'update',
            field: 'employeeCode',
            value: employeeCode,
            data: { employeeCode: null }
          })
        }).catch(err => console.error('Lỗi unlink:', err));
      }
    } catch (authErr) {
      console.error("Lỗi đồng bộ Auth User khi update (non-blocking):", authErr);
    }

    return NextResponse.json({
      data: { id, ...updateFields },
      message: "Cập nhật nhân viên thành công",
    });
  } catch (error: unknown) {
    console.error("Lỗi cập nhật employee:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi server nội bộ", error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const permError = await requirePermission(req, 'timekeeping_members_delete');
  if (permError) return permError;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { data: null, message: "ID nhân sự không hợp lệ." },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // FETCH EMPLOYEE FIRST TO GET LINKED DEVICES
    const employee = await db.collection("employees-timekeeping").findOne({
      _id: new ObjectId(id)
    });

    if (!employee) {
      return NextResponse.json(
        { data: null, message: "Không tìm thấy nhân viên hoặc đã bị xóa." },
        { status: 404 }
      );
    }

    const { zktecoLinkedDevices, employeeCode, enrollNumber } = employee;
    const userid = employeeCode || enrollNumber;

    // SEND DELETE COMMAND TO ZKTECO DEVICES IF LINKED
    if (zktecoLinkedDevices && zktecoLinkedDevices.length > 0 && userid) {
      try {
        const deviceObjectIds = zktecoLinkedDevices.filter((did: string) => ObjectId.isValid(did)).map((did: string) => new ObjectId(did));
        if (deviceObjectIds.length > 0) {
          const devices = await db.collection("ZktecoDevices").find({
            _id: { $in: deviceObjectIds }
          }).toArray();

          const connectorIds = Array.from(new Set(devices.map(d => d.connectorId?.toString()).filter(Boolean)));
          const connectors = await db.collection("ZktecoConnectors").find({
            _id: { $in: connectorIds.map(cid => new ObjectId(cid as string)) }
          }).toArray();
          const connectorMap = new Map(connectors.map(c => [c._id.toString(), c]));

          for (const device of devices) {
            try {
              const connectorIdStr = device.connectorId?.toString();
              const connector = connectorIdStr ? connectorMap.get(connectorIdStr) : undefined;
              const deviceIp = device.ipAddress || device.ip;

              if (connector && connector.connectorUrl && deviceIp) {
                const targetUrl = new URL(connector.connectorUrl);
                if (!targetUrl.pathname.endsWith('/')) targetUrl.pathname += '/';
                const actionUrl = new URL('api/zkteco/action', targetUrl);
                actionUrl.searchParams.set('ip', deviceIp);

                // Fire and forget (don't await strictly to avoid blocking employee deletion)
                fetch(actionUrl.toString(), {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-connector-id': connector._id.toString(),
                    'x-target-ip': deviceIp,
                    'x-api-key': process.env.HARDWARE_WEBHOOK_SECRET || 'HUPUNA_2026_SECURE_KEY'
                  },
                  body: JSON.stringify({
                    action: 'delete_user',
                    userid: String(userid)
                  })
                }).catch(err => console.error(`Lỗi gửi lệnh xóa user máy ${deviceIp}:`, err));
              }
            } catch (err) {
              console.error("Lỗi loop xóa máy:", err);
            }
          }
        }
      } catch (zkErr) {
        console.error("Lỗi logic xóa vân tay ZKTeco (non-blocking):", zkErr);
      }
    }

    const result = await db.collection("employees-timekeeping").deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { data: null, message: "Không tìm thấy nhân viên hoặc đã bị xóa." },
        { status: 404 }
      );
    }

    // ĐỒNG BỘ GỠ LIÊN KẾT TÀI KHOẢN AUTH
    try {
      if (employeeCode) {
        // Gỡ liên kết trực tiếp trong database Users dùng chung
        await db.collection("Users").updateOne(
          { employeeCode: employeeCode },
          { $set: { employeeCode: null } }
        );

        // Gọi thêm API Auth để đồng bộ trạng thái gỡ liên kết
        const authUrl = process.env.AUTH_API_URL || 'http://localhost:3000';
        const headers = {
          'Content-Type': 'application/json',
          'x-api-key': process.env.INTERNAL_API_KEY || ''
        };
        await fetch(`${authUrl}/api/users`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'update',
            field: 'employeeCode',
            value: employeeCode,
            data: { employeeCode: null }
          })
        }).catch(err => console.error('Lỗi unlink API khi xóa nhân viên:', err));
      }
    } catch (authErr) {
      console.error("Lỗi đồng bộ gỡ liên kết Auth User (non-blocking):", authErr);
    }

    return NextResponse.json({
      data: { id },
      message: "Xóa nhân viên thành công",
    });
  } catch (error: unknown) {
    console.error("Lỗi xóa employee:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi server nội bộ", error: errorMessage },
      { status: 500 }
    );
  }
}
