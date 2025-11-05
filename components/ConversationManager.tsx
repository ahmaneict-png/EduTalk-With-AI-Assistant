
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
    },
    hindi: {
        nameLabel: "प्रश्नोत्तर या प्रश्नोत्तरी शुरू करने के लिए नीचे दिए गए बॉक्स में अपना नाम टाइप करें।",
        namePlaceholder: "अपना नाम यहाँ लिखें",
        nameAriaLabel: "आपका नाम",
        promptText: "नाम टाइप करने के बाद बातचीत शुरू करने के लिए यह बटन दबाएं!",
        connecting: "कनेक्ट हो रहा है...",
        stopSession: "सत्र रोकें",
        startConversation: "बातचीत शुरू करें",
        startQuiz: "प्रश्नोत्तरी",
        newBadge: "नया",
        goBack: "वापस जाओ",
        errorTitle: "एक त्रुटि हुई:",
    },
    english: { // English UI uses Marathi text as requested
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
    },
    math: {
        nameLabel: "गणित सराव किंवा प्रश्नमंजुषा सुरू करण्यासाठी खालील चौकोनात आपले नाव टाईप करा.",
        namePlaceholder: "तुमचे नाव येथे लिहा",
        nameAriaLabel: "तुमचे नाव",
        promptText: "नाव टाईप करून झाल्यावर सराव सुरू करण्यासाठी खालील बटण दाबा!",
        connecting: "जोडत आहे...",
        stopSession: "सत्र थांबवा",
        startConversation: "सराव सुरू करा",
        startQuiz: "प्रश्नमंजुषा",
        newBadge: "नवीन",
        goBack: "मागे जा",
        errorTitle: "एक त्रुटी आली:",
    }
};

const ConversationManager: React.FC<ConversationManagerProps> = ({ subject, onGoBack }) => {
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionEntry[]>([]);
  const [userName, setUserName] = useState<string>('');
  const { status, error, startSession, closeSession, currentTranscription } = useGeminiLive(setTranscriptionHistory);

  const isSessionRunning = status !== ConversationStatus.IDLE && status !== ConversationStatus.ERROR;
  const strings = uiStrings[subject];

  const handleStart = (isQuizMode: boolean) => {
    if (!userName.trim()) return;
    setTranscriptionHistory([]); // Clear previous conversation
    startSession(userName.trim(), isQuizMode, subject);
  };

  const handleStop = () => {
    closeSession();
    onGoBack();
  };


  return (
    <div className="flex flex-col items-center">
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
              className="w-full max-w-sm mx-auto px-4 py-2 text-lg text-center border-2 border-purple-300 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
              aria-label={strings.nameAriaLabel}
            />
             <p className="text-gray-600 mt-4">
              {strings.promptText}
            </p>
            <div className="mt-2 text-4xl animate-bounce">👇</div>
          </div>
        )}

        <div className="flex flex-col items-center justify-center gap-4 mb-6">
          {isSessionRunning ? (
             <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                <button
                  onClick={handleStop}
                  disabled={status === ConversationStatus.CONNECTING}
                  className={`px-10 py-4 text-lg font-bold text-white rounded-full shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 w-full sm:w-auto
                    ${status === ConversationStatus.CONNECTING ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 focus:ring-red-300'}
                  `}
                >
                  {status === ConversationStatus.CONNECTING ? strings.connecting : strings.stopSession}
                </button>
                <StatusIndicator status={status} subject={subject} />
              </div>
          ) : (
            <div className="flex flex-col items-center w-full gap-4">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                  <button
                      onClick={() => handleStart(false)}
                      disabled={!userName.trim()}
                      className="px-8 py-4 text-lg font-bold text-white rounded-full shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 bg-green-500 hover:bg-green-600 focus:ring-green-300 w-full sm:w-auto disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                  >
                      {strings.startConversation}
                  </button>
                  <button
                      onClick={() => handleStart(true)}
                      disabled={!userName.trim()}
                      className="relative px-8 py-4 text-lg font-bold text-white rounded-full shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 bg-purple-600 hover:bg-purple-700 focus:ring-purple-400 w-full sm:w-auto flex items-center justify-center gap-2 overflow-hidden disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                  >
                      <span className="absolute -top-1 -left-1 bg-yellow-300 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full transform -rotate-12">{strings.newBadge}</span>
                      <span role="img" aria-label="sparkles">✨</span>
                      <span>{strings.startQuiz}</span>
                  </button>
                  <div className="hidden sm:flex">
                     <StatusIndicator status={status} subject={subject} />
                  </div>
              </div>
               <button onClick={onGoBack} className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors">
                &larr; {strings.goBack}
              </button>
              <div className="sm:hidden">
                 <StatusIndicator status={status} subject={subject} />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md" role="alert">
            <p className="font-bold">{strings.errorTitle}</p>
            <p>{error}</p>
          </div>
        )}
        
        <TranscriptionDisplay
          history={transcriptionHistory}
          current={currentTranscription}
          status={status}
          subject={subject}
        />
      </div>
    </div>
  );
};

export default ConversationManager;
