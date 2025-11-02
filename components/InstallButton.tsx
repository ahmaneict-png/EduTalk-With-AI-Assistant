import React from 'react';

interface InstallButtonProps {
  onInstallClick: () => void;
}

const InstallButton: React.FC<InstallButtonProps> = ({ onInstallClick }) => {
  return (
    <button
      onClick={onInstallClick}
      className="flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:bg-purple-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300"
      aria-label="ॲप इन्स्टॉल करा"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      <span>ॲप इन्स्टॉल करा</span>
    </button>
  );
};

export default InstallButton;
