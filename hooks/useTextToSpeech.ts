import { useState, useEffect, useCallback } from 'react';

// A good default voice URI for a male British accent often found in browsers.
const PREFERRED_VOICE_URI = "Google UK English Male";

export const useTextToSpeech = (selectedVoiceURI: string | null) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            setIsSupported(true);

            const getVoices = () => {
                const availableVoices = window.speechSynthesis.getVoices();
                if (availableVoices.length > 0) {
                    setVoices(availableVoices);
                }
            };
            
            // Voices can load asynchronously.
            if (window.speechSynthesis.getVoices().length > 0) {
                getVoices();
            } else {
                window.speechSynthesis.onvoiceschanged = getVoices;
            }
        }
    }, []);

    const speak = useCallback((text: string, lang: string, onEnd?: () => void, onStart?: () => void) => {
        if (!isSupported || !text.trim()) {
            onEnd?.();
            return;
        }

        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length === 0) {
            console.warn("TTS voices not loaded yet. Speech aborted.");
            onEnd?.();
            return;
        }
        
        // Cancel any ongoing speech to prevent overlap
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Find a voice that strictly matches the required language.
        const targetLangPrefix = lang.split('-')[0];
        const langVoices = availableVoices.filter(v => v.lang.startsWith(targetLangPrefix));

        // Strict Check: If no voices for this language are available, abort.
        if (langVoices.length === 0) {
            console.warn(`No voice available for language "${lang}". Speech will not be played.`);
            onEnd?.();
            return;
        }

        let voiceToUse: SpeechSynthesisVoice | undefined;
        
        // 1. Prioritize user's selected voice if it matches the target language.
        const userSelectedVoice = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
        if (userSelectedVoice && userSelectedVoice.lang.startsWith(targetLangPrefix)) {
            voiceToUse = userSelectedVoice;
        }

        // 2. If no suitable user voice, find the best available alternative using a scoring system.
        if (!voiceToUse) {
            const scoredVoices = langVoices.map(voice => {
                let score = 0;
                const name = voice.name.toLowerCase();
                // High-quality vendors get a big boost.
                if (name.includes('google') || name.includes('microsoft')) score += 5;
                // Keywords suggesting better quality.
                if (name.includes('natural') || name.includes('enhanced')) score += 3;
                // Prefer non-default voices as they might be user-installed/premium.
                if (!voice.default) score += 2;
                // Prefer local voices for speed and offline capability.
                if (voice.localService) score += 1;
                return { voice, score };
            });

            // Sort by score descending to find the best voice.
            scoredVoices.sort((a, b) => b.score - a.score);
            
            if (scoredVoices.length > 0) {
                voiceToUse = scoredVoices[0].voice;
            }
        }
        
        // This final check is for absolute safety.
        if (!voiceToUse) {
            console.warn(`Could not determine a suitable voice for language "${lang}" after trying all fallbacks. Using first available.`);
            voiceToUse = langVoices[0];
        }

        utterance.voice = voiceToUse;
        // Ensure the utterance lang matches the voice for best pronunciation.
        utterance.lang = voiceToUse.lang;

        utterance.onstart = () => {
            setIsSpeaking(true);
            onStart?.();
        };
        utterance.onend = () => {
            setIsSpeaking(false);
            onEnd?.();
        };
        utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
            setIsSpeaking(false);
            // It's common for speech to be interrupted by a new speech request.
            // We shouldn't treat 'interrupted' or 'canceled' as an error.
            if (event.error !== 'interrupted' && event.error !== 'canceled') {
              console.error("An error occurred during speech synthesis:", event.error);
            }
            onEnd?.(); // Also call onEnd on error to prevent getting stuck
        };
        
        window.speechSynthesis.speak(utterance);
    }, [isSupported, selectedVoiceURI]);

    const cancel = useCallback(() => {
        if (isSupported) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    }, [isSupported]);

    return { isSpeaking, speak, cancel, isSupported, voices };
};
