"use client";

import { useState } from "react";
import { ButtonBase } from "../base/button";
import { InputAreaBase } from "../base/textarea";
import { ModalBase } from "../base/modal";
import { useToast } from "../base/toast";

import { translateText } from "./translate-action";

const languages = [
    { code: "auto", name: "Phát hiện ngôn ngữ", sourceOnly: true },
    { code: "vi", name: "Tiếng Việt" },
    { code: "en", name: "Tiếng Anh" },
    { code: "zh-CN", name: "Trung Quốc" },
    { code: "ko", name: "Hàn Quốc" },
    { code: "ja", name: "Nhật Bản" },
];

export default function TranslatorUtility({ isOpen, onCancel }: { isOpen: boolean; onCancel: () => void }) {
    const [sourceText, setSourceText] = useState("");
    const [targetText, setTargetText] = useState("");

    // Default: Auto -> Vietnamese
    const [sourceLang, setSourceLang] = useState("auto");
    const [targetLang, setTargetLang] = useState("vi");

    const [loading, setLoading] = useState(false);
    const toast = useToast();

    const handleTranslate = async () => {
        if (!sourceText.trim()) return;
        setLoading(true);
        try {
            // Pass language params
            const result = await translateText(sourceText, targetLang, sourceLang);

            if (result) {
                setTargetText(result);
            } else {
                setTargetText("Không thể dịch văn bản này (Lỗi kết nối).");
            }

        } catch {
            toast({ type: "error", message: "Lỗi hệ thống dịch!" });
        } finally {
            setLoading(false);
        }
    };

    const handleSwap = () => {
        // If source is auto, we can't swap reliably unless we detected language, 
        // but for now, we'll swap to "Tiếng Anh" (en) default if auto, or just swap if both specific.
        if (sourceLang === "auto") {
            setSourceLang(targetLang);
            // Default target becomes English if we started from VI, or VI if started from EN?
            setTargetLang(targetLang === "vi" ? "en" : "vi");
        } else {
            setSourceLang(targetLang);
            setTargetLang(sourceLang);
        }

        // Also swap text if there is a result
        if (targetText) {
            setSourceText(targetText);
            setTargetText(sourceText); // Logic: previous source becomes new target (often helpful)
        }
    };

    return (
        <ModalBase
            isOpen={isOpen}
            onCancel={onCancel}
            title={<span className="font-bold uppercase text-sm tracking-widest text-slate-800 border-b-2 border-blue-500 pb-1">Dịch Thuật Đa Ngôn Ngữ</span>}
            footer={null}
            contentBtn={null}
            className="w-[700px]!"
        >
            <div className="space-y-4 p-2">
                {/* Language Controls */}
                <div className="flex gap-2 items-center mb-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <select
                        value={sourceLang}
                        onChange={(e) => setSourceLang(e.target.value)}
                        className="flex-1 bg-white p-2 text-center text-sm font-bold text-slate-600 uppercase rounded-lg border-2 border-transparent hover:border-blue-100 focus:border-blue-500 outline-none cursor-pointer"
                    >
                        {languages.map(lang => (
                            <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleSwap}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-sm rounded-full transition-all"
                        title="Đảo chiều"
                    >
                        <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                    </button>

                    <select
                        value={targetLang}
                        onChange={(e) => setTargetLang(e.target.value)}
                        className="flex-1 bg-white p-2 text-center text-sm font-bold text-blue-600 uppercase rounded-lg border-2 border-transparent hover:border-blue-100 focus:border-blue-500 outline-none cursor-pointer"
                    >
                        {languages.filter(l => !l.sourceOnly).map(lang => ( // Hide "Auto" from target
                            <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative group">
                        <label className="absolute top-2 left-3 text-[10px] font-bold text-slate-400 uppercase pointer-events-none">Nguồn ({sourceText.length} ký tự)</label>
                        <InputAreaBase
                            value={sourceText}
                            onChange={(e) => setSourceText(e.target.value)}
                            placeholder="Nhập văn bản..."
                            className="w-full h-48 pt-6 pb-3 px-3 border-slate-200 rounded-xl shadow-sm bg-white focus:ring-2 focus:ring-blue-100 transition-all text-sm resize-none"
                        />
                        {sourceText && (
                            <button onClick={() => setSourceText("")} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600">
                                <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        )}
                    </div>

                    <div className="relative">
                        <label className="absolute top-2 left-3 text-[10px] font-bold text-blue-400 uppercase pointer-events-none">Kết quả</label>
                        <div className="w-full h-[192px] md:h-48 pt-6 pb-3 px-3 border border-slate-100 rounded-xl bg-slate-50 text-slate-800 overflow-y-auto text-sm leading-relaxed">
                            {loading ? (
                                <div className="flex items-center justify-center h-full text-slate-400 gap-2">
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                                </div>
                            ) : (
                                targetText || <span className="text-slate-400 italic opacity-50">Bản dịch sẽ hiện ở đây...</span>
                            )}
                        </div>
                        {targetText && (
                            <button
                                onClick={() => { navigator.clipboard.writeText(targetText); toast({ type: 'success', message: "Đã sao chép!" }) }}
                                className="absolute bottom-2 right-2 p-2 text-slate-400 hover:text-blue-500 hover:bg-white rounded-lg transition-colors"
                                title="Sao chép"
                            >
                                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <ButtonBase
                        onClick={handleTranslate}
                        disabled={loading || !sourceText.trim()}
                        className="bg-blue-600! text-white! font-bold! px-8! py-3! rounded-xl! shadow-lg hover:shadow-blue-200 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                    >
                        {loading ? "Đang dịch..." : "Dịch ngay"}
                    </ButtonBase>
                </div>
            </div>
        </ModalBase>
    );
}
