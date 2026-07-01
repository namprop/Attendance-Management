'use client';

import React, { useState } from 'react';
import DateSinglePicker from '@/app/ui/base/date-picker';
import { SelectBase } from '@/app/ui/base/select';
import { ButtonBase } from '@/app/ui/base/button';
import { Search, Grid, FileText, Clock, AlertCircle, XCircle, FileSpreadsheet, BarChart2, CalendarDays } from 'lucide-react';

export default function AttendanceToolbar() {
  const [activeTab, setActiveTab] = useState('Chi tiết 2 cột');

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl mb-4 overflow-hidden shadow-sm text-xs">
      {/* Top Row: Date filters & Select */}
      <div className="flex items-center justify-between p-2 border-b border-slate-200 bg-slate-50 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-600">Từ ngày:</span>
            <div className="w-[120px]">
              <DateSinglePicker />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-600">Đến ngày:</span>
            <div className="w-[120px]">
              <DateSinglePicker />
            </div>
          </div>
          <ButtonBase className="flex items-center gap-1.5 h-7 px-3 border border-blue-200 bg-white text-blue-600 hover:bg-blue-50 rounded shadow-xs font-medium text-xs">
            <FileText className="w-3.5 h-3.5" />
            Xem công
          </ButtonBase>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-slate-600">Ngày đầu tháng tính công</span>
          <div className="w-[60px]">
            <SelectBase 
              options={[{ value: '1', label: '1' }]} 
              value="1"
              className="h-7 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Middle Row: Tabs */}
      <div className="flex items-center bg-[#e0e4ec] border-b border-slate-300 px-1 pt-1.5">
        {['Giờ nguồn', 'Giờ chia hai cột', 'Chi tiết 2 cột', 'Chi tiết 6 cột'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-medium border border-b-0 rounded-t-md mx-[1px] transition-colors ${
              activeTab === tab 
                ? 'bg-white text-slate-800 border-slate-300 relative translate-y-px z-10' 
                : 'bg-[#f0f2f5] text-slate-600 border-slate-300/60 hover:bg-[#e8ebf0]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

    </div>
  );
}
