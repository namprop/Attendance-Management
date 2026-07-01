"use client";

import React, { useRef } from "react";
import { ButtonBase } from "./button";

type FormPrintProps = {
  children: React.ReactNode;
  btnContent?: React.ReactNode;
  btnClassName?: string;
  disabled?: boolean
};

export function FormPrint({ children, btnContent, btnClassName, disabled }: FormPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = document.createElement("iframe");
    printWindow.style.position = "fixed";
    printWindow.style.right = "0";
    printWindow.style.bottom = "0";
    printWindow.style.width = "0";
    printWindow.style.height = "0";
    printWindow.style.border = "0";
    document.body.appendChild(printWindow);

    const doc = printWindow.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Hupuna - Giải pháp đóng gói hàng thông minh</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/antd@5.25.1/dist/antd.min.css" />
          <style>
            body {
              padding: 10px;
            }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    printWindow.onload = () => {
      printWindow.contentWindow?.focus();
      printWindow.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(printWindow);
      }, 1000);
    };
  };

  return (
    <div>
      <ButtonBase
        onClick={handlePrint}
        className={`bg-gray-500 text-white hover:bg-gray-600 ${btnClassName}`}
        disabled={disabled}
      >
        {btnContent}
      </ButtonBase>
      <div ref={printRef} className="bg-white hidden text-black p-6 max-w-md">
        {children}
      </div>
    </div>
  );
}
