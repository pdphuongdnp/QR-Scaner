import { Html5Qrcode } from 'html5-qrcode';
import { useEffect, useRef } from 'react';
import { X, Upload } from 'lucide-react';

interface ScannerProps {
  onScan: (text: string) => void;
  onClose: () => void;
}

export function Scanner({ onScan, onClose }: ScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // alert("Không thể mở camera. Vui lòng cấp quyền truy cập camera cho trình duyệt.");
    });

    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [onScan]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !scannerRef.current) return;

    try {
      // Stop scanning if active before processing file
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      
      const decodedText = await scannerRef.current.scanFile(file, true);
      onScan(decodedText);
    } catch (err) {
      console.error("Error scanning file", err);
      alert("Không tìm thấy mã QR trong ảnh này. Vui lòng thử ảnh khác hoặc căn chỉnh rõ nét hơn.");
      
      // Restart camera if it was stopped
      if (!scannerRef.current.isScanning) {
        scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            scannerRef.current?.stop().then(() => onScan(decodedText)).catch(console.error);
          },
          () => {}
        ).catch(console.error);
      }
    }
  };

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
        
        <div className="mt-8 w-full space-y-4">
          <p className="text-white/60 text-sm text-center">
            Hướng camera vào mã QR để quét tự động
          </p>
          
          <div className="flex flex-col items-center gap-3">
            <div className="w-full h-px bg-white/10"></div>
            <p className="text-white/40 text-xs uppercase tracking-widest">Hoặc</p>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/*" 
              className="hidden" 
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10 w-full justify-center"
            >
              <Upload size={20} />
              <span>Tải ảnh mã QR từ máy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
