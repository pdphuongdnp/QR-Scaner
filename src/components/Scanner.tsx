import { Html5Qrcode } from 'html5-qrcode';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ScannerProps {
  onScan: (text: string) => void;
  onClose: () => void;
}

export function Scanner({ onScan, onClose }: ScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      (decodedText) => {
        if (html5QrCode.isScanning) {
          html5QrCode.stop().then(() => {
            onScan(decodedText);
          }).catch(console.error);
        }
      },
      (errorMessage) => {
        // parse error, ignore
      }
    ).catch((err) => {
      console.error("Error starting scanner", err);
      alert("Không thể mở camera. Vui lòng cấp quyền truy cập camera cho trình duyệt.");
    });

    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md relative flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-4 px-2">
          <h3 className="text-white font-medium text-lg">Đang quét mã QR...</h3>
          <button 
            onClick={() => {
              if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().then(onClose).catch(console.error);
              } else {
                onClose();
              }
            }}
            className="p-2 bg-white/10 rounded-full text-white"
          >
            <X size={24} />
          </button>
        </div>
        <div id="reader" className="w-full rounded-2xl overflow-hidden bg-black border-2 border-white/10"></div>
        <p className="text-white/60 text-sm mt-6 text-center">
          Hướng camera vào mã QR để quét tự động
        </p>
      </div>
    </div>
  );
}
