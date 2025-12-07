import React, { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';

interface AdModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdModal: React.FC<AdModalProps> = ({ isOpen, onClose }) => {
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset button state when modal opens
      setIsButtonEnabled(false);
      
      // Push AdSense ads when modal opens
      try {
        (window as any).adsbygoogle = (window as any).adsbygoogle || [];
        (window as any).adsbygoogle.push({});
      } catch (e) {
        console.error('AdSense error:', e);
      }

      // Enable button after 3 seconds
      const timer = setTimeout(() => {
        setIsButtonEnabled(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Support Our Project</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Ad Container */}
        <div className="p-6 bg-gray-700/30">
          <div className="w-full bg-gray-800 rounded-lg p-4 min-h-[280px] flex items-center justify-center border border-gray-700">
            {/* AdSense Ad Container - must have explicit width */}
            <div style={{ width: '100%', minHeight: '280px' }}>
              <ins
                className="adsbygoogle"
                style={{
                  display: 'block',
                  width: '100%',
                }}
                data-ad-client="ca-pub-3324997515191619"
                data-ad-slot="5192457789"
                data-ad-format="auto"
                data-full-width-responsive="true"
              ></ins>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            disabled={!isButtonEnabled}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isButtonEnabled
                ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
            }`}
          >
            {isButtonEnabled ? 'Continue' : `Continue (${3}s)`}
          </button>
        </div>
      </div>
    </div>
  );
};
