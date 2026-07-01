import { Db } from 'mongodb';

const COLLECTION = 'online_checkin_settings-timekeeping';

const getString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export async function checkOnlineCheckinPermission(
  db: Db,
  employeeCode: string,
  date: string
): Promise<{ allowed: boolean; reason?: string; settingId?: string; label?: string }> {
  if (!employeeCode) {
    return { allowed: false, reason: 'Thiếu mã nhân viên' };
  }

  // Lấy tất cả cấu hình đang bật
  const enabledSettings = await db
    .collection(COLLECTION)
    .find({ enabled: true })
    .toArray();

  if (enabledSettings.length === 0) {
    return { allowed: false, reason: 'Chưa có cấu hình chấm công online nào được kích hoạt' };
  }

  // Kiểm tra từng cấu hình, nếu nhân viên khớp với bất kỳ cấu hình nào → cho phép
  for (const setting of enabledSettings) {
    const scope = getString(setting.scope) || 'all';
    const dateMode = getString(setting.dateMode) || 'always';

    // Kiểm tra phạm vi nhân viên
    let empMatch = false;
    if (scope === 'all') {
      empMatch = true;
    } else if (scope === 'specific') {
      const codes = Array.isArray(setting.employeeCodes) ? setting.employeeCodes as string[] : [];
      empMatch = codes.includes(employeeCode);
    }

    if (!empMatch) continue;

    // Kiểm tra phạm vi ngày
    let dateMatch = false;
    if (dateMode === 'always') {
      dateMatch = true;
    } else if (dateMode === 'range') {
      const from = getString(setting.dateFrom);
      const to = getString(setting.dateTo);
      if (from && to) {
        dateMatch = date >= from && date <= to;
      } else if (from) {
        dateMatch = date >= from;
      } else if (to) {
        dateMatch = date <= to;
      }
    } else if (dateMode === 'dates') {
      const dates = Array.isArray(setting.dates) ? setting.dates as string[] : [];
      dateMatch = dates.includes(date);
    }

    if (dateMatch) {
      return {
        allowed: true,
        settingId: setting._id?.toString(),
        label: setting.label || '',
      };
    }
  }

  return { allowed: false, reason: 'Ngày này không nằm trong lịch chấm công online' };
}
