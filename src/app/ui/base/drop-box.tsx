import React, { useState } from "react";
import { Box } from "./box";
import IconUp from "@public/icons/up.svg";
import IconDown from "@public/icons/down.svg";
import Image from "next/image";

type DropBoxProps = {
  children: React.ReactNode;
  className?: string;
  title?: string | React.ReactNode;
  titleEdit?: React.ReactNode;
  iconBtnDefault?: React.ReactNode;
  addBtn?: React.ReactNode;
  isOpen?: boolean;
  styleTitle?: string;
};

export const DropBox = ({
  children,
  className = "",
  title,
  titleEdit,
  iconBtnDefault = <Image src={IconUp.src} alt="" width={18} height={18} />,
  addBtn,
  isOpen = true,
  styleTitle,
}: DropBoxProps) => {
  const [isUpDown, setIsUpDown] = useState(isOpen);
  function openUpDown() {
    setIsUpDown(!isUpDown);
  }
  const imgUpDown = isUpDown ? (
    iconBtnDefault
  ) : (
    <Image src={IconDown.src} alt="" width={18} height={18} />
  );
  return (
    <Box className={`${className} `}>
      <div className="flex justify-between items-center gap-3">
        {titleEdit ? (
          <div className={`w-full text-[13px] text-[#15171a] font-bold ${styleTitle}`}>
            {titleEdit}
          </div>
        ) : (
          <h3 className={`text-[13px] text-[#15171a] font-bold ${styleTitle}`}>
            {title}
          </h3>
        )}
        <div className="flex gap-2">
          {addBtn && addBtn}
          <button
            type="button"
            onClick={() => openUpDown()}
            className="p-1 rounded-full w-[27px] hover:bg-gray-200"
          >
            {imgUpDown}
          </button>
        </div>
      </div>
      {isUpDown && <div className="mt-1">{children}</div>}
    </Box>
  );
};
