import React from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface FormDownloadPdfProps {
    btnContent: React.ReactNode;
    btnClassName?: string;
    children: React.ReactNode;
    filename?: string;
}

const FormDownloadPdf: React.FC<FormDownloadPdfProps> = ({
    btnContent,
    btnClassName,
    children,
    filename = "document.pdf",
}) => {
    const handleDownload = async () => {
        const element = document.getElementById("pdf-content");
        if (!element) return;

        // ✨ Clone node để ép background về màu HEX
        const clone = element.cloneNode(true) as HTMLElement;

        // Ép tất cả style background về HEX hoặc #fff
        clone.querySelectorAll<HTMLElement>("*").forEach((el) => {
            const style = window.getComputedStyle(el);
            if (style.backgroundColor.includes("oklch")) {
                el.style.backgroundColor = "#ffffff"; // ép thành trắng
            }
            if (style.color.includes("oklch")) {
                el.style.color = "#000000"; // ép thành đen
            }
        });

        // Thay thế node cũ tạm thời
        document.body.appendChild(clone);

        const canvas = await html2canvas(clone, {
            backgroundColor: "#ffffff", // tránh lỗi parse oklch
            useCORS: true,
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "px",
            format: "a4",
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = (canvas.height * pageWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
        pdf.save(filename);

        document.body.removeChild(clone);
    };

    return (
        <div>
            <button onClick={handleDownload} className={btnClassName}>
                {btnContent}
            </button>
            <div id="pdf-content"
                className="bg-white text-black"
                style={{
                    position: "absolute",
                    left: "-9999px",
                    top: 0
                }}>
                {children}
            </div>
        </div>
    );
};

export default FormDownloadPdf;
