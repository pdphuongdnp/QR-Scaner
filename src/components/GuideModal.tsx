import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, Download } from 'lucide-react';
import { downloadUserGuideDocx } from '../utils/generateDocx';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GuideModal({ isOpen, onClose }: GuideModalProps) {
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/HUONG_DAN_SU_DUNG.md')
        .then(res => res.text())
        .then(text => {
          setMarkdown(text);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load guide:', err);
          setMarkdown('# Lỗi\nKhông thể tải tài liệu hướng dẫn.');
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            Hướng dẫn sử dụng
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={downloadUserGuideDocx}
              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Tải file Word"
            >
              <Download size={20} />
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 prose prose-sm max-w-none prose-blue">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="markdown-body">
              <ReactMarkdown>{markdown}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
