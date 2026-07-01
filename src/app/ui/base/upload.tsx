"use client";
import React, { useState } from "react";
import { Upload, Tooltip } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import dayjs from "dayjs";
import Image from "next/image";
import iconNoPhoto from "@public/images/no-photo.svg";
import iconUpload from "@public/icons/upload.svg";
import iconDelete from "@public/icons/delete-item.svg";
import { ButtonBase } from "./button";
import { useToast } from "./toast";
import ZoomImageViewer from "./zoom-img";
import { cookieBase } from "@/app/utils/cookie";
import { User } from "@/app/data/dataUser";

export type FileInfo = {
  uid: string;
  name: string;
  url?: string;
  size?: number;
  uploader?: string;
  uploadedAt?: string;
  originFileObj?: File;
};

type UploadBaseProps = {
  defaultFiles?: FileInfo[];
  onChange?: (files: FileInfo[]) => void;
  multiple?: boolean;
  accept?: string;
  maxSizeMB?: number;
};

export const UploadBase: React.FC<UploadBaseProps> = ({
  defaultFiles = [],
  onChange,
  multiple = true,
  accept = "*",
  maxSizeMB = 100, // mặc định 2MB
}) => {
  const user = cookieBase.get<User>("info_user");
  const toast = useToast();
  const [fileList, setFileList] = useState<UploadFile[]>(
    defaultFiles.map((f) => ({
      uid: f.uid,
      name: f.name,
      url: f.url,
      size: f.size,
    }))
  );

  const updateFiles = (list: UploadFile[]) => {
    setFileList(list);
    onChange?.(
      list.map((f) => ({
        uid: f.uid,
        name: f.name,
        url: f.url || "",
        size: f.size,
        uploader: "Người dùng A",
        uploadedAt: dayjs().format("DD/MM/YYYY HH:mm"),
        originFileObj: f.originFileObj,
      }))
    );
  };

  const handleChange = ({ fileList }: { fileList: UploadFile[] }) => {
    updateFiles(fileList);
  };

  const handleRemove = (uid: string) => {
    const newList = fileList.filter((f) => f.uid !== uid);
    updateFiles(newList);
  };

  // Validate trước khi upload
  const beforeUpload = (file: File) => {
    // Kiểm tra định dạng
    if (accept !== "*" && !file.type.match(accept.replace("*", ".*"))) {
      toast({
        type: "error",
        message: `Định dạng file không hợp lệ (${file.name})`,
        duration: 3000,
      });
      return Upload.LIST_IGNORE;
    }

    // Kiểm tra dung lượng
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        type: "error",
        message: `Dung lượng tối đa ${maxSizeMB}MB (${file.name})`,
        duration: 3000,
      });
      return Upload.LIST_IGNORE;
    }

    return true; // cho phép upload
  };

  return (
    <Upload.Dragger
      multiple={multiple}
      accept={accept}
      listType="picture-card"
      fileList={fileList}
      onChange={handleChange}
      beforeUpload={beforeUpload}
      className=""
      itemRender={(originNode, file) => (
        <div
          className="relative"
          onClick={(e) => {
            e.stopPropagation(); // chặn event mặc định
            if (file.type?.startsWith("image/")) {
              // Mở zoom ảnh
            } else if (file.url) {
              // Mở file thường
              window.open(file.url, "_blank");
            }
          }}
        >
          <Tooltip
            title={
              <div>
                <p>
                  <b>Tên file:</b> {file.name}
                </p>
                <p>
                  <b>Dung lượng:</b> {file.size ? (file.size / 1024).toFixed(1) : 0} KB
                </p>
                <p>
                  <b>Ngày tải:</b> {dayjs().format("DD/MM/YYYY HH:mm")}
                </p>
                <p>
                  <b>Người tải:</b> {user?.name}
                </p>
              </div>
            }
          >
            <div className="cursor-pointer my-2 border border-gray-200 relative rounded-sm">
              <div className="flex justify-center items-center">
                {file.thumbUrl || file.url ? (
                  <ZoomImageViewer
                    src={file.thumbUrl || file.url!}
                    className="w-[64px] h-[64px] object-cover"
                  />
                ) : (
                  <div onClick={() => window.open(file.url, "_blank")}>
                    <Image
                      src={iconNoPhoto}
                      alt="No photo"
                      width={64}
                      height={64}
                      className="flex-none"
                    />
                  </div>
                )}
              </div>
              <div className="text-xs text-center p-1 text-ellipsis overflow-hidden whitespace-nowrap">
                {file.name}
              </div>
            </div>
          </Tooltip>
          <ButtonBase
            onClick={() => handleRemove(file.uid)}
            className="!absolute top-1 right-1 !p-[2px] rounded-full hover:bg-red-200"
          >
            <Image src={iconDelete} width={16} height={16} alt="" />
          </ButtonBase>
        </div>
      )}
    >
      <div className="flex justify-center items-center gap-1 p-1">
        <Image src={iconUpload} width={24} height={24} alt="" />
        Click hoặc kéo thả để tải file
      </div>
    </Upload.Dragger>
  );
};
