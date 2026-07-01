import {
  BoChapOption,
  KhoBeOption,
  Option,
  OptionFlexo,
  OptionPrintMultipliers,
} from "./interface/options";

// Các loại hộp
export const optionTypeBox: Option[] = [
  { value: "1", label: "Nắp đối" },
  { value: "6", label: "Nắp đối 2 mảnh" },
  { value: "3", label: "Nắp gài" },
  { value: "8", label: "Nắp gài 2 mảnh" },
  { value: "2", label: "Nắp chồng nắp" },
  { value: "9", label: "Nắp chồng nắp 2 mảnh" },
  { value: "4", label: "Nắp cài 2 đầu" },
  { value: "5", label: "Nắp cài đáy chéo" },
  { value: "10", label: "Tấm phôi(Tấm bìa)" },
  // { value: "16", label: "Nắp cài đáy chấm" },
  // { value: "25", label: "Tem nhãn" },
  // { value: "24", label: "Hộp như hình" },
];

export const findLabelByValue_optionTypeBox = (value: string) => optionTypeBox.find((item) => item.value === value)?.label

// Các kiểu dáng hộp ===================================
// export const typeBox: Option[] = [
//   { label: "Nắp đối", value: "1" },
//   { label: "Nắp đối 2 mảnh", value: "6" },

//   { label: "Nắp gài", value: "3" },
//   { label: "Nắp gài 2 mảnh", value: "8" },

//   { label: "Tấm bìa (Tấm phôi)", value: "10" },

//   { label: "Nắp chồng nắp", value: "2" },
//   { label: "Nắp chồng nắp 2 mảnh", value: "9" },

//   { label: "Nắp cài 2 đầu", value: "4" },
//   { label: "Nắp cài đáy chéo", value: "5" },
//   { value: "16", label: "Nắp cài đáy chám" },
//   // { label: "Nắp nam châm", value: "11" },
//   // { label: "Dạng Bao diêm", value: "12" },
//   // { label: "Nắp cánh bướm", value: "13" },
//   // { label: "Nắp âm dương", value: "14" },
//   // { label: "Nắp cài tay xách", value: "15" },
// ];
// Các loại sản phẩm giá trị phải giống với optionTypeBox
export const optionTypeProduct: Option[] = [
  { value: "1", label: "Nắp đối" },
  { value: "6", label: "Nắp đối 2 mảnh" },
  { value: "3", label: "Nắp gài" },
  { value: "8", label: "Nắp gài 2 mảnh" },
  { value: "2", label: "Nắp chồng nắp" },
  { value: "9", label: "Nắp chồng nắp 2 mảnh" },
  { value: "4", label: "Nắp cài 2 đầu" },
  { value: "5", label: "Nắp cài đáy chéo" },
  { value: "10", label: "Tấm phôi(Tấm bìa)" },

  { value: "11", label: "Nắp nam châm" },
  { value: "12", label: "Dạng Bao diêm" },
  { value: "13", label: "Nắp cánh bướm" },
  { value: "14", label: "Nắp âm dương" },
  { value: "15", label: "Nắp cài tay xách" },
  { value: "16", label: "Nắp cài đáy chấm" },
  { value: "20", label: "Túi giấy" },
  { value: "21", label: "Khay định hình" },
  { value: "22", label: "Hộp Pizza" },
  { value: "23", label: "Hộp Giày" },
  // { value: "24", label: "Hộp như hình" },
];
// Khu vực
export const optionLocation: Option[] = [
  {
    value: "1",
    label: "Hà Nội",
  },
  {
    value: "2",
    label: "HCM",
  },
];

// phân biệt bổ hay bế
export const optionBoBe: Option[] = [
  { value: "1", label: "Bổ chạp" },
  { value: "2", label: "Bế" },
];

// Loại máy bổ chạp
export const optionBoChap: BoChapOption[] = [
  { value: "1", label: "Máy bổ bé", min: 75000, },
  { value: "2", label: "Máy bổ lớn", min: 75000, },
];

// Loại máy bế to hay bé
export const optionBe: Option[] = [
  { value: "1", label: "Máy bế bé", },
  { value: "2", label: "Máy bế to", },
];

// Các loại máy bế - khổ bế
export const optionKhoBe: KhoBeOption[] = [
  {
    id: "1",
    name: "Khổ máy 50x72",
    size: "50x72",
    price: 250,
    note: "250đ/lượt, min 200k",
    mayBeId: "1",
    min: 200000,
    long: 50,
    width: 72,
  },
  {
    id: "2",
    name: "Khổ máy 62x88",
    size: "62x88",
    price: 300,
    note: "300đ/lượt, min 300k",
    mayBeId: "2",
    min: 300000,
    long: 62,
    width: 88,
  },
  {
    id: "3",
    name: "Khổ máy 72x102",
    size: "72x102",
    price: 450,
    note: "450đ/lượt, min 400k",
    mayBeId: "3",
    min: 400000,
    long: 72,
    width: 102,
  },
  {
    id: "5",
    name: "Khổ máy 79x117",
    size: "79x117",
    price: 800,
    note: "800đ/lượt, min 550k",
    mayBeId: "5",
    min: 550000,
    long: 79,
    width: 117,
  },
  // {
  //   id: "6",
  //   name: "Khổ máy đông hà 95x125",
  //   size: "95x125",
  //   price: 1300,
  //   note: "bế min 750k",
  //   mayBeId: "6",
  //   min: 750000,
  //   long: 95,
  //   width: 125,
  // },
  // {
  //   id: "7",
  //   name: "Khổ máy nhật sơn 85x125 hỏi lại trc khi tính",
  //   size: "85x125",
  //   price: 1300,
  //   note: "bế min 750k, hỏi lại trc khi tính",
  //   mayBeId: "7",
  //   min: 750000,
  //   long: 85,
  //   width: 125,
  // },
  {
    id: "8",
    name: "Khổ máy tròn 1m2x2m4",
    size: "1m2x2m4",
    price: 800,
    note: "800đ/lượt, min 1tr - hỏi lại sếp",
    mayBeId: "8",
    min: 1000000,
    long: 120,
    width: 240,
  },
  // {
  //   id: "9",
  //   name: "Khổ máy tròn khổ 1m1x1m4",
  //   size: "1m1x1m4",
  //   price: 800,
  //   note: "mã quá khổ phải bế ttd thì hỏi giá hoàn thiện",
  //   mayBeId: "9",
  //   min: 1000000,
  //   long: 110,
  //   width: 140,
  // },
  {
    id: "10",
    name: "Khổ máy 1m07x1m47",
    size: "1m07x1m47",
    price: 1200,
    note: "1000đ/lượt, min 700k",
    mayBeId: "10",
    min: 700000,
    long: 107,
    width: 147,
  },
];

// Lựa chọn Khuôn
export const optionKhuon: Option[] = [
  {
    value: "1",
    label: "Có khuôn sẵn",
  },
  {
    value: "2",
    label: "Không có khuôn sẵn",
  },
];

// Lựa chọn Dán hay Ghim
export const optionDanGhim: Option[] = [
  {
    value: "0",
    label: "Không",
  },
  {
    value: "1",
    label: "Dán",
  },
  {
    value: "2",
    label: "Ghim",
  },
];

export const optionDanTayMay: Option[] = [
  {
    value: "1",
    label: "Dán Máy",
  },
  {
    value: "2",
    label: "Dán Tay",
  },
];

// Phân biệt in lụa hay in flexo
export const optionIn: Option[] = [
  {
    value: "0",
    label: "Không In",
  },
  {
    value: "1",
    label: "Có In",
  },
];
export const optionInLuaOrMay: Option[] = [
  {
    value: "1",
    label: "In Lụa",
  },
  {
    value: "2",
    label: "In Flexo/Máy",
  },
];

export const optionPrintFace: Option[] = [
  {
    value: "1",
    label: "1 mặt chính",
  },
  {
    value: "2",
    label: "2 mặt chính",
  },
  {
    value: "3",
    label: "1 mặt phụ",
  },
  {
    value: "4",
    label: "2 mặt phụ",
  },
  {
    value: "5",
    label: "1 mặt chính + 1 mặt phụ",
  },
  {
    value: "6",
    label: "Full mặt",
  },
];

// Phân phối sản phẩm in flexo 3 lớp hay 5 lớp
export const optionFlexo: OptionFlexo[] = [
  {
    id: "1",
    name: "Hàng 3 lớp",
    price: 500,
  },
  {
    id: "2",
    name: "Hàng 5 lớp",
    price: 600,
  },
];

// Hệ số nhân in lụa
export const printAreaMultipliers: OptionPrintMultipliers[] = [
  { from: 0.0, to: 0.2, multiplier: 1.0 },
  { from: 0.2, to: 0.4, multiplier: 1.2 },
  { from: 0.4, to: 0.6, multiplier: 1.5 },
  { from: 0.6, to: 0.8, multiplier: 1.8 },
  { from: 0.8, to: 1.0, multiplier: 2.0 },
  { from: 1.0, to: 1.2, multiplier: 2.2 },
  { from: 1.2, to: 1.4, multiplier: 2.4 },
  { from: 1.4, to: 1.6, multiplier: 2.6 },
  { from: 1.6, to: 2.0, multiplier: 2.8 },
  { from: 2.0, to: Infinity, multiplier: 3.2 },
];

// Giá in lụa
export const opitonPriceInLua = [
  {
    id: 1,
    range: "Số lượng từ 1h – 299h",
    from: 1,
    to: 299,
    priceType: "fixed", // giá cố định
    basePrice: 300000,
    perTurn: 0,
    description: "300k / tổng số lượng / 1 màu",
  },
  {
    id: 2,
    range: "Số lượng từ 300h – 499h",
    from: 300,
    to: 499,
    priceType: "step", // có phụ phí theo lượt
    basePrice: 300000,
    perTurn: 1000,
    thresholdTurn: 300, // bắt đầu tính phụ phí từ lượt thứ 301 trở đi
    description: "300k + 1.000 * số lượt in >300 / tổng số lượng / 1 màu",
  },
  {
    id: 3,
    range: "Số lượng từ 500h – 899h",
    from: 500,
    to: 899,
    priceType: "step", // có phụ phí theo lượt
    basePrice: 350000,
    perTurn: 800,
    thresholdTurn: 300,
    description: "350k + 800 * số lượt in >300 / tổng số lượng / 1 màu",
  },
  {
    id: 4,
    range: "Số lượng trên 900h",
    from: 900,
    to: Infinity,
    basePrice: 0,
    perTurn: 700,
    priceType: "perTurn", // tính theo số lượt in và số lượng
    pricePerTurn: 700,
    description: "700 đ/lượt in/1 màu",
  },
];

// Hệ số nhân giá tiền ở Hanoi với số lượng trên 300
export const hanoiMultipliers = [
  { id: 1, label: "Dưới 1 triệu", from: 0, to: 1000000, multiplier: 1.48 },
  { id: 2, label: "1tr - 2tr", from: 1000000, to: 2000000, multiplier: 1.33 },
  { id: 3, label: "2tr – 3tr", from: 2000000, to: 3000000, multiplier: 1.3 },
  { id: 4, label: "3tr – 5tr", from: 3000000, to: 5000000, multiplier: 1.27 },
  { id: 5, label: "5tr – 8tr", from: 5000000, to: 8000000, multiplier: 1.25 },
  { id: 6, label: "8tr – 15tr", from: 8000000, to: 15000000, multiplier: 1.22 },
  { id: 7, label: "15tr – 25tr", from: 15000000, to: 25000000, multiplier: 1.17 },
  { id: 8, label: "25tr – 50tr", from: 25000000, to: 50000000, multiplier: 1.12 },
  { id: 9, label: "51tr – 100tr", from: 51000000, to: 100000000, multiplier: 1.07 },
  { id: 10, label: "101tr – 190tr", from: 101000000, to: 190000000, multiplier: 1.02 },
  { id: 11, label: "Trên 200tr", from: 200000000, to: Infinity, multiplier: 0.95 },
];

export const HCMmultipliers = [
  { id: 1, label: "Dưới 500k", from: 0, to: 500000, multiplier: 2 },
  { id: 2, label: "Dưới 1 triệu", from: 500000, to: 1000000, multiplier: 1.48 },
  { id: 3, label: "1tr - 2tr", from: 1000000, to: 2000000, multiplier: 1.38 },
  { id: 4, label: "2tr – 3tr", from: 2000000, to: 3000000, multiplier: 1.32 },
  { id: 5, label: "3tr – 5tr", from: 3000000, to: 5000000, multiplier: 1.3 },
  { id: 6, label: "5tr – 8tr", from: 5000000, to: 8000000, multiplier: 1.27 },
  { id: 7, label: "8tr – 15tr", from: 8000000, to: 15000000, multiplier: 1.25 },
  { id: 8, label: "15tr – 25tr", from: 15000000, to: 25000000, multiplier: 1.22 },
  { id: 9, label: "25tr – 50tr", from: 25000000, to: 50000000, multiplier: 1.2 },
  { id: 10, label: "51tr – 100tr", from: 51000000, to: 100000000, multiplier: 1.17 },
  { id: 11, label: "101tr – 190tr", from: 101000000, to: 190000000, multiplier: 1.12 },
  { id: 12, label: "Trên 200tr", from: 200000000, to: Infinity, multiplier: 1.07 },
];

// Hệ số nhân giá tiền ở Hanoi với số lượng dưới 300
export const smallOrderMultipliers = [
  { id: 1, label: "Dưới 300.000đ", from: 0, to: 300000, multiplier: 2.1 },
  { id: 2, label: "300k – 499k", from: 300000, to: 500000, multiplier: 2.05 },
  { id: 3, label: "500k – 999k", from: 500000, to: 1000000, multiplier: 1.85 },
  { id: 4, label: "1tr – 2tr", from: 1000000, to: 2000000, multiplier: 1.65 },
  { id: 5, label: "2tr – 3tr", from: 2000000, to: 3000000, multiplier: 1.5 },
  { id: 6, label: "3tr – 5tr", from: 3000000, to: 5000000, multiplier: 1.35 },
];

// Trạng thái báo giá
export const optionStatusPrice: Option[] = [
  { label: "Mới", value: "1" },
  { label: "Tính xong", value: "2" },
  { label: "Đang tính lại", value: "3" },
  { label: "Khách chưa chốt", value: "4" },
  { label: "Khách đã chốt", value: "5" },
];

// kích thước Phủ bì hay Lọt long
export const optionCoverInside: Option[] = [
  { label: "Phủ bì", value: "1" },
  { label: "Lọt lòng", value: "2" },
];
export const findLabelByValue_optionCoverInside = (value: string) => optionCoverInside.find((item) => item.value === value)?.label

// //nhóm kh
// export const optionCustomergroud: Option[] = [
//   { label: "Khách sản xuất", value: "1" },
//   { label: "Đại lý - Nhà bán hàng", value: "2" },
//   { label: "Khách lấy hàng có sẵn", value: "3" },
// ]
// //Zalo tư vẫn
// export const optionZalo: Option[] = [
//   { label: "Zalo Diễm Mi", value: "1" },
//   { label: "Zalo Hương Giang", value: "2" },
//   { label: "Zalo Kim Lê ", value: "3" },
// ]
// //Khu vực
// export const optionArea: Option[] = [
//   { label: "Hà Nội", value: "1" },
//   { label: "Sài Gòn", value: "2" },

// ]
// //Phân khúc khách hàng
// export const optionCustomersegment: Option[] = [
//   { label: "Víp", value: "1" },
//   { label: "To", value: "2" },
//   { label: "Nhỏ", value: "3" },
// ]
// //Page facebook
// export const optionPagefacebook: Option[] = [
//   { label: "Không", value: "1" },
//   { label: "Moshop", value: "2" },
//   { label: "Làm hộp carton Chấm công", value: "3" },
// ]
// //Nhóm sản phẩm
// export const optionpProductgroup: Option[] = [
//   { label: "Màng PE", value: "1" },
//   { label: "Băng dính", value: "2" },
//   { label: "Hộp carton", value: "3" },
// ]
// //Nhân viên tư vấn
// export const optionConsultant: Option[] = [
//   { label: "Dev", value: "1" },
//   { label: "Thu Huệ", value: "2" },
//   { label: "Việt Hà", value: "3" },
// ]
// //Nguồn gốc khách hàng
// export const optionCustomerorigin: Option[] = [
//   { label: "Data ngoài", value: "1" },
//   { label: "FaceBook", value: "2" },
//   { label: "Google", value: "3" },
// ]
// //Tình trạng khách hàng
// export const optionCustomerStatus: Option[] = [
//   { label: "Đang báo giá", value: "1" },
//   { label: "Báo giá khách", value: "2" },
//   { label: "Hoàn Thành", value: "3" },
// ]

export const optionFacePrint = [
  { label: "Mặt ngoài", value: "1" },
  { label: "Mặt trong", value: "2" },
  { label: "Cả hai mặt", value: "3" },
];
