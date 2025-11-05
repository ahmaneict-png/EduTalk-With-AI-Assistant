import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import LanguageSelector from './components/LanguageSelector';
import ConversationManager from './components/ConversationManager';
import InstallButton from './components/InstallButton';
import ShareButton from './components/ShareButton';
import ShareModal from './components/ShareModal';


// Define the type for the BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Add window.aistudio type definition
declare global {
  // Fix: Define the AIStudio interface inside `declare global` to resolve a TypeScript type conflict
  // with a potentially existing global definition and ensure a single, globally-scoped type.
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  
  interface Window {
    aistudio?: AIStudio;
  }
}


const App: React.FC = () => {
  const [selectedSubject, setSelectedSubject] = useState<'marathi' | 'hindi' | 'english' | 'math' | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isShareMode, setIsShareMode] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isKeySelected, setIsKeySelected] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  const [userApiKey, setUserApiKey] = useState<string | null>(() => sessionStorage.getItem('gemini-api-key'));
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'share') {
      setIsShareMode(true);
    }
  }, []);

  useEffect(() => {
    const checkApiKey = async () => {
      setIsCheckingKey(true);
      
      // 1. Check URL Hash for shared key
      const hash = window.location.hash;
      if (hash.startsWith('#key=')) {
        try {
          const encodedKey = hash.substring(5);
          const decodedKey = atob(encodedKey);
          if (decodedKey) {
            sessionStorage.setItem('gemini-api-key', decodedKey);
            setUserApiKey(decodedKey);
            setIsKeySelected(true);
            // Clean the URL hash to hide the key from the user
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            setIsCheckingKey(false);
            return;
          }
        } catch (e) {
          console.error("Failed to decode API key from URL hash.", e);
          // Clear potentially corrupted hash
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }

      // In share mode, we don't need an API key to show the initial page.
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'share') {
        setIsKeySelected(true);
        setIsCheckingKey(false);
        return;
      }

      // 2. Check AI Studio
      if (window.aistudio) {
        try {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setIsKeySelected(hasKey);
        } catch (e) {
          console.error("Error checking for API key:", e);
          setIsKeySelected(false); // Assume no key if check fails
        }
      } else {
        // 3. Not in AI Studio, check for user key in session storage.
        const sessionKey = sessionStorage.getItem('gemini-api-key');
        if (sessionKey) {
            setUserApiKey(sessionKey);
            setIsKeySelected(true);
        } else {
            setIsKeySelected(false);
        }
      }
      setIsCheckingKey(false);
    };
    checkApiKey();
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
  
  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setIsKeySelected(true);
    }
  };

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKeyInput.trim()) {
      sessionStorage.setItem('gemini-api-key', apiKeyInput.trim());
      setUserApiKey(apiKeyInput.trim());
      setIsKeySelected(true);
    }
  };

  const getOriginalAppUrl = () => {
    let origin = window.location.origin;
    if (origin.includes('.scf.usercontent.googhttps')) {
      origin = origin.replace('.scf.usercontent.googhttps', '.aistudio-app.google.com');
    }
    return `${origin}${window.location.pathname}`;
  };

  const generateShareUrl = () => {
    if (!userApiKey) return '';
    // Base64 encode the key to make it URL-safe
    const encodedKey = btoa(userApiKey);
    // Use the current URL's origin and pathname
    return `${window.location.origin}${window.location.pathname}#key=${encodedKey}`;
  };

  if (isCheckingKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fff5e6] to-[#f3e6ff] flex items-center justify-center">
        <div className="text-purple-700 font-semibold text-lg animate-pulse">ॲप लोड होत आहे...</div>
      </div>
    );
  }
  
  if (!isKeySelected) {
     if (!window.aistudio) {
       return (
         <div className="min-h-screen bg-gradient-to-br from-[#fff5e6] to-[#f3e6ff] flex items-center justify-center p-4">
          <div className="max-w-xl mx-auto text-center bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 md:p-10">
            <h2 className="text-2xl font-bold text-purple-800">Gemini API की आवश्यक आहे</h2>
            <p className="mt-4 text-gray-700">
              हे ॲप वापरण्यासाठी, तुम्हाला तुमची स्वतःची Google AI Studio API की आवश्यक आहे. तुमची की सार्वजनिकरित्या शेअर केली जाणार नाही आणि फक्त तुमच्या ब्राउझरमध्ये सेव्ह केली जाईल.
            </p>
             <p className="mt-2 text-gray-600">
              तुम्ही तुमची API की <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline font-semibold">Google AI Studio</a> वरून मिळवू शकता.
            </p>
            <form onSubmit={handleApiKeySubmit} className="mt-6 flex flex-col items-center gap-4">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="तुमची API की येथे पेस्ट करा"
                className="w-full max-w-sm px-4 py-2 text-lg text-center border-2 border-purple-300 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                aria-label="API Key Input"
              />
              <button
                type="submit"
                className="inline-block bg-purple-600 text-white font-bold py-3 px-8 rounded-full hover:bg-purple-700 transition-colors shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={!apiKeyInput.trim()}
              >
                की सेव्ह करा आणि सुरू करा
              </button>
            </form>
          </div>
        </div>
      );
    }
    return (
       <div className="min-h-screen bg-gradient-to-br from-[#fff5e6] to-[#f3e6ff] flex items-center justify-center p-4">
        <div className="max-w-xl mx-auto text-center bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 md:p-10">
          <h2 className="text-2xl font-bold text-purple-800">API की आवश्यक आहे</h2>
          <p className="mt-4 text-gray-700">
            हे ॲप वापरण्यासाठी, तुम्हाला Google AI Studio API की निवडणे आवश्यक आहे.
            तुमच्या वापरासाठी बिलिंग लागू होऊ शकते. अधिक माहितीसाठी, कृपया <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline font-semibold">बिलिंग दस्तऐवज</a> पहा.
          </p>
          <button
            onClick={handleSelectKey}
            className="mt-6 inline-block bg-purple-600 text-white font-bold py-3 px-8 rounded-full hover:bg-purple-700 transition-colors shadow-lg"
          >
            API की निवडा
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff5e6] to-[#f3e6ff] text-gray-800 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Header subject={selectedSubject} />

        <div className="my-6 flex flex-col sm:flex-row items-center justify-center flex-wrap gap-4">
          <a
            href="https://wa.me/919766599780?text=EduTalk%20ॲपबद्दल%20माझा%20अभिप्राय:"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-purple-600 text-white font-bold py-3 px-8 rounded-full hover:bg-purple-700 transition-colors shadow-lg transform hover:scale-105"
            aria-label="Send feedback on WhatsApp"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
              <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
            </svg>
            <span className="text-lg">ॲपबद्दल प्रतिक्रिया द्या</span>
          </a>
          {isKeySelected && !isShareMode && !window.aistudio && (
            <ShareButton onClick={() => setIsShareModalOpen(true)} />
          )}
        </div>

        <main className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 md:p-10">
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
            <ConversationManager subject={selectedSubject} onGoBack={handleGoBack} apiKey={userApiKey} />
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
        <ShareModal 
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          shareUrl={generateShareUrl()}
        />
        <footer className="mt-8 text-center text-sm text-gray-500">
          <p>© 2024 श्री. अनिल माने. सर्व हक्क राखीव.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;