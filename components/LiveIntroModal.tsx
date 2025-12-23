
import React from 'react';
import { Radio, ShieldAlert } from 'lucide-react';

interface LiveIntroModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const LiveIntroModal: React.FC<LiveIntroModalProps> = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-xl w-full max-w-lg text-gray-800 dark:text-gray-200 flex flex-col">
        <div className="flex items-center mb-4">
          <Radio size={32} className="text-primary-500 mr-3" />
          <h2 className="text-2xl font-bold">Go Live with Jarvis</h2>
        </div>
        
        <div className="text-sm space-y-3 text-gray-600 dark:text-gray-300">
          <p>Tapping the Live button turns on the mic. To turn off the mic, tap the Hold or End buttons or say "stop."</p>
          <p className="font-semibold text-gray-700 dark:text-gray-200">Some features aren't available in Live yet.</p>
        </div>

        <div className="my-6 border-t border-gray-200 dark:border-gray-700"></div>

        <div className="flex items-start bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
          <ShieldAlert size={40} className="text-gray-500 dark:text-gray-400 mr-4 flex-shrink-0" />
          <div className="text-xs space-y-2 text-gray-500 dark:text-gray-400">
            <p>
              Recordings of your interactions with Live and content you share with it are saved and processed per the{' '}
              <a href="#" className="text-primary-600 hover:underline">Jarvis Apps Privacy Notice</a>. Manage anytime.
            </p>
            <p>
              Respect others' privacy and ask permission before recording or including them in a Live chat.{' '}
              <a href="#" className="text-primary-600 hover:underline">Learn more</a>.
            </p>
          </div>
        </div>

        <div className="flex justify-end items-center mt-8 space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900 rounded-md transition-colors"
          >
            No, thanks
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-primary-600 text-white font-semibold rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveIntroModal;
