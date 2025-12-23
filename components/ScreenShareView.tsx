import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, RefreshCw, Mic, Camera as CaptureIcon } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import VoiceInputModal from './VoiceInputModal';

interface ScreenShareViewProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (prompt: string, image: string) => void;
}

type ViewMode = 'sharing' | 'preview';

const ScreenShareView: React.FC<ScreenShareViewProps> = ({ isOpen, onClose, onSend }) => {
  const [mode, setMode] = useState<ViewMode>('sharing');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      setPrompt(transcript);
    }
  }, [transcript]);

  const handleClose = useCallback(() => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
    }
    onClose();
  }, [stream, onClose]);

  const startScreenShare = useCallback(async () => {
    let mediaStream;
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        mediaStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
      } else if ((navigator as any).getDisplayMedia) { // Non-standard fallback
        mediaStream = await (navigator as any).getDisplayMedia({
          video: true,
        });
      } else {
        setError("Screen sharing is not supported by your browser or is unavailable in the current context (e.g., not on a secure HTTPS connection).");
        return;
      }

      mediaStream.getVideoTracks()[0].onended = () => {
        handleClose();
      };

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setMode('sharing');
      setError(null);
    } catch (err) {
      console.error("Error starting screen share:", err);
      if (err instanceof Error && err.name === 'NotAllowedError') {
          // User cancelled, which is normal. Close the view.
          handleClose();
      } else {
          // A different error occurred.
          setError("Screen share was cancelled or failed. Please try again.");
          // Don't close, so user can see the error message.
      }
    }
  }, [handleClose]);


  useEffect(() => {
    if (isOpen) {
      startScreenShare();
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      // Reset state on close
      setTimeout(() => {
        setMode('sharing');
        setCapturedImage(null);
        setError(null);
        setPrompt('');
      }, 300); // Delay for animation
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current && stream) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        setPrompt('What is on this screen?');
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
        setMode('preview');
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setPrompt('');
    startScreenShare();
  };

  const handleSend = () => {
    if (capturedImage) {
      onSend(prompt, capturedImage);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4 transition-opacity duration-300">
      <button onClick={handleClose} className="absolute top-4 right-4 text-white p-2 bg-black/50 rounded-full hover:bg-black/80 transition-colors z-20" aria-label="Close screen share view">
        <X size={24} />
      </button>

      {error ? (
        <div className="text-center text-white p-4 bg-red-900/50 border border-red-500 rounded-lg max-w-md mx-auto">
            <h3 className="text-lg font-bold mb-2 text-red-300">Screen Share Error</h3>
            <p>{error}</p>
        </div>
      ) : (
        <>
            <div className="relative w-full h-full flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-contain ${mode === 'sharing' ? 'block' : 'hidden'}`}></video>

                {mode === 'preview' && capturedImage && <img src={capturedImage} alt="Captured screen" className="w-full h-full object-contain" />}
                <canvas ref={canvasRef} className="hidden"></canvas>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col items-center">
                {mode === 'sharing' && (
                <button onClick={handleCapture} className="w-20 h-20 bg-primary-600 rounded-full flex items-center justify-center border-4 border-black/30 hover:bg-primary-700 transition-colors" aria-label="Capture screen">
                    <CaptureIcon size={32} className="text-white" />
                </button>
                )}
                {mode === 'preview' && (
                <div className="w-full max-w-2xl flex flex-col items-center gap-4">
                    <div className="relative w-full">
                        <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ask a question about the screen..."
                        className="w-full px-4 py-3 pr-12 border border-gray-500 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-800/80 text-white"
                        />
                        {isSupported && (
                        <button
                            onClick={startListening}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                            aria-label="Use microphone to dictate prompt"
                            disabled={isListening}
                        >
                            <Mic size={20} />
                        </button>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                    <button onClick={handleRetake} className="flex items-center gap-2 px-6 py-3 bg-white/20 rounded-full text-lg font-semibold hover:bg-white/30 transition-colors text-white">
                        <RefreshCw size={20} />
                        <span>Retake</span>
                    </button>
                    <button onClick={handleSend} className="flex items-center gap-2 px-6 py-3 bg-primary-600 rounded-full text-lg font-semibold hover:bg-primary-700 transition-colors text-white" disabled={!prompt.trim()}>
                        <Send size={20} />
                        <span>Send</span>
                    </button>
                    </div>
                </div>
                )}
            </div>
        </>
      )}

      <VoiceInputModal isListening={isListening} onStop={stopListening} />
    </div>
  );
};

export default ScreenShareView;
