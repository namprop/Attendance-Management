import { Option } from "./interface/options";

export const arrPaperOrigin = [
  { id: 2, name: "PT VINA", data: [] },
  { id: 1, name: "TTD", data: [] },
  { id: 3, name: "BB LÂM HUY", data: [] },
  { id: 4, name: "Jiang", data: [] },
];

export const arrPaperOriginHCM = [
  { id: 1, name: "Trung Tín", data: [] },
];

export const paper1LayerBox: Option[] = [
  { label: "Kraft 120", value: 1 },
  { label: "Kraft 150", value: 2 },
  { label: "Kraft 170", value: 3 },
  { label: "Duplex 250", value: 4 },
  { label: "Duplex 300", value: 5 },
  { label: "Duplex 350", value: 6 },
  { label: "Duplex 400", value: 7 },
  { label: "Ivory 250", value: 8 },
  { label: "Ivory 300", value: 9 },
  { label: "Ivory 350", value: 10 },
  { label: "Ivory 400", value: 11 },
  { label: "Couche 150", value: 12 },
  { label: "Couche 300", value: 13 },
  { label: "Couche 350", value: 14 },
  { label: "Couche 400", value: 15 },
];

export const optionMaterialTray: Option[] = [
  { label: "Carton sóng", value: 1 },
  { label: "Carton lạnh", value: 2 },
  { label: "Eva", value: 3 },
  { label: "Foam", value: 4 },
  { label: "Giấy 1 lớp", value: 5 },
];

export interface PaperOption {
  type: number; // 3, 5, 7 lớp
  waves: {
    wave: string; // B, C, E, BC, BE, BCE...
    thickness: number; // độ dày sóng quy đổi ra cm
    colors: {
      color: string; // 1 mặt nâu, 2 mặt nâu, trắng nâu, 2 trắng...
      weights: {
        label: string; // định lượng: 150/110/150...
        price: number;
        productId: number;
      }[];
    }[];
  }[];
}
// Phôi nhân hệ số HN =======================================
export const groupedPaperHN: PaperOption[] = [
  {
    type: 3,
    waves: [
      {
        wave: "C",
        thickness: 0.4, //cm
        colors: [
          {
            color: "1 mặt nâu, mộc",
            weights: [
              { label: "150/110/110", price: 7000, productId: 1 }, // giá cũ 6400
            ],
          },
          {
            color: "2 mặt nâu",
            weights: [
              { label: "150/110/150", price: 7500, productId: 2 }, // giá cũ 6900
              { label: "150/120/150", price: 8000, productId: 3 }, // giá cũ 7380
              { label: "150/150/150", price: 9000, productId: 4 }, // giá cũ 8300
              { label: "170/150/170", price: 10200, productId: 5 },
            ],
          },
          {
            color: "trắng nâu",
            weights: [
              { label: "150/110/150", price: 10100, productId: 6 }, // giá cũ 9100
              { label: "150/150/150", price: 11000, productId: 6 },
            ],
          },
          {
            color: "2 mặt trắng",
            weights: [{ label: "150/110/150", price: 12700, productId: 8 }], // giá cũ 11100
          },
        ],
      },
      {
        wave: "B",
        thickness: 0.3, //cm
        colors: [
          {
            color: "1 mặt nâu, mộc",
            weights: [{ label: "150/110/110", price: 6500, productId: 2 }], // giá cũ 6000
          },
          {
            color: "2 mặt nâu",
            weights: [
              { label: "150/110/150", price: 7250, productId: 4 }, // giá cũ 6700
              // { label: "150/120/150", price: 0, productId: 4 },
              { label: "150/150/150", price: 8950, productId: 5 },// 8250
              { label: "170/150/170", price: 9900, productId: 5 }, //9150
            ],
          },
          {
            color: "trắng nâu",
            weights: [
              { label: "150x110x150", price: 9800, productId: 6 }, //8900
              { label: "150x150x150", price: 10850, productId: 7 }, // 9100
            ],
          },
          {
            color: "2 mặt trắng",
            weights: [{ label: "150x110x150", price: 12400, productId: 8 }],// 11000
          },
        ],
      },
      {
        wave: "E",
        thickness: 0.2, //cm
        colors: [
          // tạm dừng ==========
          // {
          //   color: "1 mặt nâu, mộc",
          //   weights: [
          //     { label: "150/110/110", price: 7400, productId: 1 }, //giá cũ 6800
          //   ],
          // },
          {
            color: "2 mặt nâu",
            weights: [
              { label: "150/100/150", price: 7900, productId: 2 }, //giá cũ 7150
              { label: "150/100/120", price: 7400, productId: 3 }, //giá cũ 8000
              // { label: "150/110/150", price: 7450, productId: 3 }, // tạm dừng ==========
              { label: "150/120/150", price: 8300, productId: 3 },
              { label: "150/120/120", price: 7900, productId: 3 },
            ],
          },
          {
            color: "trắng nâu",
            weights: [
              { label: "140/100/120", price: 8900, productId: 6 }, //giá cũ 9250
              { label: "140/100/150", price: 10500, productId: 6 },
              // { label: "150/110/150", price: 10000, productId: 6 },  // tạm dừng ==========
            ],
          },
          {
            color: "2 mặt trắng",
            weights: [
              { label: "140/100/140", price: 12600, productId: 8 },
              // { label: "150/110/150", price: 12900, productId: 8 },  // tạm dừng ==========
            ], // giá cũ 11000
          },
        ],
      },
    ],
  },
  {
    type: 5,
    waves: [
      {
        wave: "BC",
        thickness: 0.7, //cm
        colors: [
          {
            color: "1 mặt nâu, mộc",
            weights: [{ label: "150/110/110/110/110", price: 10550, productId: 9 }], // giá cũ 9738
          },
          {
            color: "2 mặt nâu",
            weights: [
              { label: "150/110/110/110/150", price: 12500, productId: 10 }, // giá cũ 11550
              { label: "đl cao 170/130/110/150/150", price: 16500, productId: 11 }, // giá cũ 15200
              { label: "đl leman 170/150/110/150/150", price: 16800, productId: 12 }, // giá cũ 15500
              { label: "170/150/110/vkt170/170", price: 17950, productId: 12 }, // giá cũ 16500

              { label: "200/120/120/150/170", price: 17300, productId: 12 },
              { label: "200/120/120/150/200", price: 17950, productId: 12 },
            ],
          },
          {
            color: "trắng mộc",
            weights: [{ label: "150/110/110/110/110", price: 12900, productId: 13 }],
          },
          {
            color: "trắng nâu",
            weights: [
              { label: "150/110/110/110/150", price: 13600, productId: 14 }, // giá cũ 13000
              { label: "160/110/110/160/150", price: 15450, productId: 14 }, // giá cũ 13650
            ],
          },
          {
            color: "2 mặt trắng",
            weights: [{ label: "150/110/110/110/150", price: 17550, productId: 15 }], // giá cũ 15500
          },
        ],
      },
      {
        wave: "BE",
        thickness: 0.5, //cm
        colors: [
          {
            color: "1 mặt nâu, mộc",
            weights: [{ label: "150/110/110/110/110", price: 12850, productId: 9 }], // giá cũ 11000
          },
          {
            color: "2 mặt nâu",
            weights: [
              { label: "150/110/110/110/150", price: 13550, productId: 10 }, // giá cũ 12100
              // { label: "đl cao 170/130/110/150/150", price: 0, productId: 11 },
              // { label: "đl leman 170/150/110/150/150", price: 0, productId: 12 },
              // { label: "170/150/110/vkt170/170", price: 0, productId: 12 },
            ],
          },
          {
            color: "trắng mộc",
            weights: [{ label: "150/110/110/110/110", price: 11800, productId: 13 }], // giá cũ 11800
          },
          {
            color: "trắng nâu",
            weights: [
              { label: "150/110/110/110/150", price: 14700, productId: 14 }, // giá cũ 12700
              // { label: "160/110/110/160/150", price: 0, productId: 14 },
            ],
          },
          {
            color: "2 mặt trắng",
            weights: [{ label: "150/110/110/110/150", price: 17850, productId: 15 }], // giá cũ 15400
          },
        ],
      },
    ],
  },
  {
    type: 7,
    waves: [
      {
        wave: "BCE",
        thickness: 0.9, //cm
        colors: [
          {
            color: "2 mặt nâu",
            weights: [{ label: "150/110/110/110/110/110/150", price: 18500, productId: 16 }], //giá cũ 16000
          },
        ],
      },
    ],
  },
];

// Phôi nhân hệ số SG =======================================
export const groupedPaperSG: PaperOption[] = [
  {
    type: 3,
    waves: [
      {
        wave: "C",
        thickness: 0.4, //cm
        colors: [
          {
            color: "1 mặt nâu mộc",
            weights: [{ label: "125/100/100", price: 7400, productId: 1 }],
          },
          {
            color: "2 mặt nâu",
            weights: [
              { label: "125/100/125", price: 7600, productId: 2 },
              // { label: "150/120/150: 150/125/150", price: 10100, productId: 2 },
              // { label: "150/150/150", price: 12000, productId: 2 },
            ],
          },
          {
            color: "trắng mộc",
            weights: [{ label: "125/100/100", price: 8700, productId: 3 }],
          },
          {
            color: "trắng nâu",
            weights: [
              { label: "125/100/125", price: 9100, productId: 4 },
              // { label: "150x150x150", price: 13500, productId: 4 },
            ],
          },
          {
            color: "2 mặt trắng",
            weights: [{ label: "125/100/125", price: 11200, productId: 5 }],
          },
        ],
      },
      {
        wave: "B",
        thickness: 0.3, //cm
        colors: [
          {
            color: "1 mặt nâu mộc",
            weights: [{ label: "125/100/100", price: 7100, productId: 1 }],
          },
          {
            color: "2 mặt nâu",
            weights: [
              { label: "125/100/125", price: 7300, productId: 2 },
              // { label: "150/120/150: 150/125/150", price: 10200, productId: 2 },
              // { label: "150/150/150", price: 11500, productId: 2 },
            ],
          },
          {
            color: "trắng mộc",
            weights: [{ label: "125/100/100", price: 8600, productId: 3 }],
          },
          {
            color: "trắng nâu",
            weights: [
              { label: "125/100/125", price: 8800, productId: 4 },
              // { label: "150/150/150", price: 13500, productId: 4 },
            ],
          },
          {
            color: "2 mặt trắng",
            weights: [{ label: "125/100/125", price: 11400, productId: 5 }],
          },
        ],
      },
      {
        wave: "E",
        thickness: 0.2, //cm
        colors: [
          {
            color: "1 mặt nâu mộc",
            weights: [{ label: "125/100/100", price: 7100, productId: 1 }],
          },
          {
            color: "2 mặt nâu",
            weights: [{ label: "125/100/125", price: 7600, productId: 2 },
              // { label: "150/120/150: 150/125/150", price: 10900, productId: 2 },
              // { label: "150/150/150", price: 12000, productId: 2 },
            ],
          },
          {
            color: "trắng mộc",
            weights: [{ label: "125/100/100", price: 8900, productId: 3 }],
          },
          {
            color: "trắng nâu",
            weights: [
              { label: "125/100/125", price: 9100, productId: 4 },
              // { label: "150/150/150", price: 16000, productId: 4 },
            ],
          },
          {
            color: "2 mặt trắng",
            weights: [{ label: "125/100/125", price: 11700, productId: 5 }],
          },
        ],
      },
    ],
  },
  {
    type: 5,
    waves: [
      {
        wave: "BC",
        thickness: 0.7, //cm
        colors: [
          {
            color: "1 mặt nâu mộc",
            weights: [{ label: "125/100/100/100/100", price: 10550, productId: 6 }],
          },
          {
            color: "2 mặt nâu",
            weights: [
              { label: "125/100/100/100/125", price: 11400, productId: 7 },
              // { label: "ngoài sẫm 170/130/110/150/150", price: 21000, productId: 7 },
              // { label: "dl cao 170/150/110/150/150", price: 27000, productId: 7 },
            ],
          },
          {
            color: "trắng mộc",
            weights: [{ label: "140/100/100/100/100", price: 12200, productId: 8 }],
          },
          {
            color: "trắng nâu",
            weights: [
              { label: "140/100/100/100/125", price: 12500, productId: 9 },
              // { label: "160/110/110/160/150", price: 20000, productId: 9 },
            ],
          },
          {
            color: "2 mặt trắng",
            weights: [{ label: "140/100/100/100/140", price: 14000, productId: 10 }],
          },
        ],
      },
      {
        wave: "BE",
        thickness: 0.5, //cm
        colors: [
          {
            color: "2 mặt nâu",
            weights: [
              { label: "125/100/100/100/125", price: 14900, productId: 7 },
              // { label: "ngoài sẫm 170/130/110/150/150", price: 22000, productId: 7 },
              // { label: "dl cao 170/150/110/150/150", price: 28000, productId: 7 },
            ],
          },
        ],
      },
    ],
  },
];

// Phôi gốc từ nhà cung cấp HN ================================
// Phôi gốc TTD - Tân thành đạt
export const groupedPaperSupplierTTD: PaperOption[] = [
  {
    type: 3,
    waves: [
      {
        wave: "C",
        thickness: 0.4, //cm
        colors: [
          {
            color: "1 mặt nâu, mộc",
            weights: [{ label: "150/110/110", price: 6000, productId: 1 }],
          },
          {
            color: "2 mặt nâu",
            weights: [
              { label: "150/110/150", price: 6400, productId: 2 },
              { label: "dl cao 150/120/150", price: 7100, productId: 3 },
            ],
          },
          {
            color: "2 mặt mộc",
            weights: [{ label: "110/110/110", price: 5700, productId: 3 }],
          },
          {
            color: "trắng mộc",
            weights: [{ label: "150/110/110", price: 7500, productId: 4 }],
          },
          {
            color: "trắng nâu",
            weights: [{ label: "150/110/150", price: 7100, productId: 5 }],
          },
          {
            color: "2 mặt trắng",
            weights: [{ label: "150/110/150", price: 8450, productId: 6 }],
          },
        ],
      },
      {
        wave: "B",
        thickness: 0.3, //cm
        colors: [
          {
            color: "1 mặt nâu, mộc",
            weights: [{ label: "150/110/110", price: 5800, productId: 1 }],
          },
          {
            color: "2 mặt nâu",
            weights: [
              { label: "150/110/150", price: 6200, productId: 2 },
              { label: "dl cao 150/120/150", price: 6900, productId: 3 },
            ],
          },
          {
            color: "2 mộc",
            weights: [{ label: "110/110/110", price: 5500, productId: 3 }],
          },
          {
            color: "trắng mộc",
            weights: [{ label: "150/110/110", price: 7400, productId: 4 }],
          },
          {
            color: "trắng nâu",
            weights: [{ label: "150/110/150", price: 6900, productId: 5 }],
          },
          {
            color: "2 mặt trắng",
            weights: [{ label: "150/110/150", price: 8250, productId: 6 }],
          },
        ],
      },
      // Khóa tạm thời không đặt ===============================
      // Không được xóa hẳn =====================================
      // {
      //   wave: "E",
      //   thickness: 0.2, //cm
      //   colors: [
      //     {
      //       color: "1 mặt nâu, mộc",
      //       weights: [{ label: "150/100/100", price: 5900, productId: 1 }],
      //     },
      //     {
      //       color: "2 mặt nâu",
      //       weights: [
      //         { label: "150/100/150", price: 6300, productId: 2 },
      //         { label: "dl cao 150/120/150", price: 6900, productId: 7 }
      //       ],
      //     },
      //     {
      //       color: "2 mộc",
      //       weights: [{ label: "100/100/100", price: 5600, productId: 3 }],
      //     },
      //     {
      //       color: "trắng mộc",
      //       weights: [{ label: "150/100/100", price: 7300, productId: 4 }],
      //     },
      //     {
      //       color: "trắng nâu",
      //       weights: [{ label: "150/100/150", price: 8900, productId: 5 }],
      //     },
      //     {
      //       color: "2 mặt trắng",
      //       weights: [{ label: "150/100/150", price: 8150, productId: 6 }],
      //     },
      //   ],
      // },
    ],
  },
  {
    type: 5,
    waves: [
      {
        wave: "BC",
        thickness: 0.7, //cm
        colors: [
          {
            color: "1 mặt nâu, mộc",
            weights: [{ label: "150/110/110/110/110", price: 10500, productId: 8 }],
          },
          {
            color: "2 mặt nâu",
            weights: [{ label: "150/110/110/110/150", price: 11100, productId: 9 }],
          },
          {
            color: "trắng mộc",
            weights: [{ label: "150/110/110/110/110", price: 9700, productId: 10 }],
          },
          {
            color: "trắng nâu",
            weights: [{ label: "150/110/110/110/150", price: 10000, productId: 11 }],
          },
          {
            color: "2 mặt trắng",
            weights: [{ label: "150/110/110/110/150", price: 11200, productId: 12 }],
          },
        ],
      },
      {
        wave: "BE",
        thickness: 0.5, //cm
        colors: [
          {
            color: "1 mặt nâu, mộc",
            weights: [{ label: "150/110/110/110/110", price: 10300, productId: 8 }],
          },
          {
            color: "2 mặt nâu",
            weights: [{ label: "150/110/110/110/150", price: 10900, productId: 9 }],
          },
          {
            color: "trắng mộc",
            weights: [{ label: "150/110/110/110/110", price: 9500, productId: 10 }],
          },
          {
            color: "trắng nâu",
            weights: [{ label: "150/110/110/110/150", price: 9700, productId: 11 }],
          },
          {
            color: "2 mặt trắng",
            weights: [{ label: "150/110/110/110/150", price: 11000, productId: 12 }],
          },
        ],
      },
    ],
  },
  // {
  //   type: 4,
  //   waves: [
  //     {
  //       wave: "BC",
  //       thickness: 0.7, //cm
  //       colors: [
  //         {
  //           color: "nâu",
  //           weights: [
  //             { label: "110/110/110/150", price: 8300, productId: 13 },
  //           ],
  //         },
  //       ],
  //     },
  //     {
  //       wave: "BE",
  //       thickness: 0.5, //cm
  //       colors: [
  //         {
  //           color: "nâu",
  //           weights: [
  //             { label: "110/110/110/150", price: 8100, productId: 13 },
  //           ],
  //         },
  //       ],
  //     },
  //   ],
  // },
  {
    type: 7,
    waves: [
      {
        wave: "BCE",
        thickness: 0.9, //cm
        colors: [
          {
            color: "2 mặt nâu M6",
            weights: [
              { label: "150/110/110/110/110/110/150", price: 14900, productId: 16 },
            ],
          },
          {
            color: "2 mặt nâu",
            weights: [
              { label: "150/110/110/110/110/110/150", price: 12800, productId: 16 },
            ],
          },
        ],
      },
    ],
  },
];
// Phôi gốc PT Vina
export const groupedPaperSupplier2: PaperOption[] = [
  {
    type: 3,
    waves: [
      {
        wave: "C",
        thickness: 0.4, //cm
        colors: [
          {
            color: "1 mặt nâu, mộc",
            weights: [{ label: "150/110/110", price: 5450, productId: 1 }],
          },
          {
            color: "2 mặt nâu",
            weights: [
              { label: "150/110/150", price: 6000, productId: 2 },
              { label: "vkt 150/vkt150/150", price: 7200, productId: 6 },
            ],
          },
          {
            color: "trắng nâu",
            weights: [
              { label: "150/110/150", price: 8100, productId: 4 },
              { label: "150/150/150", price: 8650, productId: 4 }
            ],
          },
        ],
      },
      {
        wave: "B",
        thickness: 0.3, //cm
        colors: [
          {
            color: "1 mặt nâu, mộc",
            weights: [{ label: "150/110/110", price: 5300, productId: 1 }],
          },
          {
            color: "2 mặt nâu",
            weights: [
              { label: "150/110/150", price: 5850, productId: 2 },
              { label: "150/vkt150/150", price: 6900, productId: 2 },
              { label: "ĐL cao 170/150/170", price: 7750, productId: 6 },
            ],
          },
          {
            color: "trắng nâu",
            weights: [
              { label: "150/110/150", price: 7900, productId: 4 },
              { label: "150/150/150", price: 8500, productId: 4 },
            ],
          },
        ],
      },
    ],
  },
  {
    type: 5,
    waves: [
      {

        wave: "BC",
        thickness: 0.7, //cm
        colors: [
          {
            color: "1 mặt nâu, mộc",
            weights: [{ label: "150/110/110/110/110", price: 8400, productId: 10 }],
          },
          {
            color: "2 mặt nâu",
            weights: [
              { label: "150/110/110/110/150", price: 9100, productId: 11 },
              { label: "170/130/110/150/150", price: 12000, productId: 11 },
              { label: "đl cao 170/150/110/VKT170/170", price: 13500, productId: 11 },
            ],
          },
          {
            color: "trắng nâu",
            weights: [{ label: "150/110/110/110/150", price: 11000, productId: 13 }],
          },
        ],
      },
    ],
  },
];
// Phôi gốc Lâm Huy
export const groupedPaperSupplier3: PaperOption[] = [
  {
    type: 3,
    waves: [
      {
        wave: "C",
        thickness: 0.4, //cm
        colors: [
          {
            color: "mộc - mộc",
            weights: [{ label: "110/110/110", price: 5100, productId: 6 }],
          },
          {
            color: "1 mặt nâu, mộc",
            weights: [{ label: "150/110/110", price: 5500, productId: 1 }],
          },
          {
            color: "2 mặt nâu",
            weights: [{ label: "150/110/150", price: 6000, productId: 2 }],
          },
          {
            color: "trắng mộc",
            weights: [{ label: "150/110/110", price: 7000, productId: 3 }],
          },
          {
            color: "trắng nâu",
            weights: [{ label: "150/110/150", price: 7500, productId: 4 }],
          },
          {
            color: "2 mặt trắng",
            weights: [{ label: "150/110/150", price: 8700, productId: 5 }],
          },
          // {
          //   color: "VTM-Mộc",
          //   weights: [
          //     { label: "Mộc", price: 7100, productId: 7 },
          //   ],
          // },
          // {
          //   color: "VTM-Nâu",
          //   weights: [
          //     { label: "Nâu", price: 7400, productId: 8 },
          //   ],
          // },
          // {
          //   color: "VTM-VTM6",
          //   weights: [
          //     { label: "VTM6", price: 9200, productId: 9 },
          //   ],
          // },
        ],
      },
      {
        wave: "B",
        thickness: 0.3, //cm
        colors: [
          {
            color: "mộc - mộc",
            weights: [{ label: "110/110/110", price: 5000, productId: 6 }],
          },
          {
            color: "1 mặt nâu, mộc",
            weights: [{ label: "150/110/110", price: 5400, productId: 1 }],
          },
          {
            color: "2 mặt nâu",
            weights: [{ label: "150/110/150", price: 5900, productId: 2 }],
          },
          {
            color: "trắng mộc",
            weights: [{ label: "150/110/110", price: 6900, productId: 3 }],
          },
          {
            color: "trắng nâu",
            weights: [{ label: "150/110/150", price: 7400, productId: 4 }],
          },
          {
            color: "2 mặt trắng",
            weights: [{ label: "150/110/150", price: 8600, productId: 5 }],
          },
          // {
          //   color: "VTM",
          //   weights: [
          //     { label: "Mộc", price: 7000, productId: 7 },
          //     { label: "Nâu", price: 7300, productId: 8 },
          //     { label: "VTM6", price: 9100, productId: 9 },
          //   ],
          // },
        ],
      },
      // Khóa tạm thời không đặt ===============================
      // Không được xóa hẳn =====================================
      // {
      //   wave: "E",
      //   thickness: 0.2, //cm
      //   colors: [
      //     {
      //       color: "mộc - mộc",
      //       weights: [{ label: "110/110/110", price: 5000, productId: 6 }],
      //     },
      //     {
      //       color: "1 mặt nâu, mộc",
      //       weights: [{ label: "150/110/110", price: 5400, productId: 1 }],
      //     },
      //     {
      //       color: "2 mặt nâu",
      //       weights: [{ label: "150/110/150", price: 5900, productId: 2 }],
      //     },
      //     {
      //       color: "trắng mộc",
      //       weights: [{ label: "150/110/110", price: 6900, productId: 3 }],
      //     },
      //     {
      //       color: "trắng nâu",
      //       weights: [{ label: "150/110/150", price: 7400, productId: 4 }],
      //     },
      //     {
      //       color: "2 mặt trắng",
      //       weights: [{ label: "150/110/150", price: 8600, productId: 5 }],
      //     },
      //     // {
      //     //   color: "VTM",
      //     //   weights: [
      //     //     { label: "Mộc", price: 7000, productId: 7 },
      //     //     { label: "Nâu", price: 7300, productId: 8 },
      //     //     { label: "VTM6", price: 9100, productId: 9 },
      //     //   ],
      //     // },
      //   ],
      // },
    ],
  },
  {
    type: 5,
    waves: [
      {
        wave: "BC",
        thickness: 0.7, //cm
        colors: [
          {
            color: "mộc - mộc",
            weights: [{ label: "110/110/110/110/110", price: 8600, productId: 15 }],
          },
          {
            color: "1 mặt nâu, mộc",
            weights: [{ label: "150/110/110/110/110", price: 8900, productId: 10 }],
          },
          {
            color: "2 mặt nâu",
            weights: [{ label: "150/110/110/110/150", price: 9300, productId: 11 }],
          },
          {
            color: "trắng mộc",
            weights: [{ label: "150/110/110/110/110", price: 10300, productId: 12 }],
          },
          {
            color: "trắng nâu",
            weights: [{ label: "150/110/110/110/150", price: 10700, productId: 13 }],
          },
          {
            color: "2 mặt trắng",
            weights: [{ label: "150/110/110/110/150", price: 12300, productId: 14 }],
          },
          // {
          //   color: "VTM",
          //   weights: [
          //     { label: "Mộc", price: 10600, productId: 16 },
          //     { label: "Nâu", price: 10900, productId: 17 },
          //     { label: "VTM6", price: 12600, productId: 18 },
          //   ],
          // },
        ],
      },
      {
        wave: "BE",
        thickness: 0.5, //cm
        colors: [
          {
            color: "mộc - mộc",
            weights: [{ label: "110/110/110/110/110", price: 8500, productId: 15 }],
          },
          {
            color: "1 mặt nâu, mộc",
            weights: [{ label: "150/110/110/110/110", price: 8800, productId: 10 }],
          },
          {
            color: "2 mặt nâu",
            weights: [{ label: "150/110/110/110/150", price: 9200, productId: 11 }],
          },
          {
            color: "trắng mộc",
            weights: [{ label: "150/110/110/110/110", price: 10200, productId: 12 }],
          },
          {
            color: "trắng nâu",
            weights: [{ label: "150/110/110/110/150", price: 10600, productId: 13 }],
          },
          {
            color: "2 mặt trắng",
            weights: [{ label: "150/110/110/110/150", price: 12200, productId: 14 }],
          },
          // {
          //   color: "VTM",
          //   weights: [
          //     { label: "Mộc", price: 10500, productId: 16 },
          //     { label: "Nâu", price: 10800, productId: 17 },
          //     { label: "VTM6", price: 12500, productId: 18 },
          //   ],
          // },
        ],
      },
    ],
  },
];

// Phôi gốc nhà Jiang
export const groupedPaperSupplier4: PaperOption[] = [
  {
    type: 3,
    waves: [
      {
        wave: "B",
        thickness: 0.3, //cm
        colors: [
          {
            color: "2 mặt trắng",
            weights: [
              { label: "140/100/140", price: 8000, productId: 5 },
              { label: "140/120/140", price: 8300, productId: 2 },
            ],
          },
          {
            color: "2 mặt nâu",
            weights: [
              { label: "170/150/170", price: 7500, productId: 5 },
              { label: "170/120/170", price: 7000, productId: 5 },
            ],
          },
        ],
      },
      {
        wave: "E",
        thickness: 0.2, //cm
        colors: [
          {
            color: "2 mặt nâu",
            weights: [
              { label: "150/100/150", price: 6000, productId: 2 },
              { label: "150/100/120", price: 5600, productId: 2 },
              { label: "150/120/120", price: 5900, productId: 2 },
              { label: "170/100/120", price: 5900, productId: 2 },
              { label: "150/120/150", price: 6300, productId: 2 },
            ],
          },
          {
            color: "trắng nâu",
            weights: [
              { label: "140/100/120", price: 6500, productId: 4 },
              { label: "140/100/150", price: 7000, productId: 4 },
            ],
          },
          {
            color: "2 mặt trắng",
            weights: [
              { label: "140/100/140", price: 7900, productId: 5 },
              { label: "140/120/140", price: 8200, productId: 2 },
            ],
          },
        ],
      },
    ],
  },
  {
    type: 5,
    waves: [
      {
        wave: "BC",
        thickness: 0.7, //cm
        colors: [
          {
            color: "2 mặt nâu",
            weights: [
              { label: "170/130/110/150/150", price: 12000, productId: 11 },
              { label: "170/150/110/vkt170/170", price: 13500, productId: 11 },
              { label: "200/120/120/150/170", price: 11800, productId: 11 },
              { label: "200/120/120/150/200", price: 12200, productId: 11 },
              { label: "200/120/120/150/150", price: 11500, productId: 11 },
              { label: "200/120/120/120/200", price: 11600, productId: 11 },
            ],
          },
        ],
      },
    ],
  },
];

// Phôi gốc từ nhà cung cấp SG ====================================
export const groupedPaperSupplierSG: PaperOption[] = [
  {
    type: 3,
    waves: [
      {
        wave: "C",
        thickness: 0.4, //cm
        colors: [
          {
            color: "1 mặt nâu, mộc",
            weights: [{ label: "125/100/100", price: 7400, productId: 1 }],
          },
          {
            color: "2 mặt nâu",
            weights: [{ label: "125/100/125", price: 7600, productId: 2 }],
          },
          {
            color: "trắng mộc",
            weights: [{ label: "140/100/100", price: 8700, productId: 4 }],
          },
          {
            color: "trắng nâu",
            weights: [{ label: "140/100/125", price: 9100, productId: 5 }],
          },
          {
            color: "2 mặt trắng",
            weights: [{ label: "140/100/140", price: 11200, productId: 6 }],
          },
        ],
      },
      {
        wave: "B",
        thickness: 0.3, //cm
        colors: [
          {
            color: "1 mặt nâu, mộc",
            weights: [{ label: "125/100/100", price: 7100, productId: 1 }],
          },
          {
            color: "2 mặt nâu",
            weights: [{ label: "125/100/125", price: 7300, productId: 2 }],
          },
          {
            color: "trắng mộc",
            weights: [{ label: "140/100/100", price: 8600, productId: 4 }],
          },
          {
            color: "trắng nâu",
            weights: [{ label: "140/100/125", price: 8800, productId: 5 }],
          },
          {
            color: "2 mặt trắng",
            weights: [{ label: "140/100/140", price: 11400, productId: 6 }],
          },
        ],
      },
      {
        wave: "E",
        thickness: 0.2, //cm
        colors: [
          {
            color: "1 mặt nâu, mộc",
            weights: [{ label: "125/100/100", price: 7100, productId: 1 }],
          },
          {
            color: "2 mặt nâu",
            weights: [{ label: "125/100/125", price: 7600, productId: 2 }],
          },
          {
            color: "trắng mộc",
            weights: [{ label: "140/100/100", price: 8900, productId: 4 }],
          },
          {
            color: "trắng nâu",
            weights: [{ label: "140/100/125", price: 9100, productId: 5 }],
          },
          {
            color: "2 mặt trắng",
            weights: [{ label: "140/100/140", price: 11700, productId: 6 }],
          },
        ],
      },
    ],
  },
  {
    type: 5,
    waves: [
      {
        wave: "BC",
        thickness: 0.7, //cm
        colors: [
          {
            color: "1 mặt nâu, mộc",
            weights: [{ label: "125/100/100/100/100", price: 10550, productId: 8 }],
          },
          {
            color: "2 mặt nâu",
            weights: [{ label: "125/100/100/100/125", price: 11400, productId: 9 }],
          },
          {
            color: "trắng mộc",
            weights: [{ label: "140/100/100/100/100", price: 12200, productId: 10 }],
          },
          {
            color: "trắng nâu",
            weights: [{ label: "140/100/100/100/125", price: 12500, productId: 11 }],
          },
          {
            color: "2 mặt trắng",
            weights: [{ label: "140/100/100/100/140", price: 14000, productId: 12 }],
          },
        ],
      },
      {
        wave: "BE",
        thickness: 0.5, //cm
        colors: [
          {
            color: "2 mặt nâu",
            weights: [{ label: "125/100/100/100/125", price: 14900, productId: 9 }],
          },
        ],
      },
    ],
  },
];
