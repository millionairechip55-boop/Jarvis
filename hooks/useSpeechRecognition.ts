import { useState, useEffect, useRef, useCallback } from 'react';

// --- Type definitions for Web Speech API ---
// These types are not always included in default TS DOM typings, so we define them here.

interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
}

interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}
  
interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}
  
interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    grammars: any; // Using 'any' for simplicity, actual type is SpeechGrammarList
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    // FIX: Add missing onstart property to align with Web Speech API.
    onstart: (this: SpeechRecognition, ev: Event) => any;
    onresult: (this: SpeechRecognition, ev: SpeechRecognitionEvent) => any;
    onerror: (this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any;
    onend: (this: SpeechRecognition, ev: Event) => any;
    start(): void;
    stop(): void;
}

interface SpeechRecognitionStatic {
    new (): SpeechRecognition;
}
  
declare global {
    interface Window {
      SpeechRecognition: SpeechRecognitionStatic;
      webkitSpeechRecognition: SpeechRecognitionStatic;
    }
}
// --- End of Type definitions ---


// The SpeechRecognition interface is vendor-prefixed in some browsers.
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

interface SpeechRecognitionOptions {
    lang?: string;
}

export const useSpeechRecognition = (options: SpeechRecognitionOptions = {}) => {
    const { lang = 'en-US' } = options;
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    useEffect(() => {
        if (!SpeechRecognition) {
            setError('Speech recognition is not supported in this browser.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = lang;
        recognition.interimResults = false;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const currentTranscript = event.results[0][0].transcript;
            setTranscript(currentTranscript);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            // Don't show an error for 'aborted' as it's often user-initiated
            // (e.g., stopping listening) or a timeout, which is not a critical error.
            // onend() will be called next, which will set isListening to false.
            if (event.error === 'aborted') {
                return;
            }

            let friendlyError = '';
            switch (event.error) {
                case 'not-allowed':
                case 'service-not-allowed':
                    friendlyError = 'Microphone permission denied. Please enable it in your browser settings to use voice input.';
                    break;
                case 'no-speech':
                    friendlyError = 'No speech was detected. Please try speaking closer to the microphone.';
                    break;
                case 'audio-capture':
                    friendlyError = 'Could not capture audio. Please check that your microphone is connected and working correctly.';
                    break;
                case 'network':
                    friendlyError = 'A network error occurred during speech recognition. Please check your internet connection.';
                    break;
                default:
                    friendlyError = `An unexpected error occurred: ${event.error}`;
                    console.error('Speech recognition error:', event);
                    break;
            }
            setError(friendlyError);
            setIsListening(false);
        };
        
        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [lang]);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            setTranscript('');
            setError(null);
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                // This can happen if start() is called while it's already starting.
                console.info("Could not start speech recognition", e);
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                 console.info("Speech recognition could not be stopped.", e);
            }
            setIsListening(false);
        }
    }, [isListening]);

    return {
        isListening,
        transcript,
        error,
        startListening,
        stopListening,
        isSupported: !!SpeechRecognition
    };
};