import React from 'react';
import { UserCircle, PlusCircle } from 'lucide-react';

interface GoogleAccountChooserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: () => void;
  email: string;
}

const GoogleIconSvg = () => (
    <svg className="w-6 h-6" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path>
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path>
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.223 0-9.641-3.657-11.303-8.653l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path>
        <path fill="#1976D2" d="M43.611 20.083H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C43.021 36.251 46 30.561 46 24c0-1.341-.138-2.65-.389-3.917z"></path>
    </svg>
);

const AccountItem: React.FC<{ name: string; email: string; onClick: () => void; icon?: React.ReactNode; }> = ({ name, email, onClick, icon }) => (
    <li
        onClick={onClick}
        className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
    >
        <div className="w-10 h-10 flex items-center justify-center mr-4">
            {icon || <UserCircle size={40} className="text-gray-500 dark:text-gray-400" />}
        </div>
        <div className="flex flex-col">
            <span className="font-semibold text-gray-800 dark:text-gray-100">{name}</span>
            {email && <span className="text-sm text-gray-500 dark:text-gray-400">{email}</span>}
        </div>
    </li>
);

const GoogleAccountChooser: React.FC<GoogleAccountChooserProps> = ({ isOpen, onClose, onSelectAccount, email }) => {
    if (!isOpen) return null;

    // Create a display name from the email, or use a default
    const getDisplayName = (emailStr: string) => {
        if (!emailStr || !emailStr.includes('@')) {
            return "Primary User";
        }
        return emailStr.split('@')[0]
            .replace(/[._-]/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const primaryEmail = email || 'your.email@example.com';
    const primaryName = getDisplayName(primaryEmail);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 text-center">
                    <div className="flex justify-center items-center mb-2">
                        <GoogleIconSvg />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Choose an account</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">to continue to Jarvis AI Assistant</p>
                </div>
                <div className="p-4">
                    <ul className="space-y-2">
                        <AccountItem name={primaryName} email={primaryEmail} onClick={onSelectAccount} />
                        <AccountItem 
                            name="Use another account" 
                            email="" 
                            onClick={onSelectAccount} 
                            icon={<PlusCircle size={32} className="text-gray-500 dark:text-gray-400" />}
                        />
                    </ul>
                </div>
                <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                        To continue, Google will share your name, email address, and profile picture with Jarvis AI Assistant.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GoogleAccountChooser;