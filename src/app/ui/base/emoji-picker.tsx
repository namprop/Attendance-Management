// components/EmojiPicker.tsx

import { emojiData } from '@/app/utils/emoji-data';
import React, { useState, useRef, useEffect } from 'react'; // Thêm useRef, useEffect

interface EmojiPickerProps {
    onSelectEmoji: (emoji: string) => void;
    onClose: () => void; // THÊM HÀM ĐỂ GỌI KHI ĐÓNG
    className?: string;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelectEmoji, onClose, className }) => {
    const [activeTab, setActiveTab] = useState(0);
    const pickerRef = useRef<HTMLDivElement>(null); // REF CHO CHÍNH COMPONENT PICKER

    // HOOK XỬ LÝ CLICK RA NGOÀI
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            // Kiểm tra xem click có nằm ngoài cửa sổ picker không
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                // Đóng picker bằng cách gọi hàm onClose được truyền từ component cha
                onClose();
            }
        }

        document.addEventListener("mousedown", handleClickOutside);

        // Cleanup: Hủy lắng nghe khi component bị unmount
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onClose]); // Chạy lại khi hàm onClose thay đổi (thường là không)


    const currentGroup = emojiData[activeTab];

    return (
        // ÁP DỤNG REF VÀO DIV BAO NGOÀI CÙNG
        <div
            ref={pickerRef}
            className={`absolute z-10 bottom-full mb-2 w-72 bg-white border border-gray-300 rounded-lg shadow-xl overflow-hidden ${className}`}
        >
            {/* ... (Nội dung EmojiPicker không đổi) ... */}

            {/* 1. Phần tiêu đề nhóm */}
            <div className="p-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">{currentGroup.title}</h3>
            </div>

            {/* 2. Phần lưới Emoji */}
            <div className="h-56 overflow-y-auto p-2">
                <div className="grid grid-cols-8 gap-1">
                    {currentGroup.emojis.map((emoji, index) => (
                        <button
                            key={index}
                            type="button"
                            className="text-2xl hover:bg-gray-100 p-1 rounded transition-colors"
                            onClick={() => {
                                onSelectEmoji(emoji);
                                // onClose(); // Tùy chọn: Đóng sau khi chọn (nếu muốn)
                            }}
                            title={emoji}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            </div>

            {/* 3. Phần thanh điều hướng nhóm */}
            <div className="flex justify-around border-t border-gray-200 bg-gray-50 p-1">
                {emojiData.map((group, index) => (
                    <button
                        key={index}
                        type="button"
                        className={`text-xl p-1 rounded ${index === activeTab ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
                        onClick={() => setActiveTab(index)}
                        title={group.title}
                    >
                        {group.emojis[0]}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default EmojiPicker;
