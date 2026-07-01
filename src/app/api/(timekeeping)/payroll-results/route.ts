import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/lib/monggodb/connectToDatabase';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const payrollMonth = searchParams.get('payrollMonth');

    if (!payrollMonth) {
      return NextResponse.json(
        { success: false, message: 'Thiếu tham số payrollMonth' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const infoUserCookie = cookieStore.get('info_user')?.value;
    let isUserOnly = false;
    let userName = '';

    if (infoUserCookie) {
      try {
        const userObj = JSON.parse(decodeURIComponent(infoUserCookie));
        const role = String(userObj.role);
        // Nếu không phải SuperAdmin (0) hoặc HR (10) thì giới hạn dữ liệu
        if (role !== '0' && role !== '10' && userObj.name) {
          isUserOnly = true;
          userName = userObj.name;
        }
      } catch (e) {
        // Parse error
      }
    }

    const { db } = await connectToDatabase();

    const pipeline: any[] = [
      {
        $match: {
          status: { $in: ['ACTIVE', 'Active'] }
        }
      }
    ];

    if (isUserOnly) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: new RegExp(userName.trim(), 'i') } },
            { fullName: { $regex: new RegExp(userName.trim(), 'i') } }
          ]
        }
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: 'employee-payrolls',
          let: { empId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$employeeId', '$$empId'] },
                    { $eq: ['$payrollMonth', payrollMonth] }
                  ]
                }
              }
            }
          ],
          as: 'payrollInfo'
        }
      },
      {
        $unwind: {
          path: '$payrollInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'departments_timekeeping',
          let: { deptId: '$departmentId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', { $convert: { input: '$$deptId', to: 'objectId', onError: null, onNull: null } }]
                }
              }
            }
          ],
          as: 'departmentInfo'
        }
      },
      {
        $unwind: {
          path: '$departmentInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          employeeId: '$_id',
          payrollMonth: { $literal: payrollMonth },
          workDaysVP: { $ifNull: ['$payrollInfo.workDaysVP', 0] },
          workDaysOT: { $ifNull: ['$payrollInfo.workDaysOT', 0] },
          workDaysWFH: { $ifNull: ['$payrollInfo.workDaysWFH', 0] },
          workDaysProbation: { $ifNull: ['$payrollInfo.workDaysProbation', 0] },
          allowanceMethod: { $ifNull: ['$payrollInfo.allowanceMethod', 'Tự động tính'] },
          standardWorkDays: { $ifNull: ['$payrollInfo.standardWorkDays', 26] },
          otRateMultiplier: { $ifNull: ['$payrollInfo.otRateMultiplier', 1.5] },
          salaryRemaining: { $ifNull: ['$payrollInfo.salaryRemaining', 0] },
          finalSalary: { $ifNull: ['$payrollInfo.finalSalary', 0] },
          isFinalized: { $ifNull: ['$payrollInfo.isFinalized', false] },
          createdAt: { $ifNull: ['$payrollInfo.createdAt', '$$NOW'] },
          updatedAt: { $ifNull: ['$payrollInfo.updatedAt', '$$NOW'] },
          'employeeName': { $ifNull: ['$fullName', '$name'] },
          'employeeCode': { $ifNull: ['$employeeCode', '$code'] },
          'position': '$role',
          'departmentName': '$departmentInfo.name'
        }
      }
    );

    const payrolls = await db.collection('employees-timekeeping').aggregate(pipeline).toArray();

    return NextResponse.json({
      success: true,
      data: payrolls
    });

  } catch (error) {
    console.error('Lỗi khi lấy kết quả bảng lương:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server khi lấy kết quả bảng lương' },
      { status: 500 }
    );
  }
}
