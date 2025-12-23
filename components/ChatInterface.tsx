
import React, { useState, useRef, useEffect } from 'react';
import type { Message, SimulatedFunctionCall, GroundingChunk } from '../types';
import { Send, Mic, Settings, Bot, User, Menu, Images, Radio, Cog, MapPin, ExternalLink } from 'lucide-react';
import CodeBlock from './CodeBlock';
import SuggestionChips from './SuggestionChips';
import AttachmentMenu from './AttachmentMenu';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string, image?: string) => void;
  isSending: boolean;
  onSettingsClick: () => void;
  onToggleSidebar: () => void;
  onVoiceClick: () => void;
  onLiveClick: () => void;
  isVoiceSupported: boolean;
  userInput: string;
  setUserInput: (input: string) => void;
  onOpenCameraView: () => void;
  onOpenScreenShareView: () => void;
}

const ActionDisplay: React.FC<{ actions: SimulatedFunctionCall[] }> = ({ actions }) => (
  <div className="my-2 p-3 bg-blue-100/50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/30">
    <div className="flex items-center text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
      <Cog size={16} className="mr-2 animate-spin" />
      <span>Jarvis is performing actions...</span>
    </div>
    <ul className="space-y-1">
      {actions.map((action, i) => (
        <li key={i} className="text-xs font-mono bg-white dark:bg-gray-800 p-2 rounded shadow-sm">
          <span className="font-bold text-blue-600 dark:text-blue-400">{action.name}</span>
          <span className="text-gray-500 dark:text-gray-400">({JSON.stringify(action.args)})</span>
        </li>
      ))}
    </ul>
  </div>
);

const AnimatedMarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const lineAnimationData = lines.reduce((acc, line) => {
    const CHAR_TYPING_SPEED = 0.01;
    const PAUSE_BETWEEN_LINES = 0.05;
    const LINE_APPEAR_DURATION = 0.4;
    const previousTotalDuration = acc.length > 0 ? acc[acc.length - 1].cumulativeDuration : 0;
    const typingDuration = line.length * CHAR_TYPING_SPEED;
    const currentLineDuration = Math.max(LINE_APPEAR_DURATION, typingDuration);
    const cumulativeDuration = previousTotalDuration + currentLineDuration + PAUSE_BETWEEN_LINES;
    acc.push({ line, delay: previousTotalDuration, cumulativeDuration });
    return acc;
  }, [] as { line: string; delay: number; cumulativeDuration: number }[]);

  return (
    <>
      {lineAnimationData.map(({ line, delay }, lineIndex) => {
        const graphemes = (() => {
            try {
                return Array.from(new (Intl as any).Segmenter().segment(line)).map((s: any) => s.segment);
            } catch (e) {
                return line.split('');
            }
        })();
        return (
            <p key={lineIndex} style={{ minHeight: '1rem', whiteSpace: 'pre-wrap' }}>
              {graphemes.map((grapheme, charIndex) => (
                <span key={charIndex} className="letter" style={{ animationDelay: `${delay + (charIndex * 0.01)}s` }}>{grapheme}</span>
              ))}
              {line.length === 0 && '\u00A0'}
            </p>
        );
      })}
    </>
  );
};

const MapSourceCard: React.FC<{ chunk: GroundingChunk }> = ({ chunk }) => {
  if (!chunk.maps) return null;
  return (
    <a 
      href={chunk.maps.uri} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex flex-col p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
          <MapPin size={18} />
          <span className="font-semibold text-sm truncate max-w-[200px]">{chunk.maps.title || "View on Maps"}</span>
        </div>
        <ExternalLink size={14} className="text-gray-400 group-hover:text-primary-500" />
      </div>
      {/* FIX: Removed index access from placeAnswerSources as it is now an object, matching the updated GroundingChunk type. */}
      {chunk.maps.placeAnswerSources?.reviewSnippets?.[0]?.text && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 italic">
          "{chunk.maps.placeAnswerSources.reviewSnippets[0].text}"
        </p>
      )}
    </a>
  );
};

const MessageContent: React.FC<{ message: Message }> = ({ message }) => {
    const { text, sources, sender, actions } = message;
    const [showSources, setShowSources] = useState(false);

    useEffect(() => {
        if (sender === 'user' || !text || !sources || sources.length === 0) {
            setShowSources(true);
            return;
        }
        const timer = setTimeout(() => setShowSources(true), 1000); // Simple delay for appearance
        return () => clearTimeout(timer);
    }, [text, sources, sender]);

    if (!text && (!sources || sources.length === 0) && (!actions || actions.length === 0)) return null;
    const parts = text ? text.split(/(```[\s\S]*?```)/g) : [];

    return (
        <>
            {actions && actions.length > 0 && <ActionDisplay actions={actions} />}
            {parts.map((part, index) => {
                if (part.startsWith('```') && part.endsWith('```')) {
                    const content = part.slice(3, -3).trim();
                    const firstLineBreak = content.indexOf('\n');
                    let language = '';
                    let code = content;
                    if (firstLineBreak !== -1) {
                        const firstLine = content.substring(0, firstLineBreak).trim();
                        if (firstLine && !firstLine.includes(' ')) {
                            language = firstLine;
                            code = content.substring(firstLineBreak + 1);
                        }
                    }
                    return <CodeBlock key={index} language={language} code={code} />;
                }
                if (part.trim()) {
                    if (sender === 'bot') return <AnimatedMarkdownRenderer key={index} text={part} />;
                    else return <p key={index} style={{ whiteSpace: 'pre-wrap' }}>{part}</p>;
                }
                return null;
            })}
            {showSources && sources && sources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-300 dark:border-gray-600 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Sources & Map Data</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sources.map((source, index) => (
                            <React.Fragment key={index}>
                                {source.maps && <MapSourceCard chunk={source} />}
                                {source.web && source.web.uri && (
                                    <a 
                                        href={source.web.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2.5 text-sm bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                        <span className="truncate flex-grow">{source.web.title || source.web.uri}</span>
                                    </a>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isSending,
  onSettingsClick,
  onToggleSidebar,
  onVoiceClick,
  onLiveClick,
  isVoiceSupported,
  userInput,
  setUserInput,
  onOpenCameraView,
  onOpenScreenShareView,
}) => {
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSuggestionClick = (suggestion: string) => {
    setUserInput(suggestion);
    inputRef.current?.focus();
  };

  const handleSend = () => {
    if (userInput.trim() && !isSending) {
      onSendMessage(userInput);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleAttachmentOptionClick = (option: string) => {
    let promptText = '';
    switch (option) {
        case 'camera': onOpenCameraView(); setIsAttachmentMenuOpen(false); return;
        case 'screen_share': onOpenScreenShareView(); setIsAttachmentMenuOpen(false); return;
        case 'photos': onSendMessage('[Simulating attaching photo]'); setIsAttachmentMenuOpen(false); return;
        case 'files': onSendMessage('[Simulating attaching file]'); setIsAttachmentMenuOpen(false); return;
        case 'think_longer': promptText = 'Give me a detailed explanation of '; break;
        case 'deep_research': promptText = 'Do a deep research on '; break;
        case 'study_learn': promptText = 'Help me study and learn about '; break;
        case 'create_image': promptText = 'Create an image of '; break;
        case 'web_search': promptText = 'Search the web for the latest on '; break;
        default: setIsAttachmentMenuOpen(false); return;
    }
    setUserInput(promptText);
    inputRef.current?.focus();
    setIsAttachmentMenuOpen(false);
  };

  return (
    <main className="flex-grow flex flex-col bg-white dark:bg-gray-900 h-screen">
      <header className="flex justify-between items-center p-4 bg-primary-600 dark:bg-primary-800 text-white shadow-md z-10">
        <div className="flex items-center gap-2">
            <button onClick={onToggleSidebar} className="p-2 rounded-full hover:bg-primary-700 dark:hover:bg-primary-900 md:hidden">
                <Menu size={24} />
            </button>
            <h2 className="text-xl font-bold">Jarvis</h2>
        </div>
        <button onClick={onSettingsClick} className="p-2 rounded-full hover:bg-primary-700 dark:hover:bg-primary-900">
          <Settings size={24} />
        </button>
      </header>
      <div ref={chatBoxRef} className="flex-grow p-4 md:p-6 overflow-y-auto">
        {messages.length > 0 ? (
            <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((msg) => {
                const isLastMessage = msg.id === messages[messages.length - 1].id;
                const isLastBotMessage = isLastMessage && msg.sender === 'bot';
                return (
                  <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'bot' && (
                      <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white flex-shrink-0">
                      <Bot size={20} />
                      </div>
                  )}
                  <div className={`max-w-2xl w-fit ${msg.sender === 'user' ? 'px-4 py-3 rounded-2xl bg-primary-600 text-white rounded-br-none' : 'text-gray-800 dark:text-gray-100'}`}>
                      {msg.image && <img src={msg.image} alt="Media" className="rounded-lg mb-2 max-w-md max-h-96 object-contain"/>}
                      <MessageContent message={msg} />
                      {isSending && isLastBotMessage && !msg.image && !msg.text && !msg.actions ? <span className="inline-block animate-pulse">...</span> : ''}
                  </div>
                  {msg.sender === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-800 dark:text-white flex-shrink-0">
                      <User size={20} />
                      </div>
                  )}
                  </div>
                );
            })}
            </div>
        ) : (
            <SuggestionChips onSuggestionClick={handleSuggestionClick} />
        )}
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 md:p-6 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto flex items-center space-x-2 relative">
           <button onClick={() => setIsAttachmentMenuOpen(prev => !prev)} className="p-3 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0">
                <Images size={20} />
            </button>
            <AttachmentMenu isOpen={isAttachmentMenuOpen} onClose={() => setIsAttachmentMenuOpen(false)} onOptionClick={handleAttachmentOptionClick} />
          <input ref={inputRef} type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="Type a message or ask for a location..." className="flex-grow w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 dark:text-white" disabled={isSending}/>
          <button onClick={handleSend} disabled={isSending || !userInput.trim()} className="p-3 rounded-full bg-primary-600 text-white hover:bg-primary-700 disabled:bg-primary-300 dark:disabled:bg-primary-800 disabled:cursor-not-allowed">
            <Send size={20} />
          </button>
          {isVoiceSupported && (
            <>
             <button onClick={onVoiceClick} disabled={isSending} className="p-3 rounded-full bg-gray-600 text-white hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                <Mic size={20} />
            </button>
             <button onClick={onLiveClick} disabled={isSending} className="p-3 rounded-full bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed">
                <Radio size={20} />
            </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
};

export default ChatInterface;
