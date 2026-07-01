import { Status, StatusLevel } from "./interface/status";

export const allStatusList: Status[] = [
  // Báo giá
  { id: "0", name: "Báo giá mới", type: 1, route: "/status/0", color: "#3498db" },      // Xanh dương
  { id: "1", name: "Đang tính giá", type: 1, route: "/status/1", color: "#9b59b6" },    // Tím
  { id: "2", name: "Thiếu thông tin", type: 1, route: "/status/2", color: "#e67e22" },  // Cam
  { id: "3", name: "Từ chối báo giá", type: 1, route: "/status/3", color: "#e74c3c" },  // Đỏ
  { id: "41", name: "Yêu cầu Tính giá lại", type: 1, route: "/status/41", color: "#1abc8c" },    // Xanh ngọc
  { id: "42", name: "Kết quả chờ duyệt", type: 1, route: "/status/42", color: "#1eec8c" },    // Xanh ngọc
  { id: "4", name: "Tính giá xong", type: 1, route: "/status/4", color: "#1abc9c" },    // Xanh ngọc
  { id: "5", name: "Chốt đơn", type: 1, route: "/status/5", color: "#2ecc71" },         // Xanh lá
  { id: "51", name: "Đã gửi khách", type: 1, route: "/status/51", color: "#2edd71" },         // Xanh lá
  { id: "6", name: "Không chốt đơn", type: 1, route: "/status/6", color: "#95a5a6" },   // Xám

  // Thiết kế
  { id: "61", name: "Yêu cầu Thiết kế", type: 3, route: "/status/61", color: "#2960b9" },   // Xanh lý"
  { id: "62", name: "Thiết kế xong", type: 3, route: "/status/62", color: "#8260b9" },   // Xanh lý"
  { id: "7", name: "Đang lên Market", type: 3, route: "/status/7", color: "#2980b9" },
  // { id: "8", name: "Đã chốt Market", type: 3, route: "/status/8", color: "#27ae60" },
  // Sản xuất
  { id: "9", name: "Chuẩn bị NVL", type: 2, route: "/status/9", color: "#e67e22" },
  { id: "10", name: "Bắt đầu SX", type: 2, route: "/status/10", color: "#f1c40f" },       // Vàng
  { id: "11", name: "Đang Bế/Bổ", type: 2, route: "/status/11", color: "#d35400" },
  { id: "12", name: "Đang in", type: 2, route: "/status/12", color: "#8e44ad" },
  { id: "13", name: "SX xong", type: 2, route: "/status/13", color: "#2ecc71" },
  { id: "14", name: "Đang đóng gói", type: 2, route: "/status/14", color: "#16a085" },
  { id: "15", name: "Hoàn thành", type: 2, route: "/status/15", color: "#03FF00" },     // Xanh kết thúc
  { id: "16", name: "Đã hủy", type: 2, route: "/status/16", color: "#c0392b" },         // Đỏ đậm
];

export const allStatusLevel: StatusLevel[] = [
  { id: "1", name: "Bình thường", color: "#ffffff" },
  { id: "2", name: "Gấp", color: "#FCFF85" },
  { id: "3", name: "Rất gấp", color: "#FF9B9B" },
];
