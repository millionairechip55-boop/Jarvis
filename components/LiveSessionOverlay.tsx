
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, MicOff, Mic, Eye, EyeOff, AlertCircle, MapPin } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';

// --- Audio Utilities ---
function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

function createBlob(data: Float32Array): { data: string; mimeType: string } {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

// --- Visual Dot Animation ---
class Dot {
    x: number; y: number; radius: number; orbitRadius: number; orbitAngle: number; orbitSpeed: number;
    currentOrbitRadius: number; growSpeed: number;
    color: string;

    constructor(centerX: number, centerY: number, baseRadius: number) {
        this.x = centerX; this.y = centerY;
        this.radius = Math.random() * 1.5 + 0.8;
        this.orbitRadius = Math.sqrt(Math.random()) * baseRadius;
        this.orbitAngle = Math.random() * Math.PI * 2;
        this.orbitSpeed = Math.random() * 0.006 + 0.002;
        this.currentOrbitRadius = 0;
        this.growSpeed = 0.03;
        this.color = `rgba(59, 130, 246, ${Math.random() * 0.4 + 0.2})`;
    }

    update(amp: number, centerX: number, centerY: number, time: number) {
        if (this.currentOrbitRadius < this.orbitRadius) {
            this.currentOrbitRadius += this.growSpeed * this.orbitRadius;
        }
        
        this.orbitAngle += this.orbitSpeed;
        
        const idlePulse = Math.sin(time * 0.002 + this.orbitAngle) * 5;
        const reactivePulse = amp * 180;
        const currentRadius = this.currentOrbitRadius + idlePulse + reactivePulse;
        
        const targetX = centerX + currentRadius * Math.cos(this.orbitAngle);
        const targetY = centerY + currentRadius * Math.sin(this.orbitAngle);
        
        this.x += (targetX - this.x) * 0.1;
        this.y += (targetY - this.y) * 0.1;

        if (amp > 0.05) {
            this.x += (Math.random() - 0.5) * amp * 15;
            this.y += (Math.random() - 0.5) * amp * 15;
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

const openMapFunction: FunctionDeclaration = {
  name: 'openMap',
  parameters: {
    type: Type.OBJECT,
    description: 'Opens a map or navigates to a specific location.',
    properties: {
      location: {
        type: Type.STRING,
        description: 'The name or address of the location to show on the map.',
      }
    },
    required: ['location'],
  },
};

interface LiveSessionOverlayProps {
    onEnd: () => void;
    isTutorModeEnabled: boolean;
    selectedVoiceURI: string | null;
    selectedLanguage: string;
}

const LiveSessionOverlay: React.FC<LiveSessionOverlayProps> = ({ 
    onEnd, 
    isTutorModeEnabled,
    selectedVoiceURI,
    selectedLanguage 
}) => {
    const [isMuted, setIsMuted] = useState(false);
    const [inputTranscription, setInputTranscription] = useState('');
    const [outputTranscription, setOutputTranscription] = useState('');
    const [showCaptions, setShowCaptions] = useState(true);
    const [criticalError, setCriticalError] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(true);
    const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dotsRef = useRef<Dot[]>([]);
    const nextStartTimeRef = useRef(0);
    const amplitudeRef = useRef(0);
    const userAmplitudeRef = useRef(0);
    const animationFrameId = useRef<number>(0);
    
    const sessionRef = useRef<any>(null);
    const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const cleanup = useCallback(() => {
        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
        sourcesRef.current.clear();
        if (audioContextsRef.current) {
            audioContextsRef.current.input.close();
            audioContextsRef.current.output.close();
            audioContextsRef.current = null;
        }
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    }, []);

    const getCurrentLocation = (): Promise<GeolocationPosition | null> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) return resolve(null);
            navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 5000 });
        });
    };

    const startSession = useCallback(async () => {
        setIsConnecting(true);
        setCriticalError(null);
        
        try {
            if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
                await window.aistudio.openSelectKey();
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            await inputAudioContext.resume();
            await outputAudioContext.resume();
            
            audioContextsRef.current = { input: inputAudioContext, output: outputAudioContext };

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const location = await getCurrentLocation();
            if (location) setUserLocation({lat: location.coords.latitude, lng: location.coords.longitude});
            
            const systemInstruction = `You are Jarvis, a helpful AI assistant created by Mr. Kalpesh.
Always answer "Made by Mr. Kalpesh." if asked about your origin.
Keep responses concise.
REAL-TIME SENSOR DATA:
- Current Physical Location: ${location ? `Latitude ${location.coords.latitude}, Longitude ${location.coords.longitude}` : 'Sensors reporting unknown location'}.
- You can "see" where the user is. If they ask where they are, use this data to describe their area.
- If asked to open maps or find something nearby, use the openMap tool.
${isTutorModeEnabled ? "Act as a tutor. Correct mistakes in user speech." : ""}`;

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setIsConnecting(false);
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        scriptProcessor.onaudioprocess = (e) => {
                            if (isMuted) {
                                userAmplitudeRef.current = 0;
                                return;
                            }
                            const inputData = e.inputBuffer.getChannelData(0);
                            
                            let sum = 0;
                            for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                            userAmplitudeRef.current = Math.sqrt(sum / inputData.length);

                            const pcmBlob = createBlob(inputData);
                            sessionPromise.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            setInputTranscription(prev => prev + message.serverContent!.inputTranscription!.text);
                        }
                        if (message.serverContent?.outputTranscription) {
                            setOutputTranscription(prev => prev + message.serverContent!.outputTranscription!.text);
                        }
                        if (message.serverContent?.turnComplete) {
                            setTimeout(() => {
                                setInputTranscription('');
                                setOutputTranscription('');
                            }, 3000);
                        }

                        if (message.toolCall) {
                            for (const fc of message.toolCall.functionCalls) {
                                if (fc.name === 'openMap') {
                                    const loc = (fc.args as any).location;
                                    window.open(`https://www.google.com/maps/search/${encodeURIComponent(loc)}`, '_blank');
                                    sessionPromise.then(s => s.sendToolResponse({
                                        functionResponses: { id: fc.id, name: fc.name, response: { result: "OK" } }
                                    }));
                                }
                            }
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio) {
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                            
                            const source = outputAudioContext.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContext.destination);
                            
                            source.addEventListener('ended', () => {
                                sourcesRef.current.delete(source);
                                if (sourcesRef.current.size === 0) amplitudeRef.current = 0;
                            });

                            const rawData = audioBuffer.getChannelData(0);
                            let sum = 0;
                            for (let i = 0; i < rawData.length; i++) sum += rawData[i] * rawData[i];
                            amplitudeRef.current = Math.sqrt(sum / rawData.length);

                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }

                        if (message.serverContent?.interrupted) {
                            for (const source of sourcesRef.current.values()) {
                                try { source.stop(); } catch(e) {}
                                sourcesRef.current.delete(source);
                            }
                            nextStartTimeRef.current = 0;
                            amplitudeRef.current = 0;
                        }
                    },
                    onerror: (e) => {
                        console.error("Live Socket Error", e);
                        setIsConnecting(false);
                        setCriticalError("Network issue. Please retry.");
                    },
                    onclose: () => onEnd()
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                    tools: [{ functionDeclarations: [openMapFunction] }],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                    systemInstruction
                }
            });

            sessionRef.current = await sessionPromise;
        } catch (e: any) {
            console.error(e);
            setIsConnecting(false);
            setCriticalError("Failed to start session. " + (e.message || ""));
        }
    }, [isMuted, isTutorModeEnabled, onEnd]);

    useEffect(() => {
        startSession();
        return cleanup;
    }, [cleanup]);

    // Visualizer Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const dpr = window.devicePixelRatio || 1;
        const handleResize = () => {
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.scale(dpr, dpr);
            
            const baseRadius = Math.min(window.innerWidth, window.innerHeight) * 0.18;
            dotsRef.current = Array.from({ length: 200 }, () => new Dot(window.innerWidth / 2, window.innerHeight / 2, baseRadius));
        };
        
        handleResize();
        window.addEventListener('resize', handleResize);

        const animate = (time: number) => {
            const w = window.innerWidth / 2;
            const h = window.innerHeight / 2;
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            
            const combinedAmp = Math.max(amplitudeRef.current, userAmplitudeRef.current);
            
            const baseRadius = Math.min(window.innerWidth, window.innerHeight) * 0.18;
            const gradient = ctx.createRadialGradient(w, h, baseRadius * 0.1, w, h, baseRadius * (1.2 + combinedAmp * 2.5));
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.12)');
            gradient.addColorStop(0.6, 'rgba(59, 130, 246, 0.04)');
            gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(w, h, baseRadius * 3, 0, Math.PI * 2);
            ctx.fill();

            dotsRef.current.forEach(dot => {
                dot.update(combinedAmp, w, h, time);
                dot.draw(ctx);
            });
            
            animationFrameId.current = requestAnimationFrame(animate);
        };
        animationFrameId.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        };
    }, []);

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-between p-4 overflow-hidden">
            {criticalError && (
                <div className="absolute inset-0 bg-white/95 z-[60] flex items-center justify-center p-6 text-center">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 max-w-sm flex flex-col items-center">
                        <AlertCircle size={48} className="text-red-500 mb-4" />
                        <p className="text-gray-900 font-bold mb-2 text-xl">Connection Error</p>
                        <p className="text-gray-500 mb-8">{criticalError}</p>
                        <div className="flex flex-col w-full gap-3">
                            <button onClick={startSession} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">Retry</button>
                            <button onClick={onEnd} className="w-full py-3 bg-gray-50 text-gray-700 rounded-xl font-bold">Close</button>
                        </div>
                    </div>
                </div>
            )}
            
            <header className="w-full flex justify-between items-center z-10">
                <button onClick={() => setShowCaptions(!showCaptions)} className="p-3 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full transition-colors">
                    {showCaptions ? <EyeOff size={24} /> : <Eye size={24} />}
                </button>
                <div className="flex flex-col items-center">
                    <div className="text-blue-600 font-mono text-[10px] tracking-[0.4em] font-bold opacity-60 uppercase">
                        {isConnecting ? 'Initializing...' : 'Jarvis Native'}
                    </div>
                    {userLocation && (
                        <div className="flex items-center gap-1 text-[8px] text-gray-400 font-medium">
                            <MapPin size={8} />
                            <span>GPS Active</span>
                        </div>
                    )}
                </div>
                <button onClick={onEnd} className="p-3 text-gray-400 hover:text-red-500 bg-gray-50 rounded-full transition-colors">
                    <X size={24} />
                </button>
            </header>

            <main className="w-full flex-grow relative flex items-center justify-center pointer-events-none">
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                
                {showCaptions && (
                    <div className="relative z-10 w-full max-w-2xl text-center space-y-6 px-4">
                        {isConnecting && (
                            <p className="text-gray-400 font-medium animate-pulse">Establishing voice link...</p>
                        )}
                        {outputTranscription && (
                            <p className="text-2xl md:text-4xl text-gray-900 font-bold leading-tight drop-shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {outputTranscription}
                            </p>
                        )}
                        {inputTranscription && (
                            <p className="text-sm md:text-lg text-blue-500/60 font-medium italic animate-pulse">
                                listening: {inputTranscription}
                            </p>
                        )}
                    </div>
                )}
            </main>

            <footer className="w-full flex flex-col items-center pb-12 gap-6 z-10">
                <button 
                    onClick={() => setIsMuted(!isMuted)} 
                    disabled={isConnecting}
                    className={`p-8 rounded-full transition-all duration-300 transform active:scale-90 shadow-xl ${isConnecting ? 'opacity-30' : 'opacity-100'} ${isMuted ? 'bg-red-50 text-red-500 shadow-red-100' : 'bg-blue-50 text-blue-600 shadow-blue-100 hover:scale-110'}`}
                >
                    {isMuted ? <MicOff size={32} /> : <Mic size={32} />}
                </button>
                <div className="h-4">
                    {isMuted && <span className="text-red-500 text-[10px] font-bold tracking-[0.2em] uppercase animate-in fade-in">Microphone Paused</span>}
                </div>
            </footer>
        </div>
    );
};

export default LiveSessionOverlay;
