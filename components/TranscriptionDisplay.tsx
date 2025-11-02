import React from 'react';
import type { TranscriptionEntry } from '../types';
import { ConversationStatus } from '../types';

type Subject = 'marathi' | 'hindi' | 'english' | 'math';

interface TranscriptionDisplayProps {
  history: TranscriptionEntry[];
  current: { user: string; model: string };
  status: ConversationStatus;
  subject: Subject;
}

const bubbleStrings = {
    marathi: {
        user: 'तुम्ही',
        assistant: 'AI सहाय्यक',
        userListening: 'तुम्ही (ऐकत आहे...)',
        assistantSpeaking: 'AI सहाय्यक (बोलत आहे...)',
        placeholder: 'तुमचे संभाषण येथे दिसेल...',
    },
    hindi: {
        user: 'आप',
        assistant: 'AI सहायक',
        userListening: 'आप (सुन रहा हूँ...)',
        assistantSpeaking: 'AI सहायक (बोल रहा हूँ...)',
        placeholder: 'आपकी बातचीत यहाँ दिखाई देगी...',
    },
    english: { // English UI uses Marathi
        user: 'तुम्ही',
        assistant: 'AI सहाय्यक',
        userListening: 'तुम्ही (ऐकत आहे...)',
        assistantSpeaking: 'AI सहाय्यक (बोलत आहे...)',
        placeholder: 'तुमचे संभाषण येथे दिसेल...',
    },
    math: {
        user: 'तुम्ही',
        assistant: 'AI सहाय्यक',
        userListening: 'तुम्ही (ऐकत आहे...)',
        assistantSpeaking: 'AI सहाय्यक (बोलत आहे...)',
        placeholder: 'तुमचा गणिताचा सराव येथे दिसेल...',
    }
};

const ChatBubble: React.FC<{ entry: TranscriptionEntry; subject: Subject }> = ({ entry, subject }) => {
  const isUser = entry.speaker === 'user';
  const strings = bubbleStrings[subject];
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs md:max-w-md lg:max-w-lg px-5 py-3 rounded-2xl shadow ${
          isUser
            ? 'bg-purple-600 text-white rounded-br-none'
            : 'bg-gray-200 text-gray-800 rounded-bl-none'
        }`}
      >
        <p className="font-bold mb-1">{isUser ? strings.user : strings.assistant}</p>
        <p>{entry.text}</p>
      </div>
    </div>
  );
};


const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ history, current, status, subject }) => {
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const strings = bubbleStrings[subject];

    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history, current]);

  return (
    <div
      ref={scrollRef}
      className="h-96 w-full bg-white/80 rounded-2xl shadow-inner p-4 overflow-y-auto space-y-4"
    >
      {history.length === 0 && !current.user && !current.model && (
         <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-center">{strings.placeholder}</p>
        </div>
      )}
      {history.map((entry, index) => (
        <ChatBubble key={index} entry={entry} subject={subject}/>
      ))}
      
      {current.user && (
        <div className="flex justify-end">
            <div className="max-w-xs md:max-w-md lg:max-w-lg px-5 py-3 rounded-2xl shadow bg-purple-200 text-purple-800 rounded-br-none opacity-70">
                <p className="font-bold mb-1">{strings.userListening}</p>
                <p>{current.user}</p>
            </div>
        </div>
      )}

      {current.model && (
         <div className="flex justify-start">
            <div className="max-w-xs md:max-w-md lg:max-w-lg px-5 py-3 rounded-2xl shadow bg-gray-100 text-gray-600 rounded-bl-none opacity-70">
                <p className="font-bold mb-1">{strings.assistantSpeaking}</p>
                <p>{current.model}</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptionDisplay;