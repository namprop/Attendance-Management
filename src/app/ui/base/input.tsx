import React, { useEffect, useState } from "react";

type InputProps = {
  ref?: React.Ref<HTMLInputElement>;
  id?: string;
  name?: string;
  type?: string;
  checked?: boolean;
  className?: string;
  placeholder?: string;
  value?: string | number;
  min?: number;
  max?: number;
  maxLength?: number;
  minLength?: number;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onInput?: React.FormEventHandler<HTMLInputElement>;
  // onInput?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClick?: () => void;
};

export const InputBase = ({
  type = "text",
  checked,
  className = "",
  placeholder,
  value,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  min,
  max,
  onInput,
  maxLength,
  minLength,
  disabled = false,
  id,
  name,
  ref,
  required,
  autoComplete,
  ...rest
}: InputProps) => {
  const [displayValue, setDisplayValue] = useState<string>("");

  // Hàm format số thành chuỗi có dấu chấm ngăn cách hàng nghìn
  const formatNumber = (num: number | string): string => {
    if (num === null || num === undefined || num === "") return "";
    const parts = String(num).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return parts.join(",");
  };

  // Đồng bộ value từ prop -> displayValue
  useEffect(() => {
    if (type === "number") {
      if (typeof value === "number") {
        setDisplayValue(formatNumber(value));
      } else if (typeof value === "string" && value !== "") {
        // Nếu value là string nhưng là số
        setDisplayValue(formatNumber(Number(value)));
      } else {
        setDisplayValue("");
      }
    } else {
      setDisplayValue(value ? String(value) : "");
    }
  }, [value, type]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value;

    if (type === "number") {
      // Chỉ giữ số và dấu phẩy
      rawValue = rawValue.replace(/[^0-9,]/g, "");

      // Chuyển dấu phẩy về dấu chấm để parseFloat hoạt động
      const normalized = rawValue.replace(/,/g, ".");
      const numericValue = normalized ? parseFloat(normalized) : NaN;

      // Kiểm tra min/max
      if (!isNaN(numericValue)) {
        if ((max !== undefined && numericValue > max) || (min !== undefined && numericValue < min)) {
          return;
        }
      }

      // Cập nhật hiển thị format
      setDisplayValue(formatNumber(normalized));

      // Gửi event ra ngoài với target.value là **number**
      const clonedEvent = {
        ...e,
        target: {
          ...e.target,
          value: isNaN(numericValue) ? "" : numericValue,
        },
      } as React.ChangeEvent<HTMLInputElement>;

      onChange?.(clonedEvent);
    } else {
      // Nếu type text bình thường
      if (maxLength !== undefined && rawValue.length > maxLength) return;
      setDisplayValue(rawValue);
      onChange?.(e);
    }
  };

  return (
    <input
      ref={ref}
      id={id}
      name={name}
      checked={checked}
      // Nếu type là number thì render text để format số, nếu không thì giữ nguyên type
      type={type === "number" ? "text" : type}
      placeholder={placeholder}
      className={`no-spinner p-[6px] border border-gray-300
         text-gray-900 text-sm focus:ring-green-500 rounded-sm
          focus:border-green-500 focus:border-b w-full ${className}
          disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed`}
      value={displayValue}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      onFocus={onFocus}
      disabled={disabled}
      maxLength={maxLength}
      minLength={minLength}
      onInput={onInput}
      required={required}
      autoComplete={autoComplete}
      {...rest}
    />
  );
};
