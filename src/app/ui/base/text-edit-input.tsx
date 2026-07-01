"use client";

import { Tooltip } from "antd";
import React, { useState, useRef, useEffect } from "react";

type TextEditProps = {
  className?: string;
  textStyle?: string;
  inputStyle?: string;
  placeholder?: string;
  text: string;
  setText: (text: string) => void;
};

const EditableText = ({
  className,
  textStyle,
  inputStyle,
  placeholder = "Nhập thông tin",
  text = "Nhấn để chỉnh sửa",
  setText,
}: TextEditProps) => {
  const [isEditing, setIsEditing] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsEditing(false); // Always close on click outside
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  return (
    <div ref={containerRef} className={className}>
      {isEditing ? (
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
          }}
          onBlur={() => setIsEditing(false)} // Always close on blur
          placeholder={placeholder}
          className={`border p-1 w-full rounded cursor-pointer focus:outline-none ${inputStyle}`}
        />
      ) : (
        <Tooltip title="Nhấp để chỉnh sửa">
          <span
            onClick={() => setIsEditing(true)}
            className={`cursor-pointer inline-block min-w-[100px] min-h-[24px] ${text ? textStyle : "text-gray-400 italic"}`}
          >
            {text || placeholder}
          </span>
        </Tooltip>
      )}
    </div>
  );
};

export default EditableText;
