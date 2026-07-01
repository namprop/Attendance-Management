"use client";

import { useState, useEffect, useRef } from "react";
import { InputBase } from "./input";
import { ButtonBase } from "./button";
import { createPortal } from "react-dom";

export type Option = {
  label: string;
  value: string | number;
};

type BaseInputSelectProps = {
  value: string | number | undefined;
  onChange?: (value: string | number) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  type?: string;
  min?: number;
  max?: number;
  classNameContent?: string;
  classNameBtn?: string;
  classNameInput?: string;
  disabled?: boolean;
  status?: "" | "error";

  format?: "none" | "vnd";
};

function formatVNDInput(v: string | number) {
  const n = Number(String(v).replace(/[^\d]/g, ""));
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("vi-VN"); // 200.000
}

function parseVNDInput(v: string) {
  const raw = (v || "").replace(/[^\d]/g, "");
  return raw === "" ? "" : Number(raw);
}

export default function BaseInputSelect({
  value,
  onChange,
  options,
  placeholder,
  className = "",
  type = "number",
  classNameContent,
  classNameBtn,
  classNameInput,
  min,
  max,
  disabled = false,
  status = "",
  format = "none",
}: BaseInputSelectProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState<string | number | undefined>("");
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (open) {
      updateCoords();
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
    }
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [open]);

  // Sync từ prop -> input chỉ khi không đang edit
  useEffect(() => {
    if (isEditing) return;

    const found = options.find((opt) => opt.value === value);

    // ✅ Ưu tiên label nếu có trong options
    if (found) {
      setInputValue(found.label);
      return;
    }

    // ✅ Nếu format vnd thì format luôn value
    if (format === "vnd" && value !== undefined && value !== "") {
      setInputValue(formatVNDInput(value));
      return;
    }

    setInputValue(value ?? "");
  }, [value, options, isEditing, format]);

  // click ra ngoài thì đóng dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ FIX GIẬT: chọn option thì hiển thị label luôn (không set value vào input)
  const handleSelect = (opt: Option) => {
    setInputValue(opt.label);
    setOpen(false);
    onChange?.(opt.value);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;

    // Khi format VND: inputValue giữ text user đang gõ, onChange gửi number đã parse
    if (format === "vnd") {
      setInputValue(text);
      const parsed = parseVNDInput(text);
      onChange?.(parsed === "" ? "" : parsed);
      return;
    }

    // Default
    let val: string | number = text;
    if (type === "number" && val !== "") val = Number(val);
    setInputValue(val);
    onChange?.(val);
  };

  const handleFocus = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);

    const raw = inputValue ?? "";
    const str = String(raw).trim();

    if (str === "") {
      onChange?.("");
      setInputValue("");
      return;
    }

    // VND: parse -> clamp -> set lại dạng format
    if (format === "vnd") {
      const parsed = parseVNDInput(str);
      const n = typeof parsed === "number" ? parsed : 0;
      let final = n;
      if (min !== undefined && final < min) final = min;
      if (max !== undefined && final > max) final = max;

      onChange?.(final);
      setInputValue(final.toLocaleString("vi-VN"));
      return;
    }

    // number: parse + clamp
    if (type === "number") {
      const normalized = str.replace(/,/g, ".");
      const parsed = Number(normalized);
      if (!isNaN(parsed)) {
        let final = parsed;
        if (min !== undefined && final < min) final = min;
        if (max !== undefined && final > max) final = max;
        onChange?.(final);
        setInputValue(final);
        return;
      }
    }

    onChange?.(str);
    setInputValue(str);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div
        className={`flex w-full items-center justify-between bg-white rounded
        border ${status === "error" ? "border-red-500" : "border-gray-300"}`}
      >
        <InputBase
          type={type}
          value={inputValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`border-none! ${classNameInput}`}
          min={min}
          max={max}
          disabled={disabled}
        />
        <ButtonBase
          type="button"
          onClick={() => setOpen(!open)}
          className={`p-1! max-w-28 h-8 border-l rounded-none! border-gray-100 ${classNameBtn}`}
          disabled={disabled}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-3 w-3 transition-transform ${open ? "rotate-180" : "rotate-0"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </ButtonBase>
      </div>

      {open &&
        options.length > 0 &&
        createPortal(
          <ul
            style={{
              position: "fixed",
              top: coords.top + 4,
              left: coords.left,
              width: coords.width,
              zIndex: 9999,
              pointerEvents: "auto",
            }}
            className={`max-h-48 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg transition-all duration-50! ease-in-out ${
              classNameContent || ""
            }`}
          >
            {options.map((opt) => (
              <li
                key={opt.value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(opt);
                }}
                className="px-3 py-2 cursor-pointer hover:bg-blue-50 hover:text-blue-600 text-sm"
              >
                {opt.label}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}
