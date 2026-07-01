"use client";
import React, { useState, useRef, useEffect } from "react";

const isDev = process.env.NODE_ENV === 'development';
const URLS = {
    AUTH: isDev ? (process.env.NEXT_PUBLIC_AUTH_URL_DEV || 'http://localhost:3000') : 'https://auth.hunacloud.net',
    QUOTE: isDev ? (process.env.NEXT_PUBLIC_QUOTE_URL_DEV || 'http://localhost:3001') : 'https://quote.hunacloud.net',
    PAY: isDev ? (process.env.NEXT_PUBLIC_PAY_URL_DEV || 'http://localhost:3002') : 'https://pay.hunacloud.net',
    CRM: isDev ? (process.env.NEXT_PUBLIC_CRM_URL_DEV || 'http://localhost:3003') : 'https://crm.hunacloud.net',
    PRODUCTION: isDev ? (process.env.NEXT_PUBLIC_PRODUCTION_URL_DEV || 'http://localhost:3004') : 'https://production.hunacloud.net',
    INVOICE: isDev ? (process.env.NEXT_PUBLIC_INVOICE_URL_DEV || 'http://localhost:3005') : 'https://invoice.hunacloud.net',
    DELIVERY: isDev ? (process.env.NEXT_PUBLIC_DELIVERY_URL_DEV || 'http://localhost:3009') : 'https://giaohang.hunacloud.net',
};

const CATS = ["Tất cả", "Tài chính", "Kinh doanh", "Sản xuất", "Giao hàng", "Nhân sự", "Văn phòng số", "Nhà cung cấp"];

const APP_GROUPS: { title: string; apps: { name: string; desc: string; color: string; active: boolean; url: string }[] }[] = [
    {
        title: "Tài chính", apps: [
            { name: "Hóa đơn điện tử", desc: "Phát hành hóa đơn", color: "bg-blue-600", active: true, url: `${URLS.QUOTE}/task/red-invoice` },
            { name: "Phân tích thuế", desc: "Phân tích số liệu thuế", color: "bg-blue-500", active: true, url: `${URLS.QUOTE}/analysis` },
            { name: "Tính lệnh SX", desc: "Tính lệnh sản xuất", color: "bg-green-500", active: true, url: `${URLS.QUOTE}/analysis/production` },
            { name: "Chữ ký số", desc: "Dịch vụ chữ ký số", color: "bg-purple-500", active: false, url: "#" },
        ]
    },
    {
        title: "Kinh doanh", apps: [
            { name: "Báo giá (Quote)", desc: "Quản lý báo giá & đơn hàng", color: "bg-orange-500", active: true, url: URLS.QUOTE },
            { name: "Quản lý giao dịch", desc: "Quản lý giao dịch", color: "bg-red-500", active: true, url: URLS.PAY },
            { name: "CRM", desc: "Quản lý khách hàng", color: "bg-blue-500", active: true, url: URLS.CRM },
            { name: "Bán hàng", desc: "Quản lý bán hàng", color: "bg-purple-600", active: true, url: URLS.INVOICE },
        ]
    },
    {
        title: "Sản xuất", apps: [
            { name: "Quản lý sản xuất", desc: "Quản lý sản xuất", color: "bg-blue-600", active: true, url: URLS.PRODUCTION },
        ]
    },
    {
        title: "Giao hàng", apps: [
            { name: "Quản lý giao hàng", desc: "Quản lý giao hàng", color: "bg-orange-600", active: true, url: URLS.DELIVERY },
        ]
    },
    {
        title: "Nhân sự", apps: [
            { name: "Tuyển dụng", desc: "Quản lý tuyển dụng", color: "bg-blue-600", active: false, url: "#" },
            { name: "Thông tin nhân sự", desc: "Hệ thống thông tin HR", color: "bg-blue-500", active: false, url: "#" },
            { name: "Tiền lương", desc: "Quản lý tiền lương", color: "bg-green-600", active: false, url: "#" },
            { name: "Chấm công", desc: "Chấm công, làm thêm", color: "bg-orange-600", active: false, url: "#" },
        ]
    },
    {
        title: "Văn phòng số", apps: [
            { name: "Công việc", desc: "Quản lý công việc", color: "bg-green-500", active: false, url: "#" },
            { name: "Quy trình", desc: "Quản lý quy trình", color: "bg-cyan-500", active: false, url: "#" },
            { name: "Tài liệu", desc: "Ký tài liệu điện tử", color: "bg-blue-700", active: false, url: "#" },
            { name: "Mạng xã hội", desc: "Truyền thông nội bộ", color: "bg-blue-600", active: false, url: "#" },
        ]
    },
    {
        title: "Nhà cung cấp", apps: [
            { name: "Nhà cung cấp", desc: "Quản lý nhà cung cấp", color: "bg-green-500", active: false, url: "#" },
        ]
    },
];

export default function AppsMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeCat, setActiveCat] = useState("Tất cả");
    const [isMobile, setIsMobile] = useState(false);
    const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({ position: "fixed", top: -9999, left: -9999 });
    const btnRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Track mobile breakpoint
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 640);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    // Smart panel positioning
    const calcPosition = () => {
        if (!btnRef.current) return;
        const rect = btnRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const PANEL_W = Math.min(700, vw - 16);
        const btnMidX = (rect.left + rect.right) / 2;

        let left: number;
        if (btnMidX < vw / 2) {
            // Button on left → open right from button's left edge
            left = rect.left;
            if (left + PANEL_W > vw - 8) left = vw - PANEL_W - 8;
        } else {
            // Button on right → open left, align right edges
            left = rect.right - PANEL_W;
        }
        if (left < 8) left = 8;

        setPanelStyle({
            position: "fixed",
            top: rect.bottom + 8,
            left,
            width: PANEL_W,
            maxHeight: `calc(100vh - ${rect.bottom + 16}px)`,
        });
    };

    useEffect(() => {
        if (!isOpen) return;
        calcPosition();
        const onClickOut = (e: MouseEvent) => {
            if (
                panelRef.current && !panelRef.current.contains(e.target as Node) &&
                btnRef.current && !btnRef.current.contains(e.target as Node)
            ) setIsOpen(false);
        };
        const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
        const onResize = () => calcPosition();
        document.addEventListener("mousedown", onClickOut);
        document.addEventListener("keydown", onEsc);
        window.addEventListener("resize", onResize);
        return () => {
            document.removeEventListener("mousedown", onClickOut);
            document.removeEventListener("keydown", onEsc);
            window.removeEventListener("resize", onResize);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const groups = activeCat === "Tất cả" ? APP_GROUPS : APP_GROUPS.filter((g) => g.title === activeCat);

    const AppList = () => (
        <div className="space-y-5">
            {groups.map((g, i) => (
                <div key={i}>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <span className="w-1 h-3.5 bg-blue-500 rounded-full inline-block" />
                        {g.title}
                    </h3>
                    <div className="grid grid-cols-2 gap-1.5">
                        {g.apps.map((app, j) => (
                            <a key={j}
                                href={app.active ? app.url : undefined}
                                target={app.active && app.url !== "#" ? "_blank" : undefined}
                                onClick={!app.active ? (e) => e.preventDefault() : undefined}
                                className={`flex items-center p-2.5 rounded-xl transition-all duration-150 group ${app.active ? "hover:bg-blue-50/70 hover:shadow-sm cursor-pointer" : "opacity-40 cursor-not-allowed"
                                    }`}
                            >
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm ${app.color}`}>
                                    {app.name.charAt(0)}
                                </div>
                                <div className="ml-2.5 overflow-hidden flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                        <p className="text-[13px] font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{app.name}</p>
                                        {app.active && (
                                            <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-400 truncate">{app.desc}</p>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        // Single root div — no fragment — preserves header flex layout
        <div className="relative shrink-0">
            {/* Trigger button */}
            <button
                ref={btnRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-full hover:bg-gray-100 cursor-pointer transition-all duration-200 ${isOpen ? "bg-blue-50" : ""}`}
            >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    {[3, 10, 17].map(y => [3, 10, 17].map(x => (
                        <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" rx="1" fill={isOpen ? "#3B82F6" : "#6B7280"} />
                    )))}
                </svg>
            </button>

            {/* Backdrop — only rendered when open */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Desktop popup panel */}
            {!isMobile && (
                <div
                    ref={panelRef}
                    style={panelStyle}
                    className={`z-50 bg-white rounded-2xl shadow-2xl border border-gray-200/60 overflow-hidden flex flex-col transition-all duration-300 ease-out origin-top ${isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
                        }`}
                >
                    {/* Panel header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-linear-to-rm-blue-50/50 to-transparent shrink-0">
                        <h2 className="text-sm font-bold text-gray-800">Ứng dụng Hupuna</h2>
                        <a href={`${URLS.AUTH}/dashboard`} className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline">
                            Xem tất cả →
                        </a>
                    </div>
                    <div className="flex flex-1 overflow-hidden">
                        {/* Category sidebar */}
                        <div className="w-[148px] bg-gray-50/80 border-r border-gray-100 py-3 shrink-0 overflow-y-auto">
                            <nav className="space-y-0.5 px-2">
                                {CATS.map(c => (
                                    <button key={c} type="button" onClick={() => setActiveCat(c)}
                                        className={`w-full text-left px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-150 ${activeCat === c ? "bg-blue-100/80 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                            }`}>
                                        {c}
                                    </button>
                                ))}
                            </nav>
                        </div>
                        {/* Apps grid */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <AppList />
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile bottom sheet */}
            {isMobile && (
                <div
                    className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 flex flex-col transition-transform duration-300 ease-out ${isOpen ? "translate-y-0" : "translate-y-full"
                        }`}
                    style={{ maxHeight: "80vh" }}
                >
                    {/* Handle bar */}
                    <div className="flex justify-center pt-3 pb-1 shrink-0">
                        <div className="w-10 h-1 bg-gray-300 rounded-full" />
                    </div>
                    {/* Sheet header */}
                    <div className="flex items-center justify-between px-5 py-2 border-b border-gray-100 shrink-0">
                        <h2 className="text-sm font-bold text-gray-800">Ứng dụng Hupuna</h2>
                        <button type="button" onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                    {/* Category pills */}
                    <div className="flex gap-2 px-4 py-2.5 overflow-x-auto shrink-0 border-b border-gray-100">
                        {CATS.map(c => (
                            <button key={c} type="button" onClick={() => setActiveCat(c)}
                                className={`shrink-0 px-3 py-1 text-xs font-medium rounded-full transition-all duration-150 ${activeCat === c ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}>
                                {c}
                            </button>
                        ))}
                    </div>
                    {/* Apps list */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <AppList />
                    </div>
                </div>
            )}
        </div>
    );
}
