"use client";

import React from "react";
import Link from "next/link";
import { optionTypeBox, optionLocation } from "@/app/data/typebox";
import { Mold } from "@/app/data/dataMold";
import ZoomImageViewer from "./zoom-img";

interface MoldInfoCardProps {
  mold: Mold;
}

export const MoldInfoCard: React.FC<MoldInfoCardProps> = ({ mold }) => {
  if (!mold) return null;

  const file = mold.fileRepresentativeImage?.[0];
  const imageUrl =file?.url|| undefined;

  return (
    <div className="border border-gray-200 ">
      <p className="font-semibold py-1">Thông tin khuôn bế</p>
      <div className="block border border-gray-200 p-2 rounded-md hover:bg-blue-100  transition cursor-pointer hover:"
      >
        <Link
          href={`/mold/${mold.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <p className="font-bold text-gray-800 text-sm capitalize">{mold.name}</p>
          <p className="text-[12px] text-gray-500">
            {mold.id} |{" "}
            {optionTypeBox.find((opt) => opt.value === mold.type)?.label} |{" "}
            {mold.size} | sóng {mold.wave} | {mold.class} lớp | {mold.numberBowls} bát |{" "}
            {mold.sizePaper} |{" "}
            {optionLocation.find((opt) => opt.value === mold.area)?.label} |{" "}
            NCC: {mold.supplier}
          </p>


        </Link>
      </div>
      {file?.key && (
        <div className="mt-2">
          {imageUrl ? (
            <ZoomImageViewer src={imageUrl} className="w-30" />
          ) : (
            <span className="text-blue-600">{file.key}</span>
          )}
        </div>
      )}
    </div>
  );
};
