import {
  Body,
  Container,
  Column,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
  Tailwind,
} from '@react-email/components';
import * as React from 'react';

import { PayslipEmailProps } from '@/types/emails';

const formatCurrency = (value: number | string) => {
  if (typeof value === 'string' && value.startsWith('{{')) {
    return value;
  }
  const num = Number(value);
  if (isNaN(num)) return value;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

export const MonthlyPayslipEmail = ({
  employeeName,
  employeeCode,
  department,
  payrollMonth,
  salaryRemaining,
  totalBaseSalaryEarned,
  allowanceLunch,
  allowanceTravel,
  allowanceAttendance,
  allowancePosition,
  salaryAndAllowance,
  bonusCommission,
  bonusRevenue,
  bonusOther,
  supportOther,
  penalty,
  insuranceBHXH,
  salaryTheory,
  unionFee,
  salaryActual,
  advancePayment,
  paymentStatus,
}: PayslipEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Phiếu lương tháng {payrollMonth} của bạn</Preview>
      <Tailwind>
        <Body className="bg-slate-50 my-auto mx-auto font-sans text-slate-800 p-2">
          <Container className="border border-slate-200 rounded-[24px] my-[20px] mx-auto max-w-[680px] bg-white shadow-md">
            <Section className="p-6 sm:p-10">
            
            {/* Header */}
            <Section className="mb-8 text-center">
              <Section
                className="rounded-2xl p-8 text-center bg-[#F8FAFC] border border-slate-100"
                align="center"
              >
                <Text className="text-slate-500 text-[12px] uppercase tracking-[2px] font-semibold m-0 text-center w-full">
                  Hệ thống Quản lý Nhân sự
                </Text>
                <Text className="text-slate-500 text-[15px] mt-4 mb-0 text-center w-full">
                  Phiếu lương tháng • {payrollMonth}
                </Text>
              </Section>
            </Section>

            {/* Employee Info */}
            <Section className="bg-white border border-slate-100 border-l-[4px] border-l-blue-400 rounded-2xl p-5 mb-6 shadow-sm">
              <Row>
                <Column>
                  <Text className="m-0 text-slate-500 text-[12px] uppercase font-bold tracking-wider mb-1">Mã NV</Text>
                  <Text className="m-0 text-slate-900 text-[14px] font-medium">{employeeCode}</Text>
                </Column>
                <Column>
                  <Text className="m-0 text-slate-500 text-[12px] uppercase font-bold tracking-wider mb-1">Họ tên</Text>
                  <Text className="m-0 text-slate-900 text-[14px] font-medium">{employeeName}</Text>
                </Column>
                <Column>
                  <Text className="m-0 text-slate-500 text-[12px] uppercase font-bold tracking-wider mb-1">Phòng ban</Text>
                  <Text className="m-0 text-slate-900 text-[14px] font-medium">{department}</Text>
                </Column>
              </Row>
            </Section>

            {/* Hero Section - Net Salary */}
            <Section className="bg-emerald-50 rounded-xl p-6 mb-6 text-center border border-emerald-100">
              <Text className="m-0 text-emerald-600 text-[14px] font-bold uppercase tracking-wider mb-2">Thực Nhận Còn Lại</Text>
              <Text className="m-0 text-emerald-600 text-[32px] font-bold">
                {formatCurrency(salaryRemaining)}
              </Text>
            </Section>

            {/* Salary Details */}
            <Section className="mb-6">
              
              {/* 1. Lương & Phụ Cấp */}
              <Heading as="h3" className="text-[16px] font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">
                1. Lương & Phụ Cấp
              </Heading>
              <Row className="mb-2"><Column><Text className="m-0 text-[14px] text-slate-600">Lương công làm việc</Text></Column><Column align="right"><Text className="m-0 text-[14px] font-medium text-slate-900">{formatCurrency(totalBaseSalaryEarned)}</Text></Column></Row>
              <Row className="mb-2"><Column><Text className="m-0 text-[14px] text-slate-600">Phụ cấp ăn trưa</Text></Column><Column align="right"><Text className="m-0 text-[14px] font-medium text-slate-900">{formatCurrency(allowanceLunch)}</Text></Column></Row>
              <Row className="mb-2"><Column><Text className="m-0 text-[14px] text-slate-600">Phụ cấp đi lại</Text></Column><Column align="right"><Text className="m-0 text-[14px] font-medium text-slate-900">{formatCurrency(allowanceTravel)}</Text></Column></Row>
              <Row className="mb-2"><Column><Text className="m-0 text-[14px] text-slate-600">Phụ cấp chuyên cần</Text></Column><Column align="right"><Text className="m-0 text-[14px] font-medium text-slate-900">{formatCurrency(allowanceAttendance)}</Text></Column></Row>
              <Row className="mb-4"><Column><Text className="m-0 text-[14px] text-slate-600">Phụ cấp chức vụ</Text></Column><Column align="right"><Text className="m-0 text-[14px] font-medium text-slate-900">{formatCurrency(allowancePosition)}</Text></Column></Row>
              <Row className="mb-6"><Column><Text className="m-0 text-[14px] font-bold text-slate-900">Tổng Lương + Phụ Cấp</Text></Column><Column align="right"><Text className="m-0 text-[14px] font-bold text-slate-900">{formatCurrency(salaryAndAllowance)}</Text></Column></Row>

              {/* 2. Thưởng & Hỗ Trợ */}
              <Heading as="h3" className="text-[16px] font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">
                2. Thưởng & Hỗ Trợ
              </Heading>
              <Row className="mb-2"><Column><Text className="m-0 text-[14px] text-slate-600">Hoa hồng kinh doanh</Text></Column><Column align="right"><Text className="m-0 text-[14px] font-medium text-emerald-600">{formatCurrency(bonusCommission)}</Text></Column></Row>
              <Row className="mb-2"><Column><Text className="m-0 text-[14px] text-slate-600">Thưởng doanh số</Text></Column><Column align="right"><Text className="m-0 text-[14px] font-medium text-emerald-600">{formatCurrency(bonusRevenue)}</Text></Column></Row>
              <Row className="mb-2"><Column><Text className="m-0 text-[14px] text-slate-600">Thưởng khác</Text></Column><Column align="right"><Text className="m-0 text-[14px] font-medium text-emerald-600">{formatCurrency(bonusOther)}</Text></Column></Row>
              <Row className="mb-6"><Column><Text className="m-0 text-[14px] text-slate-600">Hỗ trợ khác</Text></Column><Column align="right"><Text className="m-0 text-[14px] font-medium text-emerald-600">{formatCurrency(supportOther)}</Text></Column></Row>

              {/* 3. Khấu Trừ & Phạt */}
              <Heading as="h3" className="text-[16px] font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">
                3. Khấu Trừ & Phạt
              </Heading>
              <Row className="mb-2"><Column><Text className="m-0 text-[14px] text-slate-600">Phạt / Quy chế</Text></Column><Column align="right"><Text className="m-0 text-[14px] font-medium text-red-500">-{formatCurrency(penalty)}</Text></Column></Row>
              <Row className="mb-4"><Column><Text className="m-0 text-[14px] text-slate-600">Bảo hiểm xã hội</Text></Column><Column align="right"><Text className="m-0 text-[14px] font-medium text-red-500">-{formatCurrency(insuranceBHXH)}</Text></Column></Row>
              <Row className="mb-6"><Column><Text className="m-0 text-[14px] font-bold text-slate-900">Lương Lý Thuyết</Text></Column><Column align="right"><Text className="m-0 text-[14px] font-bold text-slate-900">{formatCurrency(salaryTheory)}</Text></Column></Row>

              {/* 4. Công Đoàn & Tạm Ứng */}
              <Heading as="h3" className="text-[16px] font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">
                4. Công Đoàn & Tạm Ứng
              </Heading>
              <Row className="mb-2"><Column><Text className="m-0 text-[14px] text-slate-600">Công đoàn</Text></Column><Column align="right"><Text className="m-0 text-[14px] font-medium text-red-500">-{formatCurrency(unionFee)}</Text></Column></Row>
              <Row className="mb-2"><Column><Text className="m-0 text-[14px] font-bold text-slate-900">Lương Thực Nhận</Text></Column><Column align="right"><Text className="m-0 text-[14px] font-bold text-slate-900">{formatCurrency(salaryActual)}</Text></Column></Row>
              <Row className="mb-6 mt-4 p-3 bg-amber-50 rounded-lg"><Column><Text className="m-0 text-[14px] text-amber-700 font-medium">Tạm ứng trong kỳ</Text></Column><Column align="right"><Text className="m-0 text-[14px] font-bold text-amber-700">-{formatCurrency(advancePayment)}</Text></Column></Row>
              
            </Section>

            <Hr className="border border-solid border-slate-100 my-6 mx-0 w-full" />

            {/* Payment Status Info */}
            <Section className="text-center mb-6">
              <Text className="m-0 text-[14px] text-slate-500 mb-2">Trạng thái thanh toán</Text>
              <Text className={`m-0 text-[16px] font-bold ${paymentStatus === 'paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                {paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}
              </Text>
            </Section>

            {/* Footer */}
            <Section className="text-center">
              <Link
                href="https://abc.com"
                className="bg-[#2563EB] text-white font-medium px-8 py-4 rounded-xl text-[14px] inline-block no-underline shadow-sm"
              >
                📊 Xem chi tiết phiếu lương
              </Link>
              <Text className="text-[13px] font-semibold text-slate-700 mt-8 mb-2">
                Hệ thống Quản lý Nhân sự Chấm công
              </Text>
              <Text className="text-[12px] text-slate-400 mt-1 mb-0">
                Email được gửi tự động từ hệ thống.
              </Text>
              <Text className="text-[12px] text-slate-400 mt-1 mb-0">
                Vui lòng không trả lời email này.
              </Text>
              <Text className="text-[11px] text-slate-300 mt-4 m-0">
                © 2026 Công ty Chấm công
              </Text>
            </Section>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default MonthlyPayslipEmail;
