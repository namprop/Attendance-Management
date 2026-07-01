import {
  Body,
  Container,
  Column,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
  Tailwind,
  Link,
} from '@react-email/components';
import * as React from 'react';

interface WelcomeEmailProps {
  employeeName: string;
  username: string;
  password?: string;
  loginUrl?: string;
}

export const WelcomeAccountEmail = ({
  employeeName = 'Nhân viên',
  username = 'unknown',
  password = '***',
  loginUrl = 'https://auth.hunacloud.net',
}: WelcomeEmailProps) => {
  return (
    <Tailwind>
      <Html>
        <Head />
        <Preview>Chào mừng bạn gia nhập hệ thống Hupuna</Preview>
        <Body className="bg-slate-50 my-auto mx-auto font-sans text-slate-800 p-2">
          <Container className="border border-slate-200 rounded-[24px] my-[20px] mx-auto max-w-[600px] bg-white shadow-md">
            <Section className="p-6 sm:p-10">

              {/* Header */}
              <Section className="mb-8 text-center">
                <Section
                  className="rounded-2xl p-8 text-center bg-gradient-to-b from-blue-50 to-white border border-slate-100 shadow-sm"
                  align="center"
                >
                  <Text className="text-blue-700 text-[13px] uppercase tracking-[2px] font-bold m-0 text-center w-full">
                    Hệ thống Quản lý Nhân sự
                  </Text>
                  <Text className="text-slate-700 text-[16px] font-medium mt-6 mb-0 text-center w-full">
                    Thông tin <span className="font-bold text-blue-700">Tài khoản Đăng nhập</span>
                  </Text>
                </Section>
              </Section>

              {/* Greeting */}
              <Text className="text-[16px] text-slate-800 font-medium mb-4">
                Xin chào {employeeName},
              </Text>
              <Text className="text-[14px] text-slate-600 mb-6 leading-relaxed">
                Chào mừng bạn tham gia vào hệ thống phần mềm quản trị của Hupuna Group.
                Dưới đây là thông tin tài khoản truy cập hệ thống của bạn. Vì lý do bảo mật,
                vui lòng thay đổi mật khẩu ngay trong lần đăng nhập đầu tiên.
              </Text>

              {/* Account Info Card */}
              <Section className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-6 text-center">
                <Text className="text-[13px] uppercase text-blue-500 font-bold tracking-wider m-0 mb-1">
                  Tên đăng nhập
                </Text>
                <Text className="text-[20px] font-bold text-blue-900 m-0 mb-4">
                  {username}
                </Text>

                <Text className="text-[13px] uppercase text-blue-500 font-bold tracking-wider m-0 mb-1">
                  Mật khẩu tạm thời
                </Text>
                <Text className="text-[20px] font-bold text-blue-900 m-0 bg-white inline-block px-4 py-1 rounded border border-blue-200">
                  {password}
                </Text>
              </Section>

              {/* Action Button */}
              <Section className="text-center mb-8">
                <Link
                  href={loginUrl}
                  className="bg-[#2563EB] text-white font-medium px-8 py-3.5 rounded-xl text-[14px] inline-block no-underline shadow-sm hover:bg-blue-700 transition-colors"
                >
                  Đăng nhập ngay
                </Link>
              </Section>

              <Hr className="border border-solid border-slate-100 my-6 mx-0 w-full" />

              {/* Footer */}
              <Section className="text-center">
                <Text className="text-[13px] font-semibold text-slate-700 mt-2 mb-2">
                  Hệ thống Quản lý Nhân sự Hupuna
                </Text>
                <Text className="text-[12px] text-slate-400 mt-1 mb-0">
                  Email được gửi tự động từ hệ thống.
                </Text>
                <Text className="text-[11px] text-slate-300 mt-4 mb-0">
                  © 2026 Hupuna Group
                </Text>
              </Section>

            </Section>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
};

export default WelcomeAccountEmail;
