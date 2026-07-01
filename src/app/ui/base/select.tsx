import React from "react";
import { Select } from "antd";
import type { SelectProps } from "antd";
import { DefaultOptionType } from "antd/es/select";
import { valueType } from "antd/es/statistic/utils";

type SelectBaseProps = {
  showSearch?: boolean | { optionFilterProp: string; onSearch: (value: string) => void };
  className?: string;
  style?: React.CSSProperties;
  options?: DefaultOptionType[];
  defaultValue?: SelectProps["defaultValue"];
  placeholder?: string;
  onChange?: SelectProps["onChange"];
  isSort?: boolean;
  value?: valueType | valueType[] | null;
  disabled?: boolean;
};

export const SelectBase = ({
  showSearch,
  className = "",
  style,
  options = [],
  defaultValue = [],
  placeholder = "",
  onChange,
  isSort = true,
  value,
  disabled,
  ...rest
}: SelectBaseProps &
  Omit<
    SelectProps,
    "options" | "defaultValue" | "placeholder" | "onChange" | "className"
  >) => {

  function sortOptions(optionA: DefaultOptionType, optionB: DefaultOptionType) {
    return (optionA?.label ?? "")
      .toString()
      .toLowerCase()
      .localeCompare((optionB?.label ?? "").toString().toLowerCase());
  }


  // Extract specific props if showSearch is an object
  const searchProps = typeof showSearch === 'object' ? showSearch : {};
  const actualShowSearch = !!showSearch;

  return (
    <Select
      showSearch={actualShowSearch}
      defaultValue={defaultValue ?? undefined}
      value={value ?? undefined}
      className={`w-full! max-h-22 h-8 overflow-y-auto px-0 focus:ring-green-500
       focus:border-green-500 focus:border-b ${disabled ? "bg-gray-100" : ""} ${className}`}
      style={{ ...style, padding: 0 }}
      placeholder={placeholder}
      optionFilterProp="label"
      //   Sắp xếp các tùy chọn theo thứ tự chữ cái
      filterSort={isSort ? sortOptions : undefined}
      onChange={onChange}
      options={options?.map((opt) => ({
        ...opt,
        value: opt.value ?? undefined // Ensure value is not null in options
      }))}
      disabled={disabled}
      {...rest}
      {...searchProps} // Override props like onSearch if provided in showSearch object
    />
  );
};
