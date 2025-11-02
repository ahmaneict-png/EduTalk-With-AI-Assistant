import React from 'react';
import { ConversationStatus } from '../types';

type Subject = 'marathi' | 'hindi' | 'english' | 'math';

interface StatusIndicatorProps {
  status: ConversationStatus;
  subject: Subject;
}

const statusStrings = {
    marathi: {
        LISTENING: 'ऐकत आहे...',
        THINKING: 'विचार करत आहे...',
        CONNECTING: 'कनेक्ट करत आहे...',
        SPEAKING: 'बोलत आहे...',
        ERROR: 'त्रुटी',
        IDLE: 'तयार',
        UNKNOWN: 'अज्ञात',
    },
    hindi: {
        LISTENING: 'सुन रहा हूँ...',
        THINKING: 'सोच रहा हूँ...',
        CONNECTING: 'कनेक्ट हो रहा है...',
        SPEAKING: 'बोल रहा हूँ...',
        ERROR: 'त्रुटि',
        IDLE: 'तैयार',
        UNKNOWN: 'अज्ञात',
    },
    english: { // English UI uses Marathi
        LISTENING: 'ऐकत आहे...',
        THINKING: 'विचार करत आहे...',
        CONNECTING: 'कनेक्ट करत आहे...',
        SPEAKING: 'बोलत आहे...',
        ERROR: 'त्रुटी',
        IDLE: 'तयार',
        UNKNOWN: 'अज्ञात',
    },
    math: {
        LISTENING: 'ऐकत आहे...',
        THINKING: 'विचार करत आहे...',
        CONNECTING: 'कनेक्ट करत आहे...',
        SPEAKING: 'बोलत आहे...',
        ERROR: 'त्रुटी',
        IDLE: 'तयार',
        UNKNOWN: 'अज्ञात',
    }
};

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, subject }) => {
  const strings = statusStrings[subject];

  if (status === ConversationStatus.LISTENING) {
    return (
      <div className="flex items-center justify-center space-x-2 p-2 rounded-full bg-white/50 min-w-[180px]">
        <span role="img" aria-label="listening" className="text-3xl animate-pulse">👂</span>
        <span className="font-bold text-lg text-green-700 animate-pulse">{strings.LISTENING}</span>
      </div>
    );
  }

  if (status === ConversationStatus.THINKING) {
    return (
      <div className="flex items-center justify-center space-x-2 p-2 rounded-full bg-white/50 min-w-[180px]">
        <span role="img" aria-label="thinking" className="text-3xl animate-pulse">🧠</span>
        <span className="font-bold text-lg text-purple-700 animate-pulse">{strings.THINKING}</span>
      </div>
    );
  }

  const getStatusInfo = () => {
    switch (status) {
      case ConversationStatus.CONNECTING:
        return { text: strings.CONNECTING, color: 'bg-yellow-500', pulse: true };
      case ConversationStatus.SPEAKING:
        return { text: strings.SPEAKING, color: 'bg-blue-500', pulse: true };
      case ConversationStatus.ERROR:
        return { text: strings.ERROR, color: 'bg-red-500', pulse: false };
      case ConversationStatus.IDLE:
        return { text: strings.IDLE, color: 'bg-gray-400', pulse: false };
      default:
        return { text: strings.UNKNOWN, color: 'bg-gray-400', pulse: false };
    }
  };

  const { text, color, pulse } = getStatusInfo();

  return (
    <div className="flex items-center justify-center space-x-3 p-2 rounded-full bg-white/50 min-w-[180px]">
      <div className={`w-4 h-4 rounded-full ${color} ${pulse ? 'animate-pulse' : ''}`}></div>
      <span className="font-semibold text-gray-700">{text}</span>
    </div>
  );
};

export default StatusIndicator;