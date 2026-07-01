"use client";

import React, { useState } from "react";

import { ButtonBase } from "../base/button";
import CalculatorUtility from "./calculator-utility";
import TaxLookupUtility from "./tax-lookup-utility";
import TranslatorUtility from "./translator-utility";
import DonateButton from "./donate";

const IconCalculator = (
    <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500">
        <rect x="4" y="2" width="16" height="20" rx="2"></rect>
        <line x1="8" y1="6" x2="16" y2="6"></line>
        <line x1="16" y1="14" x2="16" y2="14"></line>
        <line x1="16" y1="18" x2="16" y2="18"></line>
        <line x1="12" y1="14" x2="12" y2="14"></line>
        <line x1="12" y1="18" x2="12" y2="18"></line>
        <line x1="8" y1="14" x2="8" y2="14"></line>
        <line x1="8" y1="18" x2="8" y2="18"></line>
    </svg>
);

const IconTax = (
    <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        <path d="M11 8v6M8 11h6" />
    </svg>
);

const IconTranslate = (
    <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
        <path d="M5 8l6 6"></path>
        <path d="M4 14h6"></path>
        <path d="M2 5h12"></path>
        <path d="M7 2h1"></path>
        <path d="M22 22l-5-10-5 10"></path>
        <path d="M14 18h6"></path>
    </svg>
);

const UtilityItem = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
    <ButtonBase
        onClick={onClick}
        className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-slate-100 transition-colors w-full h-full gap-2"
    >
        <div className="bg-slate-50 p-2 rounded-full shadow-sm">{icon}</div>
        <span className="text-xs font-medium text-slate-600 text-center leading-tight">{label}</span>
    </ButtonBase>
)

export default function UtilitiesDropdown() {
    const [activeUtility, setActiveUtility] = useState<"calc" | "tax" | "trans" | null>(null);

    return (
        <>
            <div className="relative group z-50">
                <ButtonBase
                    className="flex-none p-0! rounded-full hover:bg-slate-100 transition-all text-slate-500 hover:text-blue-600 focus:bg-blue-50 focus:text-blue-600 outline-none"
                >
                    {/* {IconApps} */}
                    <svg viewBox="0 0 24 24" fill="none" width={23} height={23}>
                        <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                        <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                        <g id="SVGRepo_iconCarrier">
                            <path d="M3.29701 5.2338C3.52243 4.27279 4.27279 3.52243 5.2338 3.29701V3.29701C6.06663 3.10165 6.93337 3.10165 7.7662 3.29701V3.29701C8.72721 3.52243 9.47757 4.27279 9.70299 5.2338V5.2338C9.89835 6.06663 9.89835 6.93337 9.70299 7.7662V7.7662C9.47757 8.72721 8.72721 9.47757 7.7662 9.70299V9.70299C6.93337 9.89835 6.06663 9.89835 5.2338 9.70299V9.70299C4.27279 9.47757 3.52243 8.72721 3.29701 7.7662V7.7662C3.10166 6.93337 3.10166 6.06663 3.29701 5.2338V5.2338Z" stroke="#363853" strokeWidth="1.5"></path>
                            <path d="M3.29701 16.2338C3.52243 15.2728 4.27279 14.5224 5.2338 14.297V14.297C6.06663 14.1017 6.93337 14.1017 7.7662 14.297V14.297C8.72721 14.5224 9.47757 15.2728 9.70299 16.2338V16.2338C9.89835 17.0666 9.89835 17.9334 9.70299 18.7662V18.7662C9.47757 19.7272 8.72721 20.4776 7.7662 20.703V20.703C6.93337 20.8983 6.06663 20.8983 5.2338 20.703V20.703C4.27279 20.4776 3.52243 19.7272 3.29701 18.7662V18.7662C3.10166 17.9334 3.10166 17.0666 3.29701 16.2338V16.2338Z" stroke="#0095FF" strokeWidth="1.5"></path>
                            <path d="M14.297 5.2338C14.5224 4.27279 15.2728 3.52243 16.2338 3.29701V3.29701C17.0666 3.10165 17.9334 3.10165 18.7662 3.29701V3.29701C19.7272 3.52243 20.4776 4.27279 20.703 5.2338V5.2338C20.8983 6.06663 20.8983 6.93337 20.703 7.7662V7.7662C20.4776 8.72721 19.7272 9.47757 18.7662 9.70299V9.70299C17.9334 9.89835 17.0666 9.89835 16.2338 9.70299V9.70299C15.2728 9.47757 14.5224 8.72721 14.297 7.7662V7.7662C14.1017 6.93337 14.1017 6.06663 14.297 5.2338V5.2338Z" stroke="#363853" strokeWidth="1.5"></path>
                            <path d="M14.297 16.2338C14.5224 15.2728 15.2728 14.5224 16.2338 14.297V14.297C17.0666 14.1017 17.9334 14.1017 18.7662 14.297V14.297C19.7272 14.5224 20.4776 15.2728 20.703 16.2338V16.2338C20.8983 17.0666 20.8983 17.9334 20.703 18.7662V18.7662C20.4776 19.7272 19.7272 20.4776 18.7662 20.703V20.703C17.9334 20.8983 17.0666 20.8983 16.2338 20.703V20.703C15.2728 20.4776 14.5224 19.7272 14.297 18.7662V18.7662C14.1017 17.9334 14.1017 17.0666 14.297 16.2338V16.2338Z" stroke="#363853" strokeWidth="1.5"></path>
                        </g>
                    </svg>
                </ButtonBase>

                <div className="absolute right-0 top-full mt-2 w-[320px] p-4 shadow-2xl rounded-2xl border border-slate-100 bg-white origin-top-right transform transition-all duration-200 opacity-0 invisible translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 z-100">
                    <div className="mb-3 px-1 flex justify-between items-center">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tiện ích mở rộng</h3>
                        {/* Donate */}
                        <div><DonateButton /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <UtilityItem
                            icon={IconCalculator}
                            label="Máy tính"
                            onClick={() => setActiveUtility("calc")}
                        />
                        <UtilityItem
                            icon={IconTax}
                            label="Tra cứu MST"
                            onClick={() => setActiveUtility("tax")}
                        />
                        <UtilityItem
                            icon={IconTranslate}
                            label="Dịch thuật"
                            onClick={() => setActiveUtility("trans")}
                        />
                    </div>
                    {/* <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                        <span className="text-[10px] text-slate-400">Thêm tiện ích mới? Liên hệ Admin</span>
                    </div> */}
                </div>
            </div>

            {/* Modals rendered outside DropdownBase to persist state and prevent unmounting */}
            <CalculatorUtility
                isOpen={activeUtility === 'calc'}
                onCancel={() => setActiveUtility(null)}
            />
            <TaxLookupUtility
                isOpen={activeUtility === 'tax'}
                onCancel={() => setActiveUtility(null)}
            />
            <TranslatorUtility
                isOpen={activeUtility === 'trans'}
                onCancel={() => setActiveUtility(null)}
            />
        </>
    );
}
