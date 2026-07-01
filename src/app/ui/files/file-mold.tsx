"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { InputBase } from '@/app/ui/base/input';
import { SelectBase } from '@/app/ui/base/select';
import { FileRecord } from '@/app/data/interface/file';
import ZoomImageViewer from '../base/zoom-img';
import { UploadBaseFile } from '../base/uploadfile';
import { Mold } from '@/app/data/dataMold';
import dayjs from 'dayjs';

interface ProductImageSectionProps {
    newProductImageTitle: string;
    setNewProductImageTitle: (value: string) => void;
    fileRecordOptions: { label: string; value: string }[];
    selectedProductFileRecord: FileRecord | undefined;
    filteredFileRecords: FileRecord[];
    setSelectedProductFileRecord: (record: FileRecord | undefined) => void;
}

export const ProductImageSection = ({
    newProductImageTitle,
    setNewProductImageTitle,
    fileRecordOptions,
    selectedProductFileRecord,
    filteredFileRecords,
    setSelectedProductFileRecord,
}: ProductImageSectionProps) => {
    const [previewImageUrl, setPreviewImageUrl] = useState<string>();

    const resetForm: Mold = {
        id: "K",
        type: "1",
        long: 0,
        width: 0,
        height: 0,
        image: "",
        createdAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        updatedAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        location: "",
        createdBy: 1,
        status: 1,
        updateNote: "",
        makingDate: "",
        area: "1",
        numberBowls: 0,
        wave: "B",
        class: 3,
        name: "",
        typeProduction: 1,
        typePrint: 1,
        size: "",
        sizePaper: "",
        supplier: "",
        price: 0,
        statusPay: 0,
        comboID: null,
        paidPrice: 0,
        longMold: 0,
        widthMold: 0,
        longPaper: 0,
        widthPaper: 0,
        isPlusPaper: false,
        fileMoldDrawing: [],
        fileRepresentativeImage: [],
        fileActualMoldImage: [],
        fileProductImage: [],
        fileMoldPositionImage: [],
        fileProduction: [],
    };
    const [formData, setFormData] = useState<Mold>(resetForm);

    useEffect(() => {
        const key = selectedProductFileRecord?.designItems?.[0]?.originalfile?.[0]?.url;

        if (key) {
            const apiUrl = key;
            setPreviewImageUrl(apiUrl);
        } else if (key) {
            setPreviewImageUrl(key);
        }
    }, [selectedProductFileRecord]);

    return (
        <div className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-200">
            {/* Header */}
            <div className="font-semibold text-sm bg-gray-100 p-3 rounded-t-xl border-b border-gray-200">
                Ảnh thành phẩm (sp thực tế)
            </div>

            {/* Tên ảnh */}
            <div className="flex flex-col gap-3 mt-4 px-4">
                <div className="flex items-center gap-3">
                    <label className="w-28 text-sm font-medium text-gray-700">Tên ảnh:</label>
                    <InputBase
                        type="text"
                        placeholder="Nhập tên ..."
                        value={newProductImageTitle}
                        onChange={(e) => setNewProductImageTitle(e.target.value)}
                        className="flex-1 border border-gray-300 px-3 py-2 rounded-lg"
                    />
                </div>

                {/* Select + Image + Thông tin */}
                <div className="flex gap-4 border border-dashed border-gray-300 p-4 rounded-lg">
                    {/* Thông tin bên trái */}
                    <div className="flex-1 flex flex-col gap-2 text-gray-700">
                        <div className="flex items-center gap-2">
                            <label className="whitespace-nowrap">Chọn mã bản ghi:</label>
                            <SelectBase
                                showSearch
                                placeholder="Chọn mã bản ghi..."
                                className=" border border-gray-300 rounded-lg px-3 py-2"
                                options={fileRecordOptions}
                                value={selectedProductFileRecord?.id}
                                onChange={(value) => {
                                    const record = filteredFileRecords.find(r => r.id === value);
                                    setSelectedProductFileRecord(record || undefined);
                                }}
                            />
                        </div>

                        {/* HIỂN THỊ DỮ LIỆU */}
                        <h2 className="font-medium">
                            Mã bản ghi:
                            {selectedProductFileRecord?.id ? (
                                <Link
                                    href={`/file/${selectedProductFileRecord.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline cursor-pointer"
                                >
                                    {selectedProductFileRecord.id}
                                </Link>
                            ) : (
                                '...'
                            )}
                        </h2>
                        <h2 className="font-medium">
                            Loại sp: {selectedProductFileRecord?.ProType || '...'}
                        </h2>
                        <h2 className="font-medium">
                            Tên sp: {selectedProductFileRecord?.productname || '...'}
                        </h2>
                        <h2 className="font-medium italic text-gray-400">
                            (Nếu không có bản ghi thì thêm ảnh bên dưới !)
                        </h2>
                        {/* upfile */}
                        <UploadBaseFile
                            defaultFiles={formData.fileProduction ?? []}
                            onChange={(file) =>
                                setFormData({
                                    ...formData,
                                    fileProduction: file,
                                })
                            }
                            accept="image/*"

                        />
                    </div>

                    {/* Ảnh bên phải */}
                    {selectedProductFileRecord && previewImageUrl && (
                        <div className="flex-shrink-0 cursor-pointer">
                            <ZoomImageViewer src={previewImageUrl} className="w-30" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
