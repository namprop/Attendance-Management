import React, { useRef } from "react";
import { InputBase } from "./input";


interface ColorPickerFieldProps {
  value?: string;
  onChange: (color: string) => void;
  placeholder?: string;
  
}
export function ColorPickerField({
  value,
  onChange,
}: ColorPickerFieldProps) {
  const colorInputRef = useRef<HTMLInputElement | null>(null);

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

 

  return (
    <div className="flex items-center gap-2">
      {/* preview box */}
     

      {/* native color picker visible */}
      <InputBase
        type="color"
        ref={(el) => {
          colorInputRef.current = el;
        }}
        value={value || "#E0E0E0"}
        onChange={handlePickerChange}
        className="w-8 h-8 p-0 border rounded cursor-pointer"
      />
    </div>
  );
}
