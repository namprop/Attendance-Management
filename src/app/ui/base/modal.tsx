// // ModalBase.tsx

// import React, { useEffect, useRef, useState } from "react";
// import { ConfigProvider, Modal } from "antd";
// import { ButtonBase } from "./button";
// import html2canvas from "html2canvas";
// // import type { LegacyButtonType } from "antd/es/button/button";
// import { useToast } from "./toast";

// type ModalProps = {
//   isOpen?: boolean;
//   isLoading?: boolean;
//   className?: string;
//   children?: React.ReactNode;
//   contentBtn?: React.ReactNode;
//   title?: string;
//   btnClassName?: string;
//   cancelText?: React.ReactNode;
//   okText?: React.ReactNode;
//   okType?: "default" | "primary" | "dashed" | "link" | "text" | "danger";
//   footer?: React.ReactNode;
//   onOk?: () => void;
//   isSaveImage?: boolean;
//   afterOpenChange?: ((isOpen?: boolean) => void) | undefined;
//   disabled?: boolean;
// };

// export const ModalBase = ({
//   isOpen = false,
//   isLoading = false,
//   children,
//   footer,
//   className,
//   contentBtn = "mặc định",
//   btnClassName,
//   cancelText = "Bỏ qua",
//   okText = "Đồng ý",
//   title = "Title",
//   okType = "primary",
//   onOk,
//   afterOpenChange,
//   isSaveImage = false,
//   disabled = false,
//   ...rest
// }: ModalProps) => {
//   const [open, setOpen] = useState(false);
//   const [confirmLoading, setConfirmLoading] = useState(isLoading);
//   const printRef = useRef<HTMLDivElement>(null);
//   const toast = useToast();

//   const showModal = () => {
//     setOpen(true);
//   };

//   const handleOk = () => {
//     setConfirmLoading(true);
//     if (onOk) {
//       onOk();
//       setTimeout(() => {
//         setConfirmLoading(false);
//         setOpen(isOpen);
//       }, 1000);
//     }
//   };

//   const handleCancel = () => {
//     setOpen(false);
//   };

//   const handleSaveAsImage = async () => {
//     try {
//       if (!printRef.current) return;
//       const canvas = await html2canvas(printRef.current, {
//         scale: 2, // độ phân giải cao hơn
//         useCORS: true, // nếu có ảnh từ domain khác
//       });
//       const imgData = canvas.toDataURL("image/png");

//       // Tải ảnh
//       const link = document.createElement("a");
//       link.href = imgData;
//       link.download = "báo-giá.png";
//       link.click();
//     } catch (error) {
//       toast({ type: "error", message: String(error) ? "Lỗi khi tải ảnh" : "" });
//     }
//   };

//   useEffect(() => {
//     setOpen(isOpen);
//   }, [isOpen]);

//   return (
//     <ConfigProvider
//       theme={{
//         components: {
//           Modal: {
//             // headerBg: "#000000",
//           },
//         },
//       }}
//     >
//       {contentBtn && (
//         <ButtonBase
//           onClick={showModal}
//           className={`${btnClassName}`}
//           disabled={disabled}
//         >
//           {contentBtn}
//         </ButtonBase>
//       )}
//       <Modal
//         className={`${className}`}
//         title={title}
//         open={open}
//         onOk={handleOk}
//         confirmLoading={confirmLoading}
//         onCancel={handleCancel}
//         cancelText={cancelText}
//         okText={okText}
//         okType={okType}
//         footer={footer}
//         afterOpenChange={afterOpenChange}
//         {...rest}
//       >
//         <div ref={printRef}>{children}</div>
//         {isSaveImage && (
//           <div className="mt-4 text-center">
//             <button
//               onClick={handleSaveAsImage}
//               className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
//             >
//               Lưu thành ảnh
//             </button>
//           </div>
//         )}
//       </Modal>
//     </ConfigProvider>
//   );
// };


// ModalBase.tsx
import React, { useRef, useState } from "react";
import { ConfigProvider, Modal } from "antd";
import { ButtonBase } from "./button";
import html2canvas from "html2canvas";
import { useToast } from "./toast";

type ModalProps = {
  isOpen?: boolean;
  isLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
  contentBtn?: React.ReactNode | null;
  title?: string | React.ReactNode;
  btnClassName?: string;
  cancelText?: React.ReactNode;
  okText?: React.ReactNode;
  okType?: "default" | "primary" | "dashed" | "link" | "text" | "danger";
  footer?: React.ReactNode;
  onOk?: () => void;
  onCancel?: () => void;
  isSaveImage?: boolean;
  afterOpenChange?: ((isOpen?: boolean) => void) | undefined;
  disabled?: boolean;
  width?: number | string;
  zIndex?: number;
};

export const ModalBase = ({
  isOpen = false,
  isLoading = false,
  children,
  footer,
  className,
  contentBtn = "mặc định",
  btnClassName,
  cancelText = "Bỏ qua",
  okText = "Đồng ý",
  title = "Title",
  okType = "primary",
  onOk,
  onCancel,
  afterOpenChange,
  isSaveImage = false,
  disabled = false,
  ...rest
}: ModalProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const hasInternalTrigger = contentBtn !== null;
  const open = hasInternalTrigger ? internalOpen : isOpen;

  const showModal = () => {
    setInternalOpen(true);
  };

  const handleOk = () => {
    if (onOk) {
      onOk();
    }
  };

  const handleCancel = () => {
    setInternalOpen(false);
    if (onCancel) onCancel();
  };

  const handleSaveAsImage = async () => {
    try {
      if (!printRef.current) return;
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = imgData;
      link.download = "bao-gia.png";
      link.click();
    } catch {
      toast({ type: "error", message: "Lỗi khi tải ảnh" });
    }
  };

  return (
    <ConfigProvider theme={{ components: { Modal: {} } }}>
      {contentBtn ? (
        <ButtonBase
          onClick={showModal}
          className={`${btnClassName}`}
          disabled={disabled}
        >
          {contentBtn}
        </ButtonBase>
      ) : null}
      <Modal
        className={`${className}`}
        title={title}
        open={open}
        onOk={handleOk}
        confirmLoading={isLoading}
        onCancel={handleCancel}
        cancelText={cancelText}
        okText={okText}
        okType={okType}
        footer={footer}
        afterOpenChange={afterOpenChange}
        {...rest}
      >
        <div ref={printRef}>{children}</div>
        {isSaveImage && (
          <div className="mt-4 text-center">
            <button
              onClick={handleSaveAsImage}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Lưu thành ảnh
            </button>
          </div>
        )}
      </Modal>
    </ConfigProvider>
  );
};
