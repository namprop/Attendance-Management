import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-me';

// Mock users database
const users = [
  {
    id: 1,
    username: 'admin',
    password: 'password', // in a real app, use bcrypt
    name: 'Admin System',
    employeeCode: 'EMP-000',
    employeeId: 'admin_001',
    role: { id: 1, name: 'Admin' }
  },
  {
    id: 2,
    username: 'nhanvien',
    password: 'password',
    name: 'Nhân viên test',
    employeeCode: 'EMP-001',
    employeeId: 'emp_001',
    role: { id: 2, name: 'Employee' }
  }
];

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
      return NextResponse.json(
        { message: 'Tài khoản hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const secret = new TextEncoder().encode(JWT_SECRET);
    const alg = 'HS256';

    const token = await new SignJWT({
      userId: user.id,
      roleId: user.role.id,
      username: user.username,
      employeeId: user.employeeId
    })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(secret);

    // Prepare info_user object (without password)
    const { password: _, ...userInfo } = user;

    return NextResponse.json({
      message: 'Đăng nhập thành công',
      data: {
        accessToken: token,
        info_user: userInfo
      }
    });

  } catch (error) {
    return NextResponse.json(
      { message: 'Lỗi server nội bộ' },
      { status: 500 }
    );
  }
}
