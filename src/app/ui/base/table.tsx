"use client";

import React, { useEffect, useMemo } from "react";
import IconTriangleLeft from "@public/icons/triangle-left.svg";
import IconTriangleRight from "@public/icons/triangle-right.svg";
import IconTriangleDoubleLeft from "@public/icons/triangle-double-left.svg";
import IconTriangleDoubleRight from "@public/icons/triangle-double-right.svg";
import IconArrowDown from "@public/icons/arrow-down.svg";
import IconArrowUp from "@public/icons/arrow-up.svg";
import IconArrowUpDown from "@public/icons/arrow-down-up.svg";
import IconFilter from "@public/icons/table/filter.svg";
import Image from "next/image";
import { Loading } from "./loading";
import dayjs from "dayjs";
import { ButtonBase } from "./button";

export type FilterType = "text" | "date" | "time";
type FilterState<T> = Partial<Record<keyof T, string | number | Date>>;

export interface Column<T> {
  title: string | React.ReactNode;
  dataIndex?: keyof T;
  render?: (
    value: T[keyof T] | undefined,
    record: T,
    index: number
  ) => React.ReactNode;
  className?: string;
  sorter?: (a: T, b: T) => number;
  sortKey?: string; // Key để truyền lên API khi sort server-side
  width?: number | string;
  filterType?: FilterType; // Kiểu lọc
  onFilter?: (value: string | number | Date, record: T) => boolean;
  children?: Column<T>[];
}

export interface Pagination {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  onPageChange?: (page: number, pageSize: number) => void;
}

export interface RowSelection<T> {
  selectedRowKeys: (string | number)[];
  onChange: (selectedRowKeys: (string | number)[], selectedRows: T[]) => void;
  onSelectAll?: (selected: boolean) => void;
}

interface BaseTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: keyof T;
  className?: string;
  classNameRow?: string | ((record: T, index: number) => string);
  classNameBody?: string;
  styleRow?: React.CSSProperties | ((record: T) => React.CSSProperties);
  loading?: boolean;
  pagination?: Pagination;
  isSTT?: boolean;
  bordered?: boolean;
  onRow?: (
    record: T,
    index: number
  ) => React.HTMLAttributes<HTMLTableRowElement>;
  sortType?: "asc" | "desc" | null;
  onSort?: (key: string, direction: "asc" | "desc") => void;
  rowSelection?: RowSelection<T>;
  classNameHead?: string;
  renderExpandRow?: (record: T) => React.ReactNode;
  rowContextMenuMouse?: (record: T) => React.ReactNode; // menu khi chuột phải vào từng row

  // --- THÊM MỚI: Hỗ trợ hàng tổng cộng ---
  summary?: (data: T[]) => React.ReactNode;
  // Hiển thị thanh scroll ngang sticky dưới header
  showHorizontalScroll?: boolean;
  // --- THÊM MỚI: Hỗ trợ chèn thêm nội dung vào thanh phân trang ---
  renderPaginationExtra?: () => React.ReactNode;
}

// Helper: Lấy toàn bộ cột lá (cột cuối cùng không có children) để render body và xử lý sort/filter
function getLeafColumns<T>(columns: Column<T>[]): Column<T>[] {
  const leafColumns: Column<T>[] = [];
  columns.forEach((col) => {
    if (col.children && col.children.length > 0) {
      leafColumns.push(...getLeafColumns(col.children));
    } else {
      leafColumns.push(col);
    }
  });
  return leafColumns;
}

// Helper: Tính độ sâu của cây cột (để biết cần bao nhiêu dòng header)
function getColumnDepth<T>(columns: Column<T>[]): number {
  let maxDepth = 0;
  columns.forEach((col) => {
    if (col.children && col.children.length > 0) {
      maxDepth = Math.max(maxDepth, getColumnDepth(col.children));
    }
  });
  return maxDepth + 1;
}

// Helper: Tính số lượng cột lá con của một cột (để set colSpan)
function getColSpan<T>(col: Column<T>): number {
  if (!col.children || col.children.length === 0) return 1;
  return col.children.reduce((acc, child) => acc + getColSpan(child), 0);
}

// Helper: Xây dựng cấu trúc rows cho header
function buildHeaderRows<T>(
  columns: Column<T>[],
  maxDepth: number,
  currentDepth: number = 0,
  rows: { col: Column<T>; rowSpan: number; colSpan: number; leafIndex?: number }[][] = [],
  leafIndexRef: { current: number } = { current: 0 }
) {
  if (!rows[currentDepth]) {
    rows[currentDepth] = [];
  }

  columns.forEach((col) => {
    const hasChildren = col.children && col.children.length > 0;
    const colSpan = getColSpan(col);
    // Nếu có children thì rowSpan = 1, nếu là lá thì rowSpan kéo dài xuống đáy
    const rowSpan = hasChildren ? 1 : maxDepth - currentDepth;

    // Nếu là cột lá, ta gán index thực tế trong mảng leafColumns để dùng cho việc Sort/Filter
    let currentLeafIndex: number | undefined = undefined;
    if (!hasChildren) {
      currentLeafIndex = leafIndexRef.current;
      leafIndexRef.current += 1;
    }

    rows[currentDepth].push({
      col,
      rowSpan,
      colSpan,
      leafIndex: currentLeafIndex,
    });

    if (hasChildren) {
      buildHeaderRows(col.children!, maxDepth, currentDepth + 1, rows, leafIndexRef);
    }
  });

  return rows;
}

export function TableBase<T>({
  columns,
  data,
  rowKey,
  className = "",
  classNameRow,
  classNameBody,
  styleRow,
  loading = false,
  pagination,
  isSTT = true,
  onRow,
  sortType = "asc",
  onSort, // <-- Thêm onSort
  rowSelection,
  classNameHead,
  renderExpandRow,
  rowContextMenuMouse,
  summary, // <-- Lấy prop summary
  showHorizontalScroll = false,
  renderPaginationExtra, // <-- Thêm prop renderPaginationExtra
  bordered = false,
}: BaseTableProps<T>) {
  // 1. CHUẨN BỊ DỮ LIỆU CỘT ============================
  const leafColumns = useMemo(() => getLeafColumns(columns), [columns]);
  const maxDepth = useMemo(() => getColumnDepth(columns), [columns]);
  const headerRows = useMemo(() => buildHeaderRows(columns, maxDepth), [columns, maxDepth]);

  // Loc dữ liệu ============================
  const [isOpenFilter, setIsOpenFilter] = React.useState<number | null>(null);
  const [filters, setFilters] = React.useState<FilterState<T>>({});
  const [expandedRowKey, setExpandedRowKey] = React.useState<string | number | null>(null);
  const [contextMenuMouse, setContextMenuMouse] = React.useState<{ x: number; y: number; record: T | null; } | null>(null);
  const filterRef = React.useRef<HTMLDivElement>(null);
  // Refs cho thanh scroll ngang sticky
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const theadRef = React.useRef<HTMLTableSectionElement>(null);
  const stickyScrollRef = React.useRef<HTMLDivElement>(null);
  const stickyScrollInnerRef = React.useRef<HTMLDivElement>(null);
  const isSyncing = React.useRef(false);
  const [theadHeight, setTheadHeight] = React.useState(0);

  const handleFilterChange = <K extends keyof T>(
    dataIndex: K,
    value: string | number | Date
  ) => {
    setFilters((prev) => ({ ...prev, [dataIndex]: value }));
  };

  const filteredData = useMemo(() => {
    return data.filter((record) =>
      leafColumns.every((col) => {
        const key = col.dataIndex as keyof T;
        const value = filters[key];
        if (!value) return true;

        if (col.onFilter) return col.onFilter(value, record);

        const recordValue = record[key];
        if (col.filterType === "text")
          return String(recordValue ?? "")
            .toLowerCase()
            .includes(String(value).toLowerCase());
        if (col.filterType === "date")
          return dayjs(recordValue as string).isSame(
            dayjs(value as string),
            "day"
          );
        if (col.filterType === "time")
          return dayjs(recordValue as string).format("HH:mm") === value;
        return true;
      })
    );
  }, [data, filters, leafColumns]);

  // Sắp xếp dữ liệu ============================
  const [sortConfig, setSortConfig] = React.useState<{
    columnIndex: number | null;
    direction: "asc" | "desc" | null;
  }>({ columnIndex: null, direction: sortType ?? null });

  const handleSort = (leafColIndex: number) => {
    const col = leafColumns[leafColIndex];
    if (!col.sorter) return;

    setSortConfig((prev) => {
      const newDirection: "asc" | "desc" =
        prev.columnIndex === leafColIndex
          ? prev.direction === "asc" ? "desc" : "asc"
          : "asc";
      const newConfig = { columnIndex: leafColIndex, direction: newDirection };

      // Nếu có onSort → delegate lên API, không sort local
      if (onSort) {
        const key = (col.sortKey ?? col.dataIndex) as string;
        if (key) onSort(key, newDirection);
      }

      return newConfig;
    });
  };

  const sortedData = useMemo(() => {
    const source = filteredData;
    if (
      sortConfig.columnIndex !== null &&
      leafColumns[sortConfig.columnIndex]?.sorter
    ) {
      const sorter = leafColumns[sortConfig.columnIndex].sorter!;
      const sorted = [...source].sort((a, b) => sorter(a, b));
      return sortConfig.direction === "asc" ? sorted : sorted.reverse();
    }
    if (sortConfig.direction === "asc") return source;
    return [...source].reverse();
  }, [filteredData, sortConfig, leafColumns]);

  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    if (pagination.total > sortedData.length) {
      return sortedData;
    }
    const { current, pageSize } = pagination;
    const start = (current - 1) * pageSize;
    const end = start + pageSize;
    return sortedData.slice(start, end);
  }, [sortedData, pagination]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setIsOpenFilter(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    const close = () => setContextMenuMouse(null);
    window.addEventListener("click", close);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("click", close);
    };
  }, []);

  // Đo chiều cao thead sau khi render
  React.useLayoutEffect(() => {
    if (theadRef.current) {
      setTheadHeight(theadRef.current.offsetHeight);
    }
  }, [columns, maxDepth]);

  // Cập nhật độ rộng của thanh scroll
  const [isHScrollable, setIsHScrollable] = React.useState(false);
  React.useEffect(() => {
    const update = () => {
      if (scrollContainerRef.current && stickyScrollInnerRef.current) {
        const sw = scrollContainerRef.current.scrollWidth;
        const cw = scrollContainerRef.current.clientWidth;
        stickyScrollInnerRef.current.style.width = `${sw}px`;
        setIsHScrollable(sw > cw + 2); // +2 buffer
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [columns, data, loading]);

  const onTopScroll = () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    if (scrollContainerRef.current && stickyScrollRef.current) {
      scrollContainerRef.current.scrollLeft = stickyScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => { isSyncing.current = false; });
  };

  const onTableScroll = () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    if (stickyScrollRef.current && scrollContainerRef.current) {
      stickyScrollRef.current.scrollLeft = scrollContainerRef.current.scrollLeft;
    }
    requestAnimationFrame(() => { isSyncing.current = false; });
  };

  const renderPagination = () => {
    if (!pagination) return null;
    const { current, pageSize, total, onPageChange } = pagination;
    const totalPages = Math.ceil(total / pageSize);

    const pageNumbers: (number | "...")[] = [];
    const visiblePages = 5;
    const startPage = Math.max(1, current - Math.floor(visiblePages / 2));
    const endPage = Math.min(totalPages, startPage + visiblePages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    if (endPage < totalPages) {
      pageNumbers.push("...");
    }

    return (
      <div className="flex flex-wrap gap-2 justify-between items-center mt-4 text-xs text-gray-500 px-1">
        <div className="flex items-center gap-4">
          <div className="font-medium text-slate-500">
            Hiển thị <span className="font-semibold text-slate-700">{(current - 1) * pageSize + 1}–{Math.min(current * pageSize, total)}</span> / tổng <span className="font-semibold text-slate-700">{total}</span> bản ghi
          </div>
          {renderPaginationExtra && renderPaginationExtra()}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onPageChange?.(1, pageSize)}
            className="p-1.5 w-7 h-7 rounded-md disabled:opacity-30 hover:bg-slate-100 transition-colors"
            disabled={current === 1}
          >
            <Image src={IconTriangleDoubleLeft} alt="" width={10} height={10} />
          </button>
          <button
            onClick={() => onPageChange?.(current - 1, pageSize)}
            className="p-1.5 w-7 h-7 rounded-md disabled:opacity-30 hover:bg-slate-100 transition-colors"
            disabled={current === 1}
          >
            <Image src={IconTriangleLeft} alt="" width={13} height={13} />
          </button>
          {pageNumbers.map((page, index) =>
            page === "..." ? (
              <span key={index} className="px-1.5 py-1 text-gray-400">…</span>
            ) : (
              <button
                key={index}
                onClick={() => onPageChange?.(page as number, pageSize)}
                className={`min-w-[28px] h-7 px-2 rounded-md text-xs font-medium transition-colors ${current === page
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                {page}
              </button>
            )
          )}
          <button
            onClick={() => onPageChange?.(current + 1, pageSize)}
            className="p-1.5 w-7 h-7 rounded-md disabled:opacity-30 hover:bg-slate-100 transition-colors"
            disabled={current === totalPages}
          >
            <Image src={IconTriangleRight} alt="" width={13} height={13} />
          </button>
          <button
            onClick={() => onPageChange?.(totalPages, pageSize)}
            className="p-1.5 w-7 h-7 rounded-md disabled:opacity-30 hover:bg-slate-100 transition-colors"
            disabled={current === totalPages}
          >
            <Image src={IconTriangleDoubleRight} alt="" width={10} height={10} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        ref={scrollContainerRef}
        onScroll={onTableScroll}
        className={`overflow-auto rounded-xl border border-gray-100 shadow-sm ${className}`}
      >
        {/* Thanh scroll ngang sticky dưới thead — ẩn khi không cần scroll */}
        <div
          ref={stickyScrollRef}
          onScroll={onTopScroll}
          className="tbl-hscroll sticky z-20 overflow-x-auto overflow-y-hidden transition-all duration-200"
          style={{
            top: theadHeight + 6,
            height: (showHorizontalScroll && isHScrollable) ? 6 : 0,
            left: 0,
            width: '100%',
            background: (showHorizontalScroll && isHScrollable) ? 'rgba(219,234,254,0.45)' : 'transparent',
          }}
        >
          <div ref={stickyScrollInnerRef} style={{ height: 1 }} />
        </div>
        <table className={`min-w-full text-sm bg-white ${bordered ? 'border-collapse' : ''}`}>
          <thead ref={theadRef} className={`${classNameHead} bg-slate-100 text-slate-600 font-medium text-xs tracking-wide uppercase`}>
            {headerRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {rowIndex === 0 && rowSelection && (
                  <th
                    rowSpan={maxDepth}
                    className={`p-2 border-b border-r border-gray-200 ${bordered ? 'border' : ''} text-center w-[40px] z-10 sticky left-0 bg-slate-100 cursor-pointer select-none`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentPageKeys = paginatedData.map((r) => r[rowKey] as string | number);
                      const isAllSelected =
                        currentPageKeys.length > 0 &&
                        currentPageKeys.every((k) => rowSelection.selectedRowKeys.includes(k));
                      
                      if (rowSelection.onSelectAll) {
                        rowSelection.onSelectAll(!isAllSelected);
                        return;
                      }

                      let newSelectedRowKeys = [...rowSelection.selectedRowKeys];
                      if (!isAllSelected) {
                        const keysToAdd = currentPageKeys.filter((key) => !newSelectedRowKeys.includes(key));
                        newSelectedRowKeys = [...newSelectedRowKeys, ...keysToAdd];
                      } else {
                        newSelectedRowKeys = newSelectedRowKeys.filter((key) => !currentPageKeys.includes(key));
                      }
                      rowSelection.onChange(newSelectedRowKeys, []);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        paginatedData.length > 0 &&
                        paginatedData.every((record) =>
                          rowSelection.selectedRowKeys.includes(record[rowKey] as string | number)
                        )
                      }
                      ref={(el) => {
                        if (el) {
                          const currentPageKeys = paginatedData.map((r) => r[rowKey] as string | number);
                          const selectedOnCurrentPage = currentPageKeys.filter((key) =>
                            rowSelection.selectedRowKeys.includes(key)
                          ).length;
                          el.indeterminate = selectedOnCurrentPage > 0 && selectedOnCurrentPage < currentPageKeys.length;
                        }
                      }}
                      onChange={(e) => {
                        const currentPageKeys = paginatedData.map((r) => r[rowKey] as string | number);
                        if (rowSelection.onSelectAll) {
                          rowSelection.onSelectAll(e.target.checked);
                          return;
                        }

                        let newSelectedRowKeys = [...rowSelection.selectedRowKeys];
                        if (e.target.checked) {
                          const keysToAdd = currentPageKeys.filter((key) => !newSelectedRowKeys.includes(key));
                          newSelectedRowKeys = [...newSelectedRowKeys, ...keysToAdd];
                          rowSelection.onChange(newSelectedRowKeys, []);
                        } else {
                          newSelectedRowKeys = newSelectedRowKeys.filter((key) => !currentPageKeys.includes(key));
                          rowSelection.onChange(newSelectedRowKeys, []);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="cursor-pointer w-[17px] h-[17px] accent-green-600"
                    />
                  </th>
                )}
                {rowIndex === 0 && isSTT && (
                  <th rowSpan={maxDepth} className={`border-b border-r border-gray-200 ${bordered ? 'border' : ''} text-center p-2 w-[50px]`}>
                    STT
                  </th>
                )}
                {row.map((cell, cellIndex) => {
                  const { col, rowSpan, colSpan, leafIndex } = cell;
                  const key = col.dataIndex as keyof T;
                  const isLeaf = leafIndex !== undefined;

                  return (
                    <th
                      key={cellIndex}
                      colSpan={colSpan}
                      rowSpan={rowSpan}
                      className={`px-3 py-2 ${bordered ? 'border border-gray-200' : 'border-b border-r border-gray-200'} text-left min-w-[100px] max-w-full select-none ${col.className || ''}`}
                      style={col.width ? { width: typeof col.width === "number" ? `${col.width}px` : col.width } : undefined}
                    >
                      <div className={`flex items-center justify-center gap-1 ${col.className || ''}`}>
                        <div
                          onClick={() => isLeaf && leafIndex !== undefined ? handleSort(leafIndex) : undefined}
                          className={`flex items-center gap-1 ${isLeaf && col.sorter ? "cursor-pointer" : ""}`}
                        >
                          {col.title}
                          {isLeaf && col.sorter && leafIndex !== undefined && (
                            sortConfig.columnIndex === leafIndex ? (
                              sortConfig.direction === "asc" ? (
                                <Image src={IconArrowUp} alt="" width={10} height={10} />
                              ) : (
                                <Image src={IconArrowDown} alt="" width={10} height={10} />
                              )
                            ) : (
                              <Image src={IconArrowUpDown} alt="" width={10} height={10} />
                            )
                          )}
                        </div>
                        {isLeaf && col.filterType && leafIndex !== undefined && (
                          <ButtonBase
                            onClick={() => setIsOpenFilter((prev) => (prev === leafIndex ? null : leafIndex))}
                            className={`!p-[6px] hover:bg-[#F2F2F2] flex-none relative rounded-none ${isOpenFilter === leafIndex && "bg-white"} `}
                          >
                            <Image src={IconFilter} alt="" width={13} height={13} />
                            {col.filterType && filters[key] && (
                              <div className="w-1 h-1 rounded-full bg-red-500 absolute top-[2px] right-[2px]" />
                            )}
                          </ButtonBase>
                        )}
                      </div>
                      {isLeaf && col.filterType && isOpenFilter === leafIndex && (
                        <div className="bg-white p-2 rounded absolute z-50 shadow-lg border mt-1" ref={filterRef}>
                          {col.filterType === "text" && (
                            <input
                              type="search"
                              value={(filters[key] as string) || ""}
                              onChange={(e) => handleFilterChange(key, e.target.value)}
                              placeholder="Nhập từ khóa..."
                              className="w-full text-sm text-gray-500 font-normal border p-1"
                            />
                          )}
                          {col.filterType === "date" && (
                            <input
                              type="date"
                              value={(filters[key] as string) || ""}
                              onChange={(e) => handleFilterChange(key, e.target.value)}
                              className="w-full text-sm text-gray-500 font-normal border p-1"
                            />
                          )}
                          {col.filterType === "time" && (
                            <input
                              type="time"
                              value={(filters[key] as string) || ""}
                              onChange={(e) => handleFilterChange(key, e.target.value)}
                              className="w-full text-sm text-gray-500 font-normal border p-1"
                            />
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className={`text-sm text-gray-600 divide-y divide-gray-100 ${classNameBody}`}>
            {loading ? (
              <tr>
                <td colSpan={leafColumns.length + (isSTT ? 1 : 0) + (rowSelection ? 1 : 0)} className="p-4 align-middle h-[300px]">
                  <div className="flex w-full h-full items-center justify-center">
                    <Loading />
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={leafColumns.length + (isSTT ? 1 : 0) + (rowSelection ? 1 : 0)} className="p-4 align-middle h-[150px]">
                  <div className="flex w-full h-full items-center justify-center text-gray-400">
                    Không có dữ liệu, vui lòng thử lại!
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((record, rowIndex) => {
                const rawKey = record[rowKey] as string | number;
                const key = rawKey ?? rowIndex; // Fallback to index if key is missing
                const isSelected = rowSelection?.selectedRowKeys.includes(key);
                const pageOffset = pagination && typeof pagination.current === "number" && typeof pagination.pageSize === "number"
                  ? (pagination.current - 1) * pagination.pageSize
                  : 0;
                const globalIndex = pageOffset + rowIndex + 1;
                const isExpanded = expandedRowKey === key;

                return (
                  <React.Fragment key={key}>
                    <tr
                      key={key}
                      className={`text-sm cursor-pointer transition-colors duration-100 z-0 ${bordered ? '' : 'border-b border-gray-100'} ${isSelected ? "bg-emerald-50" : "hover:bg-slate-50"} ${typeof classNameRow === 'function' ? classNameRow(record, rowIndex) : (classNameRow || "")}`}
                      style={typeof styleRow === "function" ? styleRow(record) : {
                        ...styleRow,
                        ...(onRow?.(record, rowIndex)?.style ?? {}),
                        ...(isExpanded ? { backgroundColor: "#f0f8ff" } : {}),
                      }}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (
                          target.closest("button") ||
                          target.closest("a") ||
                          target.closest("input") ||
                          target.closest("textarea") ||
                          target.closest("canvas") ||
                          target.closest("select") ||
                          target.closest('[data-row-click-ignore="true"]')
                        ) {
                          return;
                        }
                        if (renderExpandRow) {
                          setExpandedRowKey((prev) => (prev === key ? null : key));
                        }
                        onRow?.(record, rowIndex)?.onClick?.(e);
                      }}
                      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "#f8fafc"; }}
                      onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ""; }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (!rowContextMenuMouse) return;
                        setContextMenuMouse({ x: e.clientX, y: e.clientY, record: record });
                      }}
                    >
                      {rowSelection && (
                        <td
                          className={`p-2 ${bordered ? 'border border-gray-200' : 'border-r border-gray-100'} text-center cursor-pointer select-none`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isSelected) {
                              const newKeys = rowSelection.selectedRowKeys.filter((k) => k !== key);
                              rowSelection.onChange(newKeys, data.filter((d) => newKeys.includes(d[rowKey] as string | number)));
                            } else {
                              const newKeys = [...rowSelection.selectedRowKeys, key];
                              rowSelection.onChange(newKeys, data.filter((d) => newKeys.includes(d[rowKey] as string | number)));
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => { }}
                            className="w-[17px] h-[17px] accent-green-600 pointer-events-none"
                          />
                        </td>
                      )}
                      {isSTT && (
                        <td className={`px-2 py-2 ${bordered ? 'border border-gray-200' : 'border-r border-gray-100'} text-center text-gray-400 text-xs`}>{globalIndex}</td>
                      )}
                      {leafColumns.map((col, colIndex) => (
                        <td key={colIndex} className={`px-3 py-2 ${bordered ? 'border border-gray-200' : 'border-r border-gray-100 last:border-r-0'}`}>
                          {col.render
                            ? col.render(col.dataIndex ? record[col.dataIndex] : undefined, record, rowIndex)
                            : col.dataIndex
                              ? typeof record[col.dataIndex] === "object"
                                ? JSON.stringify(record[col.dataIndex])
                                : String(record[col.dataIndex] ?? "")
                              : ""}
                        </td>
                      ))}
                    </tr>
                    {renderExpandRow && isExpanded && (
                      <tr key={`${key}-expanded`} className="bg-blue-50/40 border-y border-blue-100">
                        <td colSpan={leafColumns.length + (isSTT ? 1 : 0) + (rowSelection ? 1 : 0)} className="p-4 border-t border-blue-100">
                          {renderExpandRow(record)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
          {/* --- THÊM MỚI: Phần Footer hiển thị Summary --- */}
          {!loading && summary && paginatedData.length > 0 && (
            <tfoot>
              {summary(paginatedData)}
            </tfoot>
          )}
          {contextMenuMouse && rowContextMenuMouse && (
            <div
              className="fixed bg-white border border-gray-200 shadow-xs rounded-xl p-2 z-[9999]"
              style={{ top: contextMenuMouse.y, left: contextMenuMouse.x }}
              onClick={() => setContextMenuMouse(null)}
            >
              {rowContextMenuMouse(contextMenuMouse.record as T)}
            </div>
          )}
        </table>
      </div>
      {renderPagination()}
    </>
  );
}
