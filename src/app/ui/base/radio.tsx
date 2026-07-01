import React from "react";
import type { CheckboxOptionType, RadioChangeEvent } from "antd";
import { ConfigProvider, Radio } from "antd";
import { RadioGroupButtonStyle, RadioGroupOptionType } from "antd/es/radio";
import { SizeType } from "antd/es/config-provider/SizeContext";

type CustomOptionType = {
  value: string | number;
  label: React.ReactNode;
  p?: {
    price: number;
  };
  data?: unknown;
};

type RadioBaseProps = {
  options: CheckboxOptionType[] | undefined;
  className?: string;
  onChange?: (e: RadioChangeEvent, option?: CustomOptionType) => void;
  value?: string | number | boolean | null;
  disabled?: boolean;
  optionType?: RadioGroupOptionType | undefined;
  buttonStyle?: RadioGroupButtonStyle | undefined;
  size?: SizeType;
  dotSize?: number;
  radioSize?: number;
  wrapperMarginInlineEnd?: number;
  paddingXS?: number;
  sizeText?: number;
};

export const RadioBase = ({
  options = [],
  className,
  onChange,
  value,
  disabled = false,
  optionType,
  buttonStyle,
  size = "large",
  dotSize = 7,
  radioSize = 16,
  wrapperMarginInlineEnd = 0,
  paddingXS = 8,
  sizeText = 14,
  ...rest
}: RadioBaseProps) => {
  return (
    <ConfigProvider
      theme={{
        components: {
          Radio: {
            dotSize: dotSize,
            radioSize: radioSize,
            wrapperMarginInlineEnd: wrapperMarginInlineEnd,
            buttonCheckedBgDisabled: "#1677ff",
            buttonCheckedColorDisabled: "#dedede",
          },
        },
        token: {
          fontSize: sizeText,
          paddingXS: paddingXS,
        },
      }}
    >
      <Radio.Group
        className={`!flex !flex-col !gap-2 !text-sm ${className}`}
        size={size}
        onChange={
          onChange
            ? (e) => {
              const selectedOption = options?.find(
                (opt) =>
                  (typeof opt === "object" ? opt.value : opt) === e.target.value
              );
              onChange(e, selectedOption);
            }
            : undefined
        }
        value={value}
        options={options}
        disabled={disabled}
        optionType={optionType}
        buttonStyle={buttonStyle}
        {...rest}
      />
    </ConfigProvider>
  );
};
