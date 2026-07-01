"use client";

import React, { useEffect, useRef, useState } from "react";
import type { InputRef } from "antd";
import { Input, Tag, theme, Tooltip } from "antd";
import { Option } from "@/app/data/interface/options";
import { ButtonBase } from "./button";

// Mở rộng Option để chấp nhận thêm thuộc tính color
interface TagOption extends Option {
  color?: string;
  [key: string]: unknown;
}

interface TagsBaseProps {
  className?: string;
  type?: "number" | "text" | "email" | "password";
  textTags?: string;
  tag: string[];
  inputStyle?: string;
  btnStyle?: string;
  contentStyle?: string;
  min?: number;
  max?: number;
  onChange?: (tags: string[], option?: Record<string, unknown>) => void;
  /** Nếu bật = true, sẽ dùng input có select */
  useSelect?: boolean;
  options?: TagOption[]; // Sửa type ở đây
  isViewAddTag?: boolean;
  disabled?: boolean;
}

export default function TagsBase({
  className = "",
  type = "text",
  tag = [],
  textTags = "+ Thêm tag",
  inputStyle,
  btnStyle,
  contentStyle,
  min,
  max,
  onChange,
  useSelect = false,
  options = [],
  isViewAddTag = true,
  disabled = false,
}: TagsBaseProps) {
  const { token } = theme.useToken();
  const [tags, setTags] = useState<string[]>(tag);
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [openSelect, setOpenSelect] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<InputRef>(null);

  // Màu mặc định fallback nếu DB không có màu
  const defaultColors = [
    "magenta", "red", "volcano", "orange", "gold",
    "lime", "green", "cyan", "blue", "geekblue", "purple",
  ];

  useEffect(() => {
    if (inputVisible) {
      inputRef.current?.focus();
    }
  }, [inputVisible]);

  useEffect(() => {
    setTags(tag);
  }, [tag]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpenSelect(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- LOGIC MỚI: Lấy màu từ Options (DB) ---
  const getColorForTag = (tagName: string, index: number) => {
    // 1. Tìm xem tag này có trong danh sách options (DB) không
    const foundOption = options.find(
      (opt) => opt.label === tagName || opt.value === tagName
    );

    // 2. Nếu có và có màu -> trả về màu đó
    if (foundOption && foundOption.color) {
      return foundOption.color;
    }

    // 3. Nếu không, dùng màu mặc định theo index
    return defaultColors[index % defaultColors.length];
  };

  const handleClose = (removedTag: string) => {
    if (disabled) return;
    const newTags = tags.filter((tag) => tag !== removedTag);
    setTags(newTags);
    if (onChange) {
      onChange(newTags, {});
    }
  };

  const showInput = () => {
    if (disabled) return;
    setInputVisible(true);
    if (useSelect) {
      setOpenSelect(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputConfirm = () => {
    if (inputValue && tags.indexOf(inputValue) === -1) {
      const newTags = [...tags, inputValue];
      setTags(newTags);
      if (onChange) {
        onChange(newTags, {});
      }
    }
    setInputVisible(false);
    setInputValue("");
  };

  const handleSelect = (opt: TagOption) => {
    // Ưu tiên dùng label (tên tag) để lưu
    const valToAdd = String(opt.label || opt.value);

    if (tags.indexOf(valToAdd) === -1) {
      const updated = [...tags, valToAdd];
      setTags(updated);
      onChange?.(updated, opt);
    }
    setOpenSelect(false);
    setInputVisible(false);
  };

  const forMap = (tag: string, index: number) => {
    const color = getColorForTag(tag, index);
    const isHex = color.startsWith("#");

    return (
      <span key={tag} className="inline-flex items-center">
        <Tag
          color={color}
          closable={!disabled}
          onClose={(e) => {
            e.preventDefault();
            handleClose(tag);
          }}
          className={`m-0! flex items-center ${contentStyle}`}
          // Nếu là mã HEX thì text màu đen cho dễ nhìn, còn màu ant design thì tự nó handle
          style={isHex ? { color: '#000000', border: 'none' } : {}}
        >
          {tag}
        </Tag>
      </span>
    );
  };

  const tagChild = tags.map(forMap);

  const tagPlusStyle: React.CSSProperties = {
    background: token.colorBgContainer,
    borderStyle: "dashed",
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-2 relative ${className}`}
      ref={containerRef}
    >
      {!disabled &&
        <Tooltip title="Thêm tag">
          <div className="inline-flex items-center">
            <div className="flex bg-white border border-gray-200 rounded items-center">
              {isViewAddTag && (
                <>
                  {inputVisible ? (
                    <Input
                      ref={inputRef}
                      type={type}
                      size="small"
                      style={{ width: 100, fontSize: 14 }}
                      value={inputValue}
                      onChange={handleInputChange}
                      onBlur={handleInputConfirm}
                      onPressEnter={handleInputConfirm}
                      className={`border-none! focus:ring-0! ${inputStyle}`}
                      min={type === "number" ? min : undefined}
                      max={type === "number" ? max : undefined}
                    />
                  ) : (
                    <Tag
                      onClick={showInput}
                      style={tagPlusStyle}
                      className={`m-0! flex! justify-center items-center cursor-pointer border-transparent hover:border-primary! ${btnStyle}`}
                    >
                      {textTags}
                    </Tag>
                  )}
                </>
              )}
              {useSelect && (
                <ButtonBase
                  type="button"
                  onClick={() => setOpenSelect(!openSelect)}
                  className={`p-1! h-[22px] w-[22px] flex items-center justify-center border-l border-gray-200`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-3 w-3 transition-transform ${openSelect ? "rotate-180" : "rotate-0"
                      }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </ButtonBase>
              )}
            </div>
          </div>
        </Tooltip>
      }

      {/* Dropdown chọn nhanh */}
      {useSelect && openSelect && options.length > 0 && !disabled && (
        <ul className="absolute top-full left-0 mt-1 z-50 w-56 max-h-50 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {options.map((opt, idx) => (
            <li
              key={idx}
              onClick={() => handleSelect(opt)}
              className="cursor-pointer px-3 py-2 hover:bg-gray-100 text-sm flex items-center justify-between"
            >
              <span>{opt.label}</span>
              {/* Hiển thị màu trong dropdown để dễ chọn */}
              {opt.color && (
                <span
                  style={{ backgroundColor: opt.color }}
                  className="w-3 h-3 rounded-full border border-gray-300 block"
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {tagChild}

    </div>
  );
}
