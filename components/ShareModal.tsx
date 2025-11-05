import React, { useState } from 'react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, shareUrl }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative animate-fade-in-up"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-200 transition-colors"
          aria-label="मोडल बंद करा"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-purple-800 mb-4">विद्यार्थ्यांसाठी लिंक शेअर करा</h2>
        
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-md mb-4" role="alert">
          <p className="font-bold">⚠️ महत्त्वाची सूचना</p>
          <p>या लिंकमध्ये तुमची API की आहे. ही लिंक फक्त तुमच्या विश्वासू विद्यार्थ्यांसोबत शेअर करा. ज्याच्याकडे ही लिंक असेल, तो तुमची API की वापरू शकतो, ज्यामुळे तुमच्या खात्यावर शुल्क लागू शकते.</p>
        </div>

        <p className="text-gray-700 mb-2">खालील लिंक कॉपी करून तुमच्या विद्यार्थ्यांसोबत शेअर करा:</p>
        <div className="flex items-center gap-2">
            <input 
                type="text"
                value={shareUrl}
                readOnly
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none"
                aria-label="शेअर करण्यायोग्य लिंक"
            />
            <button 
                onClick={handleCopy}
                className={`px-4 py-2 text-white font-semibold rounded-md transition-colors ${
                    copied ? 'bg-green-500' : 'bg-green-600'
                }`}
            >
                {copied ? 'कॉपी झाले!' : 'कॉपी करा'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
