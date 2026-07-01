
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Upload, Modal, Tooltip } from "antd";
import { LoadingOutlined, AppstoreOutlined, BarsOutlined, DownloadOutlined } from "@ant-design/icons";
import type { RcFile, UploadFile } from "antd/es/upload/interface";
import dayjs from "dayjs";
import Image from "next/image";
import iconUpload from "@public/icons/upload.svg";
// iconDelete removed if unused, but checking logic...
import iconNoPhoto from "@public/images/no-photo.svg";

import { ButtonBase } from "./button";
import { useToast } from "./toast";
import { InputBase } from "./input";
import { InputAreaBase } from "./textarea";
import { QRBase } from "./qr";
import { FileInfo } from "@/app/data/interface/file";
import { cookieBase } from "@/app/utils/cookie";
import { User } from "@/app/data/dataUser";
import FileLinksSection from "./link-file";
import ZoomImageViewer from "./zoom-img";
import { generateUUID } from "@/app/utils/crypto";
import { PopconfirmBase } from "./popconfirm";

// POCKETBASE IMPORT
import PocketBase from "pocketbase";

// Cấu hình PocketBase
const pb = new PocketBase("https://files.hunacloud.net");
const FILES_COLLECTION = "files";

type UploadBaseProps = {
  defaultFiles?: FileInfo[];
  onChange?: (files: FileInfo[]) => void;
  multiple?: boolean;
  accept?: string;
  maxSizeMB?: number;
  showLinks?: boolean;
  disabled?: boolean;
  blurOnDownload?: boolean;
  className?: string;
};

export type UploadFileWithLinks = UploadFile & {
  title?: string;
  description?: string;
  links?: string[];
  folder?: string;
  source?: string;
  key?: string;      // ID của bản ghi PocketBase
  url?: string;      // URL đầy đủ của file
  fileName?: string; // Tên file gốc trên PB
  uploader?: string;
  uploadedAt?: string;
  updatedAt?: string;
};

export const UploadBaseFile: React.FC<UploadBaseProps> =
  ({
    defaultFiles = [],
    onChange,
    multiple = true,
    accept = "*",
    maxSizeMB = 300,
    showLinks = false,
    disabled,
    className,
  }) => {
    const toast = useToast();
    const user_info = cookieBase.get<User>("info_user");

    const [fileList, setFileList] = useState<UploadFileWithLinks[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [currentFile, setCurrentFile] = useState<UploadFileWithLinks | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [links, setLinks] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
    const pasteAreaRef = useRef<HTMLDivElement>(null);

    const draggerKey = useMemo(() => `upload-dragger-${generateUUID()}`, []);

    const videoRef = React.useRef<HTMLVideoElement>(null);
    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.load();
        videoRef.current.play().catch(() => { });
      }
    }, [previewImageUrl]);

    const normalizeUrl = (value?: string) => (typeof value === "string" ? value.trim() : "");
    const isBlobUrl = (value: string) => /^blob:/i.test(value);
    const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

    const getSafeFileUrl = (file: Pick<UploadFileWithLinks, "url" | "thumbUrl" | "key" | "originFileObj">) => {
      const url = normalizeUrl(file.url);
      if (url) return url;

      const keyAsUrl = normalizeUrl(file.key);
      if (isHttpUrl(keyAsUrl)) return keyAsUrl;

      const thumbUrl = normalizeUrl(file.thumbUrl);
      if (thumbUrl && !isBlobUrl(thumbUrl)) return thumbUrl;

      const maybeBlob = file.originFileObj as unknown;
      if (thumbUrl && isBlobUrl(thumbUrl) && maybeBlob instanceof Blob) return thumbUrl;

      if (maybeBlob instanceof Blob) {
        try {
          return URL.createObjectURL(maybeBlob);
        } catch (error) {
          console.error("createObjectURL failed:", error, file);
        }
      }

      return "";
    };

    const convertToExternalFiles = (internalFiles: UploadFileWithLinks[]): FileInfo[] => {
      return internalFiles.map((f) => ({
        id: f.uid,
        uid: f.uid,
        size: f.size,
        type: f.type,
        title: f.title,
        description: f.description,
        links: f.links,
        folder: f.folder,
        key: f.key,        // PB ID
        url: f.url,        // PB Full URL
        source: f.source,
        originFileObj: f.originFileObj,
        uploader: f.uploader,
        name: f.name,
        thumbUrl: f.thumbUrl,
        uploadedAt: f.uploadedAt,
        updatedAt: f.updatedAt,
      }));
    };
    //xử lý up file
    useEffect(() => {
      // Nếu không có file nào
      if (!defaultFiles || defaultFiles.length === 0) {
        // Chỉ set rỗng nếu state hiện tại đang có dữ liệu để tránh render lại vô nghĩa
        setFileList((prev) => (prev.length > 0 ? [] : prev));
        return;
      }

      // Map dữ liệu trực tiếp từ defaultFiles 
      const newFileList: UploadFileWithLinks[] = defaultFiles.map((f) => {
        // LOGIC XỬ LÝ NGÀY
        let dateDisplay = "";
        // Ép kiểu an toàn cho created
        const fileInfoWithCreated = f as FileInfo & { created?: string };

        if (f.uploadedAt) {
          dateDisplay = f.uploadedAt;
        } else if (fileInfoWithCreated.created) {
          dateDisplay = dayjs(fileInfoWithCreated.created).format("DD/MM/YYYY HH:mm:ss");
        } else {
          dateDisplay = dayjs().format("DD/MM/YYYY HH:mm:ss");
        }

        return {
          uid: f.id ?? generateUUID(),
          size: f.size ?? 0,
          type: f.type ?? "",
          title: f.title ?? "",
          description: f.description ?? "",
          links: f.links || [],
          folder: f.folder ?? "",
          key: f.key ?? "",
          url: f.url ?? "",
          source: f.source || "pocketbase",

          // QUAN TRỌNG: Giữ nguyên tham chiếu Object File, không được clone qua JSON
          originFileObj: f.originFileObj as RcFile | undefined,

          uploader: f.uploader || String(user_info?.name || ""),
          name: f.title ?? f.key ?? "unknown_file",
          uploadedAt: dateDisplay,
          updatedAt: f.updatedAt,
          thumbUrl: f.thumbUrl || f.url,
        };
      });
      setFileList(newFileList);

    }, [defaultFiles, user_info?.name]);

    const handleRemove = async (uid: string) => {
      if (disabled) return;
      const newList = fileList.filter((f) => f.uid !== uid);
      setFileList(newList);
      onChange?.(convertToExternalFiles(newList));
    };

    const beforeUpload = (file: RcFile): boolean | typeof Upload.LIST_IGNORE => {
      if (accept !== "*") {
        const fileType = file.type;
        const fileName = file.name;
        const acceptedTypes = accept.split(",").map(type => type.trim());
        let isAccepted = false;
        for (const type of acceptedTypes) {
          if (type.startsWith(".")) {
            if (fileName.toLowerCase().endsWith(type.toLowerCase())) { isAccepted = true; break; }
          } else if (type.endsWith("/*")) {
            if (fileType.startsWith(type.slice(0, -1))) { isAccepted = true; break; }
          } else {
            if (fileType === type) { isAccepted = true; break; }
          }
        }
        if (!isAccepted) {
          toast({ type: "error", message: `Định dạng file không hợp lệ (${file.name})`, duration: 3000 });
          return Upload.LIST_IGNORE;
        }
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        toast({ type: "error", message: `Dung lượng tối đa ${maxSizeMB}MB (${file.name})`, duration: 3000 });
        return Upload.LIST_IGNORE;
      }
      if (disabled) return Upload.LIST_IGNORE;

      const tempFile: UploadFileWithLinks = {
        uid: `${Date.now()}-${file.name}`,
        size: file.size ?? 0,
        originFileObj: file,
        name: file.name || "unknown_file",
        type: file.type ?? "",
        title: file.name ?? "", // Title mặc định là tên file
        description: "",
        links: [],
        folder: "",
        source: "pocketbase",
        key: "",
        uploader: String(user_info?.name || "Người dùng"),
        updatedAt: dayjs().format("DD/MM/YYYY HH:mm:ss"),
        uploadedAt: dayjs().format("DD/MM/YYYY HH:mm:ss"), // Gán ngay thời gian hiện tại
        thumbUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      };

      setCurrentFile(tempFile);
      setTitle(tempFile.title || "");
      setDescription(tempFile.description || "");
      setLinks(tempFile.links || []);
      setPreviewImageUrl(tempFile.thumbUrl || null);
      setIsEditing(false);
      setModalVisible(true);

      return false;
    };

    // ===== CẬP NHẬT THÔNG TIN FILE =====
    const handleConfirmModal = async () => {
      if (!currentFile || disabled) return;

      if (title.trim().length < 1) {
        toast({ type: "error", message: "Vui lòng nhập tiêu đề file.", duration: 3000 });
        return;
      }

      setLoading(true);
      try {
        // 1. Nếu file đã tồn tại trên PocketBase (có key/ID), gọi API Update
        if (currentFile.key) {
          console.log("Đang cập nhật file trên PocketBase ID:", currentFile.key);

          await pb.collection(FILES_COLLECTION).update(currentFile.key, {
            title: title,           // Cập nhật tên mới
            description: description // Cập nhật mô tả mới
          });

          toast({ type: "success", message: "Cập nhật thông tin thành công!" });
        }

        // 2. Cập nhật lại State ở Local (Giao diện)
        const newFile: UploadFileWithLinks = {
          ...currentFile,
          title,       // Set title mới
          description, // Set mô tả mới
          links,
          name: title, // Đồng bộ name với title
          updatedAt: dayjs().format("DD/MM/YYYY HH:mm:ss"),
        };

        const newList = [...fileList.filter((f) => f.uid !== currentFile.uid), newFile];
        setFileList(newList);
        onChange?.(convertToExternalFiles(newList));

      } catch (error) {
        console.error("Lỗi cập nhật:", error);
        toast({ type: "error", message: "Lỗi cập nhật file!", duration: 3000 });
      } finally {
        setLoading(false);
        setModalVisible(false);
        setCurrentFile(null);
        setLinks([]);
      }
    };

    // --- LOGIC XEM FILE ---
    const handleViewFile = async (file: UploadFileWithLinks) => {
      setCurrentFile(file);
      setTitle(file.title || "");
      setDescription(file.description || "");
      setLinks(file.links || []);
      setIsEditing(true);
      setModalVisible(true);
      setPreviewImageUrl(null);

      try {
        const safeUrl = getSafeFileUrl(file);
        if (safeUrl) {
          setPreviewImageUrl(safeUrl);
        } else if (file.key) {
          try {
            const record = await pb.collection(FILES_COLLECTION).getOne(file.key);
            const url = pb.files.getURL(record, record.file);
            setPreviewImageUrl(url);
          } catch (err) {
            console.error("Không tìm thấy file trên PocketBase", err);
            toast({ type: "error", message: "File không tồn tại trên hệ thống" });
          }
        } else {
          setPreviewImageUrl(file.thumbUrl || null);
        }
      } catch (error) {
        console.error("Error creating preview URL:", error);
      }
    };

    // --- LOGIC TẢI XUỐNG ---
    const handleDownload = async () => {
      if (!previewImageUrl || !currentFile?.title) {
        toast({ type: "error", message: "URL không hợp lệ." });
        return;
      }

      try {
        setIsDownloading(true);
        const response = await fetch(previewImageUrl);
        if (!response.ok) throw new Error("Network response was not ok");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", currentFile.title);
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Download error:", error);
        toast({ type: "error", message: "Lỗi khi tải xuống file." });
      } finally {
        setIsDownloading(false);
      }
    };

    const handlePasteLocal = (e: React.ClipboardEvent<HTMLDivElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) beforeUpload(file as RcFile);
        }
      }
    };

    const getFileThumb = (file: UploadFileWithLinks) => {
      if (file.type?.startsWith("image/")) {
        return getSafeFileUrl(file) || iconNoPhoto.src;
      }
      return null;
    };

    // --- RENDER GRID ITEM (Card View) ---
    const renderGridItem = (customFile: UploadFileWithLinks) => {
      const thumb = getFileThumb(customFile);
      const isVideo = customFile.type?.startsWith("video/");

      return (
        <div
          key={customFile.uid}
          className="group relative flex items-start p-2 border border-gray-200 rounded-lg bg-white hover:border-blue-400 transition-all cursor-pointer overflow-hidden min-h-[80px]"
          onClick={(e) => {
            e.stopPropagation();
            handleViewFile(customFile);
          }}
        >
          {/* Thumbnail bên trái */}
          <div className="w-[50px] h-[50px] shrink-0 rounded-md border border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center mr-3 mt-0.5">
            {thumb ? (
              <img
                src={thumb}
                alt={customFile.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase">
                  {isVideo ? "VIDEO" : (customFile.type?.split("/")[1] || "FILE").substring(0, 4)}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-start">
            <div className="flex justify-between items-start w-full">
              <p className="font-bold text-sm text-gray-800 truncate pr-4 leading-tight mb-1" title={customFile.title || customFile.name}>
                {customFile.title || customFile.name}
              </p>
              <div onClick={(e) => e.stopPropagation()} className="absolute top-2 right-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <PopconfirmBase
                  title="Xóa?"
                  description=""
                  onConfirm={() => !disabled && handleRemove(customFile.uid)}
                >
                  <div className="cursor-pointer text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-full p-1 w-6 h-6 flex items-center justify-center">
                    <span className="font-bold text-lg -mt-3">...</span>
                  </div>
                </PopconfirmBase>
              </div>
            </div>
            <div className="flex flex-col justify-start items-start w-full">
              <p className="text-[12px] text-gray-500 mb-0.5">
                {customFile.size ? (customFile.size / 1024).toFixed(1) : 0} KB • {customFile.uploader}
              </p>

              {customFile.uploadedAt && (
                <p className="text-[10px] text-gray-400">
                  {customFile.uploadedAt}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    };

    // --- RENDER LIST ITEM (Slim Row View) ---
    const renderListItem = (customFile: UploadFileWithLinks) => {
      const thumb = getFileThumb(customFile);

      return (
        <div
          key={customFile.uid}
          className="group flex items-center justify-between p-2 border-b border-gray-100 last:border-0 hover:bg-blue-50 transition-colors cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handleViewFile(customFile);
          }}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 shrink-0 rounded border border-gray-200 overflow-hidden flex items-center justify-center bg-gray-50">
              {thumb ? (
                <img src={thumb} className="w-full h-full object-cover" alt="" />
              ) : <span className="text-[8px] font-bold text-gray-400">FILE</span>}
            </div>
            <div className="flex flex-col justify-start items-start w-full min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate max-w-[200px] sm:max-w-xs">{customFile.title || customFile.name}</p>
              <p className="text-[10px] text-gray-400">
                {customFile.size ? (customFile.size / 1024).toFixed(0) : 0}KB • {customFile.uploader} • {customFile.uploadedAt}
              </p>
            </div>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <PopconfirmBase
              title="Xóa?"
              description=""
              onConfirm={() => !disabled && handleRemove(customFile.uid)}
            >
              <div className="cursor-pointer text-gray-400 hover:text-red-500 p-1">
                <span className="font-bold text-lg leading-3">...</span>
              </div>
            </PopconfirmBase>
          </div>
        </div>
      );
    };



    return (
      <div className={`flex flex-col gap-2 ${className || ""} relative`}>
        {/* Toggle View Mode Buttons - Absolute Right Top */}
        {fileList.length > 0 && (
          <div className="absolute -top-3 right-0 z-10 flex gap-1 bg-white/80 backdrop-blur-sm p-0.5 rounded-bl-lg shadow-sm border-b border-l border-gray-100 items-center">
            {/* MINI UPLOAD BUTTON */}
            <Tooltip title="Tải file lên">
              <div className="inline-block"> {/* Wrapper to avoid Tooltip button issues */}
                <Upload
                  beforeUpload={beforeUpload}
                  showUploadList={false}
                  multiple={multiple}
                  accept={accept}
                >
                  <button className="p-1.5 rounded text-xs hover:bg-blue-50 text-blue-600 transition-colors flex items-center justify-center">
                    <Image src={iconUpload} width={16} height={16} alt="Upload" />
                  </button>
                </Upload>
              </div>
            </Tooltip>

            <div className="w-px h-3 bg-gray-200 mx-1"></div>

            <Tooltip title="Lưới (Grid)">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded text-xs ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <AppstoreOutlined />
              </button>
            </Tooltip>
            <Tooltip title="Danh sách (List)">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1 rounded text-xs ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <BarsOutlined />
              </button>
            </Tooltip>
          </div>
        )}

        <Upload.Dragger
          key={draggerKey}
          multiple={multiple}
          accept={accept}
          beforeUpload={beforeUpload}
          showUploadList={false}
          className="w-full block border-0! p-0!"
          style={{ padding: 0, border: 'none', background: 'transparent' }}
          openFileDialogOnClick={false}
        >
          <div className="flex flex-col min-h-[100px] relative">
            {/* LIST FILES RENDER */}
            {fileList.length > 0 ? (
              <>
                <div
                  className={`
                                mb-2 max-h-[260px] overflow-y-auto custom-scrollbar pb-2 pr-1
                                ${viewMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' // Responsive: 1 col mobile, 2 col sm+
                      : 'flex flex-col bg-white border border-gray-100 rounded-lg shadow-sm'
                    }
                            `}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {fileList.map((file) => (
                    <div key={file.uid} onClick={(e) => e.stopPropagation()} className={viewMode === 'list' ? 'w-full' : ''}>
                      {viewMode === 'grid' ? renderGridItem(file) : renderListItem(file)}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* BIG EMPTY STATE (Drop/Paste) */
              <div
                className="
                            cursor-pointer border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 
                            hover:bg-white hover:border-blue-500 hover:shadow-md
                            transition-all flex flex-col items-center justify-center py-3 min-h-[80px] group
                            focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                        "
                tabIndex={0} // Make focusable for paste
                onPaste={handlePasteLocal}
                onClick={(e) => {
                  const input = (e.currentTarget.closest('.ant-upload') as HTMLElement)?.querySelector('input[type="file"]') as HTMLInputElement;
                  input?.click();
                }}
              >
                <div className="bg-white p-2.5 rounded-full mb-2 shadow-sm group-hover:scale-110 transition-transform text-blue-500">
                  <Image src={iconUpload} width={24} height={24} alt="" />
                </div>
                <p className="text-xs text-gray-400">Click hoặc kéo thả file</p>
              </div>
            )}
            {/* SMALL PASTE AREA (When files exist) */}
            <div
              className="
                            group flex items-center justify-center gap-2
                            border border-dashed border-gray-300 rounded bg-gray-50 
                            p-2 cursor-text transition-all duration-200
                            hover:border-blue-400 hover:bg-white hover:shadow-sm
                            focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200
                        "
              tabIndex={0}
              onPaste={handlePasteLocal}
              ref={pasteAreaRef}
              onClick={(e) => {
                e.stopPropagation();
                pasteAreaRef.current?.focus();
              }}
            >
              <span className="text-xs text-gray-500 group-focus:text-blue-600">
                Click vào đây & <span className="font-semibold border border-gray-200 bg-white px-1 rounded text-[10px] text-blue-500">Ctrl+V</span> để dán thêm ảnh/file
              </span>
            </div>
          </div>
        </Upload.Dragger>

        <Modal
          title={<span className="text-lg font-bold text-gray-800">Thông tin file</span>}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={handleConfirmModal}
          okText={loading ? "Đang tải..." : isEditing ? "Lưu thay đổi" : "Xác nhận Upload"}
          okButtonProps={{
            disabled: loading || disabled || isDownloading,
            className: "bg-blue-600 hover:bg-blue-700 shadow-sm border-0"
          }}
          cancelButtonProps={{ disabled: loading || isDownloading }}
          className="max-w-full sm:max-w-lg top-8"
        >
          {currentFile && (
            <div className="flex flex-col gap-6 pt-2 max-h-[75vh] overflow-y-auto pr-1 custom-scrollbar">

              {/* Form Section */}
              <div className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    Tiêu đề <span className="text-red-500 text-lg leading-none">*</span>
                  </label>
                  <InputBase
                    placeholder="Nhập tiêu đề (VD: Hợp đồng)..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={disabled}
                    className="font-medium text-gray-700"
                  />
                </div>

                {showLinks && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Link liên quan</label>
                    <FileLinksSection defaultLinks={links.length ? links : [""]} onChange={setLinks} />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Mô tả chi tiết</label>
                  <InputAreaBase
                    className=""
                    placeholder="Nhập ghi chú thêm về file này..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    disabled={disabled}
                  />
                </div>
              </div>

              {/* Preview Section */}
              {previewImageUrl && (
                <div className="relative w-full group/preview rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shadow-sm">

                  {/* ABSOLUTE DOWNLOAD BUTTON (TOP RIGHT) */}
                  {isEditing && (
                    <div className="absolute top-3 right-3 z-20 opacity-0 group-hover/preview:opacity-100 transition-opacity">
                      <ButtonBase
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className={`
                                rounded-full text-xs h-8 px-4 transition-all flex items-center gap-2 shadow-md border-0 backdrop-blur-md
                                ${isDownloading ? "bg-white/90 cursor-wait text-gray-400" : "bg-white/90 hover:bg-white text-blue-600 hover:text-blue-700"}
                            `}
                      >
                        {isDownloading ? <LoadingOutlined spin /> : <DownloadOutlined />}
                        <span className="font-semibold">Tải xuống</span>
                      </ButtonBase>
                    </div>
                  )}

                  {/* ABSOLUTE QR CODE (BOTTOM LEFT) */}
                  {currentFile?.key && (
                    <div className="absolute top-3 left-3 z-20 bg-white/95 p-1.5 rounded-lg shadow-md border border-gray-100 backdrop-blur-sm pointer-events-none select-none">
                      <QRBase value={currentFile.key} size={70} />
                    </div>
                  )}

                  {currentFile?.type?.startsWith("image/") && (
                    <div className="w-full flex justify-center bg-gray-100/50">
                      <ZoomImageViewer
                        key={previewImageUrl}
                        src={previewImageUrl}
                        className="max-h-[350px] w-auto object-contain"
                      />
                    </div>
                  )}

                  {currentFile?.type === "application/pdf" && (
                    <iframe
                      key={previewImageUrl}
                      src={previewImageUrl}
                      className="w-full h-[400px]"
                    />
                  )}

                  {currentFile?.type?.startsWith("video/") && (
                    <div className="w-full bg-black flex justify-center py-2">
                      <ZoomImageViewer
                        key={previewImageUrl}
                        src="" // Video doesn't work with ZoomImageViewer src directly usually, checking implementation... 
                        // Wait, ZoomImageViewer expects 'src'. Video needs 'video' tag.
                        // Previous code used 'video' tag. Reverting to video tag for video.
                        // Placeholder only, fixing in next logic block
                        className="hidden"
                      />
                      <video
                        key={previewImageUrl + "_video"} // Unique key
                        ref={videoRef}
                        controls
                        muted
                        autoPlay
                        playsInline
                        className="w-full max-h-[400px]"
                      >
                        <source src={previewImageUrl} type={currentFile.type} />
                        Trình duyệt không hỗ trợ phát video này.
                      </video>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    );
  };
