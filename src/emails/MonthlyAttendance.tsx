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

import { AttendanceEmailProps } from '@/types/emails';

export const MonthlyAttendanceEmail = ({
  employeeName,
  employeeCode,
  department,
  employeeType,
  periodLabel,
  workTotal,
  lateCount,
  totalLateMinutes,
  earlyCount,
  totalEarlyMinutes,
  attendanceStatus,
  days,
}: AttendanceEmailProps) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://auth.hunacloud.net';

  return (
    <Tailwind>
      <Html>
        <Head />
        <Preview>Báo cáo chấm công {periodLabel}</Preview>
        <Body className="bg-slate-50 my-auto mx-auto font-sans text-slate-800 p-2">
          <Container className="border border-slate-200 rounded-[24px] my-[20px] mx-auto max-w-[680px] bg-white shadow-md">
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
                    Báo cáo chấm công kỳ <span className="font-bold text-blue-700">{periodLabel}</span>
                  </Text>
                </Section>
              </Section>

              {/* Employee Info */}
              <Section className="bg-white border border-slate-100 border-l-[4px] border-l-blue-400 rounded-2xl p-5 mb-6 shadow-sm">
                <Text className="text-[22px] font-bold text-slate-900 m-0">
                  {employeeName}
                </Text>
                <Text className="text-[14px] text-slate-500 mt-1 mb-5">
                  Mã nhân viên: {employeeCode}
                </Text>
                <Row>
                  <Column>
                    <Text className="text-[12px] uppercase text-slate-400 font-bold m-0">
                      Phòng ban
                    </Text>
                    <Text className="text-[15px] font-semibold text-slate-900 m-0">
                      {department}
                    </Text>
                  </Column>
                  <Column>
                    <Text className="text-[12px] uppercase text-slate-400 font-bold m-0">
                      Loại nhân sự
                    </Text>
                    <Text className="text-[15px] font-semibold text-slate-900 m-0">
                      {employeeType}
                    </Text>
                  </Column>
                </Row>
              </Section>

              {/* KPI Dashboard */}
              <Section className="mb-6">
                <Row>
                  <Column className="pr-2">
                    <Section className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                      <Text className="text-[28px] font-bold text-emerald-600 m-0">
                        {workTotal}
                      </Text>
                      <Text className="text-[12px] text-slate-500 m-0 mt-1">
                        Tổng công
                      </Text>
                    </Section>
                  </Column>
                  <Column className="px-1">
                    <Section className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                      <Text className="text-[28px] font-bold text-amber-500 m-0">
                        {lateCount}
                      </Text>
                      <Text className="text-[12px] text-slate-500 mt-1 mb-0">
                        Đi muộn
                      </Text>
                    </Section>
                  </Column>
                  <Column className="px-1">
                    <Section className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                      <Text className="text-[28px] font-bold text-red-500 m-0">
                        {earlyCount}
                      </Text>
                      <Text className="text-[12px] text-slate-500 mt-1 mb-0">
                        Về sớm
                      </Text>
                    </Section>
                  </Column>
                  <Column className="pl-2">
                    <Section className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                      <Text className="text-[28px] font-bold text-blue-600 m-0">
                        {totalLateMinutes}
                      </Text>
                      <Text className="text-[12px] text-slate-500 mt-1 mb-0">
                        Phút trễ
                      </Text>
                    </Section>
                  </Column>
                </Row>
              </Section>

              {/* Alert Card */}
              {attendanceStatus !== 'Good' && (
                <Section className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                  <Text className="text-[16px] font-bold text-amber-700 mt-0 mb-2">
                    ⚠️ Cảnh báo chấm công
                  </Text>
                  <Text className="text-[14px] text-amber-700 m-0">
                    Bạn đã đi muộn {lateCount} lần với tổng {totalLateMinutes} phút trong kỳ này.
                  </Text>
                </Section>
              )}

              {/* Daily Details */}
              <Section className="mb-6">
                <Heading as="h3" className="text-[16px] font-bold text-slate-900 mt-0 mb-4 pb-2 border-b border-slate-200">
                  Chi tiết chấm công theo tuần
                </Heading>

                {(() => {
                  if (!days || days.length === 0) {
                    return (
                      <Section className="bg-slate-50 rounded-xl p-6 text-center border border-dashed border-slate-200">
                        <Text className="text-[14px] text-slate-500 m-0 font-medium">
                          Không có dữ liệu chấm công chi tiết trong kỳ này.
                        </Text>
                      </Section>
                    );
                  }

                  const weeks = [
                    { label: 'Tuần 1 (Ngày 01-07)', items: [] as typeof days },
                    { label: 'Tuần 2 (Ngày 08-14)', items: [] as typeof days },
                    { label: 'Tuần 3 (Ngày 15-21)', items: [] as typeof days },
                    { label: 'Tuần 4 (Ngày 22-28)', items: [] as typeof days },
                    { label: 'Tuần 5 (Ngày 29-Cuối tháng)', items: [] as typeof days },
                  ];

                  days.forEach(day => {
                    if (!day.date) return;
                    const parts = day.date.split('-');
                    if (parts.length !== 3) return;
                    const dayNum = parseInt(parts[2], 10);
                    if (isNaN(dayNum)) return;

                    if (dayNum <= 7) weeks[0].items.push(day);
                    else if (dayNum <= 14) weeks[1].items.push(day);
                    else if (dayNum <= 21) weeks[2].items.push(day);
                    else if (dayNum <= 28) weeks[3].items.push(day);
                    else weeks[4].items.push(day);
                  });

                  const validWeeks = weeks.filter(w => w.items.length > 0);

                  return validWeeks.map((week, wIdx) => (
                    <Section key={wIdx} className="mb-6">
                      <Text className="text-[14px] font-bold text-blue-700 mt-0 mb-3 bg-blue-50 py-1.5 px-3 rounded-lg inline-block">
                        {week.label}
                      </Text>

                      <Section className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <Row className="bg-slate-50">
                          <Column className="w-1/2 pl-4 py-3 border-b border-slate-200"><Text className="m-0 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ngày</Text></Column>
                          <Column className="w-1/2 text-right pr-4 py-3 border-b border-slate-200"><Text className="m-0 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Công</Text></Column>
                        </Row>

                        {week.items.map((day, idx) => (
                          <Row key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                            <Column className={`w-1/2 pl-4 py-3 align-middle ${idx !== week.items.length - 1 ? 'border-b border-slate-100' : ''}`}>
                              <Text className="m-0 text-[14px] text-slate-800 font-medium">{day.date}</Text>
                              {(Number(day.lateMinutes) > 0 || Number(day.earlyMinutes) > 0) && (
                                <Text className="mt-1.5 mb-0 text-[11px] text-amber-700 bg-amber-50 inline-block px-2 py-0.5 rounded border border-amber-100 font-medium">
                                  {Number(day.lateMinutes) > 0 ? `Đi muộn: ${day.lateMinutes}p ` : ''}
                                  {Number(day.earlyMinutes) > 0 ? `Về sớm: ${day.earlyMinutes}p` : ''}
                                </Text>
                              )}
                            </Column>
                            <Column className={`w-1/2 text-right pr-4 py-3 align-middle ${idx !== week.items.length - 1 ? 'border-b border-slate-100' : ''}`}>
                              <Text className={`m-0 text-[15px] font-bold ${Number(day.work) < 1 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                {day.work}
                              </Text>
                            </Column>
                          </Row>
                        ))}
                      </Section>
                    </Section>
                  ));
                })()}
              </Section>

              {/* Summary Box */}
              <Section className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-6">
                <Text className="text-[18px] font-bold text-emerald-800 mt-0 mb-3">
                  📋 Tóm tắt kỳ công
                </Text>
                <Text className="text-[14px] text-emerald-700 mt-0 mb-1">
                  Tổng công làm việc: <strong>{workTotal}</strong>
                </Text>
                <Text className="text-[14px] text-emerald-700 mt-0 mb-1">
                  Đi muộn: <strong>{lateCount}</strong> lần
                </Text>
                <Text className="text-[14px] text-emerald-700 m-0">
                  Về sớm: <strong>{earlyCount}</strong> lần
                </Text>
              </Section>

              <Hr className="border border-solid border-slate-100 my-6 mx-0 w-full" />

              {/* Footer */}
              <Section className="text-center">
                <Link
                  href="https://hupuna.com"
                  className="bg-[#2563EB] text-white font-medium px-8 py-4 rounded-xl text-[14px] inline-block no-underline shadow-sm"
                >
                  📊 Xem chi tiết chấm công
                </Link>
                <Text className="text-[13px] font-semibold text-slate-700 mt-8 mb-2">
                  Hệ thống Quản lý Nhân sự Hupuna
                </Text>
                <Text className="text-[12px] text-slate-400 mt-1 mb-0">
                  Email được gửi tự động từ hệ thống.
                </Text>
                <Text className="text-[12px] text-slate-400 mt-1 mb-0">
                  Vui lòng không trả lời email này.
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

export default MonthlyAttendanceEmail;
