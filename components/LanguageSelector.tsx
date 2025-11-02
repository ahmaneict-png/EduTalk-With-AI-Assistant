import React from 'react';

type Subject = 'marathi' | 'hindi' | 'english' | 'math';

interface LanguageSelectorProps {
  onSelect: (subject: Subject) => void;
}

type SubjectInfo = {
  id: Subject;
  name: string;
  bgColor: string;
  hoverColor: string;
  position: string;
};

// Position classes for the four corners
const subjects: SubjectInfo[] = [
  { id: 'marathi', name: 'मराठी - व्याकरण', bgColor: 'bg-orange-500', hoverColor: 'hover:bg-orange-600', position: 'absolute top-4 left-4' },
  { id: 'hindi', name: 'हिंदी - व्याकरण', bgColor: 'bg-sky-500', hoverColor: 'hover:bg-sky-600', position: 'absolute top-4 right-4' },
  { id: 'english', name: 'इंग्रजी - संभाषण', bgColor: 'bg-emerald-500', hoverColor: 'hover:bg-emerald-600', position: 'absolute bottom-4 left-4' },
  { id: 'math', name: 'गणित - सराव', bgColor: 'bg-blue-600', hoverColor: 'hover:bg-blue-700', position: 'absolute bottom-4 right-4' },
];

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onSelect }) => {
  // Adjusted font size and added flex-col for better text wrapping
  const commonButtonClasses = "w-32 h-32 rounded-full flex flex-col items-center justify-center text-center text-white text-xl font-bold shadow-2xl transform transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-purple-400 p-2";

  return (
    <div className="animate-fade-in-up">
        <div className="relative w-full max-w-md mx-auto aspect-square p-4 bg-purple-100/50 rounded-2xl border-2 border-dashed border-purple-300">
            {/* Title placed in the center */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10">
                <h2 className="text-2xl sm:text-3xl font-bold text-purple-800 animate-blink-light">
                    शिकण्यासाठी विषय निवडा
                </h2>
            </div>
            
            {/* Subject buttons positioned in the corners */}
            {subjects.map((subject) => (
                <button
                key={subject.id}
                onClick={() => onSelect(subject.id)}
                className={`${commonButtonClasses} ${subject.bgColor} ${subject.hoverColor} ${subject.position}`}
                aria-label={`Select ${subject.name.replace(' - ', ' ')}`}
                >
                {subject.name.split(' - ').map((part, index) => (
                  <span key={index} className="block">{part}</span>
                ))}
                </button>
            ))}
        </div>
    </div>
  );
};

export default LanguageSelector;