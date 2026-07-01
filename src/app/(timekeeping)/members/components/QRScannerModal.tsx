import React, { useEffect, useRef, useState } from 'react';
import { Modal, Spin } from 'antd';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { QrCode, AlertCircle } from 'lucide-react';

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  open,
  onClose,
  onScanSuccess,
}) => {
  const [error, setError] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef<boolean>(false);

  const onScanSuccessRef = useRef(onScanSuccess);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
    onCloseRef.current = onClose;
  }, [onScanSuccess, onClose]);

  const stopAndClearScanner = async () => {
    if (scannerRef.current && !isStoppingRef.current) {
      isStoppingRef.current = true;
      const scanner = scannerRef.current;
      try {
        await scanner.stop();
      } catch (err) {
        // Ignore stop errors if not scanning
      }
      try {
        scanner.clear();
      } catch (err) {
        // Ignore clear errors
      }
      scannerRef.current = null;
      isStoppingRef.current = false;
    }
  };

  useEffect(() => {
    if (!open) {
      stopAndClearScanner();
      return;
    }

    // Delay a bit to ensure modal and #qr-reader div are fully rendered
    const initScanner = setTimeout(() => {
      setError('');
      try {
        const html5QrCode = new Html5Qrcode('qr-reader', {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Stop scanning once we get a result
            stopAndClearScanner();
            if (onScanSuccessRef.current) {
              onScanSuccessRef.current(decodedText);
            }
            if (onCloseRef.current) {
              onCloseRef.current();
            }
          },
          (errorMessage) => {
            // Ignore normal scanning errors (e.g., QR not found in frame)
          }
        ).catch((err) => {
          setError('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập camera của trình duyệt.');
          console.error('Camera Error:', err);
        });
      } catch (err) {
        console.error('Error init scanner:', err);
      }
    }, 400);

    return () => {
      clearTimeout(initScanner);
      stopAndClearScanner();
    };
  }, [open]);

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-slate-800">
          <QrCode className="w-5 h-5 text-blue-600" />
          <span>Quét mã QR nhân viên</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      centered
      width={400}
      styles={{ body: { padding: '24px 0 0' } }}
    >
      <div className="flex flex-col items-center">
        {error ? (
          <div className="p-6 text-center w-full">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-red-600 font-medium mb-4">{error}</p>
          </div>
        ) : (
          <div className="w-full relative bg-slate-900 rounded-b-lg overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
            <div id="qr-reader" className="w-full" style={{ border: 'none' }}></div>
            <div className="absolute inset-0 border-4 border-blue-500/30 pointer-events-none rounded-b-lg"></div>
          </div>
        )}
      </div>
    </Modal>
  );
};
