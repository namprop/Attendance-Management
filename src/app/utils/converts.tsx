import dayjs from "dayjs";

// chuyển đổi giá tiền
export const formatVND = (value: number): string =>
  value.toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 3,
  });

// Làm tròn lên bội của 5
export function roundUpToNearest5(value: number): number {
  return Math.ceil(value / 5) * 5;
}
// làm trong >3 và > 7 thì tròn lên, ngược lại làm trong xuống
export function roundToNearest5(value: number): number {
  return Math.round(value / 5) * 5;
}


// giảm độ cho màu sắc
export function lightenColor(hex: string, alpha: number = 0.3) {
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`; // alpha < 1 => màu nhạt hơn
}

// chuyển đổi html sang text
export function htmlToText(html: string): string {
  if (typeof window === "undefined") return ""; // tránh lỗi khi render server
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

// Chuyển đổi sang boolean
export const convertBoolean = (value: string | boolean | unknown): boolean => {
  if (value === "true" || value === true) return true
  if (value === "false" || value === false) return false
  return false
}

// Xóa khoảng trắng giữa các chữ trong đoạn text
export const trimText = (text: string) => {
  return text.replace(/\s{2,}/g, " ");
};

// convert về số thập phân nếu là số thập phân, giữ nguyên nếu là số nguyên
export const formatDouble = (value: number) => {
  if (Number.isInteger(value)) {
    return value.toString(); // số nguyên thì giữ nguyên
  }
  return parseFloat(value.toFixed(3)).toString();
};

// tính số ngày từ day trở đi
export const tinhSoNgayTroDi = (day: string) => {
  // 1. Lấy thời gian hiện tại
  const bayGio = dayjs();

  // 2. Chuyển đổi ngày chốt maket thành đối tượng dayjs
  const ngayBatDau = dayjs(day);

  // 3. Kiểm tra xem ngày nhập vào có hợp lệ không
  if (!ngayBatDau.isValid()) {
    return "Ngày không hợp lệ!";
  }

  // 4. Tính toán sự chênh lệch (diff)
  // Tham số thứ hai là đơn vị tính ('day', 'month', 'year'...)
  const soNgay = bayGio.diff(ngayBatDau, 'day');

  return soNgay;
}
// tính số ngày từ day trở về trước
export const tinhSoNgayTroVeTruoc = (day: string) => {
  // 1. Lấy thời gian hiện tại
  const bayGio = dayjs();

  // 2. Chuyển đổi ngày chốt maket thành đối tượng dayjs
  const ngayBatDau = dayjs(day);

  // 3. Kiểm tra xem ngày nhập vào có hợp lệ không
  if (!ngayBatDau.isValid()) {
    return "Ngày không hợp lệ!";
  }

  // 4. Tính toán sự chênh lệch (diff)
  // Tham số thứ hai là đơn vị tính ('day', 'month', 'year'...)
  const soNgay = ngayBatDau.diff(bayGio, 'day');

  return soNgay;
}
