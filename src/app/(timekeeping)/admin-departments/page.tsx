"use client";

import React, { useEffect, useState } from "react";
import { BranchTimekeeping, DepartmentGroupTimekeeping, DepartmentTimekeeping } from "@/app/interface/timekeeping";

export default function AdminDepartmentsPage() {
  const [branches, setBranches] = useState<BranchTimekeeping[]>([]);
  const [groups, setGroups] = useState<DepartmentGroupTimekeeping[]>([]);
  const [departments, setDepartments] = useState<DepartmentTimekeeping[]>([]);

  // Form states
  const [newBranch, setNewBranch] = useState({ code: "", name: "", location: "" });
  const [newGroup, setNewGroup] = useState({ code: "", name: "", locationId: "" });
  const [newDept, setNewDept] = useState({ code: "", name: "", shortName: "", locationId: "", departmentGroupTimekeepingId: "" });

  const fetchBranches = async () => {
    const res = await fetch("/api/branch-timekeeping");
    const data = await res.json();
    setBranches(data.data || []);
  };

  const fetchGroups = async () => {
    const res = await fetch("/api/department-groups-timekeeping");
    const data = await res.json();
    setGroups(data.data || []);
  };

  const fetchDepartments = async () => {
    const res = await fetch("/api/departments-timekeeping");
    const data = await res.json();
    setDepartments(data.data || []);
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([
        fetchBranches(),
        fetchGroups(),
        fetchDepartments()
      ]);
    };
    init();
  }, []);

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/branch-timekeeping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", ...newBranch }),
    });
    setNewBranch({ code: "", name: "", location: "" });
    fetchBranches();
  };

  const handleDeleteBranch = async (id: string) => {
    if (!confirm("Xóa Chi nhánh?")) return;
    await fetch("/api/branch-timekeeping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    fetchBranches();
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/department-groups-timekeeping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", ...newGroup }),
    });
    setNewGroup({ code: "", name: "", locationId: "" });
    fetchGroups();
  };

  const handleDeleteGroup = async (_id: string) => {
    if (!confirm("Xóa Nhóm phòng ban?")) return;
    await fetch("/api/department-groups-timekeeping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", _id }),
    });
    fetchGroups();
  };

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/departments-timekeeping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", ...newDept }),
    });
    setNewDept({ code: "", name: "", shortName: "", locationId: "", departmentGroupTimekeepingId: "" });
    fetchDepartments();
  };

  const handleDeleteDept = async (_id: string) => {
    if (!confirm("Xóa Phòng ban?")) return;
    await fetch("/api/departments-timekeeping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", _id }),
    });
    fetchDepartments();
  };

  return (
    <div className="p-6 max-w-[2840px] mx-auto space-y-8 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-bold text-slate-800">Quản lý Cấu trúc Công ty (Admin)</h1>

      {/* BRANCHES */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 text-emerald-700">1. Chi nhánh (Branch)</h2>
        <form onSubmit={handleAddBranch} className="flex gap-2 mb-4">
          <input className="border p-2 rounded text-sm flex-1" placeholder="Mã CN" value={newBranch.code} onChange={e => setNewBranch({ ...newBranch, code: e.target.value })} required />
          <input className="border p-2 rounded text-sm flex-1" placeholder="Tên chi nhánh" value={newBranch.name} onChange={e => setNewBranch({ ...newBranch, name: e.target.value })} required />
          <input className="border p-2 rounded text-sm flex-1" placeholder="Địa chỉ" value={newBranch.location} onChange={e => setNewBranch({ ...newBranch, location: e.target.value })} />
          <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-emerald-700">Thêm</button>
        </form>
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-slate-100"><th className="p-2 border">ID</th><th className="p-2 border">Mã</th><th className="p-2 border">Tên</th><th className="p-2 border">Hành động</th></tr>
          </thead>
          <tbody>
            {branches.map(b => (
              <tr key={b.id} className="border-b">
                <td className="p-2 font-mono text-xs text-slate-500">{b.id}</td>
                <td className="p-2 font-semibold">{b.code}</td>
                <td className="p-2">{b.name}</td>
                <td className="p-2"><button onClick={() => handleDeleteBranch(b.id)} className="text-rose-500 hover:underline">Xóa</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* GROUPS */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 text-blue-700">2. Nhóm phòng ban (Department Group)</h2>
        <form onSubmit={handleAddGroup} className="flex gap-2 mb-4">
          <select className="border p-2 rounded text-sm flex-1" value={newGroup.locationId} onChange={e => setNewGroup({ ...newGroup, locationId: e.target.value })} required>
            <option value="">-- Chọn Cơ sở --</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input className="border p-2 rounded text-sm flex-1" placeholder="Mã Nhóm" value={newGroup.code} onChange={e => setNewGroup({ ...newGroup, code: e.target.value })} required />
          <input className="border p-2 rounded text-sm flex-1" placeholder="Tên nhóm (VD: Sản xuất)" value={newGroup.name} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} required />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">Thêm</button>
        </form>
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-slate-100"><th className="p-2 border">ID</th><th className="p-2 border">Chi nhánh</th><th className="p-2 border">Mã</th><th className="p-2 border">Tên</th><th className="p-2 border">Hành động</th></tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <tr key={g._id} className="border-b">
                <td className="p-2 font-mono text-xs text-slate-500">{g._id}</td>
                <td className="p-2 text-slate-500">{branches.find(b => b.id === g.locationId)?.name || g.locationId}</td>
                <td className="p-2 font-semibold">{g.code}</td>
                <td className="p-2">{g.name}</td>
                <td className="p-2"><button onClick={() => handleDeleteGroup(g._id!)} className="text-rose-500 hover:underline">Xóa</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DEPARTMENTS */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 text-purple-700">3. Phòng ban chi tiết (Department)</h2>
        <form onSubmit={handleAddDept} className="flex flex-col gap-2 mb-4">
          <div className="flex gap-2">
            <select className="border p-2 rounded text-sm flex-1" value={newDept.locationId} onChange={e => setNewDept({ ...newDept, locationId: e.target.value })} required>
              <option value="">-- Chọn Cơ sở --</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select className="border p-2 rounded text-sm flex-1" value={newDept.departmentGroupTimekeepingId} onChange={e => setNewDept({ ...newDept, departmentGroupTimekeepingId: e.target.value })} required>
              <option value="">-- Chọn Nhóm --</option>
              {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <input className="border p-2 rounded text-sm flex-1" placeholder="Mã PB" value={newDept.code} onChange={e => setNewDept({ ...newDept, code: e.target.value })} required />
            <input className="border p-2 rounded text-sm flex-1" placeholder="Tên phòng ban" value={newDept.name} onChange={e => setNewDept({ ...newDept, name: e.target.value })} required />
            <input className="border p-2 rounded text-sm flex-1" placeholder="Tên viết tắt" value={newDept.shortName} onChange={e => setNewDept({ ...newDept, shortName: e.target.value })} />
            <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-purple-700 w-24">Thêm</button>
          </div>
        </form>
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-slate-100"><th className="p-2 border">ID</th><th className="p-2 border">Chi nhánh</th><th className="p-2 border">Nhóm</th><th className="p-2 border">Mã</th><th className="p-2 border">Tên PB</th><th className="p-2 border">Hành động</th></tr>
          </thead>
          <tbody>
            {departments.map(d => (
              <tr key={d._id} className="border-b">
                <td className="p-2 font-mono text-xs text-slate-500">{d._id}</td>
                <td className="p-2 text-slate-500 text-xs">{branches.find(b => b.id === d.locationId)?.name || d.locationId}</td>
                <td className="p-2 text-slate-500 text-xs">{groups.find(g => g._id === d.departmentGroupTimekeepingId)?.name || d.departmentGroupTimekeepingId}</td>
                <td className="p-2 font-semibold">{d.code}</td>
                <td className="p-2">{d.name} <span className="text-xs text-slate-400 block">{d.shortName}</span></td>
                <td className="p-2"><button onClick={() => handleDeleteDept(d._id!)} className="text-rose-500 hover:underline">Xóa</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
