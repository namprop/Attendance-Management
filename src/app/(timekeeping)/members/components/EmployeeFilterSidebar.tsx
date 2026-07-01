import React, { useState } from 'react';
import { Select, Button } from 'antd';
import { Filter } from 'lucide-react';
import { BranchItem, LocationItem, DeptGroupItem, DepartmentItem } from '../types';

export interface FilterState {
  branch: string | null;
  location: string | null;
  face: string | null;
  deptGroup: string | null;
  department: string | null;
  status: string | null;
  employeeType: string | null;
  gender: string | null;
}

interface Props {
  initialFilters: FilterState;
  onApply: (filters: FilterState) => void;
  onClear: () => void;
  branches: BranchItem[];
  locations: LocationItem[];
  groups: DeptGroupItem[];
  departments: DepartmentItem[];
}

export function EmployeeFilterSidebar({
  initialFilters: filters,
  onApply,
  onClear,
  branches,
  locations,
  groups,
  departments,
}: Props) {



  const handleClear = () => {
    const cleared = {
      branch: null,
      location: null,
      face: null,
      deptGroup: null,
      department: null,
      status: null,
      employeeType: null,
      gender: null,
    };
    onApply(cleared);
    onClear();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-5">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Chi nhánh</label>
          <Select
            className="w-full"
            placeholder="Tất cả chi nhánh"
            allowClear
            showSearch
            optionFilterProp="label"
            value={filters.branch}
            onChange={(v) => onApply({ ...filters, branch: v, location: null })}
            options={branches.map(b => ({ label: b.name, value: b._id || b.id }))}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Cơ sở làm việc</label>
          <Select
            className="w-full"
            placeholder="Tất cả cơ sở"
            allowClear
            showSearch
            optionFilterProp="label"
            value={filters.location}
            onChange={(v) => onApply({ ...filters, location: v })}
            options={locations
              .filter(l => !filters.branch || (l.branchId && filters.branch && String(l.branchId) === String(filters.branch)))
              .map(l => ({ label: l.locationName, value: l._id }))}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Khối / Cụm</label>
          <Select
            className="w-full"
            placeholder="Tất cả khối/cụm"
            allowClear
            showSearch
            optionFilterProp="label"
            value={filters.deptGroup}
            onChange={(v) => onApply({ ...filters, deptGroup: v, department: null })}
            options={groups.map(g => ({ label: g.name, value: g._id }))}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Phòng ban</label>
          <Select
            className="w-full"
            placeholder="Tất cả phòng ban"
            allowClear
            showSearch
            optionFilterProp="label"
            value={filters.department}
            onChange={(v) => onApply({ ...filters, department: v })}
            options={departments
              .filter(d => !filters.deptGroup || (d.departmentGroupTimekeepingId && filters.deptGroup && String(d.departmentGroupTimekeepingId) === String(filters.deptGroup)))
              .map(d => ({ label: d.name, value: d._id }))}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Trạng thái FaceID</label>
          <Select
            className="w-full"
            placeholder="Tất cả"
            allowClear
            value={filters.face}
            onChange={(v) => onApply({ ...filters, face: v })}
            options={[
              { label: 'Đã kích hoạt FaceID', value: 'enrolled' },
              { label: 'Chưa quét FaceID', value: 'not_enrolled' },
            ]}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Trạng thái làm việc</label>
          <Select
            className="w-full"
            placeholder="Tất cả"
            allowClear
            value={filters.status}
            onChange={(v) => onApply({ ...filters, status: v })}
            options={[
              { label: 'Đang làm việc (ACTIVE)', value: 'ACTIVE' },
              { label: 'Đã nghỉ việc (INACTIVE)', value: 'INACTIVE' },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Loại nhân sự</label>
            <Select
              className="w-full"
              placeholder="Tất cả"
              allowClear
              value={filters.employeeType}
              onChange={(v) => onApply({ ...filters, employeeType: v })}
              options={[
                { label: 'Full-time', value: 'full_time' },
                { label: 'Part-time', value: 'part_time' },
                { label: 'Thực tập sinh', value: 'intern' },
                { label: 'Cộng tác viên', value: 'collaborator' },
              ]}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Giới tính</label>
            <Select
              className="w-full"
              placeholder="Tất cả"
              allowClear
              value={filters.gender}
              onChange={(v) => onApply({ ...filters, gender: v })}
              options={[
                { label: 'Nam', value: 'Nam' },
                { label: 'Nữ', value: 'Nữ' },
                { label: 'Khác', value: 'Khác' },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-slate-100">
        <Button onClick={handleClear} block className="bg-slate-50 text-slate-600 border-slate-200">
          Xóa bộ lọc
        </Button>
      </div>
    </div>
  );
}
