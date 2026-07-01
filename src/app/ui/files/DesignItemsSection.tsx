"use client";

import React from "react";
// --- Base Components ---
import { ButtonBase } from "@/app/ui/base/button";
import { UploadBaseFile } from "@/app/ui/base/uploadfile";
import { RadioBase } from "@/app/ui/base/radio";
import { InputBase } from "@/app/ui/base/input";
// --- Service ---
import { WithPermission } from "@/app/service/permissions/permission-gate";
// --- Types ---
import { User } from "@/app/data/dataUser";
import {
    FileRecord,
    FileInfo,
    DesignItemState,
} from "@/app/data/interface/file";
import { Mold } from "@/app/data/dataMold";

// --- Custom Components ---
import { MoldInfoCard } from "../base/info-mold";
// import { FileRecordSearch } from "./search-files";
// import { FileRecordInfoCard } from "./info-file";

// ------------------- TYPES -------------------

type CurrentUploadConfig =
    | {
        key: keyof FileRecord;
        label: string;
        folder: string;
    }
    | undefined;

type StageOption = {
    label: string;
    value: number;
};

// Kiểu cơ sở cho file
type BaseFile = FileInfo & {
    originFileObj?: File;
    status?: string;
    name?: string;
};

// Các key là mảng file trong DesignItemState
type FileArrayKey =
    | "originalfile"
    | "fileAttached"
    | "fileregularbox"
    | "fileboxoffset"
    | "filetray"
    | "filebox1"
    | "filecut"
    | "fileprint"
    | "filevideo";

interface DesignItemsSectionProps {
    designItems: DesignItemState[];
    isViewOnly?: boolean;
    user_info: User | null | undefined;
    filteredOptionStage: StageOption[];
    currentUpload: CurrentUploadConfig;
    showFileCut: boolean;
    showFileMoldProp: boolean;

    // Handlers
    addDesignItem: () => void;
    removeDesignItem: (index: number) => void;
    updateDesignItem: <K extends keyof DesignItemState>(
        index: number,
        field: K,
        value: DesignItemState[K]
    ) => void;
    updateDesignItemFile: (
        index: number,
        field: FileArrayKey,
        files: BaseFile[],
        folder: string
    ) => void;
}

const DesignItemsSection: React.FC<DesignItemsSectionProps> = ({
    designItems,
    isViewOnly,
    user_info,
    filteredOptionStage,
    currentUpload,
    showFileCut,
    showFileMoldProp,
    addDesignItem,
    removeDesignItem,
    updateDesignItem,
    updateDesignItemFile,
}) => {
    return (
        <>
            {/* --- Vòng lặp Map qua các designItems --- */}
            {designItems.map((item, index) => {
                // --- Xác định giá trị idStage hợp lệ ---
                const currentIdStage = filteredOptionStage.some(
                    (opt) => opt.value === item.idStage
                )
                    ? item.idStage
                    : filteredOptionStage[0]?.value;

                // --- Chỉ hiện Mold khi idStage === 1 ---
                const shouldShowFileMold = showFileMoldProp && currentIdStage === 1;

                return (
                    <div
                        key={item.id}
                        className="mt-2 border border-gray-200 p-2 relative"
                    >
                        <div>
                            {index > 0 && (
                                <ButtonBase
                                    onClick={() => removeDesignItem(index)}
                                    className="absolute top-1 right-1 p-0! h-5! w-5! text-red-500 hover:bg-red-100 z-10"
                                    disabled={isViewOnly}
                                >
                                    X
                                </ButtonBase>
                            )}

                            <h3 className="text-base font-semibold text-gray-800 border-b pb-2 mb-5">
                                Phần này dành cho thiết kế {index + 1}
                            </h3>

                            <WithPermission
                                roleId={Number(user_info?.role)}
                                permission="Design"
                                mode="readonly"
                            >
                                {/* Công đoạn */}
                                <div className="flex items-center gap-3">
                                    <RadioBase
                                        className="flex-row! justify-start items-center gap-3"
                                        value={
                                            filteredOptionStage.some(
                                                (opt) => opt.value === item.idStage
                                            )
                                                ? item.idStage
                                                : filteredOptionStage[0]?.value
                                        }
                                        options={filteredOptionStage}
                                        onChange={(e) =>
                                            updateDesignItem(index, "idStage", e.target.value)
                                        }
                                        buttonStyle="solid"
                                        optionType="button"
                                        size="middle"
                                        disabled={isViewOnly}
                                    />
                                </div>

                                <div className="flex items-center gap-2 mt-3 w-100">
                                    <label className="w-28 text-sm font-medium">Tên combo:</label>
                                    <InputBase
                                        type="text"
                                        placeholder="Nhập tên combo..."
                                        value={item.namecombo || ""}
                                        className="border border-gray-200 px-2 rounded"
                                        disabled={isViewOnly}
                                        onChange={(e) =>
                                            updateDesignItem(index, "namecombo", e.target.value)
                                        }
                                    />
                                </div>
                            </WithPermission>
                        </div>

                        {/* --- Vùng Upload - SỬ DỤNG GRID FLATTEN --- */}
                        {/* Các item con nằm trực tiếp trong grid, không chia cột cha */}
                        <div className="grid grid-cols-3 gap-4 mt-8">

                            {/* 1. File ảnh thật (Luôn hiện) */}
                            <div className="flex flex-col h-full">
                                <div className="font-semibold text-sm bg-gray-100 p-2 mb-2">
                                    File ảnh thành phẩm (gửi khách):
                                </div>
                                <div className="flex-1">
                                    <UploadBaseFile
                                        defaultFiles={item.originalfile || []}
                                        onChange={(files: FileInfo[]) =>
                                            updateDesignItemFile(
                                                index,
                                                "originalfile",
                                                files,
                                                "File ảnh thật"
                                            )
                                        }
                                        accept="image/*"
                                        disabled={isViewOnly}
                                    />
                                </div>
                            </div>

                            {/* 2. KHUÔN BẾ (Hiện/Ẩn dựa trên shouldShowFileMold) */}
                            {shouldShowFileMold && (
                                <div className="flex flex-col h-full">
                                    <div className="flex items-center gap-3 bg-gray-100 mb-2 relative">
                                        <div className="font-semibold text-sm w-40 pl-2">
                                            Tìm kiếm khuôn (có sẵn)
                                        </div>
                                        <div className="flex-1">
                                            {/* <MoldSearch
                                                classNameContent="right-0"
                                                onSelectMold={(mold: Mold) => {
                                                    updateDesignItem(index, "dataMold", mold);
                                                }}
                                            /> */}
                                        </div>
                                    </div>
                                    {item.dataMold && <MoldInfoCard mold={item.dataMold} />}
                                </div>
                            )}

                            {/* 3. Upload động theo ProType (Ví dụ: File Tem nhãn) */}
                            {/* Đưa lên đây để khi ẩn Mold nó sẽ nhảy vào giữa */}
                            <WithPermission
                                roleId={Number(user_info?.role)}
                                permission="Design"
                            >
                                {currentUpload && (
                                    <div className="flex flex-col h-full">
                                        <div className="font-semibold text-sm bg-gray-100 p-2 mb-2 ">
                                            {currentUpload.label} (IN TK):
                                        </div>
                                        <div className="flex-1">
                                            <UploadBaseFile
                                                {...(currentUpload.key !== "fileAttached"
                                                    ? { showLinks: true }
                                                    : {})}
                                                defaultFiles={
                                                    (item[currentUpload.key as FileArrayKey] as BaseFile[]) ||
                                                    []
                                                }
                                                onChange={(files: BaseFile[]) =>
                                                    updateDesignItemFile(
                                                        index,
                                                        currentUpload.key as FileArrayKey,
                                                        files,
                                                        currentUpload.folder
                                                    )
                                                }
                                                disabled={isViewOnly}
                                            />
                                        </div>
                                    </div>
                                )}
                            </WithPermission>

                            {/* 4. File IN Sales (Luôn hiện) */}
                            <div className="flex flex-col h-full">
                                <div className="font-semibold text-sm bg-gray-100 p-2 mb-2">
                                    File IN Sales (gửi khách):
                                </div>
                                <div className="flex-1">
                                    <UploadBaseFile
                                        defaultFiles={item.fileprint || []}
                                        onChange={(files: FileInfo[]) =>
                                            updateDesignItemFile(
                                                index,
                                                "fileprint",
                                                files,
                                                "File In sales gửi khách"
                                            )
                                        }
                                        disabled={isViewOnly}
                                    />
                                </div>
                            </div>

                            {/* 5. File cắt */}
                            <WithPermission
                                roleId={Number(user_info?.role)}
                                permission="Design"
                            >
                                {showFileCut && (
                                    <div className="flex flex-col h-full">
                                        <div className="font-semibold text-sm bg-gray-100 p-2 mb-2">
                                            File Cắt:
                                        </div>
                                        <div className="flex-1">
                                            <UploadBaseFile
                                                defaultFiles={item.filecut || []}
                                                onChange={(files: FileInfo[]) =>
                                                    updateDesignItemFile(
                                                        index,
                                                        "filecut",
                                                        files,
                                                        "File tem nhãn"
                                                    )
                                                }
                                                disabled={isViewOnly}
                                            />
                                        </div>
                                    </div>
                                )}
                            </WithPermission>

                            {/* 6. File video */}
                            <WithPermission
                                roleId={Number(user_info?.role)}
                                permission="Sales"
                            >
                                {showFileCut && (
                                    <div className="flex flex-col h-full">
                                        <div className="font-semibold text-sm bg-gray-100 p-2 mb-2">
                                            File Video:
                                        </div>
                                        <div className="flex-1">
                                            <UploadBaseFile
                                                defaultFiles={item.filevideo || []}
                                                accept="video/*"
                                                onChange={(files: FileInfo[]) =>
                                                    updateDesignItemFile(
                                                        index,
                                                        "filevideo",
                                                        files,
                                                        "File Video"
                                                    )
                                                }
                                                disabled={isViewOnly}
                                            />
                                        </div>
                                    </div>
                                )}
                            </WithPermission>
                        </div>
                        {/* Kết thúc grid */}
                    </div>
                );
            })}

            {/* --- Nút Add "+" --- */}
            <WithPermission
                roleId={Number(user_info?.role)}
                permission="Design"
                mode="readonly"
            >
                <div className="flex justify-end mt-4">
                    <ButtonBase
                        onClick={addDesignItem}
                        className="p-1! h-6! px-3! bg-blue-500 text-white rounded hover:bg-blue-600"
                        disabled={isViewOnly}
                    >
                        +
                    </ButtonBase>
                </div>
            </WithPermission>
        </>
    );
};

export default DesignItemsSection;
