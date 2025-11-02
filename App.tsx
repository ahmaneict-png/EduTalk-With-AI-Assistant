import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import LanguageSelector from './components/LanguageSelector';
import ConversationManager from './components/ConversationManager';
import InstallButton from './components/InstallButton';

// Define the type for the BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}


const App: React.FC = () => {
  const [selectedSubject, setSelectedSubject] = useState<'marathi' | 'hindi' | 'english' | 'math' | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isShareMode, setIsShareMode] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'share') {
      setIsShareMode(true);
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
      if (!localStorage.getItem('installBannerDismissed')) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
  
  const handleSubjectSelect = (subject: 'marathi' | 'hindi' | 'english' | 'math') => {
    setSelectedSubject(subject);
  };

  const handleGoBack = () => {
    setSelectedSubject(null);
  };

  const handleInstallClick = async () => {
    if (!installPromptEvent) {
      return;
    }
    setShowInstallBanner(false);
    await installPromptEvent.prompt();
    await installPromptEvent.userChoice;
    setInstallPromptEvent(null);
  };
  
  const handleDismissInstallBanner = () => {
    localStorage.setItem('installBannerDismissed', 'true');
    setShowInstallBanner(false);
  };

  const getOriginalAppUrl = () => {
    let origin = window.location.origin;
    if (origin.includes('.scf.usercontent.googhttps')) {
      origin = origin.replace('.scf.usercontent.googhttps', '.aistudio-app.google.com');
    }
    return `${origin}${window.location.pathname}`;
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff5e6] to-[#f3e6ff] text-gray-800 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Header subject={selectedSubject} />
        <main className="mt-4 bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 md:p-10">
          {isShareMode ? (
            <div className="text-center p-6 bg-purple-100/50 rounded-2xl border-2 border-dashed border-purple-300">
              <p className="text-lg font-semibold text-purple-800">हे ॲपचे डेमो व्हर्जन आहे.</p>
              <p className="text-gray-600 mt-2">AI सहाय्यक वापरण्यासाठी, कृपया मूळ ॲपला भेट द्या.</p>
              <a href={getOriginalAppUrl()} className="mt-4 inline-block bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">
                मूळ ॲपवर जा
              </a>
            </div>
          ) : !selectedSubject ? (
             <LanguageSelector onSelect={handleSubjectSelect} />
          ) : (
            <ConversationManager subject={selectedSubject} onGoBack={handleGoBack} />
          )}
        </main>
        {showInstallBanner && !isShareMode && (
           <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 p-4 text-white shadow-lg animate-fade-in-up flex items-center justify-center gap-4 sm:gap-8 z-50">
            <div className="text-center sm:text-left flex-grow">
              <p className="font-bold text-lg">ॲप इन्स्टॉल करा!</p>
              <p className="text-sm">उत्तम अनुभवासाठी हे ॲप तुमच्या होम स्क्रीनवर जोडा.</p>
            </div>
            <InstallButton onInstallClick={handleInstallClick} />
            <button 
              onClick={handleDismissInstallBanner} 
              className="p-2 rounded-full hover:bg-white/20 transition-colors" 
              aria-label="बॅनर बंद करा"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <footer className="mt-8 text-center text-sm text-gray-500">
          <p>© 2024 श्री. अनिल माने. सर्व हक्क राखीव.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;