import { useEffect, useState } from "react";

interface RangeSelectProps {
  label?: string;
  options: number[]; // Ví dụ: [100, 200, 300, ...]
  value?: { from: number; to: number };
  onChange?: (range: { from: number; to: number }) => void;
  className?: string;
}

export default function SelectNumberRange({
  label = "Khoảng",
  options,
  value = { from: options[0], to: options[options.length - 1] },
  onChange,
  className,
}: RangeSelectProps) {
  const [from, setFrom] = useState(value.from);
  const [to, setTo] = useState(value.to);

  // Đảm bảo from <= to
  useEffect(() => {
    if (from > to) setTo(from);
    onChange?.({ from, to });
  }, [from, to]);

  return (
    <div className={`flex items-center gap-2 border border-gray-300 
    px-2 py-[2px] rounded-sm ${className}`}>
      {label && <span className="font-semibold">{label}:</span>}
      <select
        className="rounded px-1 py-1"
        value={from}
        onChange={(e) => setFrom(Number(e.target.value))}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <span>-</span>
      <select
        className="rounded px-1 py-1"
        value={to}
        onChange={(e) => setTo(Number(e.target.value))}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
