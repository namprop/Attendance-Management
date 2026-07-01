"use client";

import React, { useState, useEffect } from 'react';

interface CircularProps {
  size?: number; // Kích thước vòng tròn (px)
  strokeWidth?: number; // Độ dày đường viền
}

const LoadingProgress = ({ size = 30, strokeWidth = 3 }: CircularProps) => {
  const [percent, setPercent] = useState(0);
  
  // Các thông số SVG
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  useEffect(() => {
    const steps = [5, 10, 20, 30, 50, 70, 80, 99];
    let currentIndex = 0;

    const runProgress = () => {
      if (currentIndex < steps.length) {
        setPercent(steps[currentIndex]);
        currentIndex++;
        const nextTick = Math.floor(Math.random() * 600) + 400;
        setTimeout(runProgress, nextTick);
      }
    };

    const timer = setTimeout(runProgress, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center rounded-3xl w-fit mx-auto">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* SVG Vòng tròn */}
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Vòng nền (Xám nhạt) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-slate-100"
          />
          {/* Vòng tiến độ (Xanh dương) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            style={{ 
              strokeDashoffset: offset,
              transition: 'stroke-dashoffset 0.5s ease-in-out' 
            }}
            strokeLinecap="round"
            className="text-blue-600"
          />
        </svg>

        {/* Số phần trăm hiển thị ở giữa */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-[10px] text-slate-800">{percent}%</span>
        </div>
      </div>
      
      {/* Hiệu ứng tia sáng nhỏ khi đang chạy */}
      {percent < 99 && (
        <div className="mt-2 flex gap-1">
          <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce"></span>
          <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
        </div>
      )}
    </div>
  );
};

export default LoadingProgress;
