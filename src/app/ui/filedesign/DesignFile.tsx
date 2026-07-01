
import React from "react";
// --- Base Components ---
import { ButtonBase } from "@/app/ui/base/button";
import { UploadBaseFile } from "@/app/ui/base/uploadfile";
import { RadioBase } from "@/app/ui/base/radio";
// --- Service ---
import { WithPermission } from "@/app/service/permissions/permission-gate";
// --- Types ---
import { User } from "@/app/data/dataUser";
import {
    FileRecord,
    FileInfo,
    DesignItemState,

} from "@/app/data/interface/file";
import { InputBase } from "../base/input";
import { Mold } from "@/app/data/dataMold";
import { MoldInfoCard } from "../base/info-mold";

// ------------------- TYPES -------------------

type CurrentUploadConfig = {
    key: keyof FileRecord;
    label: string;
    folder: string;
} | undefined;

type StageOption = {
    label: string;
    value: number;
};

// 1. Tạo một kiểu cơ sở bao gồm TẤT CẢ các thuộc tính của file
//    mà UploadBaseFile có thể trả về.
type BaseFile = (
    | FileInfo

) & {
    originFileObj?: File;
    status?: string;
    name?: string;
};

// 2. Tạo một kiểu chỉ chứa các key là mảng file trong DesignItemState
type FileArrayKey = 'originalfile' | 'fileAttached' | 'fileregularbox' | 'fileboxoffset' | 'filetray' | 'filebox1' | 'filecut' | 'fileprint';


interface DesignItemsSectionProps {
    designItems: DesignItemState[];
    isViewOnly?: boolean;
    user_info: User | null | undefined;
    filteredOptionStage: StageOption[];
    currentUpload: CurrentUploadConfig;
    showFileCut: boolean;
    showFileMoldProp: boolean;

    // Handlers from parent
    addDesignItem: () => void;
    removeDesignItem: (index: number) => void;

    // 3. SỬA ĐỔI: Sử dụng Generic cho updateDesignItem
    updateDesignItem: <K extends keyof DesignItemState>(
        index: number,
        field: K,
        value: DesignItemState[K] // value giờ sẽ khớp chính xác với field
    ) => void;

    // 4. SỬA ĐỔI: Sử dụng FileArrayKey và BaseFile[] cho updateDesignItemFile
    updateDesignItemFile: (
        index: number,
        field: FileArrayKey, // Chỉ cho phép các key là mảng file
        files: BaseFile[],   // Mảng file cơ sở
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
                const currentIdStage = filteredOptionStage.some(opt => opt.value === item.idStage)
                    ? item.idStage
                    : filteredOptionStage[0]?.value;

                // --- Chỉ hiện Mold khi idStage === 1 ---
                const shouldShowFileMold = showFileMoldProp && currentIdStage === 1;

                return (
                    <div key={item.id} className="mt-2 border border-gray-200 p-2 relative">
                        <div>
                            {index > 0 && (
                                <ButtonBase
                                    onClick={() => removeDesignItem(index)}
                                    className="absolute top-1 right-1 !p-0 !h-5 !w-5 text-red-500 hover:bg-red-100 z-10"
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
                                        className="!flex-row justify-start items-center gap-3"
                                        value={
                                            filteredOptionStage.some(opt => opt.value === item.idStage)
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

                        {/* Vùng Upload */}
                        <div className="grid grid-cols-3 gap-4 mt-8">
                            {/* File ảnh thật */}
                            <div className="flex flex-col">
                                <div className="font-semibold text-sm bg-gray-100 p-2 mb-2">
                                    File ảnh thành phẩm (gửi khách):
                                </div>
                                <UploadBaseFile
                                    defaultFiles={item.originalfile || []}
                                    onChange={(files: FileInfo[]) => // Đã được typed
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

                            {/* --- KHỐI KHUÔN BẾ MỚI --- */}
                            {shouldShowFileMold && (
                                <div>
                                    <div className="flex items-center gap-3 bg-gray-100 mb-2 relative">
                                        {/* Phần mô tả */}
                                        <div className="font-semibold text-sm w-40">
                                            Tìm kiếm khuôn (có sẵn)
                                        </div>

                                        {/* MoldSearch chiếm phần còn lại */}
                                        <div className="flex-1">
                                            {/* <MoldSearch
                                                classNameContent="right-0"
                                                onSelectMold={(mold: Mold) => {
                                                    updateDesignItem(index, "dataMold", mold);
                                                }}
                                            /> */}
                                        </div>
                                    </div>
                                    {/* Thông tin khuôn bế */}
                                    {item.dataMold && (
                                        <MoldInfoCard mold={item.dataMold} />
                                    )}
                                </div>
                            )}
                            <div className="flex flex-col">
                                <div className="font-semibold text-sm bg-gray-100 p-2 mb-2">
                                    File IN Sales (gửi khách):
                                </div>
                                <div >
                                    <UploadBaseFile
                                        defaultFiles={item.fileprint || []}
                                        onChange={(files: FileInfo[]) => // Đã được typed
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
                            <WithPermission
                                roleId={Number(user_info?.role)}
                                permission="Design"
                            >
                                {/* Upload động theo ProType */}
                                {currentUpload && (
                                    <div className="flex flex-col">
                                        <div className="font-semibold text-sm bg-gray-100 p-2 mb-2 ">
                                            {currentUpload.label} (IN TK):
                                        </div>

                                        <UploadBaseFile
                                            {...(currentUpload.key !== "fileAttached"
                                                ? { showLinks: true }
                                                : {})}

                                            // 5. SỬA ĐỔI: Ép kiểu defaultFiles về BaseFile[]
                                            defaultFiles={
                                                (item[currentUpload.key as FileArrayKey] as BaseFile[]) || []
                                            }
                                            // 6. SỬA ĐỔI: Ép kiểu `files` về BaseFile[]
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
                                )}
                                {/* File cắt */}
                                {showFileCut && (
                                    <div className="flex flex-col">
                                        <div className="font-semibold text-sm bg-gray-100 p-2 mb-2">
                                            File Cắt:
                                        </div>

                                        <UploadBaseFile
                                            defaultFiles={item.filecut || []}
                                            onChange={(files: FileInfo[]) => // Đã được typed
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
                                )}

                            </WithPermission>

                        </div>
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
                        className="!p-1 !h-6 !px-3 bg-blue-500 text-white rounded hover:bg-blue-600"
                        disabled={isViewOnly}
                    >
                        +
                    </ButtonBase>
                </div>
            </WithPermission>
        </>
    );
}

export default DesignItemsSection;
