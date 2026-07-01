import Image from "next/image";
import React, { useRef, useState } from "react";

export function UploadImageAvatar() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE_MB = 2;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError("Ảnh không được vượt quá 2MB");
        setImagePreview(null);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setImagePreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative w-[90px] h-[90px] max-md:w-[80px] max-md:h-[80px] border border-dashed rounded overflow-hidden flex items-center justify-center"
        style={{ borderColor: "#ccc" }}
      >
        {imagePreview ? (
          <>
            <Image width={100} height={100}
              src={imagePreview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <button
              onClick={handleRemove}
              className="absolute top-0 right-0 bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
              title="Xóa ảnh"
            >
              ×
            </button>
          </>
        ) : (
          <span className="text-gray-400 text-sm">Ảnh</span>
        )}
      </div>

      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImageChange}
      />

      <button
        onClick={handleClick}
        className="bg-green-500 text-white py-1 px-2 rounded hover:bg-green-600 transition min-w-[80px]"
      >
        Chọn ảnh
      </button>

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
