
import React, { useState, useEffect, useCallback } from 'react';
import type { Message, Conversation, GroundingChunk, SimulatedFunctionCall } from './types';
import { Content } from '@google/genai';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import ConversationHistory from './components/ConversationHistory';
import ChatInterface from './components/ChatInterface';
import SettingsPanel from './components/SettingsPanel';
import VoiceInputModal from './components/VoiceInputModal';
import LiveSessionOverlay from './components/LiveSessionOverlay';
import CameraView from './components/CameraView';
import ScreenShareView from './components/ScreenShareView';
import { getResponse, generateImage, analyzeUserPrompt, deviceControlTools, mapMessagesToGeminiHistory } from './services/geminiService';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useTextToSpeech } from './hooks/useTextToSpeech';

const uniqueId = () => `id-${Date.now()}-${Math.random().toString(36).substring(2)}`;

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isCameraViewOpen, setIsCameraViewOpen] = useState(false);
  const [isScreenShareViewOpen, setIsScreenShareViewOpen] = useState(false);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(() => localStorage.getItem('jarvis_voiceOutputEnabled') === 'true');
  const [isTutorModeEnabled, setIsTutorModeEnabled] = useState(() => localStorage.getItem('jarvis_tutorModeEnabled') === 'true');
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(() => localStorage.getItem('jarvis_selectedVoiceURI'));
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => localStorage.getItem('jarvis_selectedLanguage') || 'en-US');
  const [longTermMemory, setLongTermMemory] = useState<string>(() => localStorage.getItem('jarvis_longTermMemory') || '');

  const { isListening, startListening, stopListening, isSupported } = useSpeechRecognition({ lang: selectedLanguage });
  const { speak, cancel: cancelSpeech, voices } = useTextToSpeech(selectedVoiceURI);
  
  const stripMarkdown = (text: string): string => {
    if (!text) return '';
    return text.replace(/```[\s\S]*?```/g, ' ').replace(/^\s*[\*\-]\s/gm, ', ').replace(/`([^`]+)`/g, '$1').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/^\s*#+\s/gm, '').replace(/\n/g, '. ').replace(/ +/g, ' ').trim();
  };

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 5000 }
      );
    });
  };

  const updateConversationState = useCallback((chatId: string, isNew: boolean, userPrompt: string, finalMessages: Message[]) => {
    const conversationTitle = isNew ? userPrompt.substring(0, 30) + (userPrompt.length > 30 ? '...' : '') : conversations.find(c => c.id === chatId)?.title || 'Chat';
    const updatedConversation: Conversation = { id: chatId, title: conversationTitle, messages: finalMessages };
    if (isNew) {
        setConversations(prev => [updatedConversation, ...prev]);
        setCurrentChatId(chatId);
    } else {
        setConversations(prev => prev.map(c => c.id === chatId ? updatedConversation : c));
    }
  }, [conversations]);

  const handleSendMessage = useCallback(async (userPrompt: string, imageBase64?: string) => {
    cancelSpeech();
    setIsSending(true);
    setUserInput('');
    const isNewConversation = !currentChatId;
    const newChatId = currentChatId || uniqueId();
    const userMessage: Message = { id: uniqueId(), sender: 'user', text: userPrompt, ...(imageBase64 && { image: imageBase64 }) };
    const botMessageId = uniqueId();
    const botMessagePlaceholder: Message = { id: botMessageId, sender: 'bot', text: '' };
    const currentMessages = [...messages, userMessage, botMessagePlaceholder];
    setMessages(currentMessages);

    try {
        const analysis = await analyzeUserPrompt(userPrompt);
        
        if (analysis.intent === 'image_generation' && analysis.imagePrompt) {
            const imageUrl = await generateImage(analysis.imagePrompt);
            const finalBotMsg: Message = { id: botMessageId, sender: 'bot', text: `Here is the image I created for you:`, image: imageUrl };
            setMessages(prev => [...prev.slice(0, -1), finalBotMsg]);
            setIsSending(false);
            return;
        }

        let toolsConfig: any = { tools: [{ googleSearch: {} }] };
        if (analysis.intent === 'device_control') {
            toolsConfig = { tools: [{ functionDeclarations: deviceControlTools }] };
        } else if (analysis.intent === 'location_query') {
            const coords = await getCurrentLocation();
            toolsConfig = { tools: [{ googleMaps: {} }, { googleSearch: {} }] };
            if (coords) {
                toolsConfig.toolConfig = { retrievalConfig: { latLng: coords } };
            }
        }

        const history = mapMessagesToGeminiHistory(messages);
        const userParts: any[] = [{ text: userPrompt }];
        if (imageBase64) userParts.unshift({ inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } });
        const contents: Content[] = [...history, { role: 'user', parts: userParts }];

        const responseStream = await getResponse(contents, longTermMemory, selectedLanguage, toolsConfig);
        let fullResponseText = '';
        let groundingChunks: GroundingChunk[] = [];
        
        for await (const chunk of responseStream) {
            if (chunk.text) fullResponseText += chunk.text;
            if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                groundingChunks.push(...(chunk.candidates[0].groundingMetadata.groundingChunks as any[]));
            }
            setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last) {
                    last.text = fullResponseText;
                    if (groundingChunks.length > 0) last.sources = groundingChunks;
                }
                return updated;
            });
        }

        if (analysis.isSetLocationCommand && groundingChunks.length > 0) {
            const mapChunk = groundingChunks.find(c => c.maps?.uri);
            if (mapChunk?.maps?.uri) {
                setTimeout(() => {
                    window.open(mapChunk.maps!.uri, '_blank');
                }, 1000);
            }
        }

        if (isVoiceOutputEnabled) speak(stripMarkdown(fullResponseText), selectedLanguage);

    } catch (error: any) {
        console.error("Chat error:", error);
        let errorMsg = "I encountered a problem connecting to my servers.";
        if (error?.status === 503 || error?.message?.includes('503')) {
            errorMsg = "My brain is a bit overloaded right now (503 Service Unavailable). Please try again in a few seconds!";
        } else if (error?.status === 429) {
            errorMsg = "Whoa, slow down! I've reached my message limit for now. Please wait a bit.";
        }
        
        setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last) last.text = errorMsg;
            return updated;
        });
    } finally {
        setIsSending(false);
        setMessages(final => { updateConversationState(newChatId, isNewConversation, userPrompt, final); return final; });
    }
  }, [cancelSpeech, currentChatId, messages, longTermMemory, selectedLanguage, updateConversationState, isVoiceOutputEnabled, speak]);

  useEffect(() => {
    const loggedIn = localStorage.getItem('jarvis_loggedIn') === 'true';
    if (loggedIn) {
        const stored = JSON.parse(localStorage.getItem('jarvis_conversations') || '[]');
        setIsLoggedIn(true); setConversations(stored); setUserEmail(localStorage.getItem('jarvis_userEmail'));
        if (stored.length > 0) { setCurrentChatId(stored[0].id); setMessages(stored[0].messages); }
    }
    setTimeout(() => setShowSplash(false), 800);
  }, []);

  return (
    <div className={`flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300`}>
      <SplashScreen show={showSplash} />
      {!isLoggedIn && !showSplash && <LoginScreen onLogin={(e) => {localStorage.setItem('jarvis_loggedIn', 'true'); localStorage.setItem('jarvis_userEmail', e); setIsLoggedIn(true); setUserEmail(e); }} />}
      {isLoggedIn && !showSplash && (
        <>
          <div className={`fixed top-0 left-0 h-full z-20 md:static transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
             <ConversationHistory conversations={conversations.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()))} onHistoryItemClick={(id) => { const c = conversations.find(x => x.id === id); if(c) { setCurrentChatId(id); setMessages(c.messages); if(window.innerWidth <= 768) setIsSidebarOpen(false); }}} onNewChat={() => { setCurrentChatId(null); setMessages([]); }} activeChatId={currentChatId} searchTerm={searchTerm} onSearchChange={setSearchTerm} />
          </div>
          <ChatInterface messages={messages} onSendMessage={handleSendMessage} isSending={isSending} onSettingsClick={() => setIsSettingsOpen(true)} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onVoiceClick={startListening} onLiveClick={() => setIsLiveActive(true)} isVoiceSupported={isSupported} userInput={userInput} setUserInput={setUserInput} onOpenCameraView={() => setIsCameraViewOpen(true)} onOpenScreenShareView={() => setIsScreenShareViewOpen(true)} />
          <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onLogout={() => { localStorage.clear(); setIsLoggedIn(false); setConversations([]); }} isVoiceOutputEnabled={isVoiceOutputEnabled} onToggleVoiceOutput={() => setIsVoiceOutputEnabled(!isVoiceOutputEnabled)} voices={voices} selectedVoiceURI={selectedVoiceURI} onVoiceChange={setSelectedVoiceURI} onClearLongTermMemory={() => setLongTermMemory('')} isTutorModeEnabled={isTutorModeEnabled} onToggleTutorMode={() => setIsTutorModeEnabled(!isTutorModeEnabled)} />
          <VoiceInputModal isListening={isListening} onStop={stopListening} />
          {isLiveActive && <LiveSessionOverlay onEnd={() => setIsLiveActive(false)} selectedVoiceURI={selectedVoiceURI} selectedLanguage={selectedLanguage} isTutorModeEnabled={isTutorModeEnabled} />}
          <CameraView isOpen={isCameraViewOpen} onClose={() => setIsCameraViewOpen(false)} onSend={(p, i) => handleSendMessage(p, i)} />
          <ScreenShareView isOpen={isScreenShareViewOpen} onClose={() => setIsScreenShareViewOpen(false)} onSend={(p, i) => handleSendMessage(p, i)} />
        </>
      )}
    </div>
  );
};

export default App;
