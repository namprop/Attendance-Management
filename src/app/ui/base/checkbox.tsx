import React from "react";
import { Checkbox } from "antd";
import type { CheckboxOptionType, CheckboxProps } from "antd";

type CheckboxBaseProps = {
  className?: string;
  // placeholder?: string;
  onChange?: (checkedValue: string[]| number[]) => void | undefined;
  options?: CheckboxOptionType[];
  defaultValue?: string[];
};

export const CheckboxBase = ({
  className = "",
  // placeholder = "",
  defaultValue = [],
  onChange,
  options = [],
  ...rest
}: CheckboxBaseProps &
  Omit<
    CheckboxProps,
    "options" | "defaultValue" | "placeholder" | "onChange" | "className"
  >) => {
  return (
    <Checkbox.Group
      // key={options.map((item) => item.value).join("")}
      className={`${className}`}
      options={options}
      defaultValue={defaultValue}
      onChange={onChange}
      {...rest}
    />
  );
};
