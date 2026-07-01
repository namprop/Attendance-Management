'use client';

import React, { useMemo } from 'react';
import { TreeSelect } from 'antd';
import type { DepartmentTimekeeping, DepartmentGroupTimekeeping } from '@/app/interface/timekeeping';

interface DepartmentTreeSelectProps {
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  className?: string;
  placeholder?: string;
  allowClear?: boolean;
  multiple?: boolean;
  /** Data truyền từ parent — không tự fetch nữa */
  departmentRows?: DepartmentTimekeeping[];
  groupRows?: DepartmentGroupTimekeeping[];
}

export default function DepartmentTreeSelect({
  value,
  onChange,
  className,
  placeholder = 'Tất cả',
  allowClear,
  multiple = false,
  departmentRows = [],
  groupRows = [],
}: DepartmentTreeSelectProps) {

  const departmentTreeData = useMemo(() => {
    const activeGroups = groupRows.filter(g => g.isActive !== false);
    const activeDepts = departmentRows.filter(d => d.isActive !== false);

    const treeData = activeGroups.map(group => {
      const deptsInGroup = activeDepts.filter(d => d.departmentGroupTimekeepingId === group._id);
      return {
        title: group.name,
        value: `group-${group._id}`,
        selectable: false,
        children: deptsInGroup.map(d => ({ value: d.name, title: d.name }))
      };
    }).filter(group => group.children.length > 0);

    const groupedDeptIds = new Set(activeGroups.flatMap(g => activeDepts.filter(d => d.departmentGroupTimekeepingId === g._id).map(d => d._id)));
    const ungroupedDepts = activeDepts.filter(d => !groupedDeptIds.has(d._id));

    if (ungroupedDepts.length > 0) {
      treeData.push({
        title: 'Khác',
        value: 'group-others',
        selectable: false,
        children: ungroupedDepts.map(d => ({ value: d.name, title: d.name }))
      });
    }

    return treeData;
  }, [departmentRows, groupRows]);

  const normalizedValue = multiple
    ? (Array.isArray(value) ? value : value ? [value] : [])
    : (Array.isArray(value) ? value[0] : value) || undefined;

  return (
    <TreeSelect
      value={normalizedValue || undefined}
      treeData={departmentTreeData}
      treeLine={!multiple}
      treeDefaultExpandAll
      multiple={multiple}
      treeCheckable={multiple}
      showCheckedStrategy={multiple ? TreeSelect.SHOW_CHILD : undefined}
      className={className || 'w-full max-h-22 h-8 overflow-y-auto px-0 [&_.ant-select-selector]:h-8 [&_.ant-select-selector]:rounded-lg [&_.ant-select-selector]:border-slate-200'}
      style={{ padding: 0 }}
      placeholder={placeholder}
      onChange={onChange as (v: unknown) => void}
      showSearch
      allowClear={allowClear}
      treeNodeFilterProp="title"
      maxTagCount={multiple ? 2 : undefined}
      maxTagPlaceholder={(omittedValues) => `+${omittedValues.length}`}
      styles={{
        popup: {
          root: { maxHeight: 400, overflow: 'auto', overscrollBehavior: 'contain' },
        },
      }}
      popupClassName="overscroll-contain"
    />
  );
}
