'use client';
import React, { useState } from 'react';
import {
  Settings, Trash2, AlertOctagon, ShieldAlert, Sparkles,
  Volume2, Shield, Power, RotateCw, Lock, ChevronDown, X,
} from 'lucide-react';
import { message as antMessage, Modal } from 'antd';

// ─── Password Modal ───────────────────────────────────────────────────────────
function PasswordModal({ onConfirm, onCancel }: { onConfirm: (pwd: string) => void; onCancel: () => void }) {
  const [pwd, setPwd] = useState('');
  return (
    <div className="fixed inset-0 z-1000 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Khóa Menu máy</h3>
              <p className="text-xs text-slate-400">Nhập mật khẩu số để khóa</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 pb-5 space-y-3.5">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Mật khẩu (chỉ số)</label>
            <input
              type="number" value={pwd} onChange={e => setPwd(e.target.value)}
              placeholder="Mặc định: 123456" autoFocus
              className="w-full h-11 px-4 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-400 dark:focus:border-purple-600 transition-all"
              onKeyDown={e => e.key === 'Enter' && onConfirm(pwd || '123456')}
            />
            <p className="text-[11px] text-slate-400 mt-1.5">Để trống = dùng mặc định <strong>123456</strong>. Mở khóa: ID 9999, Mật khẩu đã đặt.</p>
          </div>
          <div className="flex gap-2.5">
            <button onClick={onCancel} className="flex-1 h-10 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">Hủy</button>
            <button onClick={() => onConfirm(pwd || '123456')} className="flex-1 h-10 text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-colors">Khóa Menu</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Action Button ────────────────────────────────────────────────────────────
function ActionBtn({ icon, label, colorClass, onClick, disabled }: {
  icon: React.ReactNode;
  label: string;
  colorClass: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled} onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border font-semibold text-sm transition-all duration-150 w-full text-left disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] ${colorClass}`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 leading-tight">{label}</span>
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ZktecoDeviceSettings({ connectorUrl, deviceIp, devicePort }: {
  connectorUrl: string;
  deviceIp: string;
  devicePort?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<number | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showVoicePanel, setShowVoicePanel] = useState(false);

  const doAction = async (actionStr: string, extra: Record<string, unknown> = {}) => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/zkteco-devices/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionStr, deviceIp, devicePort, connectorUrl, ...extra }),
      });
      const result = await res.json();
      if (result.success) antMessage.success(`Đã gửi lệnh "${actionStr}" tới thiết bị.`);
      else antMessage.error(result.message || result.error || 'Lỗi thiết bị');
    } catch {
      antMessage.error('Lỗi mạng khi gửi lệnh điều khiển.');
    } finally {
      setLoading(false);
    }
  };

  const testVoice = async (index: number) => {
    setPlayingVoice(index);
    try {
      await fetch('/api/v1/zkteco-devices/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'voiceTest', index, deviceIp, devicePort, connectorUrl }),
      });
    } catch { /* ignore */ } finally {
      setTimeout(() => setPlayingVoice(null), 2000);
    }
  };

  const handleClearLogs = () => {
    Modal.confirm({
      title: 'Xóa sạch dữ liệu chấm công',
      content: 'Hành động này sẽ xóa vĩnh viễn toàn bộ bản ghi quẹt vân tay trên bộ nhớ máy. Không thể hoàn tác!',
      okText: 'Xác nhận xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        setLoading(true);
        try {
          const params = new URLSearchParams({ ip: deviceIp, port: String(devicePort || ''), connectorUrl });
          const res = await fetch(`/api/v1/zkteco-devices/logs?${params}`, { method: 'DELETE' });
          const result = await res.json();
          if (result.success) antMessage.success('Toàn bộ logs đã bị xóa khỏi thiết bị.');
          else antMessage.error(result.message || result.error || 'Lỗi xóa log');
        } catch {
          antMessage.error('Lỗi mạng khi xóa log.');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleLockMenu = async (pwd: string) => {
    setShowPasswordModal(false);
    await doAction('lock-menu', { password: pwd });
    antMessage.success(`Máy đã khóa Menu. Mở khóa: ID 9999 / Mật khẩu: ${pwd}`);
  };

  return (
    <div className="space-y-4">
      {/* ─── Control actions ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Lệnh điều khiển</h3>
            <p className="text-[11px] text-slate-400">Gửi lệnh trực tiếp đến thiết bị</p>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <ActionBtn
            icon={<ShieldAlert className="w-4 h-4" />} label="Mở khóa cửa (Unlock)"
            colorClass="border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/10 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/25"
            onClick={() => doAction('unlock')} disabled={loading}
          />

          {/* Voice test panel (expandable) */}
          <div className="sm:col-span-2 border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/10 rounded-xl overflow-hidden">
            <button type="button" onClick={() => setShowVoicePanel(v => !v)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
              <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="flex-1 text-sm font-semibold text-indigo-700 dark:text-indigo-400">Test loa — Chọn âm thanh</span>
              {playingVoice !== null && (
                <span className="text-[10px] font-bold text-white bg-indigo-500 px-2 py-0.5 rounded-full animate-pulse">Đang phát #{playingVoice}</span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-indigo-400 transition-transform duration-200 ${showVoicePanel ? 'rotate-180' : ''}`} />
            </button>
            {showVoicePanel && (
              <div className="px-4 pb-4">
                <p className="text-[11px] text-indigo-400/80 mb-3 font-medium">Click vào số âm thanh để phát thử trực tiếp trên máy</p>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {Array.from({ length: 56 }, (_, i) => (
                    <button
                      key={i} onClick={() => testVoice(i)} disabled={playingVoice !== null}
                      className={`h-9 rounded-xl text-xs font-bold border transition-all duration-150 active:scale-95 disabled:cursor-not-allowed
                        ${playingVoice === i
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md animate-pulse'
                          : 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-400 disabled:opacity-40'
                        }`}
                    >
                      #{i}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <ActionBtn
            icon={<Lock className="w-4 h-4" />} label="Vô hiệu hóa chấm công"
            colorClass="border-orange-100 dark:border-orange-900/40 bg-orange-50/40 dark:bg-orange-950/10 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/25"
            onClick={() => doAction('disable')} disabled={loading}
          />

          <ActionBtn
            icon={<Sparkles className="w-4 h-4" />} label="Cho phép chấm công"
            colorClass="border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/25"
            onClick={() => doAction('enable')} disabled={loading}
          />

          <ActionBtn
            icon={<Shield className="w-4 h-4" />} label="Khóa Menu (Set Password)"
            colorClass="border-purple-100 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/10 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/25"
            onClick={() => setShowPasswordModal(true)} disabled={loading}
          />

          <ActionBtn
            icon={<ShieldAlert className="w-4 h-4" />} label="Gỡ khóa Menu (Clear Pass)"
            colorClass="border-pink-100 dark:border-pink-900/40 bg-pink-50/40 dark:bg-pink-950/10 text-pink-700 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/25"
            onClick={() => doAction('unlock-menu')} disabled={loading}
          />

          <ActionBtn
            icon={<RotateCw className="w-4 h-4" />} label="Khởi động lại thiết bị"
            colorClass="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            onClick={() => doAction('restart')} disabled={loading}
          />

          <ActionBtn
            icon={<Power className="w-4 h-4" />} label="Tắt nguồn thiết bị"
            colorClass="border-slate-700/40 bg-slate-800 dark:bg-slate-950 text-white hover:bg-slate-900 dark:hover:bg-slate-900"
            onClick={() => doAction('poweroff')} disabled={loading}
          />
        </div>
      </div>

      {/* ─── Danger Zone ───────────────────────────────────────────────── */}
      <div className="border border-rose-100 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/5 rounded-2xl overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300">Vùng nguy hiểm</h4>
            <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-1 mb-4 leading-relaxed">
              Xóa vĩnh viễn toàn bộ bản ghi chấm công trên bộ nhớ máy. Hãy đảm bảo đã đồng bộ logs về Server trước khi xóa.
            </p>
            <button
              onClick={handleClearLogs} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold rounded-xl text-xs transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa sạch dữ liệu chấm công
            </button>
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <PasswordModal onConfirm={handleLockMenu} onCancel={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
}
