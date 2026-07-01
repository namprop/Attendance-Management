"use client";

import React from "react";

interface BaseInputNumberProps {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export const InputNumberBase: React.FC<BaseInputNumberProps> = ({
  value,
  onChange,
  min = Number.MIN_SAFE_INTEGER,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  className = "",
}) => {
  const handleDecrease = () => {
    const currentValue = typeof value === "number" ? value : 0;
    const newValue = Math.max(min, currentValue - step);
    onChange(newValue);
  };

  const handleIncrease = () => {
    const currentValue = typeof value === "number" ? value : 0;
    const newValue = Math.min(max, currentValue + step);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === "") {
      onChange(null);
      return;
    }

    const inputValue = Number(e.target.value);
    if (!isNaN(inputValue)) {
      const newValue = Math.max(min, Math.min(max, inputValue));
      onChange(newValue);
    }
  };

  return (
    <div
      className={`relative group w-[120px] flex flex-row justify-center items-end gap-2 ${className}`}
    >
      <div className="flex-basis-1/4 justify-center items-center w-6 h-6">
        <button
          type="button"
          className="hidden group-hover:flex bg-gray-100 p-1 w-6 h-6 items-center justify-center rounded-full"
          onClick={handleDecrease}
          disabled={value !== null && value <= min}
        >
          −
        </button>
      </div>
      <div className="flex-basis-2/4 justify-center items-center">
        <input
          type="number"
          className="number-input no-spinner w-full py-1 border-b border-gray-300 text-center appearance-none focus:outline-none focus:border-b-2 focus:border-blue-500"
          value={value ?? ""}
          onChange={handleInputChange}
        />
      </div>
      <div className="flex-basis-1/4 justify-center items-center w-6 h-6">
        <button
          type="button"
          className="hidden group-hover:flex bg-gray-100 p-1 w-6 h-6 items-center justify-center rounded-full"
          onClick={handleIncrease}
          disabled={value !== null && value >= max}
        >
          +
        </button>
      </div>
    </div>
  );
};
