
import React from 'react';
import { Bot } from 'lucide-react';

interface SplashScreenProps {
  show: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ show }) => {
  return (
    <div
      className={`fixed inset-0 bg-primary-600 text-white flex flex-col justify-center items-center z-50 transition-opacity duration-500 ease-out ${
        show ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <Bot size={72} className="mb-4 animate-pulse" />
      <h1 className="text-5xl font-bold">Jarvis</h1>
      <p className="text-lg mt-2">Your Personal AI Assistant</p>
    </div>
  );
};

export default SplashScreen;
