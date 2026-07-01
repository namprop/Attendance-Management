"use client";
import Image from "next/image";
import React, { useState } from "react";

type BaseUploadProps = {
  onChange?: (file: File | null) => void;
  preview?: boolean;
  className?: string;
};

export const UploadImage: React.FC<BaseUploadProps> = ({
  onChange,
  preview = true,
  className = "",
}) => {
  const [image, setImage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      onChange?.(file);
    } else {
      setImage(null);
      onChange?.(null);
    }
  };

  return (
    <div className={`flex flex-col items-start gap-2 ${className}`}>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500
        file:mr-4 file:py-2 file:px-4
        file:rounded-md file:border-0
        file:text-sm file:font-semibold
        file:bg-blue-50 file:text-blue-700
        hover:file:bg-blue-100"
      />
      {preview && image && (
        <div className="mt-2">
          <Image
            src={image}
            alt="preview"
            className="max-w-xs rounded-lg shadow"
            width={200}
            height={200}
          />
        </div>
      )}
    </div>
  );
};
