import { Tooltip } from "antd";
import React, { useState } from "react";
import DongDauABC from "@public/images/dau-abc.png";
import Image from "next/image";
import { formatVND } from "@/app/utils/converts";
import { ButtonBase } from "../base/button";
import { QRBase } from "../base/qr";
import { getDomain } from "@/app/utils/getDomain";
import { WithPermission } from "@/app/service/permissions/permission-gate";
import { cookieBase } from "@/app/utils/cookie";
import { User } from "@/app/data/dataUser";
import { useRouter } from "next/navigation";
import { DataPrice } from "@/app/data/interface/dataPrice";
import dayjs from "dayjs";
// import { ModalBase } from "../base/modal";
// import ResultPrintPrice from "@/app/(component)/prices/result-prints";

type Product = {
  id: number;
  name: string;
  unit: string;
  quantityPrices: Record<string, number>; // ví dụ: { '200': 95730, '500': 66485, '1000': 55120 }
  note?: string;
};

type Props = {
  products: Product[];
  idPrice?: string;
  dataPrice?: DataPrice;
  dataUser?: User[];
};
type ColKey = "stt" | "name" | "unit" | "quantity" | "note" | "mold" | "print";

const Resizer = ({ onMouseDown }: { onMouseDown: React.MouseEventHandler<HTMLDivElement> }) => (
  <div
    onMouseDown={onMouseDown}
    className="absolute right-0 top-0 h-full w-1 bg-transparent cursor-col-resize"
    title="Kéo để điều chỉnh cột"
  />
);

export default function QuotationPrint({
  products,
  idPrice,
  dataPrice,
  dataUser,
}: Props) {
  const user_info = cookieBase.get<User>("info_user");
  const router = useRouter();
  const allQuantities = Array.from(
    new Set(products.flatMap((p) => Object.keys(p.quantityPrices || {})))
  )
    .map(Number)
    .sort((a, b) => a - b);

  // const [colWidths, setColWidths] = useState(initialWidths);
  const [colWidths, setColWidths] = useState<Record<ColKey, number>>({
    stt: 35,
    name: 330,
    unit: 50,
    quantity: 130,
    note: 80,
    mold: 50,
    print: 50,
  });

  const handleMouseDown = (colKey: ColKey, e: React.MouseEvent) => {
    const startX = e.clientX;
    const startWidth = colWidths[colKey];

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(40, startWidth + e.clientX - startX);
      setColWidths((prev) => ({ ...prev, [colKey]: newWidth }));
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };



  const noteMold = dataPrice?.cocKhuons ? (dataPrice.cocKhuons.length > 0 ? dataPrice.cocKhuons
    .map((item) => `Khuôn ${item.id}: ${formatVND(item.price)}`)
    .join("\n ") : "") : "";

  return (
    <div
      className="py-4 px-3 text-sm font-sans relative"
      style={{ color: "#000000", backgroundColor: "#fff" }}
    >
      <WithPermission
        roleId={Number(user_info?.role)}
        permission="view_detail_price">
        {idPrice && (
          <ButtonBase
            className="bg-blue-500 text-white hover:bg-blue-700 flex! justify-end"
            onClick={() => router.push(`/prices/${dataPrice?.idQuote}`)}
          >
            Xem bài tính
          </ButtonBase>
        )}
      </WithPermission>
      {/* {dataPrice?.idPrint === "1" && dataPrice?.resultPrice && dataPrice?.resultPrice.length > 0 &&(
        <ModalBase
          className="!w-[80%] !min-w-[1000px] !h-full"
          btnClassName="bg-red-500 text-white uppercase"
          contentBtn="Kết quả theo công nghệ IN"
          title="BÁO GIÁ KHÁCH"
          footer={null}
        >
          <ResultPrintPrice
            dataPrice={dataPrice}
            // setdataPrice={setdataPrice}
          />
        </ModalBase>
      )} */}
      <div className="flex justify-between items-center mb-2">
        <div />
        {/* Header */}
        <div className="text-center">
          <p className="font-bold uppercase text-lg" style={{ color: "red" }}>
            CÔNG TY TNHH CHẤM CÔNG
          </p>
          <p className="font-bold text-md">
            Văn phòng: Ecogreen, 268 Nguyễn Xiển, Tân Triều, Thanh Trì , Hà Nội
          </p>
          <p className="font-bold text-md">
            Văn phòng HCM: Số 59/1C Ấp Nam Lân, Bà Điểm, Hóc Môn, TP. Hồ Chí Minh.
          </p>
          <p className="font-bold text-md">Hotline: 0946.333.891</p>
          <p className="font-bold text-md">MST: 0123456789</p>
        </div>
        <div className="flex flex-col justify-center items-center">
          <QRBase
            value={`${getDomain()}/quote/${dataPrice?.idQuote}`}
            size={100}
            isPrint
          />
          <div className="text-center font-semibold p-1">Mã báo giá: {dataPrice?.idQuote}</div>
        </div>
      </div>
      <div className="text-center">
        <p
          className="font-bold text-lg mt-2 border-y py-2"
          style={{ backgroundColor: "#93c47d", borderColor: "#000000" }}
        >
          BẢNG BÁO GIÁ
        </p>
      </div>

      {/* Info */}
      <div className="mt-4 space-y-1 px-1">
        <div className="flex justify-between">
          <div>
            <p className="font-bold text-md">Ngày: {dayjs(dataPrice?.createdAt).format("DD/MM/YYYY HH:mm:ss")}</p>
            <p className="font-bold text-md">
              Kính gửi: <span className="font-bold">Quý Khách Hàng</span>
            </p>
          </div>
          <div className="text-right font-bold text-md flex justify-end items-end">
            NVBG:<span className="font-bold ml-1">{dataUser ? (dataUser.find(u => Number(u.id) === Number(dataPrice?.createdBy))?.name ?? '') : ""}</span>
          </div>
        </div>
        <p className="italic text-justify font-medium">
          Công Ty Cổ Phần Công ty Chấm công trân trọng cảm ơn sự tín nhiệm và hợp tác
          của quý khách hàng sau khi nghiên cứu chất liệu và quy cách sản phẩm
          cần in ấn, chúng tôi xin trân trọng cảm ơn và gửi đến quý khách bảng
          báo giá chi tiết.
        </p>
      </div>

      {/* Table header */}
      <Tooltip title="Kéo để điều chỉnh cột">
        <table
          className="w-full border text-[17px] relative font-bold"
          style={{ borderColor: "#2A2A2A", tableLayout: "auto" }}
        >
          <thead
            className="font-bold text-center"
            style={{ backgroundColor: "#93c47d" }}
          >
            <tr>
              <th
                style={{ width: colWidths.stt, borderColor: "#2A2A2A" }}
                className="relative border p-2 text-center"
                rowSpan={2}
              >
                STT
                <Resizer onMouseDown={(e) => handleMouseDown("stt", e)} />
              </th>
              <th
                style={{ width: colWidths.name, borderColor: "#2A2A2A" }}
                className="relative border p-2 text-center"
                rowSpan={2}
              >
                Quy cách
                <Resizer onMouseDown={(e) => handleMouseDown("name", e)} />
              </th>
              <th
                style={{ width: colWidths.unit, borderColor: "#2A2A2A" }}
                className="relative border p-2 text-center"
                rowSpan={2}
              >
                ĐVT
                <Resizer onMouseDown={(e) => handleMouseDown("unit", e)} />
              </th>
              <th
                style={{ borderColor: "#2A2A2A" }}
                className="border p-2 text-center"
                colSpan={allQuantities.length}
              >
                Số lượng
              </th>
              {(dataPrice?.idBoBe === "2" && dataPrice?.idKhuon === "2" && dataPrice?.cocKhuons && dataPrice?.cocKhuons?.length > 0) && (
                <th
                  style={{ width: colWidths.mold, borderColor: "#2A2A2A" }}
                  className="relative border p-2 text-center"
                  rowSpan={2}
                >
                  Khuôn bế
                  <Resizer onMouseDown={(e) => handleMouseDown("mold", e)} />
                </th>
              )}
              {(dataPrice?.priceFlexoDesign !== 0 && !dataPrice?.isPlusPricePrint) && (
                <th
                  style={{ width: colWidths.print, borderColor: "#2A2A2A" }}
                  className="relative border p-2 text-center"
                  rowSpan={2}
                >
                  Bản in
                  <Resizer onMouseDown={(e) => handleMouseDown("print", e)} />
                </th>
              )}
              <th
                style={{ width: colWidths.note, borderColor: "#2A2A2A" }}
                className="relative border p-2 text-center"
                rowSpan={2}
              >
                Ghi chú
                <Resizer onMouseDown={(e) => handleMouseDown("note", e)} />
              </th>
            </tr>
            <tr>
              {allQuantities.map((q: number | string, i: number) => (
                <th
                  key={i}
                  style={{ width: colWidths.quantity, borderColor: "#2A2A2A" }}
                  className="relative border p-2 text-center"
                >
                  {q}
                  {i === allQuantities.length - 1 && (
                    <Resizer onMouseDown={(e) => handleMouseDown("quantity", e)} />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((product: Product, index: number) => (
              <tr key={index} className="text-center wrap-break-word">
                <td className="border p-2" style={{ borderColor: "#2A2A2A" }}>
                  {index + 1}
                </td>
                <td
                  className="border text-left p-2"
                  style={{ borderColor: "#2A2A2A" }}
                >
                  {product.name}<span className="text-md text-gray-600">{`${dataPrice?.availablePaper ? ' (phôi sẵn khổ tiêu chuẩn)' : ''}`}</span>
                </td>
                <td className="border p-2" style={{ borderColor: "#2A2A2A" }}>
                  {product.unit}
                </td>
                {allQuantities.map((q: string | number, i: number) => (
                  <td
                    key={i}
                    className="border p-2"
                    style={{ borderColor: "#2A2A2A" }}
                  >
                    {product.quantityPrices[q]
                      ? <>{formatVND(Number(product.quantityPrices[q]))}<span className="text-gray-500 text-sm">/1 {product?.unit}</span></>
                      : ""}
                  </td>
                ))}
                {(dataPrice?.idBoBe === "2" && dataPrice?.idKhuon === "2" && dataPrice?.cocKhuons && dataPrice?.cocKhuons?.length > 0) && (
                  <td className="border p-2" style={{ borderColor: "#2A2A2A" }}>
                    {noteMold}
                  </td>
                )}
                {(dataPrice?.priceFlexoDesign !== 0 && !dataPrice?.isPlusPricePrint) && (
                  <td className="border p-2" style={{ borderColor: "#2A2A2A" }}>
                    {formatVND(Number(dataPrice?.priceFlexoDesign))}
                  </td>
                )}
                <td className="border p-2" style={{ borderColor: "#2A2A2A" }}>
                  {product.note ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Tooltip>

      {/* Notes */}
      <div className="mt-4 text-md px-1">
        <p className="font-bold" style={{ color: "red" }}>
          Ghi chú:
        </p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>
            - Kích thước trên là kích thước phủ bì, hàng sản xuất có thể tăng
            hoặc giảm 10% so với số lượng đặt
          </li>
          <li>- Giá trên chưa bao gồm phí vận chuyển</li>
          <li>- Giá trên chưa bao gồm VAT 8%</li>
          {dataPrice?.location === "1" && (
            <li>
              - Đơn hàng sản xuất Hà Nội hộp sóng (B, C, BC) không in từ 6-8 ngày, in lụa từ 8-9
              ngày, offset 10-12 ngày, đơn sóng E nâu mộc, trắng nâu 10-15 ngày, tất cả các loại sóng (B, C, E) 2 trắng trung bình 15-20 ngày(hỏi lại khi chốt),
              đơn cán màng nước + thêm 2 ngày so với các đơn khác, đơn tấm bìa giảm 2 ngày so với các đơn khác, đơn hộp cứng sẽ báo khi chốt. Thời gian tính từ ngày
              duyệt maket. Trường hợp bão lũ có thể phát sinh thêm 1–2 ngày.
            </li>
          )}
          {dataPrice?.location === "2" && (
            <li>
              - Đơn hàng sản xuất HCM hộp thường từ 10-12 ngày, offset 10-15 ngày, hộp cứng sẽ báo khi chốt. Thời gian tính từ ngày
              duyệt maket. Khu vực HCM có thể phát sinh thêm 2–3 ngày.
            </li>
          )}
        </ul>

        <div
          className="mt-2 border-t text-md "
          style={{ color: "gray", borderColor: "#dedede" }}
        >
          <p className="mt-2 italic">
            Công ty cổ phần Công ty Chấm công chuyên sản xuất thùng carton, băng keo,
            màng PE, xốp nổ, xốp foam theo yêu cầu với giá cạnh tranh.
          </p>
          <p className="italic">
            Chúng tôi có xưởng sản xuất trực tiếp chắc chắn sẽ là người bạn đồng
            hành số 1 của bạn.
          </p>
          <p className="italic">Rất mong có cơ hội được phục vụ quý khách!</p>
        </div>
      </div>
      <div
        className="absolute bottom-[15%] right-[10%] z-999"
        style={{
          position: "absolute",
          bottom: "15%",
          right: "7%",
          zIndex: 999,
        }}
      >
        <img
          className="no-select-img"
          src={DongDauABC.src}
          alt="stamp"
          width={180}
          height={180}
          onContextMenu={(e) => e.preventDefault()}
        ></img>
      </div>
    </div>
  );
}
