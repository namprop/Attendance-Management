'use client';

import React, { useMemo } from 'react';
import { Tree, Timeline } from 'antd';
import type { TreeDataNode } from 'antd';
import { Building2, Users, Network, History, MapPin } from 'lucide-react';

interface Branch {
  id: string;
  _id?: string;
  name: string;
  code: string;
}

interface Department {
  id: string;
  _id?: string;
  name: string;
  code: string;
  branchId?: string;
  locationId?: string;
  departmentGroupTimekeepingId?: string;
}

interface Location {
  id: string;
  _id?: string;
  locationName: string;
  branchId?: string;
}

interface Group {
  id: string;
  _id?: string;
  name: string;
  locationId?: string;
}

interface OrganizationSidebarProps {
  branches: Branch[];
  locations: Location[];
  groups: Group[];
  departments: Department[];
}

export default function OrganizationSidebar({ branches, locations, groups, departments }: OrganizationSidebarProps) {
  // Build Tree Data from branches, locations, groups, and departments
  const treeData: TreeDataNode[] = useMemo(() => {
    const rootNodes: TreeDataNode[] = branches.map((branch) => {
      // Find locations for this branch
      const branchIdStr = branch._id || branch.id;
      const branchLocations = locations.filter((l) => {
        const lBranchId = l.branchId?.toString();
        return lBranchId === branchIdStr;
      });

      const locationNodes = branchLocations.map((loc) => {
        const locIdStr = loc._id || loc.id;
        // Find groups for this location
        const locGroups = groups.filter((g) => g.locationId?.toString() === locIdStr);
        // Find departments for this location directly (no group)
        const locDeptsDirect = departments.filter((d) => d.locationId?.toString() === locIdStr && !d.departmentGroupTimekeepingId);

        const groupNodes = locGroups.map((group) => {
          const groupIdStr = group._id || group.id;
          const groupDepts = departments.filter((d) => d.departmentGroupTimekeepingId?.toString() === groupIdStr);
          
          return {
            title: (
              <div className="flex items-center gap-2 py-0.5">
                <Network className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-[13px] text-slate-700">{group.name}</span>
              </div>
            ),
            key: `group-${groupIdStr}`,
            children: groupDepts.length > 0 ? groupDepts.map(dept => ({
              title: (
                <div className="flex items-center gap-2 py-0.5">
                  <Users className="w-3 h-3 text-emerald-600" />
                  <span className="text-xs text-slate-600">{dept.name}</span>
                </div>
              ),
              key: `dept-${dept._id || dept.id}`,
            })) : [
              {
                title: <span className="text-xs text-slate-400 italic">Chưa có phòng ban</span>,
                key: `empty-group-${groupIdStr}`,
                selectable: false,
              }
            ]
          };
        });

        const directDeptNodes = locDeptsDirect.map(dept => ({
          title: (
            <div className="flex items-center gap-2 py-0.5">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[13px] text-slate-600">{dept.name}</span>
            </div>
          ),
          key: `dept-${dept._id || dept.id}`,
        }));

        const locChildren = [...groupNodes, ...directDeptNodes];

        return {
          title: (
            <div className="flex items-center gap-2 py-0.5">
              <MapPin className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-[13px] font-medium text-slate-700">{loc.locationName}</span>
            </div>
          ),
          key: `loc-${locIdStr}`,
          children: locChildren.length > 0 ? locChildren : [
            {
              title: <span className="text-xs text-slate-400 italic">Chưa có khối/phòng ban</span>,
              key: `empty-loc-${locIdStr}`,
              selectable: false,
            }
          ]
        };
      });

      return {
        title: (
          <div className="flex items-center gap-2 py-1">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-slate-700">{branch.name}</span>
          </div>
        ),
        key: `branch-${branchIdStr}`,
        children: locationNodes.length > 0 ? locationNodes : [
          {
            title: <span className="text-xs text-slate-400 italic">Chưa có cơ sở</span>,
            key: `empty-${branchIdStr}`,
            selectable: false,
          }
        ],
      };
    });

    // Departments that are not linked to any location or group
    const unassignedDepts = departments.filter((d) => !d.locationId && !d.departmentGroupTimekeepingId);
    if (unassignedDepts.length > 0 && branches.length > 0) {
      rootNodes.push({
        title: (
          <div className="flex items-center gap-2 py-1">
            <Network className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Phòng ban chung</span>
          </div>
        ),
        key: 'unassigned-depts',
        children: unassignedDepts.map((dept) => ({
          title: (
            <div className="flex items-center gap-2 py-0.5">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs text-slate-600">{dept.name}</span>
            </div>
          ),
          key: `dept-${dept._id || dept.id}`,
        })),
      });
    }

    if (branches.length === 0 && departments.length > 0) {
      return departments.map(dept => ({
        title: (
          <div className="flex items-center gap-2 py-1">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-sm font-medium text-slate-700">{dept.name}</span>
          </div>
        ),
        key: `dept-${dept._id || dept.id}`,
      }));
    }

    return [
      {
        title: (
          <div className="flex items-center gap-2 py-1">
            <Building2 className="w-4 h-4 text-slate-800" />
            <span className="text-sm font-bold text-slate-800">Công ty Cổ phần Chấm công</span>
          </div>
        ),
        key: 'company-root',
        children: rootNodes,
      }
    ];
  }, [branches, locations, groups, departments]);

  // Mock Activity Log Data
  const activities = [
    {
      title: 'Admin đã thêm Điểm chấm công mới',
      time: '10 phút trước',
      type: 'location',
    },
    {
      title: 'Nguyễn Văn A đã cập nhật Chi nhánh Hà Nội',
      time: '1 giờ trước',
      type: 'branch',
    },
    {
      title: 'Admin đã tạo phòng ban "Marketing"',
      time: 'Hôm qua, 14:30',
      type: 'department',
    },
    {
      title: 'Hệ thống tự động đồng bộ sơ đồ',
      time: 'Hôm qua, 00:00',
      type: 'system',
    },
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Sơ đồ Cây */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col min-h-[300px]">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm m-0">Cấu trúc Tổ chức</h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Tổng quan sơ đồ phân cấp</p>
        </div>
        <div className="p-4 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
          {branches.length === 0 && departments.length === 0 ? (
            <div className="text-center text-slate-400 text-xs py-8">Chưa có dữ liệu</div>
          ) : (
            <Tree
              showLine
              defaultExpandAll
              treeData={treeData}
              className="text-sm org-sidebar-tree"
              onSelect={(selectedKeys) => {
                if (selectedKeys.length > 0) {
                  const key = selectedKeys[0].toString();
                  if (key !== 'company-root' && !key.startsWith('empty-') && key !== 'unassigned-depts') {
                    window.dispatchEvent(new CustomEvent('org-filter', { detail: key }));
                  } else {
                    window.dispatchEvent(new CustomEvent('org-filter', { detail: null }));
                  }
                } else {
                  window.dispatchEvent(new CustomEvent('org-filter', { detail: null }));
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Lịch sử hoạt động */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex-1">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-slate-800 text-sm m-0">Lịch sử cập nhật</h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Ghi nhận các thay đổi cấu hình</p>
        </div>
        <div className="p-5">
          <Timeline
            className="mt-2 text-sm"
            items={activities.map((item, index) => {
              let color = 'blue';
              if (item.type === 'location') color = 'green';
              if (item.type === 'department') color = 'purple';
              if (item.type === 'system') color = 'gray';

              return {
                color: color,
                content: (
                  <div className="pb-4">
                    <p className="text-xs font-medium text-slate-700 m-0 leading-tight mb-1">{item.title}</p>
                    <span className="text-[10px] text-slate-400">{item.time}</span>
                  </div>
                ),
              };
            })}
          />
          <button className="w-full py-2 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100/50">
            Xem tất cả lịch sử
          </button>
        </div>
      </div>
      
      {/* CSS for Tree Customization */}
      <style dangerouslySetInnerHTML={{__html: `
        .org-sidebar-tree .ant-tree-node-content-wrapper:hover {
          background-color: transparent !important;
        }
        .org-sidebar-tree .ant-tree-node-selected {
          background-color: #f1f5f9 !important;
        }
      `}} />
    </div>
  );
}
