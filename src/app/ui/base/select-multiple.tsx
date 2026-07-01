import React from "react";
import { Select } from "antd";
import type { SelectProps } from "antd";

type SelectBaseProps = {
  className?: string;
  options?: SelectProps['options'];
  defaultValue?: SelectProps['defaultValue'];
  placeholder?: string;
  onChange?: SelectProps['onChange'];
  value?: SelectProps['value'];
};

export const SelectMultipleBase = ({
  className = "",
  options = [],
  defaultValue = [],
  placeholder = "",
  onChange,
  value,
  ...rest
}: SelectBaseProps & Omit<SelectProps, 'options' | 'defaultValue' | 'placeholder' | 'onChange' | 'className'>) => {
  return (
    <Select
      className={`${className} w-full max-h-22 overflow-y-auto`}
      mode="multiple"
      allowClear
      placeholder={placeholder}
      defaultValue={defaultValue}
      onChange={onChange}
      value={value}
      options={options}
      {...rest}
    />
  )
};
