import { NextRequest, NextResponse } from "next/server";
import { ObjectId, Document } from "mongodb";
import { connectToDatabase } from "@/app/lib/monggodb/connectToDatabase";
import { requirePermission } from "@/lib/auth-guard";
import { Employee } from "@/app/interface/timekeeping";
import { sendEmail } from "@/lib/sendgrid";
import { WelcomeAccountEmail } from "@/emails/WelcomeAccount";
import * as React from "react";

export async function GET(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const checkEmail = searchParams.get("checkEmail");
    const excludeId = searchParams.get("excludeId");
    if (checkEmail) {
      const matchQuery: Record<string, unknown> = { email: checkEmail.trim() };
      if (excludeId && ObjectId.isValid(excludeId)) {
        matchQuery._id = { $ne: new ObjectId(excludeId) };
      }
      const existing = await db.collection("employees-timekeeping").findOne(matchQuery);
      return NextResponse.json({
        exists: !!existing,
        message: existing ? "Địa chỉ Email đã được sử dụng bởi nhân sự khác." : "Email hợp lệ"
      });
    }

    const getQueryValues = (params: URLSearchParams, key: string) => params.getAll(key);
    const toMongoIdValues = (ids: string[]) => ids.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));

    const branchIds = getQueryValues(searchParams, "branchIds");
    const locationIds = getQueryValues(searchParams, "locationIds");
    const departmentIds = getQueryValues(searchParams, "departmentIds");
    const employeeCodes = getQueryValues(searchParams, "employeeCodes");
    const employeeIds = getQueryValues(searchParams, "employeeIds");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(2000, Math.max(1, parseInt(searchParams.get("pageSize") || searchParams.get("limit") || "10", 10)));
    const search = (searchParams.get("search") || "").trim();
    const searchMode = searchParams.get("searchMode") || "all";
    const branchId = searchParams.get("branchId");
    const locationId = searchParams.get("locationId");
    const departmentIdSingle = searchParams.get("departmentId");
    const deptGroupId = searchParams.get("deptGroupId");
    const status = searchParams.get("status");
    const employeeType = searchParams.get("employeeType");
    const gender = searchParams.get("gender");
    const faceStatus = searchParams.get("faceStatus");

    const match: Record<string, unknown> = {};

    if (branchIds.length > 0) match.branchId = { $in: toMongoIdValues(branchIds) };
    if (locationIds.length > 0) match.locationId = { $in: toMongoIdValues(locationIds) };
    if (departmentIds.length > 0) {
      const mongoIds = toMongoIdValues(departmentIds);
      const names = departmentIds.filter(id => !ObjectId.isValid(id));
      if (names.length > 0) {
        const matchingDepts = await db.collection("departments_timekeeping")
          .find({ name: { $in: names } }, { projection: { _id: 1 } })
          .toArray();
        matchingDepts.forEach(d => mongoIds.push(d._id));
      }
      match.departmentId = { $in: mongoIds };
    }
    if (employeeCodes.length > 0) match.employeeCode = { $in: employeeCodes };
    if (employeeIds.length > 0) match._id = { $in: toMongoIdValues(employeeIds) };

    if (search) {
      match.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { employeeCode: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { unaccentedName: { $regex: search, $options: "i" } }
      ];
    }
    if (branchId) {
      match.branchId = ObjectId.isValid(branchId) ? new ObjectId(branchId) : branchId;
    }
    if (locationId) {
      match.locationId = ObjectId.isValid(locationId) ? new ObjectId(locationId) : locationId;
    }
    if (departmentIdSingle) {
      match.departmentId = ObjectId.isValid(departmentIdSingle) ? new ObjectId(departmentIdSingle) : departmentIdSingle;
    }
    if (deptGroupId) {
      match.deptGroupId = ObjectId.isValid(deptGroupId) ? new ObjectId(deptGroupId) : deptGroupId;
    }
    if (status) {
      match.status = { $regex: new RegExp(`^${status}$`, 'i') };
    }
    if (employeeType) {
      match.employeeType = employeeType;
    }
    if (gender) {
      match.gender = gender;
    }

    if (faceStatus === "enrolled") {
      const faceConditions = [
        { "biometricData.faceVectors.0": { $exists: true, $ne: null } },
        { "biometricData.faceVector": { $exists: true, $ne: null } }
      ];
      if (match.$or) {
        match.$and = [{ $or: match.$or }, { $or: faceConditions }];
        delete match.$or;
      } else {
        match.$or = faceConditions;
      }
    } else if (faceStatus === "not_enrolled") {
      match["biometricData.faceVectors.0"] = { $exists: false };
      match["biometricData.faceVector"] = { $exists: false };
    }

    const fetchCodes = searchParams.get("fetchCodes") === "true";
    if (fetchCodes) {
      const codesData = await db.collection("employees-timekeeping")
        .find(match, { projection: { employeeCode: 1, _id: 1, enrollNumber: 1 } })
        .toArray();
      const codes = codesData.map(doc => doc.employeeCode || doc.enrollNumber || doc._id.toString());
      return NextResponse.json({
        data: codes,
        message: "Lấy danh sách mã nhân viên thành công"
      });
    }

    // Count total documents for pagination
    const total = await db.collection("employees-timekeeping").countDocuments(match);

    // Fetch paginated employees
    const employees = await db.collection("employees-timekeeping")
      .find(match, { projection: { "biometricData.images": 0 } })
      .sort({ _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();

    // Extract unique IDs for related collections
    const uniqueLocationIds = Array.from(new Set(employees.map(emp => emp.locationId?.toString()).filter(Boolean)));
    const uniqueBranchIds = Array.from(new Set(employees.map(emp => emp.branchId?.toString()).filter(Boolean)));
    const uniqueDepartmentIds = Array.from(new Set(employees.map(emp => emp.departmentId?.toString()).filter(Boolean)));
    const uniqueGroupIds = Array.from(new Set(employees.map(emp => emp.deptGroupId?.toString()).filter(Boolean)));

    const toMongoIds = (ids: string[]): ObjectId[] => ids.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));

    // Fetch related collections ONLY for the current page's employees
    const [locations, branches, departments, groups] = await Promise.all([
      uniqueLocationIds.length > 0 ? db.collection("locations-timekeeping").find({ _id: { $in: toMongoIds(uniqueLocationIds) } }, { projection: { _id: 1, locationName: 1 } }).toArray() : [],
      uniqueBranchIds.length > 0 ? db.collection("branch-timekeeping").find({ _id: { $in: toMongoIds(uniqueBranchIds) } }, { projection: { _id: 1, name: 1, branchName: 1 } }).toArray() : [],
      uniqueDepartmentIds.length > 0 ? db.collection("departments_timekeeping").find({ _id: { $in: toMongoIds(uniqueDepartmentIds) } }, { projection: { _id: 1, name: 1 } }).toArray() : [],
      uniqueGroupIds.length > 0 ? db.collection("department_groups_timekeeping").find({ _id: { $in: toMongoIds(uniqueGroupIds) } }, { projection: { _id: 1, name: 1 } }).toArray() : [],
    ]);

    const locationMap = new Map(locations.map(l => [l._id.toString(), l.locationName]));
    const branchMap = new Map(branches.map(b => [b._id.toString(), b.name || b.branchName]));
    const departmentMap = new Map(departments.map(d => [d._id.toString(), d.name]));
    const groupMap = new Map(groups.map(g => [g._id.toString(), g.name]));

    const enrichedEmployees = employees.map(emp => {
      // Logic kiểm tra khuôn mặt
      const vectors = emp.biometricData?.faceVectors;
      const singleVector = emp.biometricData?.faceVector;
      let faceEnrolled = false;
      if (Array.isArray(vectors) && vectors.filter(v => Array.isArray(v) && v.length === 128).length > 0) {
        faceEnrolled = true;
      } else if (Array.isArray(singleVector) && singleVector.length === 128) {
        faceEnrolled = true;
      }

      // Xóa faceVectors để giảm dung lượng
      const { biometricData, ...rest } = emp;
      const cleanBiometricData = biometricData ? { ...biometricData, faceVectors: undefined, faceVector: undefined } : undefined;

      return {
        ...rest,
        linkedDevices: emp.zktecoLinkedDevices || [],
        biometricData: cleanBiometricData,
        locationName: locationMap.get(emp.locationId?.toString()) || "",
        branchName: branchMap.get(emp.branchId?.toString()) || "",
        departmentName: departmentMap.get(emp.departmentId?.toString()) || "",
        departmentGroupName: groupMap.get(emp.deptGroupId?.toString()) || "",
        faceEnrolled
      };
    });

    // Map _id to id for frontend compatibility
    const mappedEmployees: Employee[] = enrichedEmployees.map(emp => ({
      ...emp,
      id: emp._id.toString(),
      _id: undefined
    })) as unknown as Employee[];

    return NextResponse.json({
      data: mappedEmployees,
      total,
      page,
      pageSize,
      message: "Lấy danh sách nhân viên thành công"
    });
  } catch (error: unknown) {
    console.error("Lỗi lấy danh sách employees:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi server nội bộ", error: errorMessage },
      { status: 500 }
    );
  }
}

interface EmployeePayload extends Omit<Partial<Employee>, 'baseSalary' | 'insuranceSalary'> {
  faceVectors?: unknown[];
  baseSalary?: string | number;
  salaryType?: string;
  isPayingInsurance?: boolean;
  insuranceSalary?: string | number;
  bankName?: string;
  taxCode?: string;
  salaryStructureId?: string;
  positionId?: string;
  accountAction?: 'create' | 'link' | 'none';
  accountId?: string;
  authRole?: number;
  authUsername?: string;
  linkedDevices?: string[];
  contractTypeId?: string;
}

export async function POST(req: NextRequest) {
  const permError = await requirePermission(req, 'timekeeping_members_create');
  if (permError) return permError;

  try {
    const { db } = await connectToDatabase();
    const body: EmployeePayload = await req.json();

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
      // Auth specific fields from Salary UI
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

    // Check if employeeCode exists
    const existing = await db.collection("employees-timekeeping").findOne({ employeeCode });
    if (existing) {
      return NextResponse.json(
        { data: null, message: "Mã nhân viên đã tồn tại." },
        { status: 409 }
      );
    }

    // Check if email exists
    if (email && email.trim()) {
      const existingEmail = await db.collection("employees-timekeeping").findOne({
        email: email.trim()
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

    const newEmployee = {
      employeeCode,
      fullName,
      name: fullName, // for frontend compatibility
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
      joinDate: joinDate || new Date().toISOString().substring(0, 10),
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
      zktecoLinkedDevices: Array.isArray(linkedDevices) ? linkedDevices : [],
      biometricData: {
        // Store up to 10 face vectors per employee
        faceVectors: body.faceVectors && Array.isArray(body.faceVectors) ? body.faceVectors.slice(0, 10) : []
      },
      // Thêm các trường của luồng Salary
      baseSalary: baseSalary ? Number(baseSalary) : 0,
      salaryType: salaryType || 'Gross',
      isPayingInsurance: isPayingInsurance !== undefined ? isPayingInsurance : false,
      insuranceSalary: insuranceSalary ? Number(insuranceSalary) : 0,
      bankName: bankName || '',
      taxCode: taxCode || '',
      salaryStructureId: salaryStructureId || '',
      positionId: positionId || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("employees-timekeeping").insertOne(newEmployee);


    // ĐỒNG BỘ USER SANG HỆ THỐNG AUTH
    try {
      const authUrl = process.env.AUTH_API_URL || 'http://localhost:3000';
      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': process.env.INTERNAL_API_KEY || ''
      };

      if (accountAction === 'create' || !accountAction) {
        // Nếu tạo từ Timekeeping cũ (không có accountAction) thì mặc định là create
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let randomPassword = '';
        for (let i = 0; i < 10; i++) {
          randomPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const emailPrefix = email ? email.split('@')[0] : '';
        const finalUsername = authUsername || emailPrefix || employeeCode;
        const finalPassword = devicePassword || randomPassword;

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
              password: finalPassword,
              email: email || '',
              phone: phone || '', // Số điện thoại
              employeeCode: employeeCode,
              role: authRole ? Number(authRole) : 3, // Ép kiểu số
              location: authLocation, // Đồng bộ location
              department: authDepartment, // Đồng bộ bộ phận
              typeAccount: "individuals", // Mặc định loại tài khoản là cá nhân
              company: "Công ty Chấm công", // Mặc định công ty là Công ty Chấm công
              level: 0, // Mặc định cấp tài khoản là Thường
              cash: 0, // Mặc định số dư là 0
              bankAccount: [], // Mặc định danh sách tài khoản ngân hàng rỗng
              status: 1,
              createdAt: new Date().toISOString(), // Ngày tạo tài khoản
              updatedAt: new Date().toISOString() // Ngày cập nhật tài khoản
            }
          })
        }).catch(err => console.error('Lỗi khi fetch tạo user:', err));

        // Send email notification for the new account
        if (email) {
          try {
            const reactElement = WelcomeAccountEmail({
              employeeName: fullName,
              username: finalUsername,
              password: finalPassword,
              loginUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://auth.hunacloud.net'
            });
            await sendEmail({
              to: email,
              subject: 'Thông tin tài khoản Chấm công Workspace',
              reactElement: reactElement as React.ReactElement
            });
            console.log('Đã gửi email thông báo tài khoản tới', email);
          } catch (err) {
            console.error('Lỗi gửi email tạo tài khoản:', err);
          }
        }
      } else if (accountAction === 'link' && accountId) {
        await fetch(`${authUrl}/api/users`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'update',
            field: accountId.length === 24 ? '_id' : 'id',
            value: accountId.length === 24 ? accountId : Number(accountId),
            data: { employeeCode: employeeCode }
          })
        }).catch(err => console.error('Lỗi khi fetch link user:', err));
      }
    } catch (authErr) {
      console.error("Lỗi đồng bộ Auth User (non-blocking):", authErr);
    }

    return NextResponse.json({
      data: { id: result.insertedId.toString(), ...newEmployee },
      message: "Thêm nhân viên và xử lý tài khoản thành công",
    });
  } catch (error: unknown) {
    console.error("Lỗi tạo employee:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi server nội bộ", error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const permError = await requirePermission(req, 'timekeeping_members_delete');
  if (permError) return permError;

  try {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { data: null, message: "Danh sách ID không hợp lệ." },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const objectIds = ids.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));

    if (objectIds.length === 0) {
      return NextResponse.json(
        { data: null, message: "Không có ID nào hợp lệ." },
        { status: 400 }
      );
    }

    // Xóa nhân viên
    const result = await db.collection("employees-timekeeping").deleteMany({
      _id: { $in: objectIds }
    });

    // Gỡ liên kết tài khoản Auth hàng loạt
    try {
      // Tìm các employeeCode của những nhân viên chuẩn bị xóa
      const employeesToDelete = await db.collection("employees-timekeeping")
        .find({ _id: { $in: objectIds } }, { projection: { employeeCode: 1 } })
        .toArray();
      const employeeCodes = employeesToDelete.map(emp => emp.employeeCode).filter(Boolean);

      if (employeeCodes.length > 0) {
        // Gỡ liên kết trực tiếp trong database Users dùng chung
        await db.collection("Users").updateMany(
          { employeeCode: { $in: employeeCodes } },
          { $set: { employeeCode: null } }
        );

        // Đồng thời gọi API gỡ liên kết cho từng code để kích hoạt logic trigger bên Auth (nếu có)
        const authUrl = process.env.AUTH_API_URL || 'http://localhost:3000';
        const headers = {
          'Content-Type': 'application/json',
          'x-api-key': process.env.INTERNAL_API_KEY || ''
        };
        for (const code of employeeCodes) {
          fetch(`${authUrl}/api/users`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              action: 'update',
              field: 'employeeCode',
              value: code,
              data: { employeeCode: null }
            })
          }).catch(err => console.error(`Lỗi unlink API cho code ${code} khi xóa hàng loạt:`, err));
        }
      }
    } catch (authErr) {
      console.error("Lỗi đồng bộ gỡ liên kết Auth User hàng loạt (non-blocking):", authErr);
    }

    return NextResponse.json({
      data: { deletedCount: result.deletedCount },
      message: `Đã xóa thành công ${result.deletedCount} nhân sự.`,
    });
  } catch (error: unknown) {
    console.error("Lỗi xóa hàng loạt employee:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { data: null, message: "Lỗi server nội bộ", error: errorMessage },
      { status: 500 }
    );
  }
}
