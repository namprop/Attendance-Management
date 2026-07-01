import React from "react";
import type { PopconfirmProps } from "antd";
import { Popconfirm } from "antd";

type PopconfirmBaseProps = {
  children?: React.ReactNode;
  title?: string;
  description?: string;
  okText?: React.ReactNode;
  cancelText?: React.ReactNode;
  onConfirm?: PopconfirmProps["onConfirm"];
  onCancel?: PopconfirmProps["onCancel"];
  className?: string;
};

export const PopconfirmBase = ({
  children = "Xóa",
  title = "Xác nhận",
  description = "Bạn có muốn xóa số lượng này?",
  cancelText,
  okText,
  onConfirm,
  onCancel,
  className,
}: PopconfirmBaseProps) => {
  return (
    <Popconfirm
      title={title}
      description={description}
      onConfirm={onConfirm}
      onCancel={onCancel}
      okText={okText}
      cancelText={cancelText}
      className={className}
    >
      {children}
    </Popconfirm>
  );
};
