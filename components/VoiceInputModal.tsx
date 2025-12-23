
import React from 'react';

interface VoiceInputModalProps {
  isListening: boolean;
  onStop: () => void;
}

const VoiceInputModal: React.FC<VoiceInputModalProps> = ({ isListening, onStop }) => {
  if (!isListening) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg text-center flex flex-col items-center">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 bg-primary-500 rounded-full animate-ping"></div>
          <div className="relative w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
          </div>
        </div>
        <p className="text-lg font-semibold mt-6 mb-4 text-gray-800 dark:text-gray-100">Listening...</p>
        <button
          onClick={onStop}
          className="py-2 px-6 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Stop
        </button>
      </div>
    </div>
  );
};

export default VoiceInputModal;
