import { Tooltip } from "antd";
import React, { useState, useMemo } from "react";
import DongDauHupuna from "@public/images/dau-hupuna.png";
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

// Hằng số VAT (8%)
const VAT_RATE = 0.08;

type Product = {
    id: number;
    name: string;
    unit: string;
    quantityPrices: Record<string, number>; // ví dụ: { '200': 95730, '500': 66485, '1000': 55120 }
    note?: string;
};

// Định nghĩa Interface cho dữ liệu đã xử lý
interface PriceDetails {
    basePrice: number;
    vat: number;
    totalPrice: number;
}

interface ProcessedDataItem {
    productId: number;
    productName: string;
    productUnit: string;
    productNote: string;
    quantity: number;
    // Chỉ còn một loại giá (GIÁ CHÍNH)
    mainPrice: PriceDetails;
}

type Props = {
    products: Product[];
    idPrice?: string;
    dataPrice?: DataPrice;
    dataUser?: User[];
};
// Cập nhật ColKey để phù hợp với cấu trúc bảng mới (Loại bỏ typePrint)
type ColKey =
    | "stt"
    | "name"
    | "unit"
    | "quantity"
    | "note"
    | "mold"
    | "print"
    | "price"
    | "vat"
    | "price_vat";

const Resizer = ({ onMouseDown }: { onMouseDown: React.MouseEventHandler<HTMLDivElement> }) => (
    <div
        onMouseDown={onMouseDown}
        className="absolute right-0 top-0 h-full w-1 bg-transparent cursor-col-resize"
        title="Kéo để điều chỉnh cột"
    />
);

export default function QuotationPrintVAT({
    products,
    idPrice,
    dataPrice,
    dataUser,
}: Props) {
    const user_info = cookieBase.get<User>("info_user");
    const router = useRouter();

    // Xử lý dữ liệu để chỉ còn một cột giá chính
    const processedData: ProcessedDataItem[] = useMemo(() => {
        const results: ProcessedDataItem[] = [];

        products.forEach((product) => {
            const quantities = Object.keys(product.quantityPrices).map(Number);
            quantities.sort((a, b) => a - b);

            quantities.forEach((q) => {
                const basePrice = product.quantityPrices[String(q)] || 0;

                const getPriceDetails = (price: number): PriceDetails => ({
                    basePrice: price,
                    vat: price > 0 ? Math.round(price * VAT_RATE) : 0, // Làm tròn VAT
                    totalPrice: price > 0 ? price + Math.round(price * VAT_RATE) : 0,
                });

                const mainPriceDetails = getPriceDetails(basePrice);

                // Chỉ thêm vào nếu có giá
                if (basePrice > 0) {
                    results.push({
                        productId: product.id,
                        productName: product.name,
                        productUnit: product.unit,
                        productNote: product.note || "",
                        quantity: q,
                        mainPrice: mainPriceDetails,
                    });
                }
            });
        });
        return results;
    }, [products]);

    // State chiều rộng cột (loại bỏ cột dư)
    const [colWidths, setColWidths] = useState<Record<ColKey, number>>({
        stt: 35,
        name: 350, // Tăng chiều rộng cột tên sản phẩm
        unit: 60,
        quantity: 120,
        note: 100,
        mold: 70,
        print: 70,
        price: 130,
        vat: 110,
        price_vat: 130,
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

    const noteMold = dataPrice?.cocKhuons
        ? dataPrice.cocKhuons.length > 0
            ? dataPrice.cocKhuons
                .map((item) => `Khuôn ${item.id}: ${formatVND(item.price)}`)
                .join("\n ")
            : ""
        : "";

    const RenderPriceCell = ({
        price,
        isShowUnit = true,
    }: {
        price: number;
        isShowUnit?: boolean;
    }) => {
        // Không cần logic In lụa/Flexo nữa, chỉ hiển thị giá trị
        return (
            <td
                className="border p-2 text-center font-bold"
                style={{ borderColor: "#2A2A2A" }}
            >
                {price > 0 ? <>{formatVND(Number(price))} {isShowUnit ? <span className="text-gray-500 text-sm">/1 {dataPrice?.unit}</span> : ""}</> : ""}
            </td>
        );
    };

    // Logic để xác định STT và các ô rowspan
    const productGroups = useMemo(() => {
        const groups = new Map<number, ProcessedDataItem[]>();
        processedData.forEach(item => {
            if (!groups.has(item.productId)) {
                groups.set(item.productId, []);
            }
            groups.get(item.productId)!.push(item);
        });
        return Array.from(groups.values());
    }, [processedData]);

    // Đếm tổng số lượng hàng để tính rowspan cho các cột cuối
    const totalRowsInBody = processedData.length;


    return (
        <div
            className="py-4 px-3 text-sm font-sans relative"
            style={{ color: "#000000", backgroundColor: "#fff" }}
        >
            <WithPermission
                roleId={Number(user_info?.role)}
                permission="view_detail_price"
            >
                {idPrice && (
                    <ButtonBase
                        className="bg-blue-500 text-white hover:bg-blue-700 flex! justify-end"
                        onClick={() => router.push(`/prices/${dataPrice?.idQuote}`)}
                    >
                        Xem bài tính
                    </ButtonBase>
                )}
            </WithPermission>

            <div className="flex justify-between items-center mb-2">
                <div />
                {/* Header */}
                <div className="text-center">
                    <p className="font-bold uppercase text-lg" style={{ color: "red" }}>
                        CÔNG TY CỔ PHẦN HUPUNA GROUP
                    </p>
                    <p className="font-bold text-md">
                        Văn phòng: Ecogreen, 268 Nguyễn Xiển, Tân Triều, Thanh Trì , Hà Nội
                    </p>
                    <p className="font-bold text-md">
                        Văn phòng HCM: Số 59/1C Ấp Nam Lân, Bà Điểm, Hóc Môn, TP. Hồ Chí Minh.
                    </p>
                    <p className="font-bold text-md">Hotline: 0946.333.891</p>
                    <p className="font-bold text-md">MST: 0109746861</p>
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
                    Công Ty Cổ Phần Hupuna Group trân trọng cảm ơn sự tín nhiệm và hợp tác
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
                            {/* 4 Cột cố định (rowSpan=2) */}
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
                                style={{ width: colWidths.quantity, borderColor: "#2A2A2A" }}
                                className="relative border p-2 text-center"
                                rowSpan={2}
                            >
                                Số lượng
                                <Resizer onMouseDown={(e) => handleMouseDown("quantity", e)} />
                            </th>

                            {/* Cột GIÁ CHÍNH (THAY THẾ LỤA/FLEXO) - colSpan 3 */}
                            <th
                                className="border p-2 text-center"
                                style={{ borderColor: "#2A2A2A" }}
                                colSpan={3}
                            >
                                ĐƠN GIÁ
                            </th>

                            {/* Cột Khuôn, Bản in, Ghi chú (rowSpan=2) */}
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

                        {/* Hàng 2: Tiêu đề con cho ĐƠN GIÁ */}
                        <tr>
                            {/* ĐƠN GIÁ (3 cột con) */}
                            <th
                                style={{ width: colWidths.price, borderColor: "#2A2A2A" }}
                                className="relative border p-2 text-center"
                            >
                                Giá <br /><span className="text-xs text-red-600">(Chưa VAT)</span>
                                <Resizer onMouseDown={(e) => handleMouseDown("price", e)} />
                            </th>
                            <th
                                style={{ width: colWidths.vat, borderColor: "#2A2A2A" }}
                                className="relative border p-2 text-center"
                            >
                                VAT <br /><span className="text-xs text-red-600">(8%)</span>
                                <Resizer onMouseDown={(e) => handleMouseDown("vat", e)} />
                            </th>
                            <th
                                style={{ width: colWidths.price_vat, borderColor: "#2A2A2A" }}
                                className="relative border p-2 text-center"
                            >
                                Tổng giá <br /><span className="text-xs text-red-600">(bao gồm VAT)</span>
                                <Resizer onMouseDown={(e) => handleMouseDown("price_vat", e)} />
                            </th>

                            {/* Các cột Khuôn/Bản in/Ghi chú đã được bù rowSpan=2 ở hàng trên */}
                        </tr>
                    </thead>

                    <tbody>
                        {/* Lặp qua các nhóm sản phẩm (Mỗi nhóm là một sản phẩm, dùng cho rowspan) */}
                        {productGroups.map((group, groupIndex) => (
                            // Lặp qua các dòng trong nhóm (Mỗi dòng là một mức số lượng của sản phẩm)
                            group.map((item, itemIndex) => {
                                const totalRowsInGroup = group.length;
                                let sttCell = null;
                                let nameCell = null;
                                let unitCell = null;
                                let moldCell = null;
                                let noteCell = null;
                                let printCell = null;

                                // Chỉ render các ô rowspan cho dòng đầu tiên của mỗi nhóm (sản phẩm)
                                if (itemIndex === 0) {
                                    sttCell = (
                                        <td
                                            className="border p-2 text-center"
                                            style={{ borderColor: "#2A2A2A" }}
                                            rowSpan={totalRowsInGroup}
                                        >
                                            {groupIndex + 1}
                                        </td>
                                    );
                                    nameCell = (
                                        <td
                                            className="border text-left p-2"
                                            style={{ borderColor: "#2A2A2A" }}
                                            rowSpan={totalRowsInGroup}
                                        >
                                            {item.productName}<span className="text-md text-gray-600">{`${dataPrice?.availablePaper ? ' (phôi sẵn khổ tiêu chuẩn)' : ''}`}</span>
                                        </td>
                                    );
                                    unitCell = (
                                        <td
                                            className="border p-2 text-center"
                                            style={{ borderColor: "#2A2A2A" }}
                                            rowSpan={totalRowsInGroup}
                                        >
                                            {item.productUnit}
                                        </td>
                                    );

                                    // Cột Khuôn, Bản in, Ghi chú (Chỉ hiển thị 1 lần cho toàn bộ bảng)
                                    if (groupIndex === 0) {
                                        if (dataPrice?.idBoBe === "2" && dataPrice?.idKhuon === "2" && dataPrice?.cocKhuons && dataPrice?.cocKhuons?.length > 0) {
                                            moldCell = (
                                                <td className="border p-2" style={{ borderColor: "#2A2A2A" }} rowSpan={totalRowsInBody}>
                                                    {noteMold}
                                                </td>
                                            );
                                        }
                                        if (dataPrice?.priceFlexoDesign !== 0 && !dataPrice?.isPlusPricePrint) {
                                            printCell = (
                                                <td className="border p-2" style={{ borderColor: "#2A2A2A" }} rowSpan={totalRowsInBody}>
                                                    {formatVND(Number(dataPrice?.priceFlexoDesign))}
                                                </td>
                                            );
                                        }
                                        noteCell = (
                                            <td className="border p-2" style={{ borderColor: "#2A2A2A" }} rowSpan={totalRowsInBody}>
                                                {item.productNote ?? ""}
                                            </td>
                                        );
                                    }
                                }

                                return (
                                    <tr key={`${item.productId}-${item.quantity}`} className="text-center wrap-break-word">
                                        {/* Cột STT, Quy cách, ĐVT (Chỉ hiển thị 1 lần cho mỗi sản phẩm) */}
                                        {sttCell}
                                        {nameCell}
                                        {unitCell}

                                        {/* Cột Số lượng (Mỗi hàng 1 giá trị) */}
                                        <td className="border p-2 text-center" style={{ borderColor: "#2A2A2A" }}>
                                            {item.quantity}
                                        </td>

                                        {/* Cột GIÁ CHÍNH */}
                                        <RenderPriceCell price={item.mainPrice.basePrice} />
                                        <RenderPriceCell price={item.mainPrice.vat} isShowUnit={false} />
                                        <RenderPriceCell price={item.mainPrice.totalPrice} />

                                        {/* Cột Bản in, Khuôn bế, Ghi chú (Chỉ hiển thị 1 lần cho toàn bộ bảng) */}
                                        {moldCell}
                                        {printCell}
                                        {noteCell}
                                    </tr>
                                );
                            })
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
                    <li>- Giá trong cột **Tổng giá** đã bao gồm **VAT 8%**</li>
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
                        Công ty cổ phần Hupuna Group chuyên sản xuất thùng carton, băng keo,
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
                    src={DongDauHupuna.src}
                    alt="stamp"
                    width={180}
                    height={180}
                    onContextMenu={(e) => e.preventDefault()}
                ></img>
            </div>
        </div>
    );
}
