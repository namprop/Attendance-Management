'use client';
import React, { useState } from 'react';
import { Users, UserPlus, Trash2, Edit, Search, X, Key, ChevronDown } from 'lucide-react';
import { message as antMessage, Modal } from 'antd';

interface ZkUser {
  uid: number;
  userId: string;
  deviceUserId?: string;
  name: string;
  role?: number;
  password?: string;
  cardno?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StyledSelect({ value, onChange, children, className = '' }: {
  value: string | number;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none w-full h-10 px-3 pr-9 text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-all cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
    </div>
  );
}

function RoleBadge({ role }: { role?: number }) {
  if (role === 14) return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100 dark:border-rose-900">ADMIN</span>
  );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100 dark:border-blue-900">USER</span>
  );
}

const FINGERS = [
  'Ngón cái tay trái', 'Ngón trỏ tay trái', 'Ngón giữa tay trái', 'Ngón áp út tay trái', 'Ngón út tay trái',
  'Ngón cái tay phải', 'Ngón trỏ tay phải', 'Ngón giữa tay phải', 'Ngón áp út tay phải', 'Ngón út tay phải',
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ZktecoUserManagement({ connectorUrl, deviceIp, devicePort }: {
  connectorUrl: string;
  deviceIp: string;
  devicePort?: number;
}) {
  const [users, setUsers] = useState<ZkUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [hasFetchedInit, setHasFetchedInit] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({ uid: '', userid: '', name: '', password: '', role: '0' });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedEnrollUser, setSelectedEnrollUser] = useState<ZkUser | null>(null);
  const [enrollState, setEnrollState] = useState<{ status: 'idle' | 'waiting'; fingerIndex?: number }>({ status: 'idle' });

  const buildParams = (extra: Record<string, string | number | undefined> = {}) => {
    const p = new URLSearchParams({ connectorUrl, ip: deviceIp, port: String(devicePort || '') });
    Object.entries(extra).forEach(([k, v]) => { if (v !== undefined) p.set(k, String(v)); });
    return p;
  };

  const fetchUsers = async (targetPage = page, search = searchQuery, targetLimit = limit) => {
    setLoading(true);
    setFetchError('');
    try {
      const params = buildParams({ page: targetPage, limit: targetLimit, search });
      const res = await fetch(`/api/v1/zkteco-devices/users?${params}`);
      const result = await res.json();
      if (result.success) {
        setUsers(result.users || []);
        setTotalPages(result.totalPages || 1);
        setTotalUsers(result.total || 0);
        setPage(targetPage);
        if (!editMode && result.nextUid) setFormData(prev => ({ ...prev, uid: String(result.nextUid) }));
      } else {
        setFetchError(result.message || 'Lỗi khi tải danh sách');
      }
    } catch {
      setFetchError('Lỗi kết nối tới Connector');
    } finally {
      setLoading(false);
      setHasFetchedInit(true);
    }
  };

  React.useEffect(() => {
    const t = setTimeout(() => fetchUsers(1), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectorUrl, deviceIp, devicePort]);

  React.useEffect(() => {
    if (enrollState.status === 'waiting' && selectedEnrollUser) {
      const userId = selectedEnrollUser.userId || selectedEnrollUser.deviceUserId;
      if (!userId) return;
      const params = buildParams({ userId });
      const es = new EventSource(`/api/v1/zkteco-devices/enroll-direct/status?${params}`);
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status === 'success') {
            handleEnrollDone();
            antMessage.success(`Lấy vân tay ngón ${enrollState.fingerIndex} thành công cho NV: ${userId}`);
          } else if (data.status === 'timeout') {
            antMessage.warning('Quá 30s không nhận vân tay, thử lại!');
            setEnrollState({ status: 'idle' });
          }
        } catch { /* ignore */ }
      };
      es.onerror = () => es.close();
      return () => es.close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollState.status, selectedEnrollUser]);

  const handleEnrollFingerprint = async (userId: string, fingerIndex: number) => {
    try {
      const res = await fetch('/api/v1/zkteco-devices/enroll-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectorUrl, ip: deviceIp, port: devicePort || '', action: 'start', userId, fingerIndex }),
      });
      const data = await res.json();
      if (data.success) setEnrollState({ status: 'waiting', fingerIndex });
      else antMessage.error(data.error || 'Không thể kích hoạt lấy vân tay');
    } catch {
      antMessage.error('Lỗi kết nối tới Connector');
    }
  };

  const handleCancelEnroll = async () => {
    try {
      await fetch('/api/v1/zkteco-devices/enroll-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectorUrl, ip: deviceIp, port: devicePort || '', action: 'cancel' }),
      });
    } catch { /* ignore */ } finally {
      setEnrollState({ status: 'idle' });
    }
  };

  function handleEnrollDone() {
    setEnrollState({ status: 'idle' });
    setSelectedEnrollUser(null);
    fetchUsers(page);
  }

  const handleDeleteUser = (uid: number, name: string) => {
    Modal.confirm({
      title: 'Xóa nhân viên khỏi máy',
      content: `Xóa "${name}" (UID: ${uid}) khỏi thiết bị?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const params = buildParams({ uid });
          const res = await fetch(`/api/v1/zkteco-devices/users?${params}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) { antMessage.success(`Đã xóa UID: ${uid}`); fetchUsers(page); }
          else antMessage.error(data.error || 'Lỗi xóa nhân viên');
        } catch { antMessage.error('Lỗi kết nối tới Connector'); }
      },
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const method = editMode ? 'PUT' : 'POST';
      const res = await fetch('/api/v1/zkteco-devices/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectorUrl, ip: deviceIp, port: devicePort || '', ...formData }),
      });
      const data = await res.json();
      if (data.success) {
        antMessage.success(editMode ? 'Cập nhật thành công!' : 'Tạo nhân viên thành công!');
        setFormData({ uid: '', userid: '', name: '', password: '', role: '0' });
        setEditMode(false);
        setShowForm(false);
        fetchUsers(1);
      } else {
        antMessage.error(data.error || data.message || 'Có lỗi xảy ra');
      }
    } catch {
      antMessage.error('Lỗi kết nối server');
    } finally {
      setFormLoading(false);
    }
  };

  const startEdit = (user: ZkUser) => {
    setEditMode(true);
    setFormData({
      uid: String(user.uid),
      userid: String(user.userId || user.deviceUserId || ''),
      name: user.name,
      password: user.password || '',
      role: String(user.role || 0),
    });
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setFormData({ uid: '', userid: '', name: '', password: '', role: '0' });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      {/* ─── Form thêm/sửa ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => { if (!editMode) setShowForm(v => !v); }}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-slate-50/60 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-100/60 transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <UserPlus className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 flex-1 text-left">
            {editMode ? 'Cập nhật nhân viên' : 'Thêm nhân viên mới'}
          </span>
          {!editMode && (
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showForm ? 'rotate-180' : ''}`} />
          )}
        </button>

        {(showForm || editMode) && (
          <form onSubmit={handleCreateUser} className="p-4 space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">UID *</label>
                <input
                  required type="number" disabled={editMode} value={formData.uid}
                  onChange={e => setFormData({ ...formData, uid: e.target.value })}
                  placeholder="VD: 1"
                  className={`w-full h-10 px-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-all ${editMode ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mã NV *</label>
                <input
                  required type="text" value={formData.userid}
                  onChange={e => setFormData({ ...formData, userid: e.target.value })}
                  placeholder="VD: NV001"
                  className="w-full h-10 px-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tên hiển thị *</label>
              <input
                required type="text" value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Nguyễn Văn A"
                className="w-full h-10 px-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mật khẩu</label>
                <input
                  type="password" value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Không bắt buộc"
                  className="w-full h-10 px-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quyền hạn</label>
                <StyledSelect value={formData.role} onChange={v => setFormData({ ...formData, role: v })}>
                  <option value="0">Nhân viên (User)</option>
                  <option value="14">Quản trị (Admin)</option>
                </StyledSelect>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="submit" disabled={formLoading}
                className="flex-1 h-11 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {formLoading ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Đang lưu...</>) : (editMode ? 'Cập nhật' : 'Tạo mới')}
              </button>
              {(editMode || showForm) && (
                <button type="button" onClick={cancelEdit} className="h-11 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold transition-colors">
                  Hủy
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* ─── Danh sách nhân viên ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 shrink-0">
            <Users className="w-4 h-4 text-blue-500" />
            Nhân viên
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{totalUsers}</span>
          </h3>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                type="text" placeholder="Tên, mã NV..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchUsers(1, searchQuery)}
                className="w-full h-9 pl-9 pr-8 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-colors"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); fetchUsers(1, ''); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button onClick={() => fetchUsers(1, searchQuery)} disabled={loading} className="h-9 px-3 border border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-bold rounded-xl text-xs transition-colors disabled:opacity-50 whitespace-nowrap">
              {loading ? '...' : 'Tìm'}
            </button>
          </div>
        </div>

        {fetchError && (
          <div className="px-4 py-3 bg-rose-50 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 text-xs font-semibold">
            {fetchError}
          </div>
        )}

        {!hasFetchedInit && loading ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Đang tải danh sách từ máy chấm công...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500">
            <Users className="mx-auto w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">Không có nhân viên nào trên thiết bị</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/30">
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-16">UID</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mã NV</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Họ & Tên</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-20">Quyền</th>
                    <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map((user, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{user.uid}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                          {user.userId || user.deviceUserId}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100 max-w-[200px] truncate">{user.name}</td>
                      <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => setSelectedEnrollUser(user)} className="h-7 px-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1">
                            <Key className="w-3 h-3" /> Vân tay
                          </button>
                          <button onClick={() => startEdit(user)} className="h-7 w-7 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors flex items-center justify-center">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteUser(user.uid, user.name)} className="h-7 w-7 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors flex items-center justify-center">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((user, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <span className="text-[11px] font-black text-slate-500">#{user.uid}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{user.name}</p>
                      <RoleBadge role={user.role} />
                    </div>
                    <p className="text-xs text-slate-400 font-mono">{user.userId || user.deviceUserId}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => setSelectedEnrollUser(user)} className="h-8 w-8 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 rounded-xl flex items-center justify-center">
                      <Key className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => startEdit(user)} className="h-8 w-8 text-blue-500 hover:bg-blue-50 rounded-xl flex items-center justify-center">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteUser(user.uid, user.name)} className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-xl flex items-center justify-center">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Phân trang */}
        {totalUsers > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Hiển thị:</span>
              <StyledSelect value={limit} onChange={v => { const n = Number(v); setLimit(n); fetchUsers(1, searchQuery, n); }} className="w-24">
                <option value={10}>10 dòng</option>
                <option value={20}>20 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
              </StyledSelect>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchUsers(page - 1, searchQuery, limit)} disabled={page === 1 || loading} className="h-8 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors">← Trước</button>
              <StyledSelect value={page} onChange={v => fetchUsers(Number(v), searchQuery, limit)} className="w-32">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <option key={p} value={p}>Trang {p} / {totalPages}</option>
                ))}
              </StyledSelect>
              <button onClick={() => fetchUsers(page + 1, searchQuery, limit)} disabled={page === totalPages || loading} className="h-8 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors">Sau →</button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Modal Đăng ký vân tay ──────────────────────────────────────── */}
      {selectedEnrollUser && (
        <div className="fixed inset-0 z-1000 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-500">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Đăng ký vân tay</h3>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{selectedEnrollUser.name}</p>
                </div>
              </div>
              <button onClick={() => { if (enrollState.status === 'waiting') handleCancelEnroll(); setSelectedEnrollUser(null); setEnrollState({ status: 'idle' }); }} className="text-slate-400 hover:text-slate-600 w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              {enrollState.status === 'idle' ? (
                <>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                    Chọn ngón tay để kích hoạt cảm biến. Mã NV:{' '}
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                      {selectedEnrollUser.userId || selectedEnrollUser.deviceUserId}
                    </span>
                  </p>
                  <div className="space-y-1.5 max-h-72 overflow-y-auto">
                    {FINGERS.map((name, idx) => (
                      <button key={idx} onClick={() => handleEnrollFingerprint(selectedEnrollUser.userId || selectedEnrollUser.deviceUserId || '', idx)} className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700/60 hover:bg-blue-50/30 dark:hover:bg-blue-950/10 transition-all group">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">Ngón {idx} — {name}</span>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">Đăng ký →</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setSelectedEnrollUser(null)} className="w-full mt-4 h-10 text-sm font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                    Đóng
                  </button>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <Key className="absolute inset-0 m-auto w-7 h-7 text-emerald-500" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">Đang chờ vân tay...</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed max-w-xs mx-auto">
                    Yêu cầu <strong>{selectedEnrollUser.name}</strong> đặt ngón {enrollState.fingerIndex} lên máy <strong>3 lần</strong> liên tục.
                  </p>
                  <div className="space-y-2">
                    <button onClick={handleEnrollDone} className="w-full h-10 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors">Xác nhận đã quét xong</button>
                    <button onClick={() => handleEnrollFingerprint(selectedEnrollUser.userId || selectedEnrollUser.deviceUserId || '', enrollState.fingerIndex || 0)} className="w-full h-10 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-xl transition-colors">Thử gửi lại lệnh</button>
                    <button onClick={handleCancelEnroll} className="w-full h-10 text-sm font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 rounded-xl transition-colors">Hủy bỏ</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
