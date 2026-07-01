"use client";

import React, { useState, useMemo } from "react";
import { DropdownBase } from "./dropdown";
import { InputBase } from "./input";
import Image from "next/image";
import IconSearch from '@public/icons/search-icon.svg';

export type DropdownSelectBaseProps<T, K> = {
  items: T[];
  value?: K;
  onChange?: (value: K, item: T) => void;
  searchPlaceholder?: string;
  renderItem: (item: T, selected: boolean) => React.ReactNode; // Render từng item
  renderButton: (selectedItem?: T) => React.ReactNode; // Render button
  getValue: (item: T) => K; // Lấy giá trị duy nhất của item
  className?: string;
  classNameContent?: string;
  disabled?: boolean
};

export function DropdownSelectBase<T, K extends string | number>({
  items,
  value,
  onChange,
  searchPlaceholder = "Tìm kiếm...",
  renderItem,
  renderButton,
  getValue,
  className,
  classNameContent = "w-64",
  disabled=false,
}: DropdownSelectBaseProps<T, K>) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return items;
    return items.filter((i) =>
      JSON.stringify(i).toLowerCase().includes(search.toLowerCase())
    );
  }, [search, items]);

  const selectedItem = items.find((i) => getValue(i) === value);

  return (
    <DropdownBase
      className={`relative ${className}`}
      classNameBtn="w-full"
      iconBtn={renderButton(selectedItem)}
      classNameContent={`${classNameContent} p-2`}
      disabled={disabled}
    >
      {/* Ô tìm kiếm */}
      <div className="m-2 shadow flex items-center 
      border border-gray-200 focus-within:border-blue-400 !rounded-md px-2 py-1 ">
        <Image src={IconSearch} width={20} height={20} alt="" />
        <InputBase
          type="search"
          placeholder={searchPlaceholder}
          className="w-full text-sm border-none outline-none ml-2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Danh sách */}
      <div className="max-h-64 overflow-auto">
        {filtered.map((item) => {
          const val = getValue(item);
          const isSelected = val === value;
          return (
            <div
              key={String(val)}
              onClick={() => onChange && onChange(val, item)}
              className="cursor-pointer"
            >
              {renderItem(item, isSelected)}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-4 text-center text-gray-400 text-sm">
            Không tìm thấy
          </div>
        )}
      </div>
    </DropdownBase>
  );
}
