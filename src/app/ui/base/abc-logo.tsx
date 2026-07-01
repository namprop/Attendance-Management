import React from "react";

interface ABCLogoProps {
  className?: string;
}

export const ABCLogo: React.FC<ABCLogoProps> = ({ className = "" }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <span
        className="font-black italic tracking-tighter bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 bg-clip-text text-transparent select-none drop-shadow-sm"
        style={{ fontSize: "inherit", lineHeight: 1 }}
      >
        ABC
      </span>
    </div>
  );
};
