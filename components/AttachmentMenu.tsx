import React from 'react';
import {
  Camera,
  Images,
  Folder,
  ScreenShare,
  BrainCircuit,
  Telescope,
  BookOpen,
  Palette,
  Globe,
} from 'lucide-react';

interface AttachmentMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOptionClick: (option: string) => void;
}

const TopOption: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="flex flex-col items-center justify-center space-y-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
    <div className="w-12 h-12 flex items-center justify-center text-gray-600 dark:text-gray-300">{icon}</div>
    <span className="text-sm text-gray-700 dark:text-gray-200">{label}</span>
  </button>
);

const ListOption: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="w-full flex items-center p-3 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
    <div className="w-8 h-8 flex items-center justify-center mr-3 text-gray-600 dark:text-gray-300">{icon}</div>
    <span className="text-gray-800 dark:text-gray-100 font-medium">{label}</span>
  </button>
);

const AttachmentMenu: React.FC<AttachmentMenuProps> = ({ isOpen, onClose, onOptionClick }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose}></div>
      <div className="absolute bottom-full mb-3 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-20">
        <div className="grid grid-cols-4 gap-2 mb-4">
          <TopOption icon={<Camera size={28} />} label="Camera" onClick={() => onOptionClick('camera')} />
          <TopOption icon={<ScreenShare size={28} />} label="Screen" onClick={() => onOptionClick('screen_share')} />
          <TopOption icon={<Images size={28} />} label="Photos" onClick={() => onOptionClick('photos')} />
          <TopOption icon={<Folder size={28} />} label="Files" onClick={() => onOptionClick('files')} />
        </div>
        <div className="flex flex-col space-y-1">
          <ListOption icon={<BrainCircuit size={24} />} label="Think longer" onClick={() => onOptionClick('think_longer')} />
          <ListOption icon={<Telescope size={24} />} label="Deep research" onClick={() => onOptionClick('deep_research')} />
          <ListOption icon={<BookOpen size={24} />} label="Study and learn" onClick={() => onOptionClick('study_learn')} />
          <ListOption icon={<Palette size={24} />} label="Create image" onClick={() => onOptionClick('create_image')} />
          <ListOption icon={<Globe size={24} />} label="Web search" onClick={() => onOptionClick('web_search')} />
        </div>
      </div>
    </>
  );
};

export default AttachmentMenu;