"use client";

import { useState } from "react";
import { ButtonBase } from "../base/button";
import { InputBase } from "../base/input";
import { ModalBase } from "../base/modal";
import { useToast } from "../base/toast";

interface LookupResult {
    id: string;
    name: string;
    address: string;
    internationalName?: string;
}

export default function TaxLookupUtility({ isOpen, onCancel }: { isOpen: boolean; onCancel: () => void }) {
    const [taxCode, setTaxCode] = useState("");
    const [result, setResult] = useState<LookupResult | null>(null);
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    const handleLookup = async () => {
        if (!taxCode) {
            toast({ type: "error", message: "Vui lòng nhập mã số thuế!" });
            return;
        }
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch(`https://api.vietqr.io/v2/business/${taxCode}`, {
                method: "GET",
            });
            const data = await res.json();
            if (data.code === "00") {
                setResult(data.data);
            } else {
                toast({ type: "error", message: "Không tìm thấy thông tin doanh nghiệp!" });
            }
        } catch {
            toast({ type: "error", message: "Lỗi kết nối đến hệ thống tra cứu!" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalBase
            isOpen={isOpen}
            onCancel={() => {
                setTaxCode("");
                setResult(null);
                onCancel();
            }}
            title={<span className="font-bold uppercase text-sm tracking-widest text-slate-800 border-b-2 border-blue-500 pb-1">Tra cứu Doanh Nghiệp</span>}
            footer={null}
            contentBtn={null}
            className="w-[600px]!"
        >
            <div className="space-y-6 p-2">
                <div className="flex gap-2 bg-slate-100 p-2 rounded-lg">
                    <InputBase
                        value={taxCode}
                        onChange={(e) => setTaxCode(e.target.value)}
                        placeholder="Nhập mã số thuế..."
                        className="w-full border-none! shadow-none! bg-transparent! focus:ring-0! text-lg font-medium"
                        onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                    />
                    <ButtonBase
                        onClick={handleLookup}
                        className="bg-blue-600! text-white! font-bold! px-6! rounded-md! shadow-sm hover:shadow-md transition-all active:scale-95 disabled:bg-slate-400!"
                        disabled={loading}
                    >
                        {loading ? "Đang tìm..." : "Tra cứu"}
                    </ButtonBase>
                </div>

                {result && (
                    <div className="relative overflow-hidden bg-white rounded-xl border border-slate-200 shadow-lg">
                        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-500 to-purple-500"></div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                                    <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 21h18" />
                                        <path d="M5 21V7l8-4 8 4v14" />
                                        <path d="M8 21v-2a4 4 0 1 1 8 0v2" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tên doanh nghiệp</label>
                                    <h3 className="text-lg font-bold text-slate-800 leading-tight">{result.name}</h3>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mã số thuế</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-md font-mono font-bold text-blue-600">{result.id}</span>
                                    </div>
                                </div>
                                {result.internationalName && (
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tên quốc tế</label>
                                        <p className="text-sm font-medium text-slate-600 truncate">{result.internationalName}</p>
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Địa chỉ đăng ký</label>
                                <p className="text-sm text-slate-700 leading-snug">{result.address}</p>
                            </div>
                        </div>
                    </div>
                )}

                {!result && !loading && (
                    <div className="text-center py-8 text-slate-400">
                        <p className="text-sm">Nhập MST để xem thông tin chi tiết</p>
                    </div>
                )}
            </div>
        </ModalBase>
    );
}
