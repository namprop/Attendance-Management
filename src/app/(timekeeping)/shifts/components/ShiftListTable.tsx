import React, { forwardRef } from 'react';
import { Popconfirm } from 'antd';
import { Moon, Sun, PlusSquare, Save, X, RefreshCw, Plus } from 'lucide-react';

export type ShiftIconType = 'dot-gray' | 'dot-green' | 'dot-orange' | 'sun-cyan' | 'sun-orange' | 'moon-blue';

export interface ShiftItem {
  key: string;
  code: string;
  name: string;
  in: string;
  out: string;
  isActive: boolean;
  iconType: ShiftIconType;
}

interface ShiftListTableProps {
  data: ShiftItem[];
  selectedKey: string;
  isLoading?: boolean;
  onSelect: (key: string) => void;
  onCreate: () => void;
  onSave: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  onDeleteAll: () => void;
  onInlineEdit?: (key: string, field: 'code' | 'name' | 'in' | 'out', value: string) => void;
  hasCreateAccess?: boolean;
  hasEditAccess?: boolean;
  hasDeleteAccess?: boolean;
}

function ShiftIcon({ type }: { type: ShiftIconType }) {
  if (type === 'dot-gray') return <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-300" />;
  if (type === 'dot-green') return <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />;
  if (type === 'dot-orange') return <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-400" />;
  if (type === 'sun-cyan') return <Sun className="h-4 w-4 text-cyan-500" fill="currentColor" />;
  if (type === 'sun-orange') return <Sun className="h-4 w-4 text-orange-500" fill="currentColor" />;
  return <Moon className="h-4 w-4 text-blue-600" fill="currentColor" />;
}

interface ToolbarButtonProps {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  className?: string;
}

const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ children, onClick, disabled, className, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center gap-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...rest}
      >
        {children}
      </button>
    );
  }
);
ToolbarButton.displayName = 'ToolbarButton';

export default function ShiftListTable({
  data,
  selectedKey,
  isLoading = false,
  onSelect,
  onCreate,
  onSave,
  onDelete,
  onRefresh,
  onDeleteAll,
  onInlineEdit,
  hasCreateAccess = true,
  hasEditAccess = true,
  hasDeleteAccess = true,
}: ShiftListTableProps) {
  return (
    <div className="flex flex-1 w-full flex-col bg-white min-h-0">
      <div className="relative z-10 flex flex-wrap shrink-0 items-center justify-start gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2.5">
        {hasCreateAccess && (
          <ToolbarButton onClick={onCreate} disabled={isLoading} className="text-blue-600 hover:text-blue-700">
            <PlusSquare className="h-3.5 w-3.5" /> Thêm mới
          </ToolbarButton>
        )}
        {hasEditAccess && (
          <ToolbarButton onClick={onSave} disabled={isLoading} className="text-slate-600 hover:text-slate-900">
            <Save className="h-3.5 w-3.5 text-blue-500" /> Lưu
          </ToolbarButton>
        )}
        {hasDeleteAccess && (
          <>
            <Popconfirm
              title="Xóa ca làm việc"
              description="Bạn có chắc chắn muốn xóa ca này không?"
              onConfirm={onDelete}
              okText="Xóa"
              cancelText="Hủy"
              disabled={isLoading || !selectedKey}
              placement="bottomRight"
            >
              <ToolbarButton disabled={isLoading || !selectedKey} className="text-slate-600 hover:text-slate-900">
                <X className="h-4 w-4 text-red-500" /> Xóa
              </ToolbarButton>
            </Popconfirm>
            <Popconfirm
              title="Xóa toàn bộ dữ liệu"
              description="Hành động này sẽ XÓA HẾT TẤT CẢ các ca làm việc trong cơ sở dữ liệu và không thể khôi phục. Bạn có chắc chắn?"
              onConfirm={onDeleteAll}
              okText="Xóa tất cả"
              cancelText="Hủy"
              disabled={isLoading}
              placement="bottomRight"
            >
              <ToolbarButton disabled={isLoading} className="text-slate-600 hover:text-slate-900">
                <X className="h-4 w-4 text-red-500" /> Xóa tất cả
              </ToolbarButton>
            </Popconfirm>
          </>
        )}
        <ToolbarButton onClick={onRefresh} disabled={isLoading} className="text-slate-600 hover:text-slate-900 ml-auto">
          <RefreshCw className={`h-3.5 w-3.5 text-blue-500 ${isLoading ? 'animate-spin' : ''}`} /> Làm mới
        </ToolbarButton>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-left text-[13px] text-slate-700">
          <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
            <tr className="text-xs font-semibold text-slate-500">
              <th className="w-9 border-b border-r border-slate-200 px-2 py-3 text-center">
                <Plus className="mx-auto h-3.5 w-3.5 text-slate-400" />
              </th>
              <th className="border-b border-r border-slate-200 px-3 py-3 text-left">Mã ca</th>
              <th className="border-b border-r border-slate-200 px-3 py-3 text-left">Vào</th>
              <th className="border-b border-slate-200 px-3 py-3 text-left">Ra</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => {
              const isSelected = item.key === selectedKey;
              return (
                <tr
                  key={item.key}
                  onClick={() => onSelect(item.key)}
                  className={`cursor-pointer border-b transition-colors ${isSelected
                      ? 'border-slate-100 bg-blue-50/50 text-slate-800'
                      : `border-slate-100 text-slate-700 hover:bg-slate-50 ${item.isActive ? '' : 'opacity-55'}`
                    }`}
                >
                  <td className="border-r border-slate-100 px-2 py-3 text-center">
                    <div className="flex items-center justify-center">
                      <ShiftIcon type={item.iconType} />
                    </div>
                  </td>
                  <td className="border-r border-slate-100 px-3 py-3">
                    <input
                      type="text"
                      className="block w-full bg-transparent font-semibold outline-none leading-tight transition-colors text-slate-800 placeholder-slate-400 disabled:opacity-70 disabled:cursor-not-allowed"
                      value={item.name}
                      placeholder="Nhập tên"
                      disabled={!hasEditAccess}
                      onChange={(e) => onInlineEdit?.(item.key, 'name', e.target.value)}
                    />
                    <input
                      type="text"
                      className="block w-full bg-transparent outline-none truncate text-[11px] font-medium text-slate-500 placeholder-slate-300 disabled:opacity-70 disabled:cursor-not-allowed"
                      value={item.code}
                      placeholder="Nhập mã"
                      disabled={!hasEditAccess}
                      onChange={(e) => onInlineEdit?.(item.key, 'code', e.target.value)}
                    />
                  </td>
                  <td className="border-r border-slate-100 px-2 py-3">
                    <input
                      type="text"
                      className="w-[45px] bg-transparent text-center outline-none transition-colors text-slate-800 placeholder-slate-400 disabled:opacity-70 disabled:cursor-not-allowed"
                      value={item.in}
                      placeholder="--:--"
                      disabled={!hasEditAccess}
                      onChange={(e) => onInlineEdit?.(item.key, 'in', e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-3">
                    <input
                      type="text"
                      className="w-[45px] bg-transparent text-center outline-none transition-colors text-slate-800 placeholder-slate-400 disabled:opacity-70 disabled:cursor-not-allowed"
                      value={item.out}
                      placeholder="--:--"
                      disabled={!hasEditAccess}
                      onChange={(e) => onInlineEdit?.(item.key, 'out', e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}

            {data.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center text-xs font-medium text-slate-400">
                  Chưa có ca làm việc
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
