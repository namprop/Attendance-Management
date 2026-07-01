"use client";
import React, { useEffect, useState, useRef } from "react";
import { ConfigProvider, DatePicker } from "antd";
import type { DatePickerProps } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import weekday from "dayjs/plugin/weekday";
import isLeapYear from "dayjs/plugin/isLeapYear";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
import customParseFormat from "dayjs/plugin/customParseFormat";
import viVN from "antd/locale/vi_VN";
import "dayjs/locale/vi";

dayjs.locale("vi");
dayjs.extend(weekday);
dayjs.extend(isLeapYear);
dayjs.extend(quarterOfYear);
dayjs.extend(customParseFormat);

interface DateSinglePickerProps {
    values?: Date | Dayjs | string | null;
    showTime?: boolean;
    onDateChange?: (date: Dayjs | null) => void;
    placeholder?: string;
    className?: string;
    allowClear?: boolean;
    disabled?: boolean;
    onPresetRangeSelect?: (start: Dayjs, end: Dayjs) => void;
    isEndDate?: boolean;
    maxDate?: Dayjs;
    minDate?: Dayjs;
    picker?: "date" | "week" | "month" | "quarter" | "year";
}

const FORMATS_WITH_YEAR = [
    "DD/MM/YYYY HH:mm",
    "DD/MM/YYYY HH:mm:ss",
    "DD/MM/YYYY",
    "D/M/YYYY HH:mm",
    "D/M/YYYY",
    "DDMMYYYY HHmm",
    "DDMMYYYY",
    "DD-MM-YYYY",
    "YYYY-MM-DD HH:mm",
    "YYYY-MM-DD",
];

const NO_YEAR_PATTERNS: Array<{
    regex: RegExp;
    build: (m: RegExpMatchArray) => string;
    fmt: string;
    hasTime: boolean;
}> = [
        {
            regex: /^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{1,2})$/,
            build: (m) => `${m[1]}/${m[2]}/${dayjs().year()} ${m[3]}:${m[4]}`,
            fmt: "D/M/YYYY HH:mm",
            hasTime: true,
        },
        {
            regex: /^(\d{1,2})\/(\d{1,2})$/,
            build: (m) => `${m[1]}/${m[2]}/${dayjs().year()}`,
            fmt: "D/M/YYYY",
            hasTime: false,
        },
        {
            regex: /^(\d{1,2})-(\d{1,2})$/,
            build: (m) => `${m[1]}/${m[2]}/${dayjs().year()}`,
            fmt: "D/M/YYYY",
            hasTime: false,
        },
    ];

function parseInputDate(input: string, fallbackNow = true): Dayjs | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    for (const fmt of FORMATS_WITH_YEAR) {
        const parsed = dayjs(trimmed, fmt, true);
        if (parsed.isValid()) {
            const hasTime = fmt.includes("HH");
            if (!hasTime && fallbackNow) {
                const now = dayjs();
                return parsed.hour(now.hour()).minute(now.minute()).second(0);
            }
            return parsed;
        }
    }

    for (const { regex, build, fmt, hasTime } of NO_YEAR_PATTERNS) {
        const m = trimmed.match(regex);
        if (m) {
            const parsed = dayjs(build(m), fmt, true);
            if (parsed.isValid()) {
                if (!hasTime && fallbackNow) {
                    const now = dayjs();
                    return parsed.hour(now.hour()).minute(now.minute()).second(0);
                }
                return parsed;
            }
        }
    }

    return null;
}

export const DateSinglePicker = ({
    values = "",
    showTime = false,
    onDateChange,
    placeholder = "Chọn ngày",
    className,
    allowClear = true,
    disabled = false,
    maxDate,
    minDate,
    picker = "date",
    onPresetRangeSelect,
    isEndDate = false,
}: DateSinglePickerProps) => {
    const today = dayjs();
    const yesterday = dayjs().subtract(1, "day");
    const startOfWeek = dayjs().startOf("week");
    const startOfMonth = dayjs().startOf("month");
    const startOfQuarter = dayjs().startOf("quarter");
    const startOfYear = dayjs().startOf("year");

    const dateFormat = showTime ? "DD/MM/YYYY HH:mm" : "DD/MM/YYYY";

    const customFormat: DatePickerProps["format"] = (value) => {
        if (!value) return "";
        return dayjs(value).format(dateFormat);
    };

    const [value, setValue] = useState<Date | Dayjs | string | null>(values);
    const [open, setOpen] = useState(false);
    const [inputText, setInputText] = useState("");
    const [inputError, setInputError] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    // Ref tránh stale closure trong panelRender
    const showTimeRef = useRef(showTime);
    const onDateChangeRef = useRef(onDateChange);
    useEffect(() => { showTimeRef.current = showTime; }, [showTime]);
    useEffect(() => { onDateChangeRef.current = onDateChange; }, [onDateChange]);
    // Guard: ngăn Ant Design override giá trị khi đang apply từ custom input
    const isApplyingCustomRef = useRef(false);

    const presets = [
        { label: "Hôm nay", value: () => { const start = dayjs().startOf("day"); const end = dayjs().endOf("day"); onPresetRangeSelect?.(start, end); return isEndDate ? end : start; } },
        { label: "Hôm qua", value: () => { const start = yesterday.startOf("day"); const end = yesterday.endOf("day"); onPresetRangeSelect?.(start, end); return isEndDate ? end : start; } },
        { label: "7 ngày trước", value: () => { const start = dayjs().subtract(7, "day").startOf("day"); const end = dayjs().endOf("day"); onPresetRangeSelect?.(start, end); return isEndDate ? end : start; } },
        { label: "Tuần này", value: () => { const start = startOfWeek; const end = dayjs().endOf("week"); onPresetRangeSelect?.(start, end); return isEndDate ? end : start; } },
        { label: "Tuần trước", value: () => { const start = dayjs().subtract(1, "week").startOf("week"); const end = dayjs().subtract(1, "week").endOf("week"); onPresetRangeSelect?.(start, end); return isEndDate ? end : start; } },
        { label: "Tháng này", value: () => { const start = startOfMonth; const end = dayjs().endOf("month"); onPresetRangeSelect?.(start, end); return isEndDate ? end : start; } },
        { label: "Tháng trước", value: () => { const start = dayjs().subtract(1, "month").startOf("month"); const end = dayjs().subtract(1, "month").endOf("month"); onPresetRangeSelect?.(start, end); return isEndDate ? end : start; } },
    ];

    const applyInputFromText = (text: string) => {
        if (!text.trim()) return;
        const parsed = parseInputDate(text, showTimeRef.current);
        if (parsed) {
            // Đặt guard TRƯỚC để block onChange của Ant Design nếu nó fire
            isApplyingCustomRef.current = true;
            setValue(parsed);
            onDateChangeRef.current?.(parsed);
            setInputText("");
            setInputError(false);
            // Delay close: để Ant Design xử lý xong event rồi mới đóng
            setTimeout(() => {
                setOpen(false);
                isApplyingCustomRef.current = false;
            }, 0);
        } else {
            setInputError(true);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Chặn TẤT CẢ key events bubble lên Ant Design panel handler
        // (đặc biệt Enter: Ant Design confirm ngày focus → gọi onChange → override giá trị)
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        if (e.key === "Enter") {
            e.preventDefault();
            const currentValue = (e.target as HTMLInputElement).value;
            applyInputFromText(currentValue);
        }
        if (e.key === "Escape") {
            setInputText("");
            setInputError(false);
            setOpen(false);
        }
    };

    const onChange = (date: Dayjs | null) => {
        // Bỏ qua nếu Ant Design fire onChange trong lúc ta đang apply custom input
        if (isApplyingCustomRef.current) return;
        setValue(date);
        onDateChange?.(date);
        setInputText("");
        setInputError(false);
    };

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            setInputText("");
            setInputError(false);
        } else {
            setTimeout(() => inputRef.current?.focus(), 80);
        }
    };

    useEffect(() => {
        setValue(values ?? null);
    }, [values]);

    const pickerValue =
        value === "" || value === null
            ? null
            : typeof value === "string"
                ? dayjs(value)
                : value instanceof Date
                    ? dayjs(value)
                    : value;

    const hintText = showTime ? "vd: 16/4 09:30 hoặc 16/04/2026" : "vd: 16/4 hoặc 16/04/2026";

    return (
        <ConfigProvider locale={viVN}>
            <DatePicker
                presets={presets}
                placement="bottomRight"
                open={open}
                onOpenChange={handleOpenChange}
                value={pickerValue as Dayjs | null}
                onChange={onChange}
                showTime={showTime}
                format={customFormat}
                placeholder={placeholder}
                className={`!w-full ${className || ""}`}
                allowClear={allowClear}
                disabled={disabled}
                maxDate={maxDate}
                minDate={minDate}
                picker={picker}
                panelRender={(panel) => (
                    <div>
                        {/* Input nhập ngày ở trên panel lịch */}
                        <div
                            style={{
                                padding: "8px 12px",
                                borderBottom: "1px solid #f0f0f0",
                            }}
                            className="flex items-center gap-2"
                        >

                            <div className="font-semibold">Nhập nhanh</div>
                            <div>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => {
                                        setInputText(e.target.value);
                                        setInputError(false);
                                    }}
                                    onKeyDown={handleKeyDown}
                                    placeholder={hintText}
                                    style={{
                                        width: "100%",
                                        height: 30,
                                        padding: "0 10px",
                                        border: `1px solid ${inputError ? "#ff4d4f" : "#d9d9d9"}`,
                                        borderRadius: 6,
                                        fontSize: 13,
                                        outline: "none",
                                        color: inputError ? "#ff4d4f" : "inherit",
                                        boxSizing: "border-box",
                                        transition: "border-color 0.15s",
                                    }}
                                    className="border-blue-500! focus:border-blue-700!"
                                />
                            </div>
                            {inputError && (
                                <div style={{ color: "#ff4d4f", fontSize: 11, marginTop: 2 }}>
                                    Không nhận ra định dạng ngày — thử lại (vd: 16/4)
                                </div>
                            )}
                        </div>
                        {panel}
                    </div>
                )}
            />
        </ConfigProvider>
    );
};

export default DateSinglePicker;
