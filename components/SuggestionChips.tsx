import React from 'react';
import { Palette, FileText, Lightbulb, PenLine, GraduationCap, BarChart3, Code, Gift, Eye } from 'lucide-react';

interface SuggestionChipProps {
  icon: React.ReactNode;
  text: string;
  onClick: (text: string) => void;
}

const SuggestionChip: React.FC<SuggestionChipProps> = ({ icon, text, onClick }) => (
  <button
    onClick={() => onClick(text)}
    className="flex items-center p-4 w-full text-left bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
  >
    <div className="mr-4">{icon}</div>
    <span className="font-medium text-gray-800 dark:text-gray-100">{text}</span>
  </button>
);

interface SuggestionChipsProps {
  onSuggestionClick: (suggestion: string) => void;
}

const suggestions = [
  { icon: <Palette size={24} className="text-green-500" />, text: 'Create image' },
  { icon: <FileText size={24} className="text-orange-500" />, text: 'Summarize text' },
  { icon: <Lightbulb size={24} className="text-yellow-500" />, text: 'Brainstorm' },
  { icon: <PenLine size={24} className="text-purple-500" />, text: 'Help me write' },
  { icon: <GraduationCap size={24} className="text-blue-500" />, text: 'Get advice' },
  { icon: <Lightbulb size={24} className="text-yellow-500" />, text: 'Make a plan' },
  { icon: <BarChart3 size={24} className="text-cyan-500" />, text: 'Analyze data' },
  { icon: <Code size={24} className="text-indigo-500" />, text: 'Code' },
  { icon: <Gift size={24} className="text-rose-500" />, text: 'Surprise me' },
  { icon: <Eye size={24} className="text-teal-500" />, text: 'Analyze images' },
];

const SuggestionChips: React.FC<SuggestionChipsProps> = ({ onSuggestionClick }) => {
  return (
    <div className="max-w-4xl mx-auto my-6 px-4">
      <h2 className="text-4xl font-bold text-center text-gray-800 dark:text-gray-100 mb-8">
        What can I help with?
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {suggestions.map((suggestion) => (
          <SuggestionChip
            key={suggestion.text}
            icon={suggestion.icon}
            text={suggestion.text}
            onClick={onSuggestionClick}
          />
        ))}
      </div>
    </div>
  );
};

export default SuggestionChips;
