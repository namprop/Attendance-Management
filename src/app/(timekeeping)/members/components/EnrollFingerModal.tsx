import React, { useState } from 'react';
import { Modal, Button, message } from 'antd';
import { Fingerprint } from 'lucide-react';

interface EnrollFingerModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  deviceId: string;
  employeeId: string;
  onSuccess?: () => void;
}

export const EnrollFingerModal: React.FC<EnrollFingerModalProps> = ({
  isOpen,
  onClose,
  employeeName,
  deviceId,
  employeeId,
  onSuccess
}) => {
  const [isSending, setIsSending] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleResend = async () => {
    setIsSending(true);
    try {
      const res = await fetch('/api/v1/zkteco-devices/enroll-finger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, deviceId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi gửi lệnh');
      message.success('Đã gửi lại lệnh lấy vân tay xuống máy!');
    } catch (error: any) {
      message.error(error.message || 'Có lỗi xảy ra khi gửi lệnh.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelCommand = async () => {
    setIsCanceling(true);
    try {
      const res = await fetch('/api/v1/zkteco-devices/cancel-enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      });
      if (res.ok) {
        message.success('Đã hủy lệnh trên máy!');
        onClose();
      } else {
        const data = await res.json();
        throw new Error(data.message || 'Lỗi hủy lệnh');
      }
    } catch (error: any) {
      message.error(error.message || 'Có lỗi xảy ra khi hủy lệnh.');
      onClose(); // Vẫn đóng modal dù lỗi
    } finally {
      setIsCanceling(false);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      const res = await fetch('/api/v1/zkteco-devices/mark-fingerprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, deviceId })
      });
      if (res.ok) {
        message.success('Đã ghi nhận lưu vân tay trên máy thành công!');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const data = await res.json();
        throw new Error(data.message || 'Lỗi lưu lịch sử');
      }
    } catch (error: any) {
      message.error(error.message || 'Có lỗi xảy ra khi lưu trạng thái.');
      onClose();
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .enroll-mobile-modal .ant-modal {
            max-width: 100vw !important;
            margin: 0 !important;
            top: 0 !important;
            padding-bottom: 0 !important;
            height: 100dvh !important;
          }
          .enroll-mobile-modal .ant-modal-content {
            display: flex !important;
            flex-direction: column !important;
            height: 100dvh !important;
            border-radius: 0 !important;
          }
          .enroll-mobile-modal .ant-modal-body {
            flex: 1 !important;
            padding: 16px 0 0 0 !important;
            overflow-y: auto !important;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
      `}</style>
      <Modal
        open={isOpen}
        onCancel={onClose}
        footer={null}
        closable={true}
        width={400}
        wrapClassName="enroll-mobile-modal"
        title={
          <div className="text-center w-full font-semibold text-slate-800">
            Lấy vân tay cho: <span className="text-blue-600">{employeeName}</span>
          </div>
        }
      >
        <div className="flex flex-col items-center justify-center pt-8 pb-4">
          {/* Pulsing Fingerprint Icon */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
            <div className="relative bg-white border-2 border-slate-800 rounded-full p-4 shadow-lg flex items-center justify-center">
              <Fingerprint className="w-10 h-10 text-orange-400" />
            </div>
          </div>

          <h3 className="text-lg font-bold text-slate-800 mb-3">Đang chờ tín hiệu từ máy...</h3>
          
          <p className="text-center text-slate-500 text-sm px-4 mb-8">
            Vui lòng yêu cầu nhân viên <strong className="text-slate-800">{employeeName}</strong> thao tác ấn ngón tay <strong>3 lần</strong> trên mắt đọc của máy ZKTeco.
          </p>

          <div className="flex flex-col w-full gap-3 px-6">
            <Button 
              type="primary" 
              size="large"
              className="w-full bg-emerald-500 hover:bg-emerald-600 border-none font-medium"
              loading={isCompleting}
              onClick={handleComplete}
              disabled={isSending || isCanceling}
            >
              Đã quét xong (Hoàn tất)
            </Button>

            <Button 
              size="large"
              className="w-full text-blue-600 border-blue-200 hover:border-blue-400 font-medium"
              loading={isSending}
              onClick={handleResend}
              disabled={isCanceling || isCompleting}
            >
              Gửi lại lệnh quét
            </Button>

            <Button 
              size="large"
              className="w-full text-slate-500 font-medium"
              loading={isCanceling}
              onClick={handleCancelCommand}
              disabled={isSending || isCompleting}
            >
              Hủy bỏ lệnh
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
