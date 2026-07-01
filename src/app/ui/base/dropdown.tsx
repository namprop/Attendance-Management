"use client";

import React, { useEffect, useRef, useState } from "react";
import IconTriangleDown from "@public/icons/triangle-down.svg";
import Image from "next/image";

type DropdownProps = {
  className?: string;
  classNameContent?: string;
  classNameBtn?: string;
  children?: React.ReactNode;
  iconBtn?: React.ReactNode;
  redirect?: string[];
  disabled?: boolean;
  style?: React.CSSProperties;
};
export const DropdownBase = ({
  redirect = ["top-[103%]", "right-0"],
  className = "",
  children,
  classNameContent = "",
  classNameBtn = "p-2 rounded-full hover:bg-gray-200 cursor-pointer",
  iconBtn = <Image src={IconTriangleDown.src} alt="" width={18} height={18} />,
  disabled = false,
  style,
  ...rest
}: DropdownProps) => {
  const [isOpens, setIsOpens] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Hàm xử lý khi click ngoài
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpens(false); // Đóng khi click ra ngoài
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  function openSearch() {
    setIsOpens(!isOpens);
  }
  return (
    <div ref={wrapperRef} className={`${className}`}>
      <button type="button" onClick={openSearch} className={`${classNameBtn}`}
        style={{ ...style, cursor: disabled ? "not-allowed" : "" }} disabled={disabled}>
        {iconBtn}
      </button>
      {isOpens && (
        <div
          className={`absolute ${redirect[0]} ${redirect[1]} !z-[9999] 
            bg-white border-1 border-gray-300 shadow-2xl rounded-md 
            transition ease-in-out duration-300 ${classNameContent}`}
          {...rest}
        >
          {children}
        </div>
      )}
    </div>
  );
};
