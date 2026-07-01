"use client";
import React, { useRef, useState } from "react";
import { QRCode, Modal, Tooltip } from "antd";

type QRProps = {
  value: string;
  isPrint?: boolean;
  size?: number;
};

export const QRBase = ({ value = "-", isPrint = false, size = 100 }: QRProps) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    if (!isPrint) {
      setIsModalOpen(true);
    }
  };

  // Chế độ in: dùng type="svg" để QR render thành SVG element
  // SVG serialize được qua innerHTML (canvas thì không), nên khi copy vào iframe in sẽ hiển thị đúng
  if (isPrint) {
    return (
      <div>
        <QRCode value={value} size={size} type="svg" />
      </div>
    );
  }

  return (
    <>
      <div ref={qrRef} onClick={handleClick} className="cursor-pointer w-fit">
        <Tooltip title="Mã QR">
          <QRCode value={value} size={size} />
        </Tooltip>
      </div>

      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        centered
      >
        <div className="flex justify-center items-center">
          <QRCode value={value} size={256} type="svg" />
        </div>
      </Modal>
    </>
  );
};
