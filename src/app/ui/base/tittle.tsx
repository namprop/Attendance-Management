import React from "react";

type TitleProps = {
  className?: string;
  children?: React.ReactNode;
};

export const TitleBase = ({ children, className, ...rest }: TitleProps) => {
  return (
    <div className="relative">
      {/* <div className="absolute bottom-0 left-0 right-0 h-3 bg-[#fe9793] w-full z-0"></div> */}
      <div className="z-1 relative">
        <h2
          className={`text-2xl font-bold !text-gray-800 ${className}`}
          {...rest}
        >
          {children}
        </h2>
      </div>
    </div>
  );
};
