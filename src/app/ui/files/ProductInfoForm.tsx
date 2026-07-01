import React from "react";
import { FileRecord } from "@/app/data/interface/file";
import { InputBase } from "@/app/ui/base/input";


interface ProductInfoFormProps {
    formData: FileRecord;
    setFormData: React.Dispatch<React.SetStateAction<FileRecord>>;
    isViewOnly?: boolean;
}

const ProductInfoForm: React.FC<ProductInfoFormProps> = ({
    formData,
    setFormData,
    isViewOnly,
}) => {

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement> | { text: string },
        field: keyof FileRecord
    ) => {
        const value =
            typeof e === "object" && "target" in e ? e.target.value : e.text;
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="flex-1 border border-gray-200 p-4">
            <h3 className="text-lg font-semibold mb-4">Thông tin sản phẩm</h3>
            <div className="flex flex-col gap-3">
                {/* Mã sản phẩm */}
                <div className="flex items-center">
                    <label className="w-36 text-sm font-medium">Mã sản phẩm:</label>
                    <InputBase
                        type="text"
                        placeholder="Nhập mã sản phẩm..."
                        className="border border-gray-200 px-3 py-2 rounded flex-1"
                        value={formData.idoder || ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleInputChange(e, "idoder")
                        }
                        disabled={isViewOnly}
                    />
                </div>

                {/* Tên sản phẩm */}
                <div className="flex items-center">
                    <label className="w-36 text-sm font-medium">Tên sản phẩm:</label>
                    <InputBase
                        type="text"
                        placeholder="Nhập tên sản phẩm..."
                        className="border border-gray-200 px-3 py-2 rounded flex-1"
                        value={formData.productname || ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleInputChange(e, "productname")
                        }
                        disabled={isViewOnly}
                    />
                </div>

                {/* Trạng thái sản phẩm */}
                <div className="flex items-center">
                    <label className="w-36 text-sm font-medium">Trạng thái sản phẩm:</label>
                    <InputBase
                        type="text"
                        placeholder="Nhập trạng thái"
                        className="border border-gray-200 px-3 py-2 rounded flex-1"
                        value={formData.status || ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleInputChange(e, "status")
                        }
                        disabled={isViewOnly}
                    />
                </div>

                {/* Kích thước (cm) */}
                <div className="flex items-start flex-col gap-1">
                    <label className="text-sm font-medium">Kích thước (cm):</label>
                    <div className="flex gap-2 w-full">
                        <InputBase
                            type="number"
                            placeholder="Dài"
                            value={formData.length || ""}
                            className="border border-gray-200 h-10 px-3 py-2 rounded w-full"
                            // Tái sử dụng cùng một hàm handler
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                handleInputChange(e, "length")
                            }
                            disabled={isViewOnly}
                        />
                        <InputBase
                            type="number"
                            placeholder="Rộng"
                            value={formData.width || ""}
                            className="border border-gray-200 h-10 px-3 py-2 rounded w-full"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                handleInputChange(e, "width")
                            }
                            disabled={isViewOnly}
                        />
                        {formData.ProType !== "TEM NHÃN" && (
                            <InputBase
                                type="number"
                                placeholder="Cao"
                                value={formData.height || ""}
                                className="border border-gray-200 h-10 px-3 py-2 rounded w-full"
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    handleInputChange(e, "height")
                                }
                                disabled={isViewOnly}
                            />
                        )}
                    </div>
                    <div className="flex flex-col mt-1">
                        <label className="text-sm font-medium text-gray-700">
                            Kích thước phủ bì (cm):
                        </label>
                        <p className="text-xs text-gray-700 font-medium">
                            {(() => {
                                if (!formData.size) return "0x0x0";

                                const parts = formData.size.split("x"); // ["D", "R", "C"]

                                // Nếu TEM NHÃN → bỏ chiều cao
                                if (formData.ProType === "TEM NHÃN") {
                                    return `${parts[0] || 0}x${parts[1] || 0}`;
                                }

                                // Các loại khác → hiển thị đầy đủ
                                return formData.size;
                            })()}
                        </p>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductInfoForm;
