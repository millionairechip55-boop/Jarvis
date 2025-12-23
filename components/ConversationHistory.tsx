import React from 'react';
import { Search, FilePenLine, Library, LayoutGrid, MessageSquare } from 'lucide-react';
import type { Conversation } from '../types';

interface ConversationHistoryProps {
  conversations: Conversation[];
  onHistoryItemClick: (id: string) => void;
  onNewChat: () => void;
  activeChatId: string | null;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

const NavItem: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void; disabled?: boolean }> = ({ icon, label, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center p-2.5 text-sm rounded-lg transition-colors duration-200 ${
      disabled 
        ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' 
        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
    }`}
  >
    <div className="w-6 h-6 mr-3 flex items-center justify-center">{icon}</div>
    <span>{label}</span>
  </button>
);


const ConversationHistory: React.FC<ConversationHistoryProps> = ({ conversations, onHistoryItemClick, onNewChat, activeChatId, searchTerm, onSearchChange }) => {
  return (
    <aside className="w-72 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 dark:text-white"
        />
      </div>

      <nav className="flex flex-col space-y-1 mb-4">
        <NavItem icon={<FilePenLine size={20} />} label="New chat" onClick={onNewChat} />
        <NavItem icon={<Library size={20} />} label="Library" disabled />
        <NavItem icon={<LayoutGrid size={20} />} label="Apps" disabled />
      </nav>

      <hr className="border-gray-200 dark:border-gray-700" />
      
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 px-2.5 mt-4 mb-2 flex items-center">
        <MessageSquare size={16} className="mr-2"/>
        Chats
      </h3>

      <ul className="space-y-1 overflow-y-auto flex-grow">
        {conversations.length > 0 ? (
          conversations.map((conv) => (
            <li key={conv.id}>
              <button
                onClick={() => onHistoryItemClick(conv.id)}
                className={`w-full text-left text-sm p-2.5 rounded-lg truncate transition-colors duration-200 ${
                    activeChatId === conv.id 
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-200 font-semibold'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                title={conv.title}
              >
                {conv.title}
              </button>
            </li>
          ))
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 p-2.5">No matching chats.</p>
        )}
      </ul>
    </aside>
  );
};

export default ConversationHistory;