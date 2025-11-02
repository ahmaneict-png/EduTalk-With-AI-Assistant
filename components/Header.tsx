import React from 'react';

type Subject = 'marathi' | 'hindi' | 'english' | 'math' | null;

interface HeaderProps {
  subject: Subject;
}

const getTitle = (subject: Subject) => {
  switch (subject) {
    case 'marathi':
      return 'मराठी व्याकरण सहाय्यक';
    case 'hindi':
      return 'हिंदी व्याकरण सहायक';
    case 'english':
      return 'इंग्रजी संभाषण सहाय्यक';
    case 'math':
      return 'गणित सहाय्यक';
    default:
      return 'AI शिक्षण सहाय्यक';
  }
};


const Header: React.FC<HeaderProps> = ({ subject }) => {
  return (
    <header className="text-center py-6">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
        {getTitle(subject)}
      </h1>
      <p className="mt-2 text-lg text-purple-700 font-semibold">
        यशवंतराव चव्हाण विद्यालय, यशवंतनगर, ता. कराड, जि. सातारा
      </p>

      <div className="mt-4 inline-block bg-purple-100/60 backdrop-blur-sm rounded-xl px-6 py-3 shadow-lg border border-purple-200/50">
        <p className="text-md font-semibold text-purple-900 text-center">
          संकल्पना व निर्मिती - श्री. अनिल माने, उपशिक्षक
        </p>
        <hr className="my-2 border-purple-200/60" />
        <p className="text-sm font-medium text-gray-700 text-center">
          सौजन्य - Google Gemini
        </p>
      </div>
      
      <div className="mt-6 inline-block p-1 glowing-box rounded-xl">
         <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2">
             <p className="text-md font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600 animate-pulse">
                आता, AI द्वारे शिका, आपल्या सवडीनुसार!
             </p>
         </div>
      </div>
    </header>
  );
};

export default Header;