import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Select, Spin } from 'antd';
import debounce from 'lodash/debounce';

interface AsyncEmployeeSelectProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  selectedBranchIds?: string[];
  selectedLocationIds?: string[];
  selectedDepartmentGroupIds?: string[];
  selectedDepartmentIds?: string[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

interface Option {
  label: string;
  value: string;
}

export function AsyncEmployeeSelect({
  value = [],
  onChange,
  selectedBranchIds = [],
  selectedLocationIds = [],
  selectedDepartmentGroupIds = [],
  selectedDepartmentIds = [],
  disabled,
  placeholder = "Nhập tên hoặc mã NV để tìm kiếm...",
  className = "",
}: AsyncEmployeeSelectProps) {
  const [options, setOptions] = useState<Option[]>([]);
  const [fetching, setFetching] = useState(false);
  const fetchRef = useRef(0);
  const initialFetchDone = useRef(false);

  const fetchEmployees = useMemo(
    () =>
      debounce(async (search: string, initialCodes?: string[]) => {
        fetchRef.current += 1;
        const fetchId = fetchRef.current;
        setFetching(true);

        try {
          const params = new URLSearchParams();
          params.append('pageSize', '50');
          if (search) params.append('search', search);

          if (initialCodes && initialCodes.length > 0) {
            initialCodes.forEach((code) => params.append('employeeCodes', code));
          } else {
            selectedBranchIds.forEach((id) => params.append('branchIds', id));
            selectedLocationIds.forEach((id) => params.append('locationIds', id));
            selectedDepartmentGroupIds.forEach((id) => params.append('deptGroupId', id));
            selectedDepartmentIds.forEach((id) => params.append('departmentIds', id));
          }

          const response = await fetch(`/api/v1/employees?${params.toString()}`);
          const json = await response.json();

          if (fetchId !== fetchRef.current) {
            // A newer request was made, ignore this response
            return;
          }

          const newOptions = (Array.isArray(json.data) ? json.data : []).map((employee: any) => {
            const val = String(employee.employeeCode || employee.id || employee._id || '').trim();
            const name = employee.fullName || employee.name || val;
            return {
              label: `${name} - ${val}`,
              value: val,
            };
          }).filter((o: Option) => Boolean(o.value));

          if (initialCodes && initialCodes.length > 0) {
            // Append to existing options to avoid overriding currently shown values
            setOptions((prev) => {
              const prevMap = new Map(prev.map(o => [o.value, o]));
              newOptions.forEach((o: Option) => prevMap.set(o.value, o));
              return Array.from(prevMap.values());
            });
          } else {
            setOptions(newOptions);
          }
        } catch (error) {
          console.error('Failed to load employees for AsyncSelect', error);
        } finally {
          if (fetchId === fetchRef.current) {
            setFetching(false);
          }
        }
      }, 500),
    [selectedBranchIds, selectedLocationIds, selectedDepartmentGroupIds, selectedDepartmentIds]
  );

  useEffect(() => {
    // Re-fetch options if filters change and we don't have a search keyword
    fetchEmployees('');
  }, [fetchEmployees]);

  useEffect(() => {
    // If there are selected values that we haven't loaded labels for, fetch them initially
    if (!initialFetchDone.current && value.length > 0) {
      initialFetchDone.current = true;
      const missingCodes = value.filter(val => !options.some(opt => opt.value === val));
      if (missingCodes.length > 0) {
        // Fetch specific missing codes
        fetchEmployees('', missingCodes);
      }
    }
  }, [value, options, fetchEmployees]);

  return (
    <Select
      mode="multiple"
      allowClear
      className={`${className} w-full max-h-22 overflow-y-auto`}
      placeholder={placeholder}
      onChange={onChange}
      value={value}
      options={options}
      disabled={disabled}
      filterOption={false}
      onSearch={(search) => fetchEmployees(search)}
      notFoundContent={fetching ? <Spin size="small" /> : 'Không tìm thấy dữ liệu'}
      showSearch
    />
  );
}
