import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { QrCode, Plus, Download, Trash2, FileText, ShoppingCart, ChevronLeft, ChevronRight, Edit, X, History, Save, Home, HelpCircle, Info } from 'lucide-react';
import { Scanner } from './components/Scanner';
import { GuideModal } from './components/GuideModal';
import { downloadUserGuideDocx } from './utils/generateDocx';
import Joyride, { STATUS, Step } from 'react-joyride';

interface Record {
  id: string;
  type?: 'soan_hang' | 'nhap_hang';
  orderNumber: string;
  pickerName: string;
  location: string; // Vị trí thực tế
  productLocation: string; // Vị trí mã hàng (từ QR)
  productName: string;
  quantity: string;
  note?: string;
  transferToLocation?: string; // Vị trí chuyển đến (chỉ cho Nhập hàng)
  createdAt: number;
  
  maBravo?: string;
  khachHang?: string;
  dvt?: string;
  slThucXuat?: string;
  quiCach?: string;
  slBaoCay?: string;
  slLe?: string;
  thongTinMaHang?: string;
  nhanVienQuanHang?: string;
  trongLuong?: string;
  taiTrongXe?: string;
}

type ScanField = 'orderNumber' | 'pickerName' | 'location' | 'productName' | 'productQR' | 'welcomeOrderQR' | 'transferToLocation' | null;

type ModalState = {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'alert' | 'confirm';
  onConfirm?: () => void;
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'soan_hang' | 'nhap_hang'>('welcome');
  
  const [modal, setModal] = useState<ModalState>({ isOpen: false, title: '', message: '', type: 'alert' });

  const showAlert = (message: string, title = 'Thông báo') => {
    setModal({ isOpen: true, title, message, type: 'alert' });
  };

  const showConfirm = (message: string, onConfirm: () => void, title = 'Xác nhận') => {
    setModal({ isOpen: true, title, message, type: 'confirm', onConfirm });
  };

  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  // Load records from localStorage on initial render
  const [records, setRecords] = useState<Record[]>(() => {
    const saved = localStorage.getItem('qr_scanner_records');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeOrderNumber, setActiveOrderNumber] = useState('');
  const [orderNumberInput, setOrderNumberInput] = useState('');
  const [pickerName, setPickerName] = useState(() => {
    return localStorage.getItem('qr_scanner_picker_name') || '';
  });
  const [location, setLocation] = useState('');
  const [productLocation, setProductLocation] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [transferToLocation, setTransferToLocation] = useState('');
  
  const [maBravo, setMaBravo] = useState('');
  const [khachHang, setKhachHang] = useState('');
  const [dvt, setDvt] = useState('');
  const [slThucXuat, setSlThucXuat] = useState('');
  const [quiCach, setQuiCach] = useState('');
  const [slBaoCay, setSlBaoCay] = useState('');
  const [slLe, setSlLe] = useState('');
  const [thongTinMaHang, setThongTinMaHang] = useState('');
  const [nhanVienQuanHang, setNhanVienQuanHang] = useState('');
  const [trongLuong, setTrongLuong] = useState('');
  const [taiTrongXe, setTaiTrongXe] = useState('');

  const [scanningField, setScanningField] = useState<ScanField>(null);
  
  // Review & Edit states
  const [reviewIndex, setReviewIndex] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [runTour, setRunTour] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Check if it's the first time visiting a screen to run the tour
  useEffect(() => {
    const hasSeenTour = localStorage.getItem(`has_seen_tour_${currentScreen}_v1`);
    if (!hasSeenTour) {
      setRunTour(true);
    } else {
      setRunTour(false);
    }
  }, [currentScreen]);

  const handleTourFinish = (data: any) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRunTour(false);
      localStorage.setItem(`has_seen_tour_${currentScreen}_v1`, 'true');
    }
  };

  const getTourSteps = (): Step[] => {
    if (currentScreen === 'welcome') {
      return [
        {
          target: '#picker-name-input',
          content: 'Đầu tiên, hãy nhập tên của bạn vào đây để hệ thống biết ai là người thực hiện.',
          disableBeacon: true,
        },
        {
          target: '#order-number-input',
          content: 'Nếu bạn đi Soạn hàng, hãy quét mã QR trên phiếu hoặc nhập số đơn hàng tại đây.',
        },
        {
          target: '#btn-soan-hang',
          content: 'Bấm vào đây để bắt đầu quy trình Soạn hàng (màu xanh).',
        },
        {
          target: '#btn-nhap-hang',
          content: 'Hoặc bấm vào đây nếu bạn muốn Nhập hàng mới vào kho (màu vàng).',
        },
        {
          target: '#btn-help-docx',
          content: 'Bạn cũng có thể tải file hướng dẫn chi tiết bằng Word tại đây để in ra nếu cần.',
        },
      ];
    }
    
    if (currentScreen === 'soan_hang') {
      return [
        {
          target: '#btn-scan-product',
          content: 'Đây là nút quan trọng nhất! Bấm vào để quét mã QR trên sản phẩm. Thông tin sản phẩm sẽ tự động hiện ra.',
          disableBeacon: true,
        },
        {
          target: '#product-name-display',
          content: 'Thông tin sản phẩm sau khi quét sẽ được hiển thị tại đây.',
        },
        {
          target: '#location-input',
          content: 'Nhập vị trí bạn lấy hàng vào đây. Định dạng chuẩn là X-000-00.',
        },
        {
          target: '#quantity-input',
          content: 'Nhập số lượng thực tế bạn đã soạn.',
        },
        {
          target: '#btn-add-record',
          content: 'Sau khi nhập đủ thông tin, bấm nút này để lưu món hàng vào danh sách tạm thời.',
        },
        {
          target: '#review-section',
          content: 'Bạn có thể xem lại, sửa hoặc xóa các món đã quét tại khu vực này.',
        },
        {
          target: '#btn-save-csv',
          content: 'Cuối cùng, khi đã xong toàn bộ đơn, hãy bấm nút này để tải file dữ liệu về máy.',
        },
        {
          target: '#btn-home',
          content: 'Bấm vào đây để quay lại màn hình chính khi hoàn tất.',
        },
      ];
    }
    
    if (currentScreen === 'nhap_hang') {
      return [
        {
          target: '#product-name-input',
          content: 'Nhập tên hàng hóa bạn đang nhập vào kho.',
          disableBeacon: true,
        },
        {
          target: '#location-input',
          content: 'Nhập vị trí hiện tại của hàng hóa.',
        },
        {
          target: '#transfer-to-location-input',
          content: 'Nếu bạn đang chuyển kho, hãy nhập vị trí mới tại đây.',
        },
        {
          target: '#quantity-input',
          content: 'Nhập số lượng hàng hóa.',
        },
        {
          target: '#note-input',
          content: 'Thêm ghi chú nếu cần thiết.',
        },
        {
          target: '#btn-add-record',
          content: 'Bấm nút này để lưu thông tin nhập hàng.',
        },
        {
          target: '#review-section',
          content: 'Xem lại danh sách hàng đã nhập tại đây.',
        },
        {
          target: '#btn-save-csv',
          content: 'Tải file dữ liệu nhập hàng khi hoàn tất.',
        },
        {
          target: '#btn-home',
          content: 'Quay lại màn hình chính.',
        },
      ];
    }
    
    return [];
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Derived state: records for the CURRENT order only
  const currentOrderRecords = records.filter(r => 
    r.orderNumber === activeOrderNumber && 
    (currentScreen === 'nhap_hang' ? r.type === 'nhap_hang' : r.type !== 'nhap_hang')
  );

  // Clamp review index during render to prevent out-of-bounds blank items
  const safeReviewIndex = Math.max(0, Math.min(reviewIndex, currentOrderRecords.length - 1));

  // Sync the state if it was out of bounds
  useEffect(() => {
    if (reviewIndex !== safeReviewIndex) {
      setReviewIndex(safeReviewIndex);
    }
  }, [reviewIndex, safeReviewIndex]);

  // Save to localStorage whenever records change
  useEffect(() => {
    localStorage.setItem('qr_scanner_records', JSON.stringify(records));
  }, [records]);

  // Save picker name to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('qr_scanner_picker_name', pickerName);
  }, [pickerName]);

  const handleScan = (text: string) => {
    if (scanningField === 'orderNumber') setOrderNumberInput(text);
    if (scanningField === 'pickerName') setPickerName(text);
    if (scanningField === 'location') setLocation(text);
    if (scanningField === 'transferToLocation') setTransferToLocation(text);
    if (scanningField === 'welcomeOrderQR') {
      if (text.includes(';')) {
        const parts = text.split(';');
        if (parts.length >= 5) {
          // Extract order number (index 4, which is 5th item)
          setOrderNumberInput(parts[4]?.trim() || '');
        } else {
          setOrderNumberInput(text);
        }
      } else {
        setOrderNumberInput(text);
      }
    }
    if (scanningField === 'productName' || scanningField === 'productQR') {
      if (text.includes(';')) {
        const parts = text.split(';');
        if (parts.length >= 14) {
          const newMaBravo = parts[1]?.trim() || '';
          const newProductName = parts[2]?.trim() || '';
          const newKhachHang = parts[3]?.trim() || '';
          const newOrderNumber = parts[4]?.trim() || '';
          const newDvt = parts[5]?.trim() || '';
          const newSlThucXuat = parts[6]?.trim() || '';
          const newQuiCach = parts[7]?.trim() || '';
          const newSlBaoCay = parts[8]?.trim() || '';
          const newSlLe = parts[9]?.trim() || '';
          const newProductLocation = parts[10]?.trim() || '';
          const newNhanVienQuanHang = parts[11]?.trim() || '';
          const newTrongLuong = parts[12]?.trim() || '';
          const newTaiTrongXe = parts[13]?.trim() || '';

          const applyScanData = () => {
            setMaBravo(newMaBravo);
            setProductName(newProductName);
            setKhachHang(newKhachHang);
            if (newOrderNumber && newOrderNumber !== activeOrderNumber) {
               showAlert(`Cảnh báo: Đơn hàng trong mã QR (${newOrderNumber}) khác với đơn hàng đang soạn (${activeOrderNumber})`);
            }
            setDvt(newDvt);
            setSlThucXuat(newSlThucXuat);
            setQuiCach(newQuiCach);
            setSlBaoCay(newSlBaoCay);
            setSlLe(newSlLe);
            setProductLocation(newProductLocation);
            setThongTinMaHang(newProductLocation);
            setNhanVienQuanHang(newNhanVienQuanHang);
            setTrongLuong(newTrongLuong);
            setTaiTrongXe(newTaiTrongXe);
            setLocation(''); // Để trống vị trí thực tế khi quét mã mới
          };

          const isDuplicate = currentOrderRecords.some(r => r.maBravo === newMaBravo);
          
          if (isDuplicate) {
            showConfirm(`Mã hàng ${newMaBravo} đã được quét trước đó. Bạn có muốn nhập lại mã này không?`, () => {
              applyScanData();
            });
          } else {
            applyScanData();
          }
        } else {
          setProductName(text);
          setLocation('');
        }
      } else {
        setProductName(text);
      }
    }
    setScanningField(null);
  };

  const handleAddOrUpdateRecord = () => {
    if (!location && !productName && !quantity) {
      showAlert('Vui lòng nhập ít nhất một thông tin sản phẩm (Vị trí, Tên SP, hoặc Số lượng)');
      return;
    }
    
    if (editingId) {
      // Update existing record
      setRecords(records.map(r => 
        r.id === editingId 
          ? { ...r, location, productLocation, productName, quantity, note, transferToLocation, maBravo, khachHang, dvt, slThucXuat, quiCach, slBaoCay, slLe, thongTinMaHang, nhanVienQuanHang, trongLuong, taiTrongXe } 
          : r
      ));
      setEditingId(null);
      showToast('Đã cập nhật bản ghi!');
    } else {
      // Add new record
      const newRecord: Record = {
        id: Math.random().toString(36).substring(7),
        type: currentScreen === 'nhap_hang' ? 'nhap_hang' : 'soan_hang',
        orderNumber: activeOrderNumber,
        pickerName,
        location,
        productLocation,
        productName,
        quantity,
        note,
        transferToLocation,
        createdAt: Date.now(),
        maBravo, khachHang, dvt, slThucXuat, quiCach, slBaoCay, slLe, thongTinMaHang, nhanVienQuanHang, trongLuong, taiTrongXe
      };
      setRecords([...records, newRecord]);
      setReviewIndex(99999); // Jump to the newly added record (clamped by useEffect)
      showToast('Đã thêm bản ghi mới!');
      
      // Ask if user wants to scan another item
      const message = currentScreen === 'nhap_hang' 
        ? 'Bạn có muốn nhập mã vị trí nhập hàng khác không?' 
        : 'Bạn có muốn soạn mã hàng khác không?';
      
      setTimeout(() => {
        showConfirm(message, () => {
          if (currentScreen === 'nhap_hang') {
            setScanningField('location');
          } else {
            setScanningField('productQR');
          }
        });
      }, 500);
    }
    
    // Reset form (giữ lại số đơn hàng và người soạn)
    setLocation('');
    setProductLocation('');
    setProductName('');
    setQuantity('');
    setNote('');
    setTransferToLocation('');
    setMaBravo('');
    setKhachHang('');
    setDvt('');
    setSlThucXuat('');
    setQuiCach('');
    setSlBaoCay('');
    setSlLe('');
    setThongTinMaHang('');
    setNhanVienQuanHang('');
    setTrongLuong('');
    setTaiTrongXe('');
  };

  const handleEdit = (record: Record) => {
    setEditingId(record.id);
    setLocation(record.location);
    setProductLocation(record.productLocation || '');
    setProductName(record.productName);
    setQuantity(record.quantity);
    setNote(record.note || '');
    setTransferToLocation(record.transferToLocation || '');
    setMaBravo(record.maBravo || '');
    setKhachHang(record.khachHang || '');
    setDvt(record.dvt || '');
    setSlThucXuat(record.slThucXuat || '');
    setQuiCach(record.quiCach || '');
    setSlBaoCay(record.slBaoCay || '');
    setSlLe(record.slLe || '');
    setThongTinMaHang(record.thongTinMaHang || '');
    setNhanVienQuanHang(record.nhanVienQuanHang || '');
    setTrongLuong(record.trongLuong || '');
    setTaiTrongXe(record.taiTrongXe || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setLocation('');
    setProductLocation('');
    setProductName('');
    setQuantity('');
    setNote('');
    setTransferToLocation('');
    setMaBravo('');
    setKhachHang('');
    setDvt('');
    setSlThucXuat('');
    setQuiCach('');
    setSlBaoCay('');
    setSlLe('');
    setThongTinMaHang('');
    setNhanVienQuanHang('');
    setTrongLuong('');
    setTaiTrongXe('');
  };

  const handleDeleteRecord = (id: string) => {
    showConfirm('Bạn có chắc muốn xóa bản ghi này?', () => {
      setRecords(prev => {
        const updated = prev.filter(r => r.id !== id);
        // Force synchronous update to localStorage to prevent data loss on immediate reload
        localStorage.setItem('qr_scanner_records', JSON.stringify(updated));
        return updated;
      });
      
      if (editingId === id) {
        handleCancelEdit();
      }
      
      // Clear input fields to avoid confusion
      setLocation('');
      setProductLocation('');
      setProductName('');
      setQuantity('');
      setNote('');
      setMaBravo('');
      setKhachHang('');
      setDvt('');
      setSlThucXuat('');
      setQuiCach('');
      setSlBaoCay('');
      setSlLe('');
      setThongTinMaHang('');
      setNhanVienQuanHang('');
      setTrongLuong('');
      setTaiTrongXe('');
      
      // Reset review index to make the UI change obvious
      setReviewIndex(0);
      
      showToast('Đã xóa bản ghi thành công!');
    });
  };

  const handleDownload = () => {
    if (currentOrderRecords.length === 0) {
      showAlert('Không có dữ liệu để tải xuống');
      return;
    }

    const escapeCSV = (str: string) => {
      if (!str) return '';
      const stringified = String(str);
      if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
        return '"' + stringified.replace(/"/g, '""') + '"';
      }
      return stringified;
    };

    // Format: [tên người soạn] [4 số cuối đơn hàng] [ddMMMyyyy hhmm].CSV
    const last4Order = activeOrderNumber.slice(-4);
    const fileName = `${pickerName} ${last4Order} ${format(new Date(), 'ddMMMyyyy HHmm')}.CSV`;
    
    // Create content (comma separated)
    const header = [
      'Ngày', 'Mã Bravo', 'Tên sản phẩm', 'Khách hàng', 'Đơn hàng', 'ĐVT', 
      'SL Thực Xuất(cái)', 'Qui cách(Bao/Cây)', 'SL (Bao/Cây)', 'SL Lẻ', 
      'Thông tin mã hàng', 'Nhân viên quản hàng', 'Trọng lượng(kg)', 'Tải trọng xe(kg)',
      'Vị trí chuyển đến', 'Người soạn/nhập', 'Vị trí thực tế', 'Số lượng thực tế', 'Loại', 'Ghi chú'
    ].map(escapeCSV).join(',');
    
    const rows = currentOrderRecords.map(r => 
      [
        new Date(r.createdAt).toLocaleDateString('vi-VN'),
        r.maBravo || '', 
        r.productName || '', 
        r.khachHang || '',
        r.orderNumber || '', 
        r.dvt || '', 
        r.slThucXuat || '', 
        r.quiCach || '', 
        r.slBaoCay || '', 
        r.slLe || '', 
        r.productLocation || r.thongTinMaHang || '', 
        r.nhanVienQuanHang || '', 
        r.trongLuong || '', 
        r.taiTrongXe || '',
        r.transferToLocation || '',
        r.pickerName || '', 
        r.location || '', 
        r.quantity || '',
        r.type === 'nhap_hang' ? 'Nhập hàng' : 'Soạn hàng',
        r.note || ''
      ].map(escapeCSV).join(',')
    );
    // Add BOM for Excel UTF-8 compatibility
    const content = '\uFEFF' + [header, ...rows].join('\n');
    
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    // Small delay for mobile browsers to process
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);

    // Auto redirect to welcome screen to start a new order
    setCurrentScreen('welcome');
    setOrderNumberInput('');
    // Keep pickerName so they don't have to retype it
  };

  // Calculate today's orders for Welcome screen
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayRecords = records.filter(r => r.createdAt >= todayStart.getTime());
  const todayOrders = Array.from(new Set(todayRecords.map(r => r.orderNumber))).filter(Boolean) as string[];

  const handleStartOrder = (order: string) => {
    if (!order || !pickerName) {
      showAlert('Vui lòng nhập đầy đủ Số đơn hàng và Người soạn');
      return;
    }
    
    // Extract location if it was scanned along with the order
    // Assuming the user might type it manually or scan it. 
    // If they scan the 13-field QR, we already extracted the order number.
    // We need a separate field for order location on the welcome screen.
    
    const exists = records.some(r => r.orderNumber === order && r.type !== 'nhap_hang');
    if (exists) {
      showConfirm(`Số đơn hàng "${order}" đã tồn tại trong dữ liệu. Bạn có muốn tiếp tục nhập thêm vào đơn này không?`, () => {
        setActiveOrderNumber(order);
        setOrderNumberInput(order);
        // Find existing location for this order
        setCurrentScreen('soan_hang');
      });
      return;
    }
    
    setActiveOrderNumber(order);
    setOrderNumberInput(order);
    setCurrentScreen('soan_hang');
  };

  const handleStartNhapHang = () => {
    if (!pickerName) {
      showAlert('Vui lòng nhập Người nhập');
      return;
    }
    setActiveOrderNumber(`NHAP_HANG_${format(new Date(), 'yyyyMMdd')}`);
    setCurrentScreen('nhap_hang');
  };

  const handleResumeOrder = (order: string) => {
    const existingRecord = records.find(r => r.orderNumber === order);
    if (existingRecord && existingRecord.pickerName) {
      setPickerName(existingRecord.pickerName);
    } else if (!pickerName) {
      showAlert('Vui lòng nhập Người soạn trước khi tiếp tục đơn cũ');
      return;
    }
    
    setActiveOrderNumber(order);
    setOrderNumberInput(order);
    setCurrentScreen(existingRecord?.type === 'nhap_hang' ? 'nhap_hang' : 'soan_hang');
  };

  if (currentScreen === 'welcome') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Joyride
        steps={getTourSteps()}
        run={runTour}
        continuous
        showProgress
        showSkipButton
        callback={handleTourFinish}
        locale={{
          back: 'Quay lại',
          close: 'Đóng',
          last: 'Hoàn tất',
          next: 'Tiếp theo',
          skip: 'Bỏ qua'
        }}
        styles={{
          options: {
            primaryColor: '#2563eb',
            zIndex: 1000,
          }
        }}
      />
        <div className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/20 w-full max-w-md space-y-6 text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShoppingCart size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SOẠN / NHẬP HÀNG DNP</h1>
          <p className="text-gray-500 text-sm">Vui lòng nhập thông tin để bắt đầu</p>

          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setIsGuideOpen(true)}
              className="flex items-center justify-center gap-2 mx-auto text-blue-600 hover:text-blue-700 text-sm font-medium bg-blue-50 px-4 py-2 rounded-full transition-colors"
            >
              <HelpCircle size={16} /> Xem hướng dẫn (Web)
            </button>
            <button 
              id="btn-help-docx"
              onClick={downloadUserGuideDocx}
              className="flex items-center justify-center gap-2 mx-auto text-emerald-600 hover:text-emerald-700 text-sm font-medium bg-emerald-50 px-4 py-2 rounded-full transition-colors"
            >
              <Download size={16} /> Tải hướng dẫn (.docx)
            </button>
            <button 
              onClick={() => setRunTour(true)}
              className="flex items-center justify-center gap-2 mx-auto text-gray-600 hover:text-gray-700 text-sm font-medium bg-gray-50 px-4 py-2 rounded-full transition-colors"
            >
              <Info size={16} /> Xem lại hướng dẫn nhanh
            </button>
          </div>
          
          <div className="text-left space-y-4">
            <ScanInput 
              id="picker-name-input"
              label="Người soạn / Người nhập" 
              value={pickerName} 
              onChange={setPickerName} 
              onScanClick={() => setScanningField('pickerName')} 
              placeholder="Nhập tên..."
            />
            <ScanInput 
              id="order-number-input"
              label="Quét QR Đơn hàng (Dành cho Soạn hàng)" 
              value={orderNumberInput} 
              onChange={setOrderNumberInput} 
              onScanClick={() => setScanningField('welcomeOrderQR')} 
              placeholder="Quét mã để lấy số đơn..."
            />
          </div>

          <div className="space-y-3">
            <button 
              id="btn-soan-hang"
              onClick={() => handleStartOrder(orderNumberInput)}
              disabled={!orderNumberInput || !pickerName}
              className="w-full py-3.5 bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
            >
              Bắt đầu soạn hàng
            </button>
            <button 
              id="btn-nhap-hang"
              onClick={handleStartNhapHang}
              disabled={!pickerName}
              className="w-full py-3.5 bg-amber-500 disabled:bg-gray-300 disabled:text-gray-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors shadow-sm"
            >
              Bắt đầu nhập hàng
            </button>
          </div>

          {/* Today's Orders List */}
          {todayOrders.length > 0 && (
            <div className="mt-8 text-left w-full border-t border-gray-100 pt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                <History size={16} /> Đơn hàng đã quét hôm nay
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {todayOrders.map(order => (
                  <button
                    key={order}
                    onClick={() => handleResumeOrder(order)}
                    className="w-full p-3 bg-gray-50 hover:bg-blue-50 border border-gray-100 rounded-xl text-left flex items-center justify-between group transition-colors"
                  >
                    <span className="font-medium text-gray-700 group-hover:text-blue-700 truncate pr-2">{order}</span>
                    <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Scanner Modal */}
        {(scanningField === 'orderNumber' || scanningField === 'pickerName' || scanningField === 'welcomeOrderQR') && (
          <Scanner 
            onScan={handleScan} 
            onClose={() => setScanningField(null)} 
          />
        )}
        <CustomModal modal={modal} onClose={closeModal} />
      </div>
    );
  }

  const currentRecord = currentOrderRecords[safeReviewIndex];

  return (
    <div className="min-h-screen pb-24">
      <Joyride
        steps={getTourSteps()}
        run={runTour}
        continuous
        showProgress
        showSkipButton
        callback={handleTourFinish}
        locale={{
          back: 'Quay lại',
          close: 'Đóng',
          last: 'Hoàn tất',
          next: 'Tiếp theo',
          skip: 'Bỏ qua'
        }}
        styles={{
          options: {
            primaryColor: '#2563eb',
            zIndex: 1000,
          }
        }}
      />
      {/* Header */}
      <header className={`text-white p-4 shadow-md sticky top-0 z-10 flex justify-between items-center ${currentScreen === 'nhap_hang' ? 'bg-amber-500/90' : 'bg-blue-600/90'} backdrop-blur-md`}>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ShoppingCart /> {currentScreen === 'nhap_hang' ? 'NHẬP HÀNG DNP' : 'SOẠN HÀNG DNP'}
        </h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setRunTour(true)}
            className="bg-white/20 p-2 rounded-lg hover:bg-white/30 transition-colors"
            title="Hướng dẫn nhanh"
          >
            <Info size={20} />
          </button>
          <button 
            onClick={downloadUserGuideDocx}
            className="bg-white/20 p-2 rounded-lg hover:bg-white/30 transition-colors"
            title="Tải hướng dẫn (.docx)"
          >
            <Download size={20} />
          </button>
          <button 
            onClick={() => setIsGuideOpen(true)}
            className="bg-white/20 p-2 rounded-lg hover:bg-white/30 transition-colors"
            title="Xem hướng dẫn"
          >
            <HelpCircle size={20} />
          </button>
          <button 
            id="btn-home"
            onClick={() => {
              setCurrentScreen('welcome');
              setOrderNumberInput('');
            }} 
            className="bg-white/20 p-2 rounded-lg hover:bg-white/30 transition-colors"
            title="Về trang chủ"
          >
            <Home size={20} />
          </button>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-6">
        {/* Input Form */}
        <div className={`bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border ${editingId ? 'border-blue-300 ring-2 ring-blue-50' : 'border-white/20'} space-y-4 transition-all`}>
          {editingId && (
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold text-blue-700">
                Sửa bản ghi
              </h2>
              <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>
          )}
          
          <div className="space-y-3">
            {currentScreen === 'nhap_hang' ? (
              <>
                <ScanInput 
                  label="1. Người nhập" 
                  value={pickerName} 
                  onChange={setPickerName} 
                  onScanClick={() => {}} 
                  placeholder="Tên người nhập"
                  disabled={true}
                />
                
                <div id="product-name-input">
                  <label className="block text-sm font-medium text-gray-700 mb-1">2. Tên hàng</label>
                  <input 
                    type="text" 
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                    placeholder="Nhập tên hàng..."
                  />
                </div>

                <ScanInput 
                  id="location-input"
                  label="3. Vị trí thực tế (VD: A-001-01)" 
                  value={location} 
                  onChange={setLocation} 
                  onScanClick={() => setScanningField('location')} 
                  placeholder="Nhập hoặc quét mã..."
                />

                <ScanInput 
                  id="transfer-to-location-input"
                  label="4. Vị trí chuyển đến (Chuyển kho)" 
                  value={transferToLocation} 
                  onChange={setTransferToLocation} 
                  onScanClick={() => setScanningField('transferToLocation')} 
                  placeholder="Nhập hoặc quét mã chuyển đến..."
                />
                
                <div id="quantity-input">
                  <label className="block text-sm font-medium text-gray-700 mb-1">5. Số lượng</label>
                  <input 
                    type="number" 
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                    placeholder="Nhập số lượng..."
                  />
                </div>

                <div id="note-input">
                  <label className="block text-sm font-medium text-gray-700 mb-1">6. Ghi chú</label>
                  <textarea 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none transition-all"
                    placeholder="Nhập ghi chú..."
                  />
                </div>
              </>
            ) : (
              <>
                <div className="pb-2">
                  <button
                    id="btn-scan-product"
                    onClick={() => setScanningField('productQR')}
                    className="w-full py-3 bg-blue-100 text-blue-700 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-200 transition-colors border border-blue-200"
                  >
                    <QrCode size={20} /> Quét QR sản phẩm cần soạn
                  </button>
                </div>

                <ScanInput 
                  label="1. Người soạn" 
                  value={pickerName} 
                  onChange={setPickerName} 
                  onScanClick={() => {}} 
                  placeholder="Tên người soạn"
                  disabled={true}
                />
                <ScanInput 
                  label="2. Số đơn hàng" 
                  value={activeOrderNumber} 
                  onChange={() => {}} 
                  onScanClick={() => {}} 
                  placeholder="Số đơn hàng"
                  disabled={true}
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">3. Vị trí mã hàng</label>
                  <textarea 
                    value={productLocation}
                    disabled={true}
                    rows={8}
                    className="w-full p-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed outline-none resize-none"
                    placeholder="Trích xuất từ QR..."
                  />
                </div>

                <ScanInput 
                  id="product-name-display"
                  label="4. Tên sản phẩm" 
                  value={productName} 
                  onChange={() => {}} 
                  onScanClick={() => {}} 
                  placeholder="Tên sản phẩm"
                  disabled={true}
                />

                <ScanInput 
                  id="location-input"
                  label="5. Vị trí thực tế (VD: A-001-01)" 
                  value={location} 
                  onChange={setLocation} 
                  onScanClick={() => setScanningField('location')} 
                  placeholder="Nhập hoặc quét mã..."
                />
                
                <div id="quantity-input">
                  <label className="block text-sm font-medium text-gray-700 mb-1">6. Số lượng thực tế</label>
                  <input 
                    type="number" 
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Nhập số lượng..."
                  />
                </div>
              </>
            )}
          </div>

          <button 
            id="btn-add-record"
            onClick={handleAddOrUpdateRecord}
            disabled={!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0 || !/^[A-Z]-\d{3}-\d{2}$/.test(location) || !productName.trim()}
            className={`w-full mt-4 py-3 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors ${
              (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0 || !/^[A-Z]-\d{3}-\d{2}$/.test(location) || !productName.trim())
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : editingId 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' 
                  : currentScreen === 'nhap_hang'
                    ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
            }`}
          >
            {editingId ? (
              <><Save size={20} /> Cập nhật bản ghi</>
            ) : (
              <><Plus size={20} /> Thêm vào danh sách</>
            )}
          </button>
          
          {/* Display extracted fields below the button */}
          {maBravo && (
            <div className="mt-6 space-y-3 border-t border-gray-200 pt-4">
              <h3 className="font-medium text-gray-800 mb-2">Thông tin chi tiết từ QR:</h3>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Mã hàng:</span>
                  <span className="font-medium text-gray-900">{maBravo}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Khách hàng:</span>
                  <span className="font-medium text-gray-900">{khachHang}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">SL yêu cầu:</span>
                  <span className="font-medium text-gray-900">{slThucXuat}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Qui cách bao:</span>
                  <span className="font-medium text-gray-900">{quiCach}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">SL bao cần xuất:</span>
                  <span className="font-medium text-gray-900">{slBaoCay}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">SL lẻ:</span>
                  <span className="font-medium text-gray-900">{slLe}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Trọng lượng hàng/ĐVT:</span>
                  <span className="font-medium text-gray-900">{trongLuong}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-gray-500">Trọng lượng hàng:</span>
                  <span className="font-medium text-gray-900">{taiTrongXe}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Records Review Carousel */}
        <div id="review-section" className="bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-white/20">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <FileText size={18} className="text-gray-500" /> 
              Duyệt đơn này {currentOrderRecords.length > 0 ? `(${safeReviewIndex + 1}/${currentOrderRecords.length})` : '(0)'}
            </h2>
            {currentOrderRecords.length > 0 && (
              <button 
                onClick={() => {
                  showConfirm('Bạn có chắc muốn xóa TẤT CẢ dữ liệu của đơn hàng này?', () => {
                    setRecords(prev => {
                      const updated = prev.filter(r => r.orderNumber !== activeOrderNumber);
                      localStorage.setItem('qr_scanner_records', JSON.stringify(updated));
                      return updated;
                    });
                    handleCancelEdit();
                    setLocation('');
                    setProductLocation('');
                    setProductName('');
                    setQuantity('');
                    setNote('');
                    setMaBravo('');
                    setKhachHang('');
                    setDvt('');
                    setSlThucXuat('');
                    setQuiCach('');
                    setSlBaoCay('');
                    setSlLe('');
                    setThongTinMaHang('');
                    setNhanVienQuanHang('');
                    setTrongLuong('');
                    setTaiTrongXe('');
                    setReviewIndex(0);
                    showToast('Đã xóa toàn bộ đơn hàng!');
                  });
                }}
                className="text-sm text-red-500 hover:text-red-700 font-medium"
              >
                Xóa đơn này
              </button>
            )}
          </div>
          
          {currentOrderRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Đơn hàng này chưa có dữ liệu.<br/>Hãy quét mã và thêm vào danh sách.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current Record Card */}
              <div className={`p-4 border rounded-xl space-y-2 text-sm transition-colors ${
                editingId === currentRecord?.id 
                  ? 'border-blue-200 bg-blue-50/50' 
                  : 'border-blue-100 bg-blue-50/30'
              }`}>
                <div className="flex justify-between border-b border-black/5 pb-2">
                  <span className="text-gray-500">{currentScreen === 'nhap_hang' ? 'Người nhập:' : 'Người soạn:'}</span>
                  <span className="font-medium text-gray-900">{currentRecord?.pickerName || '-'}</span>
                </div>
                {currentScreen !== 'nhap_hang' && (
                  <div className="flex justify-between border-b border-black/5 pb-2">
                    <span className="text-gray-500">Đơn hàng:</span>
                    <span className="font-medium text-gray-900">{currentRecord?.orderNumber || '-'}</span>
                  </div>
                )}
                {currentScreen !== 'nhap_hang' && (
                  <div className="flex justify-between border-b border-black/5 pb-2">
                    <span className="text-gray-500">Vị trí mã hàng:</span>
                    <span className="font-medium text-gray-900">{currentRecord?.productLocation || '-'}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-black/5 pb-2">
                  <span className="text-gray-500">Vị trí thực tế:</span>
                  <span className="font-medium text-gray-900">{currentRecord?.location || '-'}</span>
                </div>
                {currentRecord?.transferToLocation && (
                  <div className="flex justify-between border-b border-black/5 pb-2">
                    <span className="text-gray-500">Vị trí chuyển đến:</span>
                    <span className="font-medium text-blue-600">{currentRecord.transferToLocation}</span>
                  </div>
                )}
                {currentScreen !== 'nhap_hang' && (
                  <div className="flex justify-between border-b border-black/5 pb-2">
                    <span className="text-gray-500">Mã Bravo:</span>
                    <span className="font-medium text-gray-900">{currentRecord?.maBravo || '-'}</span>
                  </div>
                )}
                {currentScreen !== 'nhap_hang' && currentRecord?.khachHang && (
                  <div className="flex justify-between border-b border-black/5 pb-2">
                    <span className="text-gray-500">Khách hàng:</span>
                    <span className="font-medium text-gray-900">{currentRecord?.khachHang}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-black/5 pb-2">
                  <span className="text-gray-500">Tên hàng:</span>
                  <span className="font-medium text-gray-900">{currentRecord?.productName || '-'}</span>
                </div>
                {currentScreen !== 'nhap_hang' && currentRecord?.slThucXuat && (
                  <div className="flex justify-between border-b border-black/5 pb-2">
                    <span className="text-gray-500">SL Thực Xuất:</span>
                    <span className="font-medium text-gray-900">{currentRecord?.slThucXuat} {currentRecord?.dvt}</span>
                  </div>
                )}
                <div className={`flex justify-between pt-1 items-center ${currentScreen === 'nhap_hang' && currentRecord?.note ? 'border-b border-black/5 pb-2' : ''}`}>
                  <span className="text-gray-500">Số lượng:</span>
                  <span className={`font-bold text-base px-2 py-0.5 rounded-md ${currentScreen === 'nhap_hang' ? 'text-amber-700 bg-amber-100' : 'text-blue-600 bg-blue-100'}`}>{currentRecord?.quantity || '-'}</span>
                </div>
                {currentScreen === 'nhap_hang' && currentRecord?.note && (
                  <div className="flex justify-between pt-1 items-center">
                    <span className="text-gray-500">Ghi chú:</span>
                    <span className="font-medium text-gray-900">{currentRecord?.note}</span>
                  </div>
                )}
              </div>

              {/* Navigation & Actions */}
              <div className="flex items-center justify-between gap-2">
                <button 
                  onClick={() => setReviewIndex(safeReviewIndex - 1)}
                  disabled={safeReviewIndex === 0}
                  className="p-2.5 rounded-xl bg-gray-100 text-gray-700 disabled:opacity-40 hover:bg-gray-200 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                
                <div className="flex gap-2 flex-1 justify-center">
                  <button 
                    onClick={() => handleEdit(currentRecord)} 
                    className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors ${
                      editingId === currentRecord?.id 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Edit size={18} /> Sửa
                  </button>
                  <button 
                    onClick={() => {
                      if (currentRecord) {
                        handleDeleteRecord(currentRecord.id);
                      }
                    }} 
                    className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-medium flex items-center gap-2 transition-colors"
                  >
                    <Trash2 size={18} /> Xóa
                  </button>
                </div>

                <button 
                  onClick={() => setReviewIndex(safeReviewIndex + 1)}
                  disabled={safeReviewIndex === currentOrderRecords.length - 1}
                  className="p-2.5 rounded-xl bg-gray-100 text-gray-700 disabled:opacity-40 hover:bg-gray-200 transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Fixed Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-white/20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-md mx-auto">
          <button 
            id="btn-save-csv"
            onClick={handleDownload}
            disabled={currentOrderRecords.length === 0}
            className={`w-full py-3.5 disabled:bg-gray-300 disabled:text-gray-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm ${
              currentScreen === 'nhap_hang' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Download size={20} /> Ghi dữ liệu (Tải File CSV)
          </button>
        </div>
      </div>

      {/* Scanner Modal */}
      {scanningField && (
        <Scanner 
          onScan={handleScan} 
          onClose={() => setScanningField(null)} 
        />
      )}
      <CustomModal modal={modal} onClose={closeModal} />
      <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white px-6 py-3 rounded-full shadow-2xl text-sm font-medium flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          {toastMessage}
        </div>
      )}
    </div>
  );
}

function CustomModal({ modal, onClose }: { modal: ModalState, onClose: () => void }) {
  if (!modal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-white/20">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{modal.title}</h3>
        <p className="text-gray-600 mb-6">{modal.message}</p>
        <div className="flex justify-end gap-3">
          {modal.type === 'confirm' && (
            <button 
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
            >
              Hủy
            </button>
          )}
          <button 
            onClick={() => {
              if (modal.onConfirm) modal.onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-medium transition-colors"
          >
            {modal.type === 'confirm' ? 'Đồng ý' : 'Đóng'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScanInput({ label, value, onChange, onScanClick, placeholder, disabled, id }: { 
  label: string, 
  value: string, 
  onChange: (val: string) => void, 
  onScanClick: () => void,
  placeholder?: string,
  disabled?: boolean,
  id?: string
}) {
  return (
    <div id={id}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex gap-2">
        {!disabled && (
          <button 
            onClick={onScanClick}
            className="p-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors flex items-center justify-center aspect-square"
            title="Quét mã QR"
          >
            <QrCode size={20} />
          </button>
        )}
        <input 
          type="text" 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
