import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    }, (err) => {
      console.error('Failed to copy text: ', err);
    });
  };

  return (
    <div className="bg-gray-900 rounded-lg my-4 overflow-hidden">
      <div className="flex justify-between items-center px-4 py-1.5 bg-gray-700 dark:bg-gray-800">
        <span className="text-xs text-gray-300 font-sans">{language || 'code'}</span>
        <button 
          onClick={handleCopy} 
          className="text-gray-300 hover:text-white flex items-center text-xs p-1 rounded-md"
          aria-label="Copy code"
        >
          {isCopied ? <Check size={14} className="mr-1 text-green-400" /> : <Copy size={14} className="mr-1" />}
          {isCopied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm">
        <code className={`language-${language} text-white`}>
          {code}
        </code>
      </pre>
    </div>
  );
};

export default CodeBlock;
