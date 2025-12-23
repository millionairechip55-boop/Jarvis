



import React, { useState, useEffect } from 'react';
import { X, Moon, Sun } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  isVoiceOutputEnabled: boolean;
  onToggleVoiceOutput: () => void;
  voices: SpeechSynthesisVoice[];
  selectedVoiceURI: string | null;
  onVoiceChange: (voiceURI: string) => void;
  onClearLongTermMemory: () => void;
  isTutorModeEnabled: boolean;
  onToggleTutorMode: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  isOpen, 
  onClose, 
  onLogout, 
  isVoiceOutputEnabled, 
  onToggleVoiceOutput,
  voices,
  selectedVoiceURI,
  onVoiceChange,
  onClearLongTermMemory,
  isTutorModeEnabled,
  onToggleTutorMode,
}) => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // FIX: Type the accumulator in the `reduce` callback to ensure `groupedVoices` is correctly typed, which resolves the subsequent error on `langVoices.map`.
  const groupedVoices = voices.reduce((acc: Record<string, SpeechSynthesisVoice[]>, voice) => {
    const lang = voice.lang || 'default';
    (acc[lang] = acc[lang] || []).push(voice);
    return acc;
    // FIX: Explicitly type the initial value for the `reduce` method to ensure correct type inference for `groupedVoices`.
  }, {} as Record<string, SpeechSynthesisVoice[]>);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      ></div>
      <aside
        className={`fixed top-0 right-0 w-80 h-full bg-white dark:bg-gray-800 shadow-xl transition-transform duration-300 ease-in-out z-40 p-6 flex flex-col ${
          isOpen ? 'transform translate-x-0' : 'transform translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-6 flex-grow overflow-y-auto pr-2 -mr-2">
          <div className="flex items-center justify-between">
            <label htmlFor="theme-select" className="text-gray-700 dark:text-gray-300">Theme</label>
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <label htmlFor="enable-notifications" className="text-gray-700 dark:text-gray-300">Enable Notifications</label>
            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input type="checkbox" name="toggle" id="enable-notifications" className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                <label htmlFor="enable-notifications" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
            </div>
            <style>{`.toggle-checkbox:checked { right: 0; border-color: #3b82f6; } .toggle-checkbox:checked + .toggle-label { background-color: #3b82f6; }`}</style>
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="enable-voice-output" className="text-gray-700 dark:text-gray-300">Enable Voice Output</label>
            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input 
                    type="checkbox" 
                    name="toggle-voice" 
                    id="enable-voice-output" 
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                    checked={isVoiceOutputEnabled}
                    onChange={onToggleVoiceOutput}
                />
                <label htmlFor="enable-voice-output" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
            </div>
          </div>

          {isVoiceOutputEnabled && (
            <div className="flex flex-col space-y-2">
              <label htmlFor="voice-select" className="text-gray-700 dark:text-gray-300">Assistant Voice</label>
              <select
                id="voice-select"
                value={selectedVoiceURI || ''}
                onChange={(e) => onVoiceChange(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={voices.length === 0}
              >
                {voices.length > 0 ? (
                  // FIX: Refactored to use Object.keys() for more reliable type inference, resolving an error where `langVoices.map` was called on an `unknown` type.
                  Object.keys(groupedVoices)
                    .sort((langA, langB) => langA.localeCompare(langB))
                    .map((lang) => (
                      <optgroup key={lang} label={lang}>
                        {groupedVoices[lang].map(voice => (
                          <option key={voice.voiceURI} value={voice.voiceURI}>
                            {voice.name}
                          </option>
                        ))}
                      </optgroup>
                    ))
                ) : (
                  <option value="">Loading voices...</option>
                )}
              </select>
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
             <div className="flex items-center justify-between">
                <div className="flex-grow pr-4">
                    <label htmlFor="enable-tutor-mode" className="text-gray-700 dark:text-gray-300">Language Tutor Mode</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">In Live sessions, Jarvis will correct your speech to help you learn.</p>
                </div>
                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in flex-shrink-0">
                    <input 
                        type="checkbox" 
                        name="toggle-tutor" 
                        id="enable-tutor-mode" 
                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                        checked={isTutorModeEnabled}
                        onChange={onToggleTutorMode}
                    />
                    <label htmlFor="enable-tutor-mode" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                </div>
            </div>
          </div>


          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Long-Term Memory</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Jarvis automatically learns facts from your conversations to personalize your experience. You can clear this memory at any time.
            </p>
             <button
              onClick={onClearLongTermMemory}
              className="w-full mt-2 py-2 px-4 font-semibold rounded-md transition-colors duration-300 bg-red-600/10 text-red-700 dark:text-red-300 dark:bg-red-500/10 hover:bg-red-600/20 dark:hover:bg-red-500/20"
            >
              Clear Memory
            </button>
          </div>

        </div>
        
        <div className="mt-6">
          <button
            onClick={onLogout}
            className="w-full py-2 px-4 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-300"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default SettingsPanel;