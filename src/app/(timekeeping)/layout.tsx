import TimekeepingLayout from '@/app/ui/timekeeping/layout/TimekeepingLayout';

export default async function TimekeepingGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TimekeepingLayout>{children}</TimekeepingLayout>;
}
