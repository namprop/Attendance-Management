// utils/filters.ts
export const INVALID_VALUES = [0, "", null, undefined] as const;

// Xóa các giá trị trong bộ lọc
export function cleanFilters<T extends object>(filters?: T) {
    return Object.fromEntries(
        Object.entries(filters ?? {}).filter(([, v]) => !INVALID_VALUES.includes(v as never))
    ) as Partial<T>;
}

// Kiểm tra có bộ lọc nào được áp dụng không
export function hasActiveFilters<T extends object>(filters?: T): boolean {
    return Object.entries(filters ?? {}).some(([, v]) => !INVALID_VALUES.includes(v as never));
}
