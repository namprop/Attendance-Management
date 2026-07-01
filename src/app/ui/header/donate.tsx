"use client";

import { useState } from "react";
import { ModalBase } from "../base/modal";
import { useToast } from "../base/toast";

// Bank Information
const BANK_INFO = {
    bankId: "TPB",
    accountNo: "03631707201",
    accountName: "VUONG BA QUANG",
    template: "compact2" // compact2, compact, qr_only, print
};

// VietQR API URL
const QR_URL = `https://img.vietqr.io/image/${BANK_INFO.bankId}-${BANK_INFO.accountNo}-${BANK_INFO.template}.png?addInfo=Donate%20Em%20Quang&accountName=${encodeURIComponent(BANK_INFO.accountName)}`;

export default function DonateButton() {
    const [isOpen, setIsOpen] = useState(false);
    const toast = useToast();

    const handleCopy = () => {
        navigator.clipboard.writeText(BANK_INFO.accountNo);
        toast({ type: "success", message: "Đã sao chép số tài khoản!" });
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-pink-50 text-pink-600 hover:bg-pink-100 hover:scale-105 transition-all group"
                title="Ủng hộ tác giả"
            >
                <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:fill-pink-500 group-hover:text-pink-600 transition-colors"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
                    </span>
                </div>
                <span className="font-semibold text-sm hidden sm:inline-block">Donate</span>
            </button>

            <ModalBase
                isOpen={isOpen}
                onCancel={() => setIsOpen(false)}
                title={<span className="font-bold text-lg text-pink-600 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-pink-500"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                    Ủng hộ / Donate
                </span>}
                footer={null}
                contentBtn={null}
                className="w-[400px]!"
            >
                <div className="flex flex-col items-center gap-4 p-2">
                    <div className="text-center text-gray-600 text-sm mb-2">
                        Cảm ơn bạn đã sử dụng và ủng hộ ứng dụng! ❤️
                    </div>

                    {/* QR Code Container */}
                    <div className="relative w-full aspect-4/5 bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={QR_URL}
                            alt="VietQR Donate"
                            className="w-full h-full object-contain p-2"
                        />
                        {/* Download overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a href={QR_URL} download="abc-donate-qr.png" target="_blank" rel="noreferrer" className="bg-white text-gray-800 px-4 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Tải mã QR
                            </a>
                        </div>
                    </div>

                    {/* Bank Details */}
                    <div className="w-full bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Ngân hàng</span>
                            <span className="font-bold text-gray-800">TPBank</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Chủ tài khoản</span>
                            <span className="font-bold text-gray-800">{BANK_INFO.accountName}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 block min-w-[80px]">Số tài khoản</span>
                            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-gray-200">
                                <span className="font-mono font-bold text-blue-600 text-base">{BANK_INFO.accountNo}</span>
                                <button
                                    onClick={handleCopy}
                                    className="text-gray-400 hover:text-blue-500 transition-colors"
                                    title="Sao chép"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </ModalBase>
        </>
    );
}
