import React from "react";

type BoxProps = {
  children: React.ReactNode;
  className?: string;
};

export const Box = ({ children, className = "" }: BoxProps) => {
  return (
    <div className={`flex flex-col gap-2 bg-white border-b border-gray-200 rounded-md px-2 py-3 shadow-xl ${className}`}>
      {children}
    </div>
  );
};
