"use client";
import React, { useState, ReactNode, useRef, useEffect } from "react";
import Image from "next/image";
import IconFilter from "@public/icons/table/filter.svg";
import IconDelete from "@public/icons/close.svg";
import { ButtonBase } from "./button";

interface BaseFilterProps {
    children: ReactNode;
    onApply: () => void;
    onClear?: () => void; // Xóa bộ lọc
    hasActive?: boolean; // Có filter đang active hay không
    buttonLabel?: string;
    className?: string;
    classNamePanel?: string;
}

const BaseFilter: React.FC<BaseFilterProps> = ({
    children,
    onApply,
    onClear,
    hasActive = false,
    buttonLabel,
    className = "",
    classNamePanel,
}) => {
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Đóng khi click ra ngoài
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        if (open) document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [open]);

    const handleApply = () => {
        onApply();
        setOpen(false);
    };

    return (
        <div className={`relative inline-block ${className}`}>
            {/* Nút mở filter */}
            <ButtonBase
                onClick={() => setOpen((prev) => !prev)}
                className="flex items-center gap-2 !px-3 !py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition text-gray-700 shadow-sm"
            >
                <Image src={IconFilter} alt="Filter Icon" width={18} height={18} />
                {buttonLabel && <span className="text-sm font-medium">{buttonLabel}</span>}
            </ButtonBase>

            {/* Nút clear */}
            {hasActive && onClear && (
                <ButtonBase
                    aria-label="Clear filters"
                    title="Xóa bộ lọc"
                    onClick={onClear}
                    className="!py-[2px] !px-[5px] absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white !text-xs !rounded-full shadow-md transition"
                >
                    Xóa
                </ButtonBase>
            )}

            {/* Panel bộ lọc */}
            <div
                ref={panelRef}
                onClick={(e) => e.stopPropagation()}
                className={`fixed right-0 top-0 ml-2 w-75 h-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 transform transition-transform duration-300 ease-in-out origin-left
                    ${open ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"} ${classNamePanel}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-700">Bộ lọc</h2>
                    <ButtonBase
                        className="!p-0 hover:bg-gray-100 rounded-full transition"
                        onClick={() => setOpen(false)}
                    >
                        <Image src={IconDelete} alt="Filter Icon" width={35} height={35} />
                    </ButtonBase>
                </div>

                {/* Nội dung */}
                <div className="p-4 h-[calc(100vh-120px)] overflow-y-auto space-y-3">
                    {children}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-gray-100 flex justify-end items-end gap-2">
                    {/* Nút clear */}
                    {hasActive && onClear && (
                        <ButtonBase
                            aria-label="Clear filters"
                            title="Xóa bộ lọc"
                            onClick={onClear}
                            className="px-3 py-1.5 text-sm bg-red-400 text-white rounded-lg hover:bg-red-500 transition"
                        >
                            Đặt lại
                        </ButtonBase>
                    )}
                    <ButtonBase
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
                        onClick={handleApply}
                    >
                        Áp dụng
                    </ButtonBase>
                </div>
            </div>
        </div>
    );
};

export default BaseFilter;
