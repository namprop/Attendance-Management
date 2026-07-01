"use client";

import { htmlToText } from "@/app/utils/converts";
import dynamic from "next/dynamic";
import React, { useState, useEffect, useRef } from "react";


import "react-quill-new/dist/quill.snow.css";
import { ButtonBase } from "./button";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

type EditorChange = { html: string; text: string };

type BaseEditorProps = {
  value?: string;
  onChange?: (val: EditorChange) => void;
  placeholder?: string;
  disabled?: boolean;
  maxHeight?: string | number; // Chiều cao tối đa khi thu gọn
};

export default function TextEditor({ value, onChange, placeholder, disabled = false, maxHeight }: BaseEditorProps) {
  const [editorValue, setEditorValue] = useState(value);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditorValue(value);
  }, [value]);

  useEffect(() => {
    if (maxHeight && containerRef.current) {
      // Kiểm tra chiều cao thực tế so với maxHeight
      const contentHeight = containerRef.current.scrollHeight;
      const limitHeight = typeof maxHeight === 'number' ? maxHeight : parseInt(maxHeight as string) || 0;

      if (contentHeight > limitHeight) {
        setShowToggle(true);
      } else {
        setShowToggle(false);
      }
    }
  }, [editorValue, maxHeight]);

  const handleChange = (content: string) => {
    if (disabled) return;
    setEditorValue(content);
    onChange?.({ html: content, text: htmlToText(content) });
  };

  return (
    <div className={`w-full relative ${disabled ? "opacity-90" : ""}`}>
      <div
        ref={containerRef}
        className={`rounded-md w-full bg-white transition-all duration-300 ease-in-out ${disabled ? "cursor-not-allowed" : ""}`}
        style={{
          maxHeight: (!isExpanded && maxHeight) ? maxHeight : 'none',
          overflowY: (!isExpanded && maxHeight) ? 'auto' : 'visible'
        }}
      >
        <ReactQuill
          theme="snow"
          value={editorValue || ""}
          onChange={handleChange}
          readOnly={disabled}
          placeholder={placeholder || "Nhập mô tả..."}
          modules={
            disabled
              ? { toolbar: false }
              : {
                toolbar: [
                  [{ font: [] }, { size: [] }],
                  ["bold", "italic", "underline", "strike"],
                  [{ script: "sub" }, { script: "super" }],
                  ["blockquote", "code-block"],
                  [{ color: [] }, { background: [] }],
                  [{ align: [] }],
                  [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
                  // ["link", "image", "video"],
                  ["link"],
                  ["clean"],
                ],
              }
          }
        />
      </div>

      {/* Button Xem thêm / Thu gọn */}
      {showToggle && (
        <div className="flex justify-center mt-2">
          <ButtonBase
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-xs! font-bold! text-blue-600! hover:text-blue-800! hover:underline! flex items-center gap-1 bg-white! px-2! py-1! rounded! border! border-blue-100!"
          >
            {isExpanded ? "Thu gọn" : "Xem thêm"}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transform transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </ButtonBase>
        </div>
      )}
    </div>
  );
}
