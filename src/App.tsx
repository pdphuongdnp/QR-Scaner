import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useState, useEffect, useRef } from 'react';
import { format, parse } from 'date-fns';
import { QrCode, Plus, Download, Trash2, FileText, ShoppingCart, ChevronLeft, ChevronRight, Edit, X, History, Save, Home, HelpCircle, Info, Maximize, LogOut, Layers, Upload } from 'lucide-react';
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
  thongTinMaHang?: string;
  nhanVienQuanHang?: string;
  trongLuong?: string;
  taiTrongXe?: string;
  vehicleNumber?: string; // For xuat_hang
  pxkNumber?: string; // For xuat_hang
  customerName?: string; // For xuat_hang
  deliveryAddress?: string; // For xuat_hang
}

type ScanField = 'orderNumber' | 'pickerName' | 'location' | 'productName' | 'productQR' | 'welcomeOrderQR' | 'transferToLocation' | null;

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
  const [importType, setImportType] = useState<'soan' | 'nhap' | null>(null);

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
  const [records, setRecords] = useState<Record[]>(() => {
    const saved = localStorage.getItem('qr_scanner_records');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeOrderNumber, setActiveOrderNumber] = useState(() => {
    return localStorage.getItem('qr_scanner_active_order') || '';
  });
  const [orderNumberInput, setOrderNumberInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pickerName, setPickerName] = useState(() => {
    return localStorage.getItem('qr_scanner_picker_name') || '';
  });
  const [importedFiles, setImportedFiles] = useState<{name: string, lastModified: number, size: number}[]>(() => {
    const saved = localStorage.getItem('qr_scanner_imported_files');
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
    localStorage.setItem('qr_scanner_records', JSON.stringify(records));
  }, [records]);

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
      r.orderNumber === activeOrderNumber && 
      r.type === currentScreen
    )
    .sort((a, b) => b.createdAt - a.createdAt);

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

            return {
              id: crypto.randomUUID(),
              type,
              orderNumber,
              pickerName: getValue(['Người soạn/nhập', 'Người soạn', 'Người nhập', 'Picker Name']) || pickerName || 'Admin',
              location: getValue(['Vị trí thực tế', 'Vị trí', 'Location']) || '',
              productLocation: infoMaHang || '',
              thongTinMaHang: infoMaHang || '',
              productName: getValue(['Tên sản phẩm', 'Tên hàng', 'Product Name']) || '',
              quantity: getValue(['Số lượng thực tế', 'Số lượng', 'Quantity']) || '',
              note: getValue(['Ghi chú', 'Ghi chú nhập', 'Note']) || '',
              transferToLocation: getValue(['Vị trí chuyển đến', 'Transfer To']) || '',
              createdAt,
              maBravo: getValue(['Mã Bravo', 'Mã hàng', 'Mã sản phẩm', 'Code']) || '',
              khachHang: getValue(['Khách hàng', 'Customer']) || '',
              customerName: getValue(['Khách hàng', 'Customer', 'Tên khách hàng']) || '',
              dvt: getValue(['ĐVT', 'Unit']) || '',
              slThucXuat: getValue(['SL Thực Xuất (cái)', 'SL Thực Xuất(cái)', 'SL Thực Xuất']) || '',
              quiCach: getValue(['Qui cách (Bao/Cây)', 'Qui cách(Bao/Cây)', 'Qui cách']) || '',
              slBaoCay: getValue(['SL (Bao/Cây)', 'SL(Bao/Cây)', 'Số lượng bao/cây']) || '',
              slLe: getValue(['SL Lẻ', 'Số lượng lẻ']) || '',
              nhanVienQuanHang: getValue(['Nhân viên quản hàng']) || '',
              trongLuong: getValue(['Trọng lượng(kg)', 'Trọng lượng']) || '',
              taiTrongXe: getValue(['Tải trọng xe(kg)', 'Tải trọng']) || '',
              vehicleNumber: getValue(['Số xe VC', 'Số xe vận chuyển', 'Vehicle Number']) || '',
              pxkNumber: getValue(['Số PXK', 'PXK Number']) || '',
              deliveryAddress: getValue(['ĐC Nhận hàng', 'Địa chỉ giao hàng', 'Delivery Address']) || ''
            };
          });

          if (importedRecords.length > 0) {
            // Map to store the final order number for each unique order number in the imported file
            const orderNumberMap: { [key: string]: string } = {};
            const uniqueImportedOrders = Array.from(new Set(importedRecords.map(r => r.orderNumber)));
            const existingOrders = Array.from(new Set(records.map(r => r.orderNumber)));
            const usedInThisImport = new Set<string>();

            uniqueImportedOrders.forEach(originalOrder => {
              if (!originalOrder) {
                orderNumberMap[originalOrder] = '';
                return;
              }

              if (!existingOrders.includes(originalOrder) && !usedInThisImport.has(originalOrder)) {
                orderNumberMap[originalOrder] = originalOrder;
                usedInThisImport.add(originalOrder);
              } else {
                // Find the next available suffix
                let suffix = 1;
                let newOrder = `${originalOrder}-${suffix}`;
                while (existingOrders.includes(newOrder) || usedInThisImport.has(newOrder)) {
                  suffix++;
                  newOrder = `${originalOrder}-${suffix}`;
                }
                orderNumberMap[originalOrder] = newOrder;
                usedInThisImport.add(newOrder);
              }
            });

            // Apply the mapped order numbers to the imported records
            const finalImportedRecords = importedRecords.map(r => ({
              ...r,
              orderNumber: orderNumberMap[r.orderNumber] || r.orderNumber
            }));

            setRecords(prev => [...prev, ...finalImportedRecords]);
            setImportedFiles(prev => [...prev, fileInfo]);
            
            // Automatically select the first new order and switch to the correct screen
            const firstNewRecord = finalImportedRecords.find(r => r.orderNumber);
            if (firstNewRecord) {
              setActiveOrderNumber(firstNewRecord.orderNumber);
              setOrderNumberInput(firstNewRecord.orderNumber);
              // If picker name is empty, try to set it from the imported record
              if (!pickerName && firstNewRecord.pickerName) {
                setPickerName(firstNewRecord.pickerName);
              }
              setCurrentScreen(firstNewRecord.type);
              showToast(`Đã nhập ${importedRecords.length} bản ghi. Đang mở đơn ${firstNewRecord.orderNumber}...`);
            } else {
              showToast(`Đã nhập thành công ${importedRecords.length} bản ghi!`);
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

  const addLocationPair = () => {
    if (!location || !quantity) {
      showAlert('Vui lòng nhập đầy đủ Vị trí và Số lượng');
      return;
    }
    if (!/^[A-Z]{1,2}-\d{3}-\d{2}$/.test(location)) {
      showAlert('Vị trí không đúng định dạng (VD: A-001-01 hoặc AA-001-01)');
      return;
    }
    setMultiLocations([...multiLocations, { location, quantity }]);
    setLocation('');
    setQuantity('');
  };

  const removeLocationPair = (index: number) => {
    setMultiLocations(multiLocations.filter((_, i) => i !== index));
  };

  const handleAddOrUpdateRecord = () => {
    let finalMultiLocations = [...multiLocations];
    // If there's leftover data in the inputs, add it to multiLocations automatically
    if (location && quantity && /^[A-Z]{1,2}-\d{3}-\d{2}$/.test(location)) {
      finalMultiLocations.push({ location, quantity });
    }

    if (finalMultiLocations.length === 0) {
      showAlert('Vui lòng thêm ít nhất một vị trí và số lượng (bấm nút "Thêm vị trí" hoặc nhập đầy đủ)');
      return;
    }

    if (!productName.trim()) {
      showAlert('Vui lòng nhập hoặc quét tên sản phẩm');
      return;
    }
    
    if (editingId) {
      // Update existing record
      setRecords(records.map(r => 
        r.id === editingId 
          ? { ...r, pickerName, location: finalMultiLocations[0].location, productLocation, productName, quantity: finalMultiLocations[0].quantity, multiLocations: finalMultiLocations, note, transferToLocation, maBravo, khachHang, dvt, slThucXuat, quiCach, slBaoCay, slLe, thongTinMaHang, nhanVienQuanHang, trongLuong, taiTrongXe, vehicleNumber, pxkNumber, customerName, deliveryAddress } 
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
        maBravo, khachHang, dvt, slThucXuat, quiCach, slBaoCay, slLe, thongTinMaHang, nhanVienQuanHang, trongLuong, taiTrongXe,
        vehicleNumber, // Add vehicle number for xuat_hang
        pxkNumber,
        customerName,
        deliveryAddress
      };
      setRecords([...records, newRecord]);
      setReviewIndex(99999); // Jump to the newly added record (clamped by useEffect)
      showToast('Đã thêm bản ghi mới!');
      
      // Ask if user wants to scan another item
      let message = 'Bạn có muốn soạn mã hàng khác không?';
      if (currentScreen === 'nhap_hang') message = 'Bạn có muốn nhập mã vị trí nhập hàng khác không?';
      if (currentScreen === 'xuat_hang') message = 'Bạn có muốn xuất mã hàng khác không?';
      
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

  const generateXuatKhoPDF = () => {
    if (currentOrderRecords.length === 0) {
      showAlert('Không có dữ liệu để xuất PDF');
      return;
    }

    const doc = new jsPDF();
    
    // Basic Vietnamese support in jsPDF is tricky without custom fonts, 
    // but let's try to use standard ones.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('PHIEU XUAT KHO', 105, 15, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`So PXK: ${pxkNumber || 'N/A'}`, 15, 25);
    doc.text(`Ngay: ${format(new Date(), 'dd/MM/yyyy')}`, 15, 30);
    doc.text(`Khach hang: ${customerName || 'N/A'}`, 15, 35);
    doc.text(`Dia chi: ${deliveryAddress || 'N/A'}`, 15, 40);
    doc.text(`So xe: ${vehicleNumber || 'N/A'}`, 15, 45);
    doc.text(`Nguoi xuat: ${pickerName || 'N/A'}`, 15, 50);

    const tableData = currentOrderRecords.map((r, index) => [
      index + 1,
      r.maBravo || '',
      r.productName || '',
      r.dvt || '',
      r.quantity || '',
      r.location || '',
      r.note || ''
    ]);

    (doc as any).autoTable({
      startY: 55,
      head: [['STT', 'Ma hang', 'Ten hang', 'DVT', 'S.Luong', 'Vi tri', 'Ghi chu']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 25 },
        2: { cellWidth: 50 },
        3: { cellWidth: 15 },
        4: { cellWidth: 20 },
        5: { cellWidth: 25 },
        6: { cellWidth: 35 }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text('Nguoi nhan hang', 40, finalY);
    doc.text('(Ky, ho ten)', 40, finalY + 5);
    
    doc.text('Nguoi xuat kho', 140, finalY);
    doc.text('(Ky, ho ten)', 140, finalY + 5);

    doc.save(`Phieu_Xuat_Kho_${activeOrderNumber}.pdf`);
    showToast('Đã xuất file PDF thành công!');
  };

  const handleDownload = () => {
    if (currentOrderRecords.length === 0) {
      showAlert('Không có dữ liệu để tải xuống');
      return;
    }

    if (currentScreen === 'xuat_hang') {
      generateXuatKhoPDF();
      // Continue to CSV export to support Power Query as requested
    }

    const escapeCSV = (str: string) => {
      if (!str) return '';
      const stringified = String(str);
      if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
        return '"' + stringified.replace(/"/g, '""') + '"';
      }
      return stringified;
    };

    // Format:
    // 1. Nhập: N_ddMMMyy_hhmmss_tên người nhập
    // 2. Soạn: S_số đơn hàng_ddMMMyy_hhmmss_tên người soạn
    // 3. Xuất: X_số đơn hàng_ddMMMyy_hhmmss_tên người xuất
    const isNhap = currentOrderRecords.some(r => r.type === 'nhap_hang');
    const isXuat = currentOrderRecords.some(r => r.type === 'xuat_hang');
    const now = new Date();
    const timestamp = format(now, 'ddMMMyy_HHmmss');
    const fileCreationTime = format(now, 'dd/MM/yyyy HH:mm:ss');
    let fileName = '';
    
    if (isNhap) {
      fileName = `NF_${timestamp}_${pickerName}.csv`;
    } else if (isXuat) {
      fileName = `XF_${activeOrderNumber}_${timestamp}_${pickerName}.csv`;
    } else {
      fileName = `SF_${activeOrderNumber}_${timestamp}_${pickerName}.csv`;
    }
    
    // Create content (comma separated)
    const header = [
      'STT', 'Ngày', 'Mã Bravo', 'Tên sản phẩm', 'Khách hàng', 'ĐC Nhận hàng', 
      'Số PXK', 'Số xe VC', 'Đơn hàng', 'ĐVT', 'SL Thực Xuất(cái)', 
      'Qui cách(Bao/Cây)', 'SL (Bao/Cây)', 'SL Lẻ', 'Thông tin mã hàng', 
      'Nhân viên quản hàng', 'Trọng lượng( kg)', 'Tải trọng xe(kg)',
      'Vị trí chuyển đến', 'Người soạn/nhập', 'Vị trí thực tế', 'Số lượng thực tế', 'Loại', 'Ghi chú', 'Ngày giờ tạo file'
    ].map(escapeCSV).join(',');
    
    let stt = 1;
    const rows = currentOrderRecords.flatMap(r => {
      // If there are multiple locations, create a row for each
      if (r.multiLocations && r.multiLocations.length > 0) {
        return r.multiLocations.map(pair => [
          stt++,
          format(r.createdAt, 'dd/MM/yyyy'),
          r.maBravo || '', 
          r.productName || '', 
          r.khachHang || r.customerName || '',
          r.deliveryAddress || '',
          r.pxkNumber || '',
          r.vehicleNumber || '',
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
          pair.location || '', 
          pair.quantity || '',
          r.type === 'nhap_hang' ? 'Nhập hàng' : (r.type === 'xuat_hang' ? 'Xuất hàng' : 'Soạn hàng'),
          r.note || '',
          fileCreationTime
        ]);
      }
      
      // Fallback for single location or legacy records
      return [[
        stt++,
        format(r.createdAt, 'dd/MM/yyyy'),
        r.maBravo || '', 
        r.productName || '', 
        r.khachHang || r.customerName || '',
        r.deliveryAddress || '',
        r.pxkNumber || '',
        r.vehicleNumber || '',
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
        r.type === 'nhap_hang' ? 'Nhập hàng' : (r.type === 'xuat_hang' ? 'Xuất hàng' : 'Soạn hàng'),
        r.note || '',
        fileCreationTime
      ]];
    }).map(row => row.map(escapeCSV).join(','));

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

  // Calculate orders for Welcome screen
  // Show all unique order numbers, sorted by newest first
  const allOrders = Array.from(new Set(records.map(r => r.orderNumber)))
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = records.find(r => r.orderNumber === a)?.createdAt || 0;
      const bTime = records.find(r => r.orderNumber === b)?.createdAt || 0;
      return bTime - aTime;
    }) as string[];

  const handleStartOrder = (order: string) => {
    if (!order || !pickerName) {
      showAlert('Vui lòng nhập đầy đủ Số đơn hàng và Người soạn');
      return;
    }
    
    const exists = records.some(r => r.orderNumber === order && r.type === 'soan_hang');
    if (exists) {
      showConfirm(`Số đơn hàng "${order}" đã tồn tại trong dữ liệu. Bạn có muốn tiếp tục nhập thêm vào đơn này không?`, () => {
        setActiveOrderNumber(order);
        setOrderNumberInput(order);
        setCurrentScreen('soan_hang');
      });
      return;
    }
    
    setActiveOrderNumber(order);
    setOrderNumberInput(order);
    setCurrentScreen('soan_hang');
  };

  const handleStartXuatHang = (order: string) => {
    if (!order || !pickerName) {
      showAlert('Vui lòng nhập đầy đủ Số đơn hàng và Người xuất');
      return;
    }
    
    const exists = records.some(r => r.orderNumber === order && r.type === 'xuat_hang');
    if (exists) {
      showConfirm(`Số đơn hàng "${order}" đã tồn tại trong dữ liệu xuất. Bạn có muốn tiếp tục không?`, () => {
        setActiveOrderNumber(order);
        setOrderNumberInput(order);
        setCurrentScreen('xuat_hang');
      });
      return;
    }
    
    setActiveOrderNumber(order);
    setOrderNumberInput(order);
    setCurrentScreen('xuat_hang');
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
    if (existingRecord?.type === 'xuat_hang') {
      setCurrentScreen('xuat_hang');
    } else {
      setCurrentScreen(existingRecord?.type === 'nhap_hang' ? 'nhap_hang' : 'soan_hang');
    }
  };

  const triggerImport = (type: 'soan' | 'nhap') => {
    setImportType(type);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
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
        <div className="relative bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/20 w-full max-w-md space-y-6 text-center">
          {/* Exit button for Welcome screen */}
          <button 
            id="btn-exit"
            onClick={handleExitApp}
            className="absolute -top-4 -right-4 p-3 bg-red-500 text-white rounded-2xl shadow-lg hover:bg-red-600 hover:scale-110 active:scale-95 transition-all animate-pulse-red border-2 border-red-400 flex flex-col items-center min-w-[50px] z-10"
            title="Thoát"
          >
            <LogOut size={20} />
            <span className="text-[8px] font-black uppercase">Thoát</span>
          </button>
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
              id="btn-xuat-hang"
              onClick={() => handleStartXuatHang(orderNumberInput)}
              disabled={!orderNumberInput || !pickerName}
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

            <button 
              onClick={toggleFullScreen}
              className="w-full py-3.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Maximize size={20} className="text-gray-600" />
              Toàn màn hình
            </button>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportCSV} 
              accept=".csv" 
              className="hidden" 
            />
          </div>

          {/* Orders List */}
          {allOrders.length > 0 && (
            <div className="mt-8 text-left w-full border-t border-gray-100 pt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                <History size={16} /> Danh sách đơn hàng
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {allOrders.map(order => (
                  <button
                    key={order}
                    onClick={() => handleResumeOrder(order)}
                    className="w-full p-3 bg-gray-50 hover:bg-blue-50 border border-gray-100 rounded-xl text-left flex items-center justify-between group transition-colors"
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="font-medium text-gray-700 group-hover:text-blue-700 truncate">{order}</span>
                      <span className="text-xs text-gray-400">
                        {format(records.find(r => r.orderNumber === order)?.createdAt || Date.now(), 'dd/MM/yyyy HH:mm')}
                      </span>
                    </div>
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
        {/* Xuất hàng specific fields */}
        {currentScreen === 'xuat_hang' && (
          <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-purple-200 space-y-4">
            <h3 className="font-bold text-purple-700 flex items-center gap-2 border-b border-purple-100 pb-2">
              <FileText size={18} /> Thông tin vận chuyển
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số PXK</label>
                <input 
                  type="text" 
                  value={pxkNumber}
                  onChange={(e) => setPxkNumber(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Nhập số PXK..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng</label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Tên khách hàng..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ giao hàng</label>
                <input 
                  type="text" 
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Địa chỉ..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số xe vận chuyển</label>
                <input 
                  type="text" 
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Nhập số xe..."
                />
              </div>
            </div>
          </div>
        )}

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
                <div className="pb-2">
                  <button 
                    onClick={() => triggerImport('nhap')}
                    className="w-full py-2.5 bg-white border border-gray-200 text-amber-600 text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-amber-50 transition-colors shadow-sm"
                  >
                    <Upload size={16} />
                    Tải đơn nhập (.csv)
                  </button>
                </div>
                <div className="pb-2">
                  <button
                    onClick={() => setScanningField('productQR')}
                    className="w-full py-3 bg-amber-100 text-amber-700 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-amber-200 transition-colors border border-amber-200"
                  >
                    <QrCode size={20} /> Quét QR sản phẩm (nếu có)
                  </button>
                </div>

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

                <div className={!productName.trim() && !editingId ? 'opacity-50 pointer-events-none' : ''}>
                  <ScanInput 
                    id="location-input"
                    label="3. Vị trí thực tế (VD: A-001-01 hoặc AA-001-01)" 
                    value={location} 
                    onChange={setLocation} 
                    onScanClick={() => setScanningField('location')} 
                    placeholder="Nhập hoặc quét mã..."
                    disabled={!productName.trim() && !editingId}
                  />

                  <div id="quantity-input">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng tại vị trí này</label>
                    <input 
                      type="number" 
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      disabled={!productName.trim() && !editingId}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all disabled:bg-gray-50"
                      placeholder="Nhập số lượng..."
                    />
                  </div>

                  <button 
                    onClick={addLocationPair}
                    disabled={!productName.trim() && !editingId}
                    className="w-full py-2.5 bg-amber-50 text-amber-700 rounded-xl border border-dashed border-amber-300 hover:bg-amber-100 transition-colors flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50"
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

                  <ScanInput 
                    id="transfer-to-location-input"
                    label="4. Vị trí chuyển đến (Chuyển kho)" 
                    value={transferToLocation} 
                    onChange={setTransferToLocation} 
                    onScanClick={() => setScanningField('transferToLocation')} 
                    placeholder="Nhập hoặc quét mã chuyển đến..."
                    disabled={!productName.trim() && !editingId}
                  />
                  
                  <div id="note-input">
                    <label className="block text-sm font-medium text-gray-700 mb-1">6. Ghi chú</label>
                    <textarea 
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      disabled={!productName.trim() && !editingId}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none transition-all disabled:bg-gray-50"
                      placeholder="Nhập ghi chú..."
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="pb-2">
                  <button 
                    onClick={() => triggerImport('soan')}
                    className={`w-full py-2.5 bg-white border border-gray-200 ${currentScreen === 'xuat_hang' ? 'text-purple-600 hover:bg-purple-50' : 'text-blue-600 hover:bg-blue-50'} text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm`}
                  >
                    <Upload size={16} />
                    Tải đơn soạn (.csv)
                  </button>
                </div>
                <div className="pb-2">
                  <button
                    id="btn-scan-product"
                    onClick={() => setScanningField('productQR')}
                    className={`w-full py-3 ${currentScreen === 'xuat_hang' ? 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'} font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors border`}
                  >
                    <QrCode size={20} /> {currentScreen === 'xuat_hang' ? 'Quét QR sản phẩm cần xuất' : 'Quét QR sản phẩm cần soạn'}
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
                
                <div className={!productName.trim() && !editingId ? 'opacity-50 pointer-events-none' : ''}>
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
                    label="5. Vị trí thực tế (VD: A-001-01 hoặc AA-001-01)" 
                    value={location} 
                    onChange={setLocation} 
                    onScanClick={() => setScanningField('location')} 
                    placeholder="Nhập hoặc quét mã..."
                    disabled={!productName.trim() && !editingId}
                  />
                  
                  <div id="quantity-input">
                    <label className="block text-sm font-medium text-gray-700 mb-1">6. Số lượng thực tế tại vị trí này</label>
                    <input 
                      type="number" 
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      disabled={!productName.trim() && !editingId}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50"
                      placeholder="Nhập số lượng..."
                    />
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
            disabled={(!productName.trim() && !editingId) || (multiLocations.length === 0 && (!location || !quantity))}
            className={`w-full mt-4 py-3 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors ${
              ((!productName.trim() && !editingId) || (multiLocations.length === 0 && (!location || !quantity)))
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

        {/* Records Review Carousel */}
        <div id="review-section" className="bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-white/20">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <FileText size={18} className="text-gray-500" /> 
              {currentScreen === 'nhap_hang' ? 'Duyệt đợt nhập này' : 'Duyệt đơn này'} {currentOrderRecords.length > 0 ? `(${safeReviewIndex + 1}/${currentOrderRecords.length})` : '(0)'}
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
            <div className="space-y-4">
              {/* Current Record Card */}
              <div className={`p-4 border rounded-xl space-y-2 text-sm transition-colors h-[450px] overflow-y-auto ${
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
                {currentScreen === 'xuat_hang' && (
                  <>
                    <div className="flex justify-between border-b border-black/5 pb-2">
                      <span className="text-gray-500">Số PXK:</span>
                      <span className="font-medium text-gray-900">{currentRecord?.pxkNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between border-b border-black/5 pb-2">
                      <span className="text-gray-500">Khách hàng:</span>
                      <span className="font-medium text-gray-900">{currentRecord?.customerName || '-'}</span>
                    </div>
                    <div className="flex justify-between border-b border-black/5 pb-2">
                      <span className="text-gray-500">Địa chỉ:</span>
                      <span className="font-medium text-gray-900">{currentRecord?.deliveryAddress || '-'}</span>
                    </div>
                    <div className="flex justify-between border-b border-black/5 pb-2">
                      <span className="text-gray-500">Số xe:</span>
                      <span className="font-medium text-gray-900">{currentRecord?.vehicleNumber || '-'}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between border-b border-black/5 pb-2">
                  <span className="text-gray-500">Tên hàng:</span>
                  <span className="font-medium text-gray-900">{currentRecord?.productName || '-'}</span>
                </div>
                {currentScreen !== 'nhap_hang' && (
                  <>
                    <div className="flex justify-between border-b border-black/5 p-2 items-center bg-blue-600 text-white rounded-lg mb-1">
                      <span className="font-medium">SL Thực Xuất (cái):</span>
                      <span className="font-bold text-lg">
                        {currentRecord?.slThucXuat || '-'} {currentRecord?.slThucXuat ? currentRecord?.dvt : ''}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-black/5 pb-2">
                      <span className="text-gray-500">Qui cách (Bao/Cây):</span>
                      <span className="font-medium text-gray-900">{currentRecord?.quiCach || '-'}</span>
                    </div>
                    <div className="flex justify-between border-b border-black/5 p-2 items-center bg-blue-600 text-white rounded-lg mb-1">
                      <span className="font-medium">SL (Bao/Cây):</span>
                      <span className="font-bold text-lg">
                        {currentRecord?.slBaoCay || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-black/5 pb-2">
                      <span className="text-gray-500">SL Lẻ:</span>
                      <span className="font-medium text-gray-900">{currentRecord?.slLe || '-'}</span>
                    </div>
                  </>
                )}
                {/* Multi-location display in Review */}
                {currentRecord?.multiLocations && currentRecord.multiLocations.length > 0 ? (
                  <div className="border-b border-black/5 pb-2">
                    <span className="text-gray-500 block mb-1">Vị trí & Số lượng thực tế:</span>
                    <div className="space-y-1">
                      {currentRecord.multiLocations.map((pair, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white/50 px-2 py-1 rounded border border-black/5">
                          <span className="font-medium text-gray-700">{pair.location}</span>
                          <span className={`font-bold ${currentScreen === 'nhap_hang' ? 'text-amber-700' : 'text-blue-600'}`}>
                            {pair.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between border-b border-black/5 pb-2">
                      <span className="text-gray-500">Vị trí thực tế:</span>
                      <span className="font-medium text-gray-900">{currentRecord?.location || '-'}</span>
                    </div>
                    <div className={`flex justify-between pt-1 items-center ${currentScreen === 'nhap_hang' && currentRecord?.note ? 'border-b border-black/5 pb-2' : ''}`}>
                      <span className="text-gray-500">Số lượng:</span>
                      <span className={`font-bold text-base px-2 py-0.5 rounded-md ${currentScreen === 'nhap_hang' ? 'text-amber-700 bg-amber-100' : 'text-blue-600 bg-blue-100'}`}>{currentRecord?.quantity || '-'}</span>
                    </div>
                  </>
                )}
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
              currentScreen === 'nhap_hang' ? 'bg-amber-500 hover:bg-amber-600' : currentScreen === 'xuat_hang' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Download size={20} /> 
            {currentScreen === 'nhap_hang' ? 'Duyệt đợt nhập này' : currentScreen === 'xuat_hang' ? 'Hoàn tất và xuất dữ liệu' : 'Hoàn tất và tải file CSV'}
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
