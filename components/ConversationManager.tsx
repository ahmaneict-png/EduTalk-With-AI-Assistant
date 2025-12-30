
import React, { useState } from 'react';
import useGeminiLive from '../hooks/useGeminiLive';
import type { TranscriptionEntry } from '../types';
import { ConversationStatus } from '../types';
import StatusIndicator from './StatusIndicator';
import TranscriptionDisplay from './TranscriptionDisplay';

type Subject = 'marathi' | 'hindi' | 'english' | 'math';

interface ConversationManagerProps {
  subject: Subject;
  onGoBack: () => void;
}

const uiStrings = {
    marathi: {
        nameLabel: "प्रश्नोत्तरे किंवा प्रश्नमंजुषा सुरू करण्यासाठी खालील चौकोनात आपले नाव टाईप करा.",
        namePlaceholder: "तुमचे नाव येथे लिहा",
        nameAriaLabel: "तुमचे नाव",
        promptText: "नाव टाईप करून झाल्यावर संभाषण सुरू करण्यासाठी हे बटण दाबा!",
        connecting: "जोडत आहे...",
        stopSession: "सत्र थांबवा",
        startConversation: "संभाषण सुरू करा",
        startQuiz: "प्रश्नमंजुषा",
        newBadge: "नवीन",
        goBack: "मागे जा",
        errorTitle: "एक त्रुटी आली:",
        showTechnical: "तांत्रिक माहिती दाखवा",
        hideTechnical: "तांत्रिक माहिती लपवा",
        apiMissingHint: "💡 उपाय: Vercel Settings > Environment Variables मध्ये 'API_KEY' नाव देऊन तुमची Gemini Key पेस्ट करा, मग 'Redeploy' करा."
    },
    hindi: {
        nameLabel: "प्रश्नोत्तर या प्रश्नोत्तरी शुरू करने के लिए अपना नाम टाइप करें।",
        namePlaceholder: "अपना नाम यहाँ लिखें",
        nameAriaLabel: "आपका नाम",
        promptText: "बातचीत शुरू करने के लिए बटन दबाएं!",
        connecting: "कनेक्ट हो रहा है...",
        stopSession: "सत्र रोकें",
        startConversation: "बातचीत शुरू करें",
        startQuiz: "प्रश्नोत्तरी",
        newBadge: "नया",
        goBack: "वापस जाओ",
        errorTitle: "त्रुटि हुई:",
        showTechnical: "तकनीकी विवरण दिखाएं",
        hideTechnical: "तकनीकी विवरण छिपाएं",
        apiMissingHint: "💡 उपाय: Vercel Settings में 'API_KEY' सेट करें और 'Redeploy' करें।"
    },
    english: { 
        nameLabel: "प्रश्नोत्तरे किंवा प्रश्नमंजुषा सुरू करण्यासाठी खालील चौकोनात आपले नाव टाईप करा.",
        namePlaceholder: "तुमचे नाव येथे लिहा",
        nameAriaLabel: "तुमचे नाव",
        promptText: "नाव टाईप करून झाल्यावर संभाषण सुरू करण्यासाठी हे बटण दाबा!",
        connecting: "जोडत आहे...",
        stopSession: "सत्र थांबवा",
        startConversation: "संभाषण सुरू करा",
        startQuiz: "प्रश्नमंजुषा",
        newBadge: "नवीन",
        goBack: "मागे जा",
        errorTitle: "एक त्रुटी आली:",
        showTechnical: "तांत्रिक माहिती दाखवा",
        hideTechnical: "तांत्रिक माहिती लपवा",
        apiMissingHint: "💡 उपाय: Vercel Settings मध्ये 'API_KEY' सेट करा आणि 'Redeploy' करा."
    },
    math: {
        nameLabel: "गणित सराव सुरू करण्यासाठी खालील चौकोनात आपले नाव टाईप करा.",
        namePlaceholder: "तुमचे नाव येथे लिहा",
        nameAriaLabel: "तुमचे नाव",
        promptText: "सराव सुरू करण्यासाठी खालील बटण दाबा!",
        connecting: "जोडत आहे...",
        stopSession: "सत्र थांबवा",
        startConversation: "सराव सुरू करा",
        startQuiz: "प्रश्नमंजुषा",
        newBadge: "नवीन",
        goBack: "मागे जा",
        errorTitle: "त्रुटी आली:",
        showTechnical: "तांत्रिक माहिती दाखवा",
        hideTechnical: "तांत्रिक माहिती लपवा",
        apiMissingHint: "💡 उपाय: Vercel Settings मध्ये 'API_KEY' सेट करा आणि 'Redeploy' करा."
    }
};

const ConversationManager: React.FC<ConversationManagerProps> = ({ subject, onGoBack }) => {
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionEntry[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [showRaw, setShowRaw] = useState(false);
  const { status, error, rawError, startSession, closeSession, currentTranscription } = useGeminiLive(setTranscriptionHistory);

  const isSessionRunning = status !== ConversationStatus.IDLE && status !== ConversationStatus.ERROR;
  const strings = uiStrings[subject];

  const handleStart = (isQuizMode: boolean) => {
    if (!userName.trim()) return;
    setTranscriptionHistory([]);
    startSession(userName.trim(), isQuizMode, subject);
  };

  const handleStop = () => {
    closeSession();
  };

  const isApiKeyMissing = error && (error.includes('API_KEY') || error.includes('API की'));

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full max-w-2xl">
        {status === ConversationStatus.IDLE && transcriptionHistory.length === 0 && (
          <div className="text-center p-6 bg-purple-100/50 rounded-2xl border-2 border-dashed border-purple-300 mb-6 animate-fade-in-up">
            <label htmlFor="userName" className="block text-lg font-semibold text-purple-800 mb-3">
              {strings.nameLabel}
            </label>
            <input
              id="userName"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder={strings.namePlaceholder}
              className="w-full max-w-sm mx-auto px-4 py-3 text-lg text-center border-2 border-purple-300 rounded-full focus:ring-4 focus:ring-purple-200 outline-none transition-all"
              aria-label={strings.nameAriaLabel}
            />
             <p className="text-gray-600 mt-4 font-medium">
              {strings.promptText}
            </p>
            <div className="mt-2 text-4xl animate-bounce">👇</div>
          </div>
        )}

        <div className="flex flex-col items-center justify-center gap-4 mb-8">
          {isSessionRunning ? (
             <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-4">
                <button
                  onClick={handleStop}
                  disabled={status === ConversationStatus.CONNECTING}
                  className={`px-10 py-5 text-xl font-black text-white rounded-2xl shadow-2xl transition-all duration-300 transform active:scale-95 focus:outline-none focus:ring-4 w-full sm:w-auto
                    ${status === ConversationStatus.CONNECTING ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 focus:ring-red-300'}
                  `}
                >
                  {status === ConversationStatus.CONNECTING ? strings.connecting : strings.stopSession}
                </button>
                <StatusIndicator status={status} subject={subject} />
              </div>
          ) : (
            <div className="flex flex-col items-center w-full gap-6 px-4">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                  <button
                      onClick={() => handleStart(false)}
                      disabled={!userName.trim()}
                      className="px-8 py-5 text-xl font-black text-white rounded-2xl shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 bg-green-500 hover:bg-green-600 focus:ring-green-300 w-full sm:w-auto disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none"
                  >
                      {strings.startConversation}
                  </button>
                  <button
                      onClick={() => handleStart(true)}
                      disabled={!userName.trim()}
                      className="relative px-8 py-5 text-xl font-black text-white rounded-2xl shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 bg-purple-600 hover:bg-purple-700 focus:ring-purple-400 w-full sm:w-auto flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none"
                  >
                      <span className="absolute -top-3 -right-2 bg-yellow-400 text-purple-900 text-xs font-black px-2 py-1 rounded-lg shadow-sm transform rotate-12 z-20 border border-white">{strings.newBadge}</span>
                      <span role="img" aria-label="sparkles">✨</span>
                      <span>{strings.startQuiz}</span>
                  </button>
              </div>
              
              <div className="flex flex-col items-center gap-4 w-full">
                <StatusIndicator status={status} subject={subject} />
                <button 
                  onClick={onGoBack} 
                  className="px-8 py-2 text-md font-bold text-purple-600 bg-purple-100 rounded-full hover:bg-purple-200 transition-all active:scale-95"
                >
                  &larr; {strings.goBack}
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border-l-8 border-red-500 text-red-700 p-6 mb-8 rounded-r-2xl shadow-lg animate-fade-in-up mx-4" role="alert">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-100 rounded-full">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-black text-xl">{strings.errorTitle}</p>
            </div>
            <p className="mb-4 font-medium text-lg leading-relaxed whitespace-pre-line">{error}</p>
            
            {isApiKeyMissing && (
              <div className="bg-blue-100/80 p-5 rounded-xl border border-blue-300 text-blue-900 font-bold shadow-inner">
                {strings.apiMissingHint}
              </div>
            )}

            {rawError && (
              <div className="mt-4">
                <button 
                  onClick={() => setShowRaw(!showRaw)}
                  className="text-xs font-mono bg-red-100/50 border border-red-200 px-3 py-1 rounded-md hover:bg-red-200 transition-colors font-bold uppercase tracking-wider"
                >
                  {showRaw ? strings.hideTechnical : strings.showTechnical}
                </button>
                {showRaw && (
                  <pre className="mt-3 p-4 bg-gray-900 text-green-400 text-[11px] rounded-xl overflow-x-auto whitespace-pre-wrap font-mono shadow-inner border border-gray-700">
                    {rawError}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
        
        <div className="px-4">
          <TranscriptionDisplay
            history={transcriptionHistory}
            current={currentTranscription}
            status={status}
            subject={subject}
          />
        </div>
      </div>
    </div>
  );
};

export default ConversationManager;
