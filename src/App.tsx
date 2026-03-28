import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useState, useEffect, useRef } from 'react';
import { format, parse, isValid } from 'date-fns';
import { QrCode, Plus, Download, Trash2, FileText, ShoppingCart, ChevronLeft, ChevronRight, Edit, X, History, Save, Home, HelpCircle, Info, Maximize, LogOut, Layers, Upload, Check, Package, FileDown } from 'lucide-react';
import { Scanner } from './components/Scanner';
import { GuideModal } from './components/GuideModal';
import { downloadUserGuideDocx } from './utils/generateDocx';
import Joyride, { STATUS, Step } from 'react-joyride';
import Papa from 'papaparse';

interface LocationPair {
  location: string;
  quantity: string;
}

interface Record {
  id: string;
  type?: 'soan_hang' | 'nhap_hang' | 'xuat_hang';
  orderNumber: string;
  pickerName: string;
  location: string; // Vị trí thực tế (legacy/first)
  productLocation: string; // Vị trí mã hàng (từ QR)
  productName: string;
  quantity: string; // Số lượng thực tế (legacy/first)
  multiLocations?: LocationPair[]; // Multiple locations and quantities
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
  originalSlThucXuat?: string;
  originalSlBaoCay?: string;
  originalSlLe?: string;
  thongTinMaHang?: string;
  nhanVienQuanHang?: string;
  trongLuong?: string;
  taiTrongXe?: string;
  vehicleNumber?: string; // For xuat_hang
  pxkNumber?: string; // For xuat_hang
  customerName?: string; // For xuat_hang
  deliveryAddress?: string; // For xuat_hang
}

type ScanField = 'orderNumber' | 'pickerName' | 'location' | 'productName' | 'productQR' | 'welcomeOrderQR' | 'transferToLocation' | 'vehicleNumber' | 'pxkNumber' | 'maBravo' | null;

type ModalState = {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'alert' | 'confirm' | 'three-way';
  onConfirm?: () => void;
  onSecondary?: () => void;
  confirmText?: string;
  secondaryText?: string;
  cancelText?: string;
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'soan_hang' | 'nhap_hang' | 'xuat_hang'>(() => {
    return (localStorage.getItem('qr_scanner_current_screen') as any) || 'welcome';
  });
  
  const [modal, setModal] = useState<ModalState>({ isOpen: false, title: '', message: '', type: 'alert' });

  const [vehicleNumber, setVehicleNumber] = useState(() => {
    return localStorage.getItem('qr_scanner_vehicle_number') || '';
  });
  const [pxkNumber, setPxkNumber] = useState(() => {
    return localStorage.getItem('qr_scanner_pxk_number') || '';
  });
  const [customerName, setCustomerName] = useState(() => {
    return localStorage.getItem('qr_scanner_customer_name') || '';
  });
  const [deliveryAddress, setDeliveryAddress] = useState(() => {
    return localStorage.getItem('qr_scanner_delivery_address') || '';
  });
  const [importType, setImportType] = useState<'soan' | 'nhap' | 'xuat' | null>(null);

  const showAlert = (message: string, title = 'Thông báo') => {
    setModal({ isOpen: true, title, message, type: 'alert' });
  };

  const showConfirm = (message: string, onConfirm: () => void, title = 'Xác nhận') => {
    setModal({ isOpen: true, title, message, type: 'confirm', onConfirm });
  };

  const showThreeWay = (message: string, onConfirm: () => void, onSecondary: () => void, title = 'Xác nhận') => {
    setModal({ 
      isOpen: true, 
      title, 
      message, 
      type: 'three-way', 
      onConfirm, 
      onSecondary,
      confirmText: 'Lưu',
      secondaryText: 'Không lưu',
      cancelText: 'Hủy'
    });
  };

  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  // Load records from localStorage on initial render
  const [recordsSoan, setRecordsSoan] = useState<Record[]>(() => {
    const saved = localStorage.getItem('qr_scanner_records_soan');
    return saved ? JSON.parse(saved) : [];
  });
  const [recordsNhap, setRecordsNhap] = useState<Record[]>(() => {
    const saved = localStorage.getItem('qr_scanner_records_nhap');
    return saved ? JSON.parse(saved) : [];
  });
  const [recordsXuat, setRecordsXuat] = useState<Record[]>(() => {
    const saved = localStorage.getItem('qr_scanner_records_xuat');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeOrderSoan, setActiveOrderSoan] = useState(() => localStorage.getItem('qr_scanner_active_order_soan') || '');
  const [activeOrderNhap, setActiveOrderNhap] = useState(() => localStorage.getItem('qr_scanner_active_order_nhap') || '');
  const [activeOrderXuat, setActiveOrderXuat] = useState(() => localStorage.getItem('qr_scanner_active_order_xuat') || '');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pickerName, setPickerName] = useState(() => localStorage.getItem('qr_scanner_picker_name') || '');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const [importedFilesSoan, setImportedFilesSoan] = useState<{name: string, lastModified: number, size: number}[]>(() => {
    const saved = localStorage.getItem('qr_scanner_imported_files_soan');
    return saved ? JSON.parse(saved) : [];
  });
  const [importedFilesNhap, setImportedFilesNhap] = useState<{name: string, lastModified: number, size: number}[]>(() => {
    const saved = localStorage.getItem('qr_scanner_imported_files_nhap');
    return saved ? JSON.parse(saved) : [];
  });
  const [importedFilesXuat, setImportedFilesXuat] = useState<{name: string, lastModified: number, size: number}[]>(() => {
    const saved = localStorage.getItem('qr_scanner_imported_files_xuat');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('qr_scanner_current_screen', currentScreen);
  }, [currentScreen]);

  useEffect(() => {
    localStorage.setItem('qr_scanner_vehicle_number', vehicleNumber);
  }, [vehicleNumber]);

  useEffect(() => {
    localStorage.setItem('qr_scanner_pxk_number', pxkNumber);
  }, [pxkNumber]);

  useEffect(() => {
    localStorage.setItem('qr_scanner_customer_name', customerName);
  }, [customerName]);

  useEffect(() => {
    localStorage.setItem('qr_scanner_delivery_address', deliveryAddress);
  }, [deliveryAddress]);

  useEffect(() => {
    localStorage.setItem('qr_scanner_records_soan', JSON.stringify(recordsSoan));
  }, [recordsSoan]);
  useEffect(() => {
    localStorage.setItem('qr_scanner_records_nhap', JSON.stringify(recordsNhap));
  }, [recordsNhap]);
  useEffect(() => {
    localStorage.setItem('qr_scanner_records_xuat', JSON.stringify(recordsXuat));
  }, [recordsXuat]);

  useEffect(() => {
    localStorage.setItem('qr_scanner_active_order_soan', activeOrderSoan);
  }, [activeOrderSoan]);
  useEffect(() => {
    localStorage.setItem('qr_scanner_active_order_nhap', activeOrderNhap);
  }, [activeOrderNhap]);
  useEffect(() => {
    localStorage.setItem('qr_scanner_active_order_xuat', activeOrderXuat);
  }, [activeOrderXuat]);

  useEffect(() => {
    localStorage.setItem('qr_scanner_imported_files_soan', JSON.stringify(importedFilesSoan));
  }, [importedFilesSoan]);
  useEffect(() => {
    localStorage.setItem('qr_scanner_imported_files_nhap', JSON.stringify(importedFilesNhap));
  }, [importedFilesNhap]);
  useEffect(() => {
    localStorage.setItem('qr_scanner_imported_files_xuat', JSON.stringify(importedFilesXuat));
  }, [importedFilesXuat]);

  const records = currentScreen === 'soan_hang' ? recordsSoan : (currentScreen === 'nhap_hang' ? recordsNhap : recordsXuat);
  const setRecords = currentScreen === 'soan_hang' ? setRecordsSoan : (currentScreen === 'nhap_hang' ? setRecordsNhap : setRecordsXuat);
  const activeOrderNumber = currentScreen === 'soan_hang' ? activeOrderSoan : (currentScreen === 'nhap_hang' ? activeOrderNhap : activeOrderXuat);
  const setActiveOrderNumber = currentScreen === 'soan_hang' ? setActiveOrderSoan : (currentScreen === 'nhap_hang' ? setActiveOrderNhap : setActiveOrderXuat);
  const importedFiles = currentScreen === 'soan_hang' ? importedFilesSoan : (currentScreen === 'nhap_hang' ? importedFilesNhap : importedFilesXuat);
  const setImportedFiles = currentScreen === 'soan_hang' ? setImportedFilesSoan : (currentScreen === 'nhap_hang' ? setImportedFilesNhap : setImportedFilesXuat);

  useEffect(() => {
    localStorage.setItem('qr_scanner_active_order', activeOrderNumber);
  }, [activeOrderNumber]);

  useEffect(() => {
    localStorage.setItem('qr_scanner_picker_name', pickerName);
  }, [pickerName]);

  useEffect(() => {
    localStorage.setItem('qr_scanner_imported_files', JSON.stringify(importedFiles));
  }, [importedFiles]);
  const [location, setLocation] = useState('');
  const [productLocation, setProductLocation] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [multiLocations, setMultiLocations] = useState<LocationPair[]>([]);
  const [note, setNote] = useState('');
  const [transferToLocation, setTransferToLocation] = useState('');
  
  const [maBravo, setMaBravo] = useState('');
  const [khachHang, setKhachHang] = useState('');
  const [dvt, setDvt] = useState('');
  const [slThucXuat, setSlThucXuat] = useState('');
  const [quiCach, setQuiCach] = useState('');
  const [slBaoCay, setSlBaoCay] = useState('');
  const [slLe, setSlLe] = useState('');
  const [originalSlThucXuat, setOriginalSlThucXuat] = useState('');
  const [originalSlBaoCay, setOriginalSlBaoCay] = useState('');
  const [originalSlLe, setOriginalSlLe] = useState('');
  const [thongTinMaHang, setThongTinMaHang] = useState('');
  const [nhanVienQuanHang, setNhanVienQuanHang] = useState('');
  const [trongLuong, setTrongLuong] = useState('');
  const [taiTrongXe, setTaiTrongXe] = useState('');

  const [scanningField, setScanningField] = useState<ScanField>(null);
  
  // Review & Edit states
  const [currentPage, setCurrentPage] = useState(1);
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
        {
          target: '#btn-exit',
          content: 'Nút THOÁT (Màu Đỏ nhấp nháy) giúp bạn đóng ứng dụng nhanh chóng.',
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
          content: 'Nhập vị trí bạn lấy hàng vào đây. Định dạng chuẩn là X-000-00 hoặc XX-000-00.',
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
          content: 'Nút HOME (Màu Trắng) giúp bạn quay lại màn hình chính bất cứ lúc nào.',
        },
        {
          target: '#btn-exit',
          content: 'Nút THOÁT (Màu Đỏ nhấp nháy) giúp bạn đóng ứng dụng nhanh chóng khi xong việc.',
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
          content: 'Quay lại màn hình chính bằng nút HOME màu trắng.',
        },
        {
          target: '#btn-exit',
          content: 'Thoát ứng dụng bằng nút THOÁT màu đỏ nhấp nháy.',
        },
      ];
    }
    
    return [];
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Derived state: records for the CURRENT order only, sorted by newest first
  const currentOrderRecords = records
    .filter(r => 
      (r.orderNumber || '').trim() === (activeOrderNumber || '').trim() && 
      (currentScreen === 'welcome' || r.type === currentScreen)
    )
    .sort((a, b) => {
      const timeA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt).getTime();
      const timeB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

  const availableOrders = Array.from(new Set(records.filter(r => r.type === currentScreen).map(r => r.orderNumber))).filter(Boolean);

  // Pagination logic
  const itemsPerPage = 7;
  const totalPages = Math.max(1, Math.ceil(currentOrderRecords.length / itemsPerPage));
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));

  // Sync the state if it was out of bounds
  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  // Get current page items
  const currentItems = currentOrderRecords.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage
  );

  // Track if we've already auto-populated shipping info for the current order to avoid overwriting manual changes
  const lastAutoPopulatedOrder = useRef<string | null>(null);

  // Auto-populate shipping info from imported records for Export screen
  useEffect(() => {
    if (currentScreen === 'xuat_hang' && activeOrderNumber) {
      // Only auto-populate if we haven't done it for this specific order yet
      if (lastAutoPopulatedOrder.current !== activeOrderNumber && currentOrderRecords.length > 0) {
        // Find the first record that has any shipping info
        const firstWithInfo = currentOrderRecords.find(r => r.pxkNumber || r.customerName || r.deliveryAddress || r.vehicleNumber);
        
        if (firstWithInfo) {
          setPxkNumber(firstWithInfo.pxkNumber || '');
          setCustomerName(firstWithInfo.customerName || firstWithInfo.khachHang || '');
          setDeliveryAddress(firstWithInfo.deliveryAddress || '');
          setVehicleNumber(firstWithInfo.vehicleNumber || '');
          lastAutoPopulatedOrder.current = activeOrderNumber;
        }
      }
    } else if (currentScreen === 'xuat_hang' && !activeOrderNumber) {
      // Reset if no order is active on xuat_hang screen
      setPxkNumber('');
      setCustomerName('');
      setDeliveryAddress('');
      setVehicleNumber('');
      lastAutoPopulatedOrder.current = null;
    } else {
      // If we leave the screen, reset the ref so it can re-populate if we come back
      lastAutoPopulatedOrder.current = null;
    }
  }, [currentScreen, activeOrderNumber, currentOrderRecords.length > 0]);

  // Save to localStorage whenever records change
  useEffect(() => {
    localStorage.setItem('qr_scanner_records', JSON.stringify(records));
  }, [records]);

  // Save picker name to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('qr_scanner_picker_name', pickerName);
  }, [pickerName]);

  // Save current screen and active order to localStorage
  useEffect(() => {
    localStorage.setItem('qr_scanner_current_screen', currentScreen);
  }, [currentScreen]);

  useEffect(() => {
    localStorage.setItem('qr_scanner_active_order', activeOrderNumber);
  }, [activeOrderNumber]);

  // Navigation Guard: Check for unsaved changes
  const hasUnsavedChanges = () => {
    return !!(location || productName || quantity || note || maBravo || khachHang || multiLocations.length > 0);
  };

  // Prevent browser reload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [location, productName, quantity, note, maBravo, khachHang, multiLocations]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // If scanner is open, close it first
      if (scanningField) {
        setScanningField(null);
        // We stay on the current screen, so we need to push the state back to keep the "back" button working for the screen
        window.history.pushState({ screen: currentScreen, scanning: false }, '');
        return;
      }

      if (currentScreen !== 'welcome') {
        // Prevent default back navigation
        window.history.pushState({ screen: currentScreen }, '');
        handleGoHome();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentScreen, scanningField, location, productName, quantity, note, maBravo, khachHang, multiLocations]);

  // When scanner opens, push a state to handle back button
  useEffect(() => {
    if (scanningField) {
      window.history.pushState({ screen: currentScreen, scanning: true }, '');
    }
  }, [scanningField]);

  const handleGoHome = () => {
    if (hasUnsavedChanges()) {
      showThreeWay(
        'Bạn đang có dữ liệu chưa lưu. Bạn có muốn lưu lại trước khi quay về trang chủ không?', 
        () => {
          // User wants to save
          if (!location && !productName && !quantity) {
            showAlert('Vui lòng nhập đầy đủ thông tin (Vị trí, Tên SP, hoặc Số lượng) để lưu.');
          } else {
            handleAddOrUpdateRecord();
            setCurrentScreen('welcome');
          }
        }, 
        () => {
          // User doesn't want to save
          setCurrentScreen('welcome');
          // Clear unsaved fields
          setLocation('');
          setProductName('');
          setQuantity('');
          setNote('');
          setMaBravo('');
          setKhachHang('');
        },
        'Lưu dữ liệu?'
      );
    } else {
      setCurrentScreen('welcome');
    }
  };

  const handleExitApp = () => {
    showConfirm('Bạn có chắc chắn muốn thoát ứng dụng không?', () => {
      // 1. Try to close the window
      window.close();
      
      // 2. Try Android Home Intent (Common for Android scanners/PWAs)
      try {
        window.location.href = "intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.HOME;end";
      } catch (e) {
        console.error("Home intent failed", e);
      }

      // 3. Fallback to blank page
      setTimeout(() => {
        if (window.location.href !== "about:blank") {
          window.location.href = "about:blank";
        }
      }, 300);

      // 4. Final fallback message
      setTimeout(() => {
        showAlert('Ứng dụng đã sẵn sàng để đóng. Nếu ứng dụng không tự đóng, vui lòng vuốt ứng dụng đi để thoát hoàn toàn.', 'Thông báo');
      }, 800);
    }, 'Thoát ứng dụng');
  };

  const handleSwitchApp = () => {
    showAlert('Trình duyệt không thể mở trực tiếp trình quản lý ứng dụng của hệ thống vì lý do bảo mật. Vui lòng sử dụng phím điều hướng của điện thoại để chuyển đổi ứng dụng.', 'Chuyển ứng dụng');
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileInfo = { name: file.name, lastModified: file.lastModified, size: file.size };
    const isAlreadyImported = importedFiles.some(f => 
      f.name === fileInfo.name && 
      f.lastModified === fileInfo.lastModified && 
      f.size === fileInfo.size
    );

    const proceedWithImport = () => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Try to extract timestamp from filename if it matches our format: S_123_23Mar26_150000_Phuong.csv
          // Format: ddMMMyy_HHmmss
          let fileTimestamp: number | null = null;
          let detectedType: 'soan_hang' | 'nhap_hang' | 'xuat_hang' | null = null;
          
          if (file.name.startsWith('NF_') || file.name.startsWith('N_')) {
            detectedType = 'nhap_hang';
          } else if (file.name.startsWith('SF_') || file.name.startsWith('S_')) {
            detectedType = 'soan_hang';
          } else if (file.name.startsWith('XF_') || file.name.startsWith('X_')) {
            detectedType = 'xuat_hang';
          }

          const fileNameParts = file.name.split('_');
          if (fileNameParts.length >= 4) {
            const datePart = fileNameParts[fileNameParts.length - 3]; // 23Mar26
            const timePart = fileNameParts[fileNameParts.length - 2]; // 150000
            try {
              const parsed = parse(`${datePart}_${timePart}`, 'ddMMMyy_HHmmss', new Date());
              if (!isNaN(parsed.getTime())) {
                fileTimestamp = parsed.getTime();
              }
            } catch (e) {
              console.error('Error parsing timestamp from filename:', e);
            }
          }

          const importedRecords: Record[] = results.data.map((row: any, index: number) => {
            // Helper to find value by matching headers loosely
            const getValue = (possibleHeaders: string[]) => {
              const normalizedRow = Object.keys(row).reduce((acc, key) => {
                acc[key.toLowerCase().trim().replace(/\s+/g, ' ')] = row[key];
                return acc;
              }, {} as any);

              for (const h of possibleHeaders) {
                const normalizedH = h.toLowerCase().trim().replace(/\s+/g, ' ');
                if (normalizedRow[normalizedH] !== undefined) {
                  return normalizedRow[normalizedH];
                }
                // Also try without any spaces at all for maximum robustness
                const noSpaceH = normalizedH.replace(/\s+/g, '');
                const noSpaceRow = Object.keys(row).reduce((acc, key) => {
                  acc[key.toLowerCase().replace(/\s+/g, '')] = row[key];
                  return acc;
                }, {} as any);
                if (noSpaceRow[noSpaceH] !== undefined) {
                  return noSpaceRow[noSpaceH];
                }
              }
              return '';
            };

            // Unified mapping logic
            const infoMaHang = getValue(['Thông tin mã hàng', 'Vị trí mã hàng', 'Product Location']);
            const typeValue = getValue(['Loại', 'Type']);
            
          // Determine type: precedence 1. importType button, 2. filename prefix, 3. 'Loại' column, 4. default
          let type: 'soan_hang' | 'nhap_hang' | 'xuat_hang' = 'soan_hang';
          if (importType === 'soan') type = 'soan_hang';
          else if (importType === 'nhap') type = 'nhap_hang';
          else if (importType === 'xuat') type = 'xuat_hang';
          else if (detectedType) type = detectedType;
            else if (typeValue === 'Nhập hàng') type = 'nhap_hang';
            else if (typeValue === 'Xuất hàng') type = 'xuat_hang';

            // Use file timestamp if available, otherwise parse from 'Ngày' column, otherwise use current time
            let createdAt = (fileTimestamp || Date.now()) + index;
            const ngayValue = getValue(['Ngày', 'Date']);
            if (!fileTimestamp && ngayValue) {
              try {
                // Try multiple formats
                const formats = ['dd/MM/yyyy', 'dd.MM.yyyy', 'yyyy-MM-dd'];
                for (const f of formats) {
                  const parsedDate = parse(ngayValue, f, new Date());
                  if (!isNaN(parsedDate.getTime())) {
                    createdAt = parsedDate.getTime() + index;
                    break;
                  }
                }
              } catch (e) {
                console.error('Error parsing date:', e);
              }
            }

            // If it's a simple import (e.g. from Admin file), some fields might be missing
            // We provide defaults or map from available columns
            const orderNumber = getValue(['Đơn hàng', 'Order Number', 'Số đơn hàng']) || 
                               (importType === 'nhap' ? `NHAP_${format(new Date(), 'ddMMMyy_HHmmss')}` : '');

            const slThucXuatVal = getValue(['SL Thực Xuất (cái)', 'SL Thực Xuất(cái)', 'SL Thực Xuất', 'Số lượng cái']) || '';
            const slBaoCayVal = getValue(['SL (Bao/Cây)', 'SL(Bao/Cây)', 'Số lượng bao/cây', 'Số lượng bao']) || '';
            const slLeVal = getValue(['SL Lẻ', 'Số lượng lẻ']) || '';

            return {
              id: crypto.randomUUID(),
              type,
              orderNumber,
              pickerName: getValue(['Người soạn/nhập', 'Người soạn', 'Người nhập', 'Picker Name']) || pickerName || 'Admin',
              location: getValue(['Vị trí thực tế', 'Vị trí nhập thực tế', 'Vị trí', 'Location']) || '',
              productLocation: infoMaHang || '',
              thongTinMaHang: infoMaHang || '',
              productName: getValue(['Tên sản phẩm', 'Tên hàng', 'Product Name']) || '',
              quantity: getValue(['Số lượng thực tế', 'Số lượng tại vị trí', 'Số lượng', 'Quantity']) || '',
              note: getValue(['Ghi chú', 'Ghi chú nhập', 'Note', 'Ghi chú khi nhập hàng']) || '',
              transferToLocation: getValue(['Vị trí chuyển đến', 'Transfer To']) || '',
              createdAt,
              maBravo: getValue(['Mã Bravo', 'Mã hàng', 'Mã sản phẩm', 'Code']) || '',
              khachHang: getValue(['Khách hàng', 'Customer']) || '',
              customerName: getValue(['Khách hàng', 'Customer', 'Tên khách hàng']) || '',
              dvt: getValue(['ĐVT', 'Unit']) || '',
              slThucXuat: slThucXuatVal,
              originalSlThucXuat: slThucXuatVal,
              quiCach: getValue(['Qui cách (Bao/Cây)', 'Qui cách(Bao/Cây)', 'Qui cách', 'Qui cách bao']) || '',
              slBaoCay: slBaoCayVal,
              originalSlBaoCay: slBaoCayVal,
              slLe: slLeVal,
              originalSlLe: slLeVal,
              nhanVienQuanHang: getValue(['Nhân viên quản hàng']) || '',
              trongLuong: getValue(['Trọng lượng(kg)', 'Trọng lượng']) || '',
              taiTrongXe: getValue(['Tải trọng xe(kg)', 'Tải trọng']) || '',
              vehicleNumber: getValue(['Số xe VC', 'Số xe vận chuyển', 'Vehicle Number']) || '',
              pxkNumber: getValue(['Số PXK', 'PXK Number']) || '',
              deliveryAddress: getValue(['ĐC Nhận hàng', 'Địa chỉ giao hàng', 'Delivery Address']) || ''
            };
          });

          if (importedRecords.length > 0) {
            // Xác định setter phù hợp dựa trên loại dữ liệu nhập vào
            const firstType = importedRecords[0].type;
            const targetSetter = firstType === 'nhap_hang' ? setRecordsNhap : (firstType === 'xuat_hang' ? setRecordsXuat : setRecordsSoan);
            const targetActiveSetter = firstType === 'nhap_hang' ? setActiveOrderNhap : (firstType === 'xuat_hang' ? setActiveOrderXuat : setActiveOrderSoan);
            
            targetSetter(prev => {
              const updatedRecords = [...prev];
              const newRecordsToAdd: Record[] = [];
              
              importedRecords.forEach(imported => {
                // Tìm xem mặt hàng này đã tồn tại trong đơn hàng này chưa
                const existingIndex = updatedRecords.findIndex(r => 
                  r.orderNumber === imported.orderNumber && 
                  r.maBravo === imported.maBravo &&
                  r.type === imported.type
                );
                
                if (existingIndex !== -1) {
                  // Cập nhật bản ghi hiện có với thông tin mới từ file
                  updatedRecords[existingIndex] = {
                    ...updatedRecords[existingIndex],
                    pxkNumber: imported.pxkNumber || updatedRecords[existingIndex].pxkNumber,
                    customerName: imported.customerName || updatedRecords[existingIndex].customerName,
                    deliveryAddress: imported.deliveryAddress || updatedRecords[existingIndex].deliveryAddress,
                    vehicleNumber: imported.vehicleNumber || updatedRecords[existingIndex].vehicleNumber,
                    originalSlThucXuat: imported.originalSlThucXuat,
                    originalSlBaoCay: imported.originalSlBaoCay,
                    originalSlLe: imported.originalSlLe,
                    khachHang: imported.khachHang || updatedRecords[existingIndex].khachHang,
                    dvt: imported.dvt || updatedRecords[existingIndex].dvt,
                    quiCach: imported.quiCach || updatedRecords[existingIndex].quiCach,
                    nhanVienQuanHang: imported.nhanVienQuanHang || updatedRecords[existingIndex].nhanVienQuanHang,
                    trongLuong: imported.trongLuong || updatedRecords[existingIndex].trongLuong,
                    taiTrongXe: imported.taiTrongXe || updatedRecords[existingIndex].taiTrongXe,
                    productName: imported.productName || updatedRecords[existingIndex].productName,
                    productLocation: imported.productLocation || updatedRecords[existingIndex].productLocation,
                    thongTinMaHang: imported.thongTinMaHang || updatedRecords[existingIndex].thongTinMaHang
                  };
                } else {
                  newRecordsToAdd.push(imported);
                }
              });
              
              return [...updatedRecords, ...newRecordsToAdd];
            });
            
            setImportedFiles(prev => [...prev, fileInfo]);
            
            // Tự động chọn đơn hàng đầu tiên và chuyển sang màn hình tương ứng
            const firstImported = importedRecords[0];
            if (firstImported) {
              targetActiveSetter(firstImported.orderNumber);
              if (!pickerName && firstImported.pickerName) {
                setPickerName(firstImported.pickerName);
              }
              setCurrentScreen(firstImported.type);
              showToast(`Đã đồng bộ ${importedRecords.length} bản ghi từ file.`);
            }
          } else {
            showAlert('Không tìm thấy dữ liệu hợp lệ trong file.');
          }
          
          // Reset file input
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
        error: (error) => {
          showAlert(`Lỗi khi đọc file: ${error.message}`);
        }
      });
    };

    if (isAlreadyImported) {
      showConfirm(`File "${file.name}" đã được nhập trước đó. Bạn có muốn nhập lại (tạo bản sao dữ liệu) không?`, proceedWithImport, 'File đã tồn tại');
    } else {
      proceedWithImport();
    }
  };

  const handleScan = (text: string) => {
    if (scanningField === 'orderNumber') setActiveOrderNumber(text);
    if (scanningField === 'pickerName') setPickerName(text);
    if (scanningField === 'location') setLocation(text);
    if (scanningField === 'transferToLocation') setTransferToLocation(text);
    if (scanningField === 'vehicleNumber') setVehicleNumber(text);
    if (scanningField === 'pxkNumber') setPxkNumber(text);
    if (scanningField === 'maBravo') setMaBravo(text);
    if (scanningField === 'welcomeOrderQR') {
      if (text.includes(';')) {
        const parts = text.split(';');
        if (parts.length >= 5) {
          // Extract order number (index 4, which is 5th item)
          const order = parts[4]?.trim() || '';
          setActiveOrderNumber(order);
        } else {
          setActiveOrderNumber(text);
        }
      } else {
        setActiveOrderNumber(text);
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
            setOriginalSlThucXuat(newSlThucXuat);
            setQuiCach(newQuiCach);
            setSlBaoCay(newSlBaoCay);
            setOriginalSlBaoCay(newSlBaoCay);
            setSlLe(newSlLe);
            setOriginalSlLe(newSlLe);
            setProductLocation(newProductLocation);
            setThongTinMaHang(newProductLocation);
            setNhanVienQuanHang(newNhanVienQuanHang);
            setTrongLuong(newTrongLuong);
            setTaiTrongXe(newTaiTrongXe);
            setLocation(''); // Để trống vị trí thực tế khi quét mã mới
          };

          // Just apply data on scan. Duplicate check will happen when clicking "Xác nhận"
          // This avoids double confirmation prompts while still populating fields.
          applyScanData();
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

  const updateShippingInfoForAll = () => {
    if (!activeOrderNumber) {
      showAlert('Vui lòng chọn đơn hàng trước');
      return;
    }
    const updatedRecords = records.map(r => 
      r.orderNumber === activeOrderNumber ? { 
        ...r, 
        vehicleNumber,
        pxkNumber,
        customerName,
        deliveryAddress
      } : r
    );
    setRecords(updatedRecords);
    showAlert(`Đã cập nhật thông tin giao hàng cho tất cả hàng trong đơn ${activeOrderNumber}`);
  };

  const addLocationPair = () => {
    const isXuat = currentScreen === 'xuat_hang';
    
    if (!quantity) {
      showAlert('Vui lòng nhập Số lượng');
      return;
    }

    if (!isXuat && !location) {
      showAlert('Vui lòng nhập Vị trí');
      return;
    }

    if (!isXuat && location && !/^[A-Z]{1,2}-\d{3}-\d{2}$/.test(location)) {
      showAlert('Vị trí không đúng định dạng (VD: A-001-01 hoặc AA-001-01)');
      return;
    }

    // Đối với xuất hàng, nếu vị trí trống thì dùng "XUAT" để giữ cột trong dữ liệu
    const finalLocation = isXuat ? (location || 'XUAT') : location;

    // Check for duplicate location in the current list to consolidate
    const existingIndex = multiLocations.findIndex(ml => ml.location === finalLocation);
    if (existingIndex >= 0) {
      const newMulti = [...multiLocations];
      newMulti[existingIndex] = { location: finalLocation, quantity };
      setMultiLocations(newMulti);
    } else {
      setMultiLocations([...multiLocations, { location: finalLocation, quantity }]);
    }
    
    setLocation('');
    setQuantity('');
  };

  const removeLocationPair = (index: number) => {
    setMultiLocations(multiLocations.filter((_, i) => i !== index));
  };

  const handleAddOrUpdateRecord = () => {
    let finalMultiLocations = [...multiLocations];
    
    // For xuat_hang, if quantity is empty but slThucXuat exists, use slThucXuat
    const effectiveQuantity = (currentScreen === 'xuat_hang' && !quantity && slThucXuat) ? slThucXuat : quantity;
    const effectiveLocation = (currentScreen === 'xuat_hang' && !location) ? 'XUAT' : location;

    // If there's leftover data in the inputs, add it to multiLocations automatically
    if (effectiveQuantity && (currentScreen === 'xuat_hang' || (effectiveLocation && /^[A-Z]{1,2}-\d{3}-\d{2}$/.test(effectiveLocation)))) {
      // Avoid duplicate location entries in the list (consolidate if already exists)
      const existingIdx = finalMultiLocations.findIndex(ml => ml.location === effectiveLocation);
      if (existingIdx >= 0) {
        finalMultiLocations[existingIdx] = { location: effectiveLocation, quantity: effectiveQuantity };
      } else {
        finalMultiLocations.push({ 
          location: effectiveLocation, 
          quantity: effectiveQuantity 
        });
      }
    }

    if (finalMultiLocations.length === 0) {
      showAlert('Vui lòng thêm ít nhất một vị trí và số lượng (bấm nút "Thêm vị trí" hoặc nhập đầy đủ)');
      return;
    }

    if (!productName.trim()) {
      showAlert('Vui lòng nhập hoặc quét tên sản phẩm');
      return;
    }

    // Duplicate check for records in the current order
    const isDuplicate = records.some(r => r.maBravo === maBravo && r.orderNumber === activeOrderNumber && r.id !== editingId);
    
    const performSave = (idToUpdate: string | null) => {
      if (idToUpdate) {
        // Update existing record
        const existing = records.find(r => r.id === idToUpdate);
        setRecords(records.map(r => 
          r.id === idToUpdate 
            ? { 
                ...r, 
                pickerName, 
                location: finalMultiLocations[0].location, 
                productLocation, 
                productName, 
                quantity: finalMultiLocations[0].quantity, 
                multiLocations: finalMultiLocations, 
                note, 
                transferToLocation, 
                maBravo, 
                khachHang, 
                dvt, 
                slThucXuat, 
                quiCach, 
                slBaoCay, 
                slLe, 
                // Preserve original values from the existing record if they are not empty (e.g. from CSV import)
                originalSlThucXuat: existing?.originalSlThucXuat || originalSlThucXuat,
                originalSlBaoCay: existing?.originalSlBaoCay || originalSlBaoCay,
                originalSlLe: existing?.originalSlLe || originalSlLe,
                thongTinMaHang, 
                nhanVienQuanHang, 
                trongLuong, 
                taiTrongXe, 
                vehicleNumber, 
                pxkNumber, 
                customerName, 
                deliveryAddress 
              } 
            : r
        ));
        setEditingId(null);
        showToast('Đã cập nhật bản ghi!');
      } else {
        // Add new record
        const newRecord: Record = {
          id: Math.random().toString(36).substring(7),
          type: currentScreen === 'welcome' ? 'soan_hang' : currentScreen,
          orderNumber: activeOrderNumber,
          pickerName,
          location: finalMultiLocations[0].location,
          productLocation,
          productName,
          quantity: finalMultiLocations[0].quantity,
          multiLocations: finalMultiLocations,
          note,
          transferToLocation,
          createdAt: Date.now(),
          maBravo, khachHang, dvt, slThucXuat, quiCach, slBaoCay, slLe, originalSlThucXuat, originalSlBaoCay, originalSlLe, thongTinMaHang, nhanVienQuanHang, trongLuong, taiTrongXe,
          vehicleNumber, 
          pxkNumber,
          customerName,
          deliveryAddress
        };
        setRecords([...records, newRecord]);
        setCurrentPage(99999); 
        showToast('Đã thêm bản ghi mới!');
      }
      resetForm();
    };

    if (isDuplicate && !editingId) {
      showConfirm(`Bạn đã check mã ${maBravo} rồi. Vui lòng thay đổi mã khác hoặc nhấn xác nhận lại để cập nhật số lượng mới.`, () => {
        const existingRecord = records.find(r => r.maBravo === maBravo && r.orderNumber === activeOrderNumber);
        if (existingRecord) {
          performSave(existingRecord.id);
        }
      });
      return;
    }

    performSave(editingId);
  };

  const resetForm = () => {
    setLocation('');
    setProductLocation('');
    setProductName('');
    setQuantity('');
    setMultiLocations([]);
    setNote('');
    setTransferToLocation('');
    setMaBravo('');
    setKhachHang('');
    setDvt('');
    setSlThucXuat('');
    setOriginalSlThucXuat('');
    setQuiCach('');
    setSlBaoCay('');
    setOriginalSlBaoCay('');
    setSlLe('');
    setOriginalSlLe('');
    setThongTinMaHang('');
    setNhanVienQuanHang('');
    setTrongLuong('');
    setTaiTrongXe('');
  };

  const getQuantityColor = (current: string, original: string) => {
    if (!original || !current) return 'text-gray-900';
    return current === original ? 'text-gray-900' : 'text-red-600 font-bold';
  };

  const handleEdit = (record: Record) => {
    setEditingId(record.id);
    setLocation(record.location);
    setProductLocation(record.productLocation || '');
    setProductName(record.productName);
    setQuantity(record.quantity);
    setMultiLocations(record.multiLocations || []);
    setNote(record.note || '');
    setTransferToLocation(record.transferToLocation || '');
    setMaBravo(record.maBravo || '');
    setKhachHang(record.khachHang || '');
    setDvt(record.dvt || '');
    setSlThucXuat(record.slThucXuat || '');
    setOriginalSlThucXuat(record.originalSlThucXuat || record.slThucXuat || '');
    setQuiCach(record.quiCach || '');
    setSlBaoCay(record.slBaoCay || '');
    setOriginalSlBaoCay(record.originalSlBaoCay || record.slBaoCay || '');
    setSlLe(record.slLe || '');
    setOriginalSlLe(record.originalSlLe || record.slLe || '');
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
    setMultiLocations([]);
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
        localStorage.setItem('qr_scanner_records', JSON.stringify(updated));
        return updated;
      });
      
      if (editingId === id) {
        handleCancelEdit();
      }
      
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
      
      showToast('Đã xóa bản ghi thành công!');
    });
  };

  const handleDownload = () => {
    try {
      if (currentOrderRecords.length === 0) {
        showAlert('Không có dữ liệu để tải xuống!');
        return;
      }

      const isNhap = currentScreen === 'nhap_hang';
      const isXuat = currentScreen === 'xuat_hang';
      const now = new Date();
      const timestamp = format(now, 'ddMMMyy_HHmmss');
      const fileCreationTime = format(now, 'dd/MM/yyyy HH:mm:ss');
      
      const safePickerName = (pickerName || 'unnamed').trim();
      const safeOrderNumber = (activeOrderNumber || 'no_order').trim();
      
      let fileName = isNhap ? `NF_${timestamp}_${safePickerName}.csv` : (isXuat ? `XF_${safeOrderNumber}_${timestamp}_${safePickerName}.csv` : `SF_${safeOrderNumber}_${timestamp}_${safePickerName}.csv`);

      const escapeCSV = (str: any) => {
        if (str === null || str === undefined) return '';
        const stringified = String(str);
        if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
          return '"' + stringified.replace(/"/g, '""') + '"';
        }
        return stringified;
      };

      let header = [
        'STT', 'Ngày', 'Mã Bravo', 'Tên sản phẩm', 'Khách hàng', 'ĐC Nhận hàng', 
        'Số PXK', 'Số xe VC', 'Đơn hàng', 'ĐVT', isNhap ? 'SL Nhập(cái)' : 'SL Thực Xuất(cái)', 
        'Qui cách(Bao/Cây)', 'SL (Bao/Cây)', 'SL Lẻ', 'Trọng lượng', 'Vị trí thực tế', 'Số lượng thực tế', 'Ghi chú', 'Ngày giờ tạo file'
      ].map(escapeCSV).join(',');
      
      let stt = 1;
      const rows = currentOrderRecords.flatMap(r => {
        const createdDate = r.createdAt ? new Date(r.createdAt) : new Date();
        const dateStr = isValid(createdDate) ? format(createdDate, 'dd/MM/yyyy') : '';

        const baseRow = [
          stt++, dateStr, r.maBravo || '', r.productName || '', r.khachHang || r.customerName || '',
          r.deliveryAddress || '', r.pxkNumber || '', r.vehicleNumber || '', r.orderNumber || '', 
          r.dvt || '', r.slThucXuat || '', r.quiCach || '', r.slBaoCay || '', r.slLe || '', 
          r.trongLuong || '', r.location || '', r.quantity || '', r.note || '', fileCreationTime
        ];

        if (r.multiLocations && r.multiLocations.length > 0) {
          return r.multiLocations.map(pair => {
            const newRow = [...baseRow];
            newRow[0] = stt++; // Update STT
            newRow[14] = pair.location || ''; // Update location
            newRow[15] = pair.quantity || ''; // Update quantity
            return newRow;
          });
        }
        return [baseRow];
      });
      
      const csvString = '\uFEFF' + [header, ...rows.map(row => row.map(escapeCSV).join(','))].join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 200);
      
      showAlert(`File CSV đã được tải xuống máy của bạn!\nTên file: ${fileName}`);
      if (currentScreen !== 'welcome') {
        setCurrentScreen('welcome');
        setActiveOrderNumber('');
      }
    } catch (error) {
      console.error('CSV Export Error:', error);
      showAlert('Lỗi khi xuất file CSV: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): Promise<string> => {
    return new Promise((resolve, reject) => {
      const blob = new Blob([buffer]);
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          const base64 = dataUrl.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Không thể chuyển đổi ArrayBuffer sang Base64'));
        }
      };
      reader.onerror = () => reject(new Error('Lỗi khi đọc file font'));
      reader.readAsDataURL(blob);
    });
  };

  const handleDownloadPDF = async () => {
 try {
  if (currentOrderRecords.length === 0) { showAlert('Không có dữ liệu để xuất!'); return; }
  setIsGeneratingPDF(true); showToast('Đang chuẩn bị dữ liệu PDF...');
  const isNhap = currentScreen === 'nhap_hang'; const isXuat = currentScreen === 'xuat_hang';
  const now = new Date(); const timestamp = format(now, 'ddMMMyy_HHmmss');
  const safePickerName = (pickerName || 'unnamed').trim(); const safeOrderNumber = (activeOrderNumber || 'no_order').trim();
  const title = isNhap ? 'PHIẾU ĐỀ NGHỊ NHẬP KHO' : (isXuat ? 'PHIẾU ĐỀ NGHỊ XUẤT KHO' : 'PHIẾU ĐỀ NGHỊ SOẠN KHO');
  const fileName = isNhap ? `NF_${timestamp}_${safePickerName}.pdf` : (isXuat ? `XF_${safeOrderNumber}_${timestamp}_${safePickerName}.pdf` : `SF_${safeOrderNumber}_${timestamp}_${safePickerName}.pdf`);
  
  const doc = new jsPDF('l', 'mm', 'a4'); 
  const fontName = 'Roboto';

  const loadFontBase64 = async (url: string) => {
   try { 
     const resp = await fetch(url, { cache: 'force-cache' }); 
     if (!resp.ok) return ''; 
     const buf = await resp.arrayBuffer(); 
     return await arrayBufferToBase64(buf); 
   } catch (e) { 
     console.warn('Font load error:', e); 
     return ''; 
   }
  };

  // chu thich: tai font tu thu muc public/fonts
  console.log('PDF: Đang tải font Roboto...');
  const reg = await loadFontBase64('/fonts/Roboto-Regular.ttf');
  const bold = await loadFontBase64('/fonts/Roboto-Bold.ttf');
  console.log('PDF: Font tải xong, độ dài:', reg.length, bold.length);

  if (!reg || reg.length < 500) { 
    showAlert('Không tải được font Roboto-Regular.ttf. Vui lòng kiểm tra file trong thư mục public/fonts.'); 
    return; 
  }

  doc.addFileToVFS('Roboto-Regular.ttf', reg);
  doc.addFont('Roboto-Regular.ttf', fontName, 'normal');
  doc.addFont('Roboto-Regular.ttf', fontName, 'italic');
  
  if (bold && bold.length > 500) {
    doc.addFileToVFS('Roboto-Bold.ttf', bold);
    doc.addFont('Roboto-Bold.ttf', fontName, 'bold');
    doc.addFont('Roboto-Bold.ttf', fontName, 'bolditalic');
  } else {
    // Fallback neu khong co bold
    doc.addFont('Roboto-Regular.ttf', fontName, 'bold');
    doc.addFont('Roboto-Regular.ttf', fontName, 'bolditalic');
  }
  
  doc.setFont(fontName, 'normal');
  console.log('PDF: Đã đăng ký font xong.');
  showToast('Đang tạo trang PDF...');

  const headers = isNhap
   ? [['STT','Ngày','Mã Bravo','Tên sản phẩm','Đơn hàng','ĐVT','SL Nhập','Qui cách','SL Bao','SL Lẻ','Trọng lượng','Ghi chú']]
   : [['STT','Ngày','Mã Bravo','Tên sản phẩm','Đơn hàng','ĐVT','SL Thực Xuất','Qui cách','SL Bao','SL Lẻ','Trọng lượng','Tải trọng xe']];

  let stt = 1;
  const allData = currentOrderRecords.map(r => {
   const createdDate = r.createdAt ? new Date(r.createdAt) : new Date();
   const dateStr = isValid(createdDate) ? format(createdDate, 'dd/MM/yyyy') : '';
   return isNhap
    ? [stt++, dateStr, r.maBravo || '', r.productName || '', r.orderNumber || '', r.dvt || '', r.slThucXuat || '', r.quiCach || '', r.slBaoCay || '', r.slLe || '', r.trongLuong || '', r.note || '']
    : [stt++, dateStr, r.maBravo || '', r.productName || '', r.orderNumber || '', r.dvt || '', r.slThucXuat || '', r.quiCach || '', r.slBaoCay || '', r.slLe || '', r.trongLuong || '', r.taiTrongXe || ''];
  });

  // 1. Ham ve tieu de va thong tin chung (se goi o moi trang)
  const drawHeader = (d: any) => {
    d.setFontSize(18); d.setFont(fontName, 'bold'); d.text(title, 148, 15, { align: 'center' });
    d.setFontSize(11); 
    const labelGap = 3;
    
    // Dong 1
    d.setFont(fontName, 'bold'); d.text('Số PXK: ', 20, 30);
    d.setFont(fontName, 'normal'); d.text(pxkNumber || '', 20 + d.getTextWidth('Số PXK: ') + labelGap, 30);
    d.setFont(fontName, 'bold'); d.text('Số xe VC: ', 230, 30);
    d.setFont(fontName, 'normal'); d.text(vehicleNumber || '', 230 + d.getTextWidth('Số xe VC: ') + labelGap, 30);

    // Dong 2
    d.setFont(fontName, 'bold'); d.text('KHÁCH HÀNG: ', 20, 42);
    d.setFont(fontName, 'normal'); d.text(customerName || '', 20 + d.getTextWidth('KHÁCH HÀNG: ') + labelGap, 42);

    // Dong 3
    d.setFont(fontName, 'bold'); d.text('ĐC nhận hàng: ', 20, 54);
    const addressText = deliveryAddress || '';
    d.setFont(fontName, 'normal');
    const splitAddress = d.splitTextToSize(addressText, 220); 
    const addressLines = splitAddress ? splitAddress.slice(0, 3) : [];
    if (addressLines.length > 0) d.text(addressLines as any, 20 + d.getTextWidth('ĐC nhận hàng: ') + labelGap, 54);
  };

  // 2. Goi autoTable mot lan duy nhat cho tat ca du lieu
  autoTable(doc, {
    startY: 70,
    margin: { top: 70 }, // Khoang cach de ve header o cac trang sau
    head: headers,
    body: allData,
    theme: 'grid',
    headStyles: { fillColor: [240,240,240], textColor: [0,0,0], lineWidth: 0.1, fontStyle: 'bold', font: fontName, halign: 'center', valign: 'middle', fontSize: 10 },
    styles: { fontSize: 10.5, cellPadding: 3, font: fontName, overflow: 'linebreak', halign: 'center', valign: 'middle' },
    columnStyles: { 
      0: { cellWidth: 8 }, 1: { cellWidth: 18 }, 2: { cellWidth: 22 }, 
      3: { cellWidth: 75, halign: 'left' }, 
      4: { cellWidth: 22 }, 5: { cellWidth: 12 }, 
      6: { cellWidth: 18, fillColor: [220, 220, 220], fontSize: 14.5, fontStyle: 'bold' }, 
      7: { cellWidth: 15 }, 
      8: { cellWidth: 15, fillColor: [220, 220, 220], fontSize: 14.5, fontStyle: 'bold' }, 
      9: { cellWidth: 15, fontSize: 14.5, fontStyle: 'bold' }, 
      10: { cellWidth: 18 }, 11: { cellWidth: 18 } 
    },
    didDrawPage: (data) => {
      // Ve header cho moi trang
      drawHeader(doc);
    }
  });

  // 3. Ve chu ky o trang cuoi cung
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  // Kiem tra neu trang hien tai khong du cho ve chu ky thi sang trang moi
  if (finalY > 180) {
    doc.addPage();
    drawHeader(doc);
    doc.setFontSize(11); doc.setFont(fontName, 'bold');
    doc.text('Người Lập Phiếu', 30, 85); doc.text('Thủ kho', 100, 85); doc.text('Tài xế', 170, 85); doc.text('Bảo vệ', 240, 85);
  } else {
    doc.setFontSize(11); doc.setFont(fontName, 'bold');
    doc.text('Người Lập Phiếu', 30, finalY); doc.text('Thủ kho', 100, finalY); doc.text('Tài xế', 170, finalY); doc.text('Bảo vệ', 240, finalY);
  }

  const pdfBlob = doc.output('blob'); 
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a'); 
  link.href = url; 
  link.setAttribute('download', fileName); 
  document.body.appendChild(link); 
  link.click();
  
  setTimeout(() => { 
    document.body.removeChild(link); 
    URL.revokeObjectURL(url); 
  }, 500);
  
  showToast(`Đã tải file: ${fileName}`);

  if (currentScreen !== 'welcome') {
   setCurrentScreen('welcome');
   if (currentScreen === 'soan_hang') setActiveOrderSoan(''); else if (currentScreen === 'nhap_hang') setActiveOrderNhap(''); else if (currentScreen === 'xuat_hang') setActiveOrderXuat('');
  }
 } catch (error) {
  console.error('PDF Export Error:', error);
  const errorMsg = error instanceof Error ? error.message : String(error);
  showAlert(`Lỗi khi tạo file PDF: ${errorMsg}. Vui lòng thử lại.`);
 } finally { setIsGeneratingPDF(false); }
};


  // Calculate orders for Welcome screen
  const handleStartNhapHang = () => {
    if (!pickerName) {
      showAlert('Vui lòng nhập Người nhập');
      return;
    }
    setActiveOrderNumber(`NHAP_HANG_${format(new Date(), 'yyyyMMdd')}`);
    setCurrentScreen('nhap_hang');
  };

  const triggerImport = (type: 'soan' | 'nhap' | 'xuat') => {
    setImportType(type);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  if (currentScreen === 'welcome') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="relative bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/20 w-full max-w-md space-y-6 text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShoppingCart size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 uppercase">Kho Thành Phẩm DNP</h1>
          <p className="text-gray-500 text-sm">Hệ thống quản lý kho thông minh & chính xác</p>
          
          <div className="text-left space-y-4">
            <ScanInput 
              id="picker-name-input"
              label="Người soạn / Người nhập / Người xuất" 
              value={pickerName} 
              onChange={setPickerName} 
              onScanClick={() => setScanningField('pickerName')} 
              placeholder="Nhập tên..."
            />
          </div>

          <div className="space-y-3">
            <button 
              id="btn-soan-hang"
              onClick={() => {
                if (!pickerName) {
                  showAlert('Vui lòng nhập tên người soạn');
                  return;
                }
                setCurrentScreen('soan_hang');
              }}
              disabled={!pickerName}
              className="w-full py-3.5 bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
            >
              Bắt đầu soạn hàng
            </button>
            <button 
              id="btn-xuat-hang"
              onClick={() => {
                if (!pickerName) {
                  showAlert('Vui lòng nhập tên người xuất');
                  return;
                }
                setCurrentScreen('xuat_hang');
              }}
              disabled={!pickerName}
              className="w-full py-3.5 bg-purple-600 disabled:bg-gray-300 disabled:text-gray-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors shadow-sm"
            >
              Bắt đầu xuất hàng
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
        </div>
        
        {/* Scanner Modal */}
        {(scanningField === 'orderNumber' || scanningField === 'pickerName' || scanningField === 'welcomeOrderQR') && (
          <Scanner 
            onScan={handleScan} 
            onClose={() => setScanningField(null)} 
          />
        )}
        <CustomModal modal={modal} onClose={closeModal} />
        <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImportCSV} 
          accept=".csv" 
          className="hidden" 
        />
      </div>
    );
  }

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
      <header className={`text-white p-4 shadow-md sticky top-0 z-10 flex justify-between items-center ${currentScreen === 'nhap_hang' ? 'bg-amber-500/90' : currentScreen === 'xuat_hang' ? 'bg-purple-600/90' : 'bg-blue-600/90'} backdrop-blur-md`}>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ShoppingCart /> {currentScreen === 'nhap_hang' ? 'NHẬP HÀNG DNP' : currentScreen === 'xuat_hang' ? 'XUẤT HÀNG DNP' : 'SOẠN HÀNG DNP'}
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
            onClick={handleGoHome} 
            className="bg-white p-2 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.6)] hover:scale-115 active:scale-90 transition-all flex flex-col items-center min-w-[60px] border-2 border-white group"
            title="Về trang chủ"
          >
            <Home size={22} className={`${currentScreen === 'nhap_hang' ? 'text-amber-600' : 'text-blue-600'} group-hover:scale-110 transition-transform`} />
            <span className={`text-[10px] font-black uppercase tracking-tighter ${currentScreen === 'nhap_hang' ? 'text-amber-600' : 'text-blue-600'}`}>Home</span>
          </button>
          <button 
            onClick={handleSwitchApp}
            className="bg-white/20 p-2 rounded-lg hover:bg-white/30 transition-colors"
            title="Chuyển ứng dụng"
          >
            <Layers size={20} />
          </button>
          <button 
            id="btn-exit"
            onClick={handleExitApp}
            className="bg-red-500 p-2 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.6)] hover:bg-red-600 hover:scale-115 active:scale-90 transition-all flex flex-col items-center min-w-[60px] border-2 border-red-400 group animate-pulse-red"
            title="Thoát ứng dụng"
          >
            <LogOut size={22} className="text-white group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-tighter text-white">Thoát</span>
          </button>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-6">
        {/* General Order Info Section */}
        <div className={`bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border ${currentScreen === 'nhap_hang' ? 'border-amber-200' : currentScreen === 'xuat_hang' ? 'border-purple-200' : 'border-blue-200'} space-y-3 transition-all`}>
          <div className="flex justify-between items-center mb-2">
            <h2 className={`font-semibold flex items-center gap-2 ${currentScreen === 'nhap_hang' ? 'text-amber-700' : currentScreen === 'xuat_hang' ? 'text-purple-700' : 'text-blue-700'}`}>
              <FileText size={18} /> 
              Thông tin chung
            </h2>
          </div>
          
          <ScanInput 
            label={currentScreen === 'nhap_hang' ? 'Người nhập' : currentScreen === 'xuat_hang' ? 'Người xuất' : 'Người soạn'} 
            value={pickerName} 
            onChange={setPickerName} 
            onScanClick={() => {}} 
            placeholder="Tên người thao tác"
            disabled={false}
          />
          
          <ScanInput 
            label={currentScreen === 'nhap_hang' ? 'Số đợt nhập' : 'Số đơn hàng'} 
            value={activeOrderNumber} 
            onChange={setActiveOrderNumber} 
            onScanClick={() => setScanningField('welcomeOrderQR')} 
            placeholder="Số đơn hàng"
            disabled={false}
          />

          {currentScreen === 'xuat_hang' && (
            <>
              <ScanInput label="Số PXK" value={pxkNumber} onChange={setPxkNumber} onScanClick={() => setScanningField('pxkNumber')} placeholder="Số PXK (từ đơn)..." disabled={false} />
              <ScanInput label="Khách hàng" value={customerName} onChange={setCustomerName} onScanClick={() => {}} placeholder="Tên khách hàng (từ đơn)..." disabled={false} />
              <ScanInput label="Địa chỉ giao hàng" value={deliveryAddress} onChange={setDeliveryAddress} onScanClick={() => {}} placeholder="Địa chỉ (từ đơn)..." disabled={false} />
              
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <ScanInput label="Số xe vận chuyển" value={vehicleNumber} onChange={setVehicleNumber} onScanClick={() => setScanningField('vehicleNumber')} placeholder="Nhập hoặc quét số xe..." disabled={false} />
                </div>
                <button 
                  onClick={updateShippingInfoForAll}
                  className="p-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors flex items-center justify-center h-[46px] mb-[1px]"
                  title="Cập nhật thông tin giao hàng cho toàn bộ đơn"
                >
                  <Save size={20} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Product Input Form */}
        <div className={`bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border ${editingId ? 'border-blue-300 ring-2 ring-blue-50' : currentScreen === 'xuat_hang' ? 'border-purple-200' : 'border-white/20'} space-y-4 transition-all`}>
          {!editingId && (
            <h2 className={`font-semibold flex items-center gap-2 mb-2 ${currentScreen === 'nhap_hang' ? 'text-amber-700' : currentScreen === 'xuat_hang' ? 'text-purple-700' : 'text-blue-700'}`}>
              <Package size={18} /> 
              {currentScreen === 'nhap_hang' ? 'Chi tiết nhập hàng' : currentScreen === 'xuat_hang' ? 'Chi tiết xuất hàng' : 'Chi tiết soạn hàng'}
            </h2>
          )}
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
            {currentScreen === 'xuat_hang' && (
              <>
                <div className="pb-2">
                  <button 
                    onClick={() => triggerImport('xuat')}
                    className="w-full py-2.5 bg-white border border-purple-200 text-purple-600 text-sm font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-purple-50 transition-colors shadow-sm"
                  >
                    <Upload size={18} />
                    Tải đơn xuất (.csv)
                  </button>
                </div>
                <div className="pb-2">
                  <button
                    onClick={() => setScanningField('productQR')}
                    className="w-full py-3 bg-purple-100 text-purple-700 font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-purple-200 transition-colors border border-purple-200"
                  >
                    <QrCode size={20} /> Quét mã sản phẩm
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <ScanInput label="Tên sản phẩm" value={productName} onChange={setProductName} onScanClick={() => {}} placeholder="Tên sản phẩm" disabled={false} />
                    
                    <div className="grid grid-cols-1 gap-3 pt-3 mt-3 border-t border-purple-100">
                      <div>
                        <label className="block text-sm font-bold text-purple-700 mb-1">Số lượng thực xuất (cái)</label>
                        <input 
                          type="number" 
                          value={slThucXuat}
                          onChange={(e) => setSlThucXuat(e.target.value)}
                          className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none ${
                            slThucXuat !== originalSlThucXuat ? 'border-red-500 bg-red-50 text-red-600 font-bold' : 'border-purple-300 bg-purple-50/30'
                          }`}
                          placeholder="Nhập số lượng thực xuất..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Trọng lượng hàng/ĐVT</label>
                        <input 
                          type="text" 
                          value={trongLuong}
                          onChange={(e) => setTrongLuong(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                          placeholder="VD: 0.5kg/cái"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng bao/cây</label>
                          <input 
                            type="number" 
                            value={slBaoCay}
                            onChange={(e) => setSlBaoCay(e.target.value)}
                            className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none ${
                              slBaoCay !== originalSlBaoCay ? 'border-red-500 bg-red-50 text-red-600 font-bold' : 'border-gray-300'
                            }`}
                            placeholder="Bao/Cây"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng lẻ</label>
                          <input 
                            type="number" 
                            value={slLe}
                            onChange={(e) => setSlLe(e.target.value)}
                            className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none ${
                              slLe !== originalSlLe ? 'border-red-500 bg-red-50 text-red-600 font-bold' : 'border-gray-300'
                            }`}
                            placeholder="SL Lẻ"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                      <textarea 
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                        placeholder="Nhập ghi chú xuất hàng..."
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {currentScreen === 'nhap_hang' && (
              <>
                <div className="pb-2">
                  <button 
                    onClick={() => triggerImport('nhap')}
                    className="w-full py-2.5 bg-white border border-amber-200 text-amber-600 text-sm font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-amber-50 transition-colors shadow-sm"
                  >
                    <Upload size={18} />
                    Tải đơn nhập (.csv)
                  </button>
                </div>
                <div className="pb-2">
                  <button
                    onClick={() => setScanningField('productQR')}
                    className="w-full py-3 bg-amber-100 text-amber-700 font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-amber-200 transition-colors border border-amber-200"
                  >
                    <QrCode size={20} /> Quét QR sản phẩm (nếu có)
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <ScanInput 
                    label="Mã hàng" 
                    value={maBravo} 
                    onChange={setMaBravo} 
                    onScanClick={() => setScanningField('maBravo')} 
                    placeholder="Nhập hoặc quét mã hàng..." 
                  />
                  
                  <div id="product-name-input">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên hàng</label>
                    <input 
                      type="text" 
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                      placeholder="Nhập tên hàng..."
                    />
                  </div>

                  <div>
                    <div className="grid grid-cols-1 gap-3 pt-3 mt-3 border-t border-amber-100">
                      <div>
                        <label className="block text-sm font-bold text-amber-700 mb-1">Số lượng nhập (cái)</label>
                        <input 
                          type="number" 
                          value={slThucXuat}
                          onChange={(e) => setSlThucXuat(e.target.value)}
                          className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none ${
                            slThucXuat !== originalSlThucXuat ? 'border-red-500 bg-red-50 text-red-600 font-bold' : 'border-amber-300 bg-amber-50/30'
                          }`}
                          placeholder="Nhập số lượng nhập..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Trọng lượng hàng/ĐVT</label>
                        <input 
                          type="text" 
                          value={trongLuong}
                          onChange={(e) => setTrongLuong(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                          placeholder="VD: 0.5kg/cái"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng bao</label>
                          <input 
                            type="number" 
                            value={slBaoCay}
                            onChange={(e) => setSlBaoCay(e.target.value)}
                            className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none ${
                              slBaoCay !== originalSlBaoCay ? 'border-red-500 bg-red-50 text-red-600 font-bold' : 'border-gray-300'
                            }`}
                            placeholder="Số lượng bao"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Qui cách bao</label>
                          <input 
                            type="text" 
                            value={quiCach}
                            onChange={(e) => setQuiCach(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                            placeholder="Qui cách"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng lẻ</label>
                        <input 
                          type="number" 
                          value={slLe}
                          onChange={(e) => setSlLe(e.target.value)}
                          className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none ${
                            slLe !== originalSlLe ? 'border-red-500 bg-red-50 text-red-600 font-bold' : 'border-gray-300'
                          }`}
                          placeholder="Số lượng lẻ"
                        />
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-amber-100">
                      <ScanInput 
                        id="location-input"
                        label="Vị trí thực tế (VD: A-001-01 hoặc AA-001-01)" 
                        value={location} 
                        onChange={setLocation} 
                        onScanClick={() => setScanningField('location')} 
                        placeholder="Nhập hoặc quét mã..."
                        disabled={false}
                      />

                      <div id="quantity-input" className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng tại vị trí này</label>
                        <input 
                          type="number" 
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          disabled={false}
                          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all disabled:bg-gray-50"
                          placeholder="Nhập số lượng..."
                        />
                      </div>

                      <button 
                        onClick={addLocationPair}
                        disabled={false}
                        className="w-full py-2.5 bg-amber-50 text-amber-700 rounded-xl border border-dashed border-amber-300 hover:bg-amber-100 transition-colors flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50 mt-3"
                      >
                        <Plus size={18} /> Thêm vị trí & số lượng này
                      </button>

                      {multiLocations.length > 0 && (
                        <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 space-y-2 mt-2">
                          <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Danh sách vị trí đã thêm:</h4>
                          {multiLocations.map((pair, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-amber-200 shadow-sm">
                              <span className="text-sm font-bold text-gray-700">{pair.location} <span className="text-amber-600 mx-1">→</span> {pair.quantity}</span>
                              <button onClick={() => removeLocationPair(idx)} className="text-red-500 p-1 hover:bg-red-50 rounded-md transition-colors">
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-3">
                        <ScanInput 
                          id="transfer-to-location-input"
                          label="Vị trí chuyển đến (Chuyển kho)" 
                          value={transferToLocation} 
                          onChange={setTransferToLocation} 
                          onScanClick={() => setScanningField('transferToLocation')} 
                          placeholder="Nhập hoặc quét mã chuyển đến..."
                          disabled={false}
                        />
                      </div>
                      
                      <div id="note-input" className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                        <textarea 
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          rows={3}
                          disabled={false}
                          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none transition-all disabled:bg-gray-50"
                          placeholder="Nhập ghi chú..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
            {currentScreen === 'soan_hang' && (
              <>
                <div className="pb-2">
                  <button 
                    onClick={() => triggerImport('soan')}
                    className="w-full py-2.5 bg-white border border-blue-200 text-blue-600 text-sm font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors shadow-sm"
                  >
                    <Upload size={18} />
                    Tải đơn soạn (.csv)
                  </button>
                </div>
                <div className="pb-2">
                  <button
                    id="btn-scan-product"
                    onClick={() => setScanningField('productQR')}
                    className="w-full py-3 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors border"
                  >
                    <QrCode size={20} /> Quét QR sản phẩm cần soạn
                  </button>
                </div>

                <div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí mã hàng</label>
                    <textarea 
                      value={productLocation}
                      onChange={(e) => setProductLocation(e.target.value)}
                      disabled={false}
                      rows={8}
                      className="w-full p-3 border border-gray-300 rounded-xl outline-none resize-none transition-all"
                      placeholder="Trích xuất từ QR..."
                    />
                  </div>

                  <ScanInput 
                    id="product-name-display"
                    label="Tên sản phẩm" 
                    value={productName} 
                    onChange={setProductName} 
                    onScanClick={() => {}} 
                    placeholder="Tên sản phẩm"
                    disabled={false}
                  />

                  <ScanInput 
                    id="location-input"
                    label="Vị trí thực tế (VD: A-001-01 hoặc AA-001-01)" 
                    value={location} 
                    onChange={setLocation} 
                    onScanClick={() => setScanningField('location')} 
                    placeholder="Nhập hoặc quét mã..."
                    disabled={false}
                  />
                  
                  <div id="quantity-input">
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Số lượng thực tế tại vị trí này
                        </label>
                        <input 
                          type="number" 
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          disabled={false}
                          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50"
                          placeholder="Nhập số lượng..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Trọng lượng hàng/ĐVT</label>
                        <input 
                          type="text" 
                          value={trongLuong}
                          onChange={(e) => setTrongLuong(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="VD: 0.5kg/cái"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={addLocationPair}
                    disabled={!productName.trim() && !editingId}
                    className="w-full py-2.5 bg-blue-50 text-blue-700 rounded-xl border border-dashed border-blue-300 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50"
                  >
                    <Plus size={18} /> Thêm vị trí & số lượng này
                  </button>

                  {multiLocations.length > 0 && (
                    <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-2 mt-2">
                      <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Danh sách vị trí đã thêm:</h4>
                      {multiLocations.map((pair, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-blue-200 shadow-sm">
                          <span className="text-sm font-bold text-gray-700">{pair.location} <span className="text-blue-600 mx-1">→</span> {pair.quantity}</span>
                          <button onClick={() => removeLocationPair(idx)} className="text-red-500 p-1 hover:bg-red-50 rounded-md transition-colors">
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <button 
            id="btn-add-record"
            onClick={handleAddOrUpdateRecord}
            disabled={(!productName.trim() && !editingId) || (multiLocations.length === 0 && (!location && !quantity && !(currentScreen === 'xuat_hang' && slThucXuat)))}
            className={`w-full mt-4 py-3 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors ${
              ((!productName.trim() && !editingId) || (multiLocations.length === 0 && (!location && !quantity && !(currentScreen === 'xuat_hang' && slThucXuat))))
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : editingId 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' 
                  : currentScreen === 'nhap_hang'
                    ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                    : currentScreen === 'xuat_hang'
                      ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
            }`}
          >
            {editingId ? (
              currentScreen === 'xuat_hang' ? (
                <><Check size={20} /> Xác nhận số lượng với chi tiết hàng này</>
              ) : (
                <><Save size={20} /> Cập nhật bản ghi</>
              )
            ) : (
              currentScreen === 'xuat_hang' ? (
                <><Check size={20} /> Xác nhận số lượng với chi tiết hàng này</>
              ) : (
                <><Plus size={20} /> Thêm vào danh sách</>
              )
            )}
          </button>
          
          {/* Display extracted fields below the button */}
          {currentScreen !== 'xuat_hang' && maBravo && (
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
                <div className="flex justify-between border-b border-gray-100 p-2 items-center bg-blue-600 text-white rounded-lg mb-1">
                  <span className="font-medium">SL Thực Xuất (cái):</span>
                  <span className="font-bold text-lg">{slThucXuat} {dvt}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Qui cách (Bao/Cây):</span>
                  <span className="font-medium text-gray-900">{quiCach}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 p-2 items-center bg-blue-600 text-white rounded-lg mb-1">
                  <span className="font-medium">SL (Bao/Cây):</span>
                  <span className="font-bold text-lg">{slBaoCay}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">SL Lẻ:</span>
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

        {availableOrders.length > 0 && (
          <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-white/20">
            <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${
              currentScreen === 'nhap_hang' ? 'text-amber-500' : currentScreen === 'xuat_hang' ? 'text-purple-500' : 'text-blue-500'
            }`}>
              {currentScreen === 'nhap_hang' ? 'Đợt nhập đang thực hiện:' : 'Đơn hàng đang thực hiện:'}
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
              {availableOrders.map(order => (
                <button
                  key={order}
                  onClick={() => setActiveOrderNumber(order)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                    order === activeOrderNumber 
                      ? currentScreen === 'nhap_hang'
                        ? 'bg-amber-500 text-white border-transparent shadow-md scale-105'
                        : currentScreen === 'xuat_hang'
                          ? 'bg-purple-600 text-white border-transparent shadow-md scale-105'
                          : 'bg-blue-600 text-white border-transparent shadow-md scale-105'
                      : currentScreen === 'nhap_hang'
                        ? 'bg-white border-amber-200 text-amber-600 hover:border-amber-400'
                        : currentScreen === 'xuat_hang'
                          ? 'bg-white border-purple-200 text-purple-600 hover:border-purple-400'
                          : 'bg-white border-blue-200 text-blue-600 hover:border-blue-400'
                  }`}
                >
                  {order}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Records Review Table */}
        <div id="review-section" className="bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-white/20">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <FileText size={18} className="text-gray-500" /> 
              {currentScreen === 'nhap_hang' ? 'Duyệt đợt nhập này' : 'Duyệt đơn này'}
            </h2>
            {currentOrderRecords.length > 0 && (
              <button 
                onClick={() => {
                  showConfirm(`Bạn có chắc muốn xóa TẤT CẢ dữ liệu của ${currentScreen === 'nhap_hang' ? 'đợt nhập' : 'đơn hàng'} này?`, () => {
                    setRecords(prev => {
                      const updated = prev.filter(r => r.orderNumber !== activeOrderNumber);
                      localStorage.setItem('qr_scanner_records', JSON.stringify(updated));
                      return updated;
                    });
                    handleCancelEdit();
                    setCurrentPage(1);
                    showToast(`Đã xóa toàn bộ ${currentScreen === 'nhap_hang' ? 'đợt nhập' : 'đơn hàng'}!`);
                  });
                }}
                className="text-sm text-red-500 hover:text-red-700 font-medium"
              >
                {currentScreen === 'nhap_hang' ? 'Xóa đợt nhập này' : 'Xóa đơn này'}
              </button>
            )}
          </div>
          
          {currentOrderRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {currentScreen === 'nhap_hang' ? 'Đợt nhập này chưa có dữ liệu.' : 'Đơn hàng này chưa có dữ liệu.'}<br/>Hãy quét mã và thêm vào danh sách.
            </div>
          ) : (
            <div>
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mb-4 px-2 pb-2 border-b border-gray-100">
                  <button 
                    onClick={() => setCurrentPage(p => p === 1 ? totalPages : p - 1)}
                    className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm text-gray-600 font-medium">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(p => p === totalPages ? 1 : p + 1)}
                    className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
              
              <div className="overflow-x-auto overflow-y-auto" style={{ height: '600px' }}>
                <table className="w-full text-sm text-left relative">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-2 py-3 w-10 text-center">STT</th>
                      <th className="px-2 py-3">Tên hàng</th>
                      <th className="px-2 py-3 text-center">Trạng thái</th>
                      <th className="px-2 py-3 text-right">Sửa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((record, index) => {
                      const isPicked = (record.multiLocations && record.multiLocations.length > 0) || (record.location && record.quantity);
                      const stt = (currentPage - 1) * itemsPerPage + index + 1;
                      return (
                        <tr key={record.id} className="bg-white border-b hover:bg-gray-50 h-[100px]">
                          <td className="px-2 py-3 text-center text-gray-500">{stt}</td>
                          <td className="px-2 py-3 font-medium text-gray-900">
                            <div className="line-clamp-2 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: '2.5rem' }} title={record.productName}>
                              {record.productName}
                            </div>
                          </td>
                          <td className="px-2 py-3 text-center">
                            {isPicked ? (
                              <div className="flex justify-center">
                                <Check size={18} className="text-green-600" />
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-2 py-3 text-right">
                            <button 
                              onClick={() => handleEdit(record)}
                              className="text-blue-600 hover:text-blue-800 p-1 inline-flex justify-center items-center"
                            >
                              <Edit size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>


      {/* Fixed Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-white/20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-md mx-auto flex gap-3">
          <button 
            id="btn-save-csv"
            onClick={handleDownload}
            disabled={currentOrderRecords.length === 0}
            className={`flex-1 py-3.5 disabled:bg-gray-300 disabled:text-gray-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${
              currentScreen === 'nhap_hang' ? 'bg-amber-500 hover:bg-amber-600' : currentScreen === 'xuat_hang' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <FileDown size={20} /> 
            Xuất CSV
          </button>
          <button 
            id="btn-save-pdf"
            onClick={handleDownloadPDF}
            disabled={currentOrderRecords.length === 0}
            className={`flex-1 py-3.5 disabled:bg-gray-300 disabled:text-gray-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${
              currentScreen === 'nhap_hang' ? 'bg-amber-600 hover:bg-amber-700' : currentScreen === 'xuat_hang' ? 'bg-purple-700 hover:bg-purple-800' : 'bg-blue-700 hover:bg-blue-800'
            }`}
          >
            <FileText size={20} /> 
            Xuất PDF
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
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImportCSV} 
        accept=".csv" 
        className="hidden" 
      />
    </div>
  );
}

function CustomModal({ modal, onClose }: { modal: ModalState, onClose: () => void }) {
  if (!modal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-white/20">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{modal.title}</h3>
        <p className="text-gray-600 mb-6">{modal.message}</p>
        <div className="flex flex-wrap justify-end gap-3">
          {(modal.type === 'confirm' || modal.type === 'three-way') && (
            <button 
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
            >
              {modal.cancelText || 'Hủy'}
            </button>
          )}
          {modal.type === 'three-way' && (
            <button 
              onClick={() => {
                if (modal.onSecondary) modal.onSecondary();
                onClose();
              }}
              className="px-4 py-2 bg-gray-200 text-gray-800 hover:bg-gray-300 rounded-xl font-medium transition-colors"
            >
              {modal.secondaryText || 'Không lưu'}
            </button>
          )}
          <button 
            onClick={() => {
              if (modal.onConfirm) modal.onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-medium transition-colors"
          >
            {modal.type === 'alert' ? 'Đóng' : (modal.confirmText || 'Đồng ý')}
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
