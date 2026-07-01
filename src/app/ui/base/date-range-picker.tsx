import React, { useState, useEffect, useRef, useCallback } from "react";
import { ConfigProvider, DatePicker } from "antd";
import type { DatePickerProps, TimeRangePickerProps } from "antd";
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

const { RangePicker } = DatePicker;

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

function parseInputDate(input: string, useCurrentTime = true): Dayjs | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  for (const fmt of FORMATS_WITH_YEAR) {
    const parsed = dayjs(trimmed, fmt, true);
    if (parsed.isValid()) {
      const hasTime = fmt.includes("HH");
      if (!hasTime && useCurrentTime) {
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
        if (!hasTime && useCurrentTime) {
          const now = dayjs();
          return parsed.hour(now.hour()).minute(now.minute()).second(0);
        }
        return parsed;
      }
    }
  }

  return null;
}

interface DateRangePickerProps {
  initRange?: { from?: Date | string; to?: Date | string };
  value?: [Dayjs, Dayjs];
  showTime?: boolean;
  onRangeChanges?: (dates: [Dayjs, Dayjs] | null) => void;
  className?: string;
  allowClear?: boolean;
  disabled?: boolean;
  defaultOnClear?: boolean;
  disabledDate?: (current: Dayjs) => boolean;
}

export const DateRangePicker = ({
  initRange,
  value = [dayjs("2025-01-01"), dayjs()],
  showTime = false,
  onRangeChanges,
  className = "",
  allowClear = true,
  disabled = false,
  defaultOnClear = true,
  disabledDate,
}: DateRangePickerProps) => {

  const today = dayjs();
  const yesterday = dayjs().subtract(1, "day");
  const startOfWeek = dayjs().startOf("week");
  const endOfWeek = dayjs().endOf("week");
  const lastWeekStart = dayjs().subtract(1, "week").startOf("week");
  const lastWeekEnd = dayjs().subtract(1, "week").endOf("week");
  const startOfMonth = dayjs().startOf("month");
  const endOfMonth = dayjs().endOf("month");
  const lastMonthStart = dayjs().subtract(1, "month").startOf("month");
  const lastMonthEnd = dayjs().subtract(1, "month").endOf("month");
  const startOfQuarter = dayjs().startOf("quarter");
  const endOfQuarter = dayjs().endOf("quarter");
  const lastQuarterStart = dayjs().subtract(1, "quarter").startOf("quarter");
  const lastQuarterEnd = dayjs().subtract(1, "quarter").endOf("quarter");
  const startOfYear = dayjs().startOf("year");
  const endOfYear = dayjs().endOf("year");
  const lastYearStart = dayjs().subtract(1, "year").startOf("year");
  const lastYearEnd = dayjs().subtract(1, "year").endOf("year");

  const dateFormat = showTime ? "DD/MM/YYYY HH:mm" : "DD/MM/YYYY";

  const customWeekStartEndFormat: DatePickerProps["format"] = (val) => {
    if (!val) return "";
    if (dayjs(val).format(dateFormat) === "01/01/2025") return "Từ trước";
    if (dayjs(val).isSame(today, "day")) return "Hôm nay";
    return dayjs(val).format(dateFormat);
  };

  const [values, setValues] = useState<[Dayjs, Dayjs] | null>(() => {
    if (initRange?.from && initRange?.to) {
      return [dayjs(initRange.from), dayjs(initRange.to)];
    }
    return value;
  });
  const [open, setOpen] = useState(false);
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [fromError, setFromError] = useState(false);
  const [toError, setToError] = useState(false);
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initRange?.from && initRange?.to) {
      setValues([dayjs(initRange.from), dayjs(initRange.to)]);
    }
  }, [initRange?.from, initRange?.to]);

  const rangePresets: TimeRangePickerProps["presets"] = [
    { label: "Toàn thời gian", value: [dayjs("2025-01-01"), dayjs()] },
    { label: "Hôm nay", value: [today.startOf("day"), today.endOf("day")] },
    { label: "Hôm qua", value: [yesterday.startOf("day"), yesterday.endOf("day")] },
    { label: "Tuần này", value: [startOfWeek, endOfWeek] },
    { label: "Tuần trước", value: [lastWeekStart, lastWeekEnd] },
    { label: "7 ngày qua", value: [today.subtract(6, "day").startOf("day"), today.endOf("day")] },
    { label: "10 ngày qua", value: [today.subtract(9, "day").startOf("day"), today.endOf("day")] },
    { label: "15 ngày qua", value: [today.subtract(14, "day").startOf("day"), today.endOf("day")] },
    { label: "Tháng này", value: [startOfMonth, endOfMonth] },
    { label: "Tháng trước", value: [lastMonthStart, lastMonthEnd] },
    { label: "30 ngày qua", value: [today.subtract(29, "day").startOf("day"), today.endOf("day")] },
    { label: "Quý này", value: [startOfQuarter, endOfQuarter] },
    { label: "Quý trước", value: [lastQuarterStart, lastQuarterEnd] },
    { label: "Năm nay", value: [startOfYear, endOfYear] },
    { label: "Năm trước", value: [lastYearStart, lastYearEnd] },
  ];

  const onRangeChange = (dates: null | (Dayjs | null)[]) => {
    if (dates && dates[0] && dates[1]) {
      const start = dates[0].startOf("day");
      const end = dates[1].endOf("day");
      setValues([start, end]);
      if (onRangeChanges) onRangeChanges([start, end]);
    } else {
      if (defaultOnClear && rangePresets?.[0]?.value) {
        const defaultVal = rangePresets[0].value as [Dayjs, Dayjs];
        setValues(defaultVal);
        onRangeChanges?.(defaultVal);
      } else {
        setValues(null);
        onRangeChanges?.(null);
      }
    }
    resetFooter();
  };

  const resetFooter = () => {
    setFromText(""); setToText("");
    setFromError(false); setToError(false);
  };

  // Áp dụng range từ 2 input
  const applyRange = () => {
    const parsedFrom = fromText.trim() ? parseInputDate(fromText, showTime) : values?.[0] ?? null;
    const parsedTo = toText.trim() ? parseInputDate(toText, showTime) : values?.[1] ?? null;

    let hasErr = false;
    if (fromText.trim() && !parsedFrom) { setFromError(true); hasErr = true; }
    if (toText.trim() && !parsedTo) { setToError(true); hasErr = true; }
    if (hasErr) return;

    if (parsedFrom && parsedTo) {
      const newRange: [Dayjs, Dayjs] = [parsedFrom, parsedTo];
      setValues(newRange);
      onRangeChanges?.(newRange);
      resetFooter();
      setOpen(false);
    }
  };

  const stopArrow = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.stopPropagation();
    }
  };

  const handleFromKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    stopArrow(e);
    if (e.key === "Enter") {
      e.preventDefault();
      // Nếu ô "đến" còn trống thì focus sang, ngược lại apply luôn
      if (!toText.trim()) {
        toRef.current?.focus();
      } else {
        applyRange();
      }
    }
    if (e.key === "Escape") { resetFooter(); setOpen(false); }
  };

  const handleToKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    stopArrow(e);
    if (e.key === "Enter") { e.preventDefault(); applyRange(); }
    if (e.key === "Escape") { resetFooter(); setOpen(false); }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetFooter();
    } else {
      setTimeout(() => fromRef.current?.focus(), 80);
    }
  };

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    flex: 1,
    height: 30,
    padding: "0 10px",
    border: `1px solid ${hasError ? "#ff4d4f" : "#d9d9d9"}`,
    borderRadius: 6,
    fontSize: 13,
    outline: "none",
    color: hasError ? "#ff4d4f" : "inherit",
    minWidth: 0,
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  });

  const hintText = showTime ? "dd/mm hh:mm hoặc dd/mm/yyyy" : "dd/mm hoặc dd/mm/yyyy";

  const panelHeader = (
    <div
      style={{
        padding: "8px 12px",
        borderBottom: "1px solid #f0f0f0",
      }}
    >
      <div className="flex items-center gap-3">
        <div className="font-semibold">Nhập nhanh</div>
        <div>
          <input
            ref={fromRef}
            type="text"
            value={fromText}
            onChange={(e) => { setFromText(e.target.value); setFromError(false); }}
            onKeyDown={handleFromKeyDown}
            placeholder={`Từ: ${hintText}`}
            style={inputStyle(fromError)}
            className="border-blue-500! w-[130px]!"
          />
          {fromError && (
            <div style={{ color: "#ff4d4f", fontSize: 11, marginTop: 2 }}>Sai định dạng</div>
          )}
        </div>

        <span style={{ lineHeight: "30px", color: "#bbb", flexShrink: 0 }}>→</span>

        <div>
          <input
            ref={toRef}
            type="text"
            value={toText}
            onChange={(e) => { setToText(e.target.value); setToError(false); }}
            onKeyDown={handleToKeyDown}
            placeholder={`Đến: ${hintText}`}
            style={inputStyle(toError)}
            className="border-blue-500! w-[130px]!"
          />
          {toError && (
            <div style={{ color: "#ff4d4f", fontSize: 11, marginTop: 2 }}>Sai định dạng</div>
          )}
        </div>
      </div>
    </div>
  );

  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileDateRangePicker
        values={values}
        onRangeChange={(dates) => {
          if (dates) {
            setValues(dates);
            onRangeChanges?.(dates);
          }
        }}
        rangePresets={rangePresets ?? []}
        dateFormat={dateFormat}
        className={className}
        allowClear={allowClear}
        disabled={disabled}
      />
    );
  }

  return (
    <ConfigProvider locale={viVN}>
      <RangePicker
        presets={rangePresets}
        onChange={onRangeChange}
        placement={"bottomRight"}
        format={customWeekStartEndFormat}
        placeholder={["Bắt đầu", "Kết thúc"]}
        value={values as [Dayjs, Dayjs] | undefined}
        showTime={showTime}
        className={`w-full! ${className}`}
        allowClear={allowClear}
        disabled={disabled}
        disabledDate={disabledDate}
        open={open}
        onOpenChange={handleOpenChange}
        panelRender={(panel) => (
          <div>
            {panelHeader}
            {panel}
          </div>
        )}
      />
    </ConfigProvider>
  );
};

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

function MobileDateRangePicker({
  values, onRangeChange, rangePresets, dateFormat, className = "", allowClear, disabled,
}: {
  values: [Dayjs, Dayjs] | null;
  onRangeChange: (dates: [Dayjs, Dayjs] | null) => void;
  rangePresets: NonNullable<TimeRangePickerProps["presets"]>;
  dateFormat: string;
  className?: string;
  allowClear?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [fromVal, setFromVal] = useState("");
  const [toVal, setToVal] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && values) {
      setFromVal(values[0].format("YYYY-MM-DD"));
      setToVal(values[1].format("YYYY-MM-DD"));
    }
  }, [open]);

  const displayText = values
    ? `${values[0].format("DD/MM/YYYY")} – ${values[1].format("DD/MM/YYYY")}`
    : "Chọn khoảng thời gian";

  const handleApply = useCallback(() => {
    if (fromVal && toVal) {
      const start = dayjs(fromVal).startOf("day");
      const end = dayjs(toVal).endOf("day");
      if (start.isValid() && end.isValid()) onRangeChange([start, end]);
    }
    setOpen(false);
  }, [fromVal, toVal, onRangeChange]);

  const handlePreset = useCallback((preset: { label: React.ReactNode; value: [Dayjs, Dayjs] }) => {
    const [start, end] = preset.value;
    setFromVal(start.format("YYYY-MM-DD"));
    setToVal(end.format("YYYY-MM-DD"));
    onRangeChange([start, end]);
    setOpen(false);
  }, [onRangeChange]);

  return (
    <>
      <button type="button" disabled={disabled} onClick={() => !disabled && setOpen(true)}
        className={`flex items-center gap-1.5 text-xs border border-gray-300 rounded-full px-3 py-1.5 bg-white text-gray-600 active:bg-gray-100 transition ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className="truncate max-w-[160px]">{displayText}</span>
      </button>
      {open && (
        <div ref={backdropRef} className="fixed inset-0 z-9999 flex items-end justify-center bg-black/40"
          onClick={(e) => { if (e.target === backdropRef.current) setOpen(false); }}>
          <div className="w-full max-w-md bg-white rounded-t-2xl shadow-2xl"
            style={{ maxHeight: "85vh", animation: "slideUp .25s ease-out" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-sm text-gray-800">Chọn khoảng thời gian</span>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="text-[11px] text-gray-400 uppercase font-semibold mb-2">Chọn nhanh</div>
              <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto">
                {(rangePresets as Array<{ label: React.ReactNode; value: [Dayjs, Dayjs] }>).map((preset, i) => (
                  <button key={i} type="button" onClick={() => handlePreset(preset)}
                    className="px-2.5 py-1 text-xs rounded-full border border-gray-200 bg-gray-50 text-gray-600 active:bg-blue-50 active:border-blue-300 active:text-blue-600 transition whitespace-nowrap">
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-4 py-4 space-y-3">
              <div>
                <label className="text-[11px] text-gray-400 uppercase font-semibold mb-1 block">Từ ngày</label>
                <input type="date" value={fromVal} onChange={(e) => setFromVal(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 uppercase font-semibold mb-1 block">Đến ngày</label>
                <input type="date" value={toVal} onChange={(e) => setToVal(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              <button type="button" onClick={handleApply}
                className="w-full bg-blue-500 active:bg-blue-600 text-white font-semibold py-2.5 rounded-lg text-sm transition">
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
