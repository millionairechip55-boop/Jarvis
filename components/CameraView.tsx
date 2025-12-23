
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera as CameraIcon, Send, RefreshCw, Upload, Mic, ArrowLeft } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import VoiceInputModal from './VoiceInputModal';

interface CameraViewProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (prompt: string, image: string) => void;
}

type ViewMode = 'chooser' | 'camera' | 'preview';

const CameraView: React.FC<CameraViewProps> = ({ isOpen, onClose, onSend }) => {
  const [mode, setMode] = useState<ViewMode>('chooser');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      setPrompt(transcript);
    }
  }, [transcript]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = useCallback(async () => {
    stopCamera(); // Stop any existing stream
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setMode('camera');
      setError(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access the camera. Please check permissions or try uploading an image instead.");
      setMode('chooser');
    }
  }, [stopCamera]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Effect to handle opening/closing of the view
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      // Reset state when closed
      setTimeout(() => {
        setMode('chooser');
        setCapturedImage(null);
        setError(null);
        setPrompt('');
      }, 300); // Delay to allow for closing animation
    }
  }, [isOpen, stopCamera]);


  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        setPrompt('What is in this image?');
        stopCamera();
        setMode('preview');
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setCapturedImage(dataUrl);
        setPrompt('What is in this image?');
        setMode('preview');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setPrompt('');
    setMode('chooser');
  };

  const handleBackToChooser = () => {
    stopCamera();
    setMode('chooser');
  };
  
  const handleSend = () => {
    if (capturedImage) {
        onSend(prompt, capturedImage);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4 transition-opacity duration-300">
      {mode === 'camera' && (
        <button onClick={handleBackToChooser} className="absolute top-4 left-4 text-white p-2 bg-black/50 rounded-full hover:bg-black/80 transition-colors z-20" aria-label="Back to options">
            <ArrowLeft size={24} />
        </button>
      )}

      <button onClick={onClose} className="absolute top-4 right-4 text-white p-2 bg-black/50 rounded-full hover:bg-black/80 transition-colors z-20" aria-label="Close camera view">
        <X size={24} />
      </button>

      <div className="relative w-full h-full flex items-center justify-center">
        {/* Chooser View */}
        {mode === 'chooser' && (
          <div className="text-center text-white">
            <h2 className="text-2xl font-bold mb-6">Add an Image</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={startCamera} className="flex items-center justify-center gap-3 px-6 py-4 bg-primary-600 rounded-lg text-lg font-semibold hover:bg-primary-700 transition-colors">
                <CameraIcon size={24} />
                <span>Use Camera</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-3 px-6 py-4 bg-white/20 rounded-lg text-lg font-semibold hover:bg-white/30 transition-colors">
                <Upload size={24} />
                <span>Upload Image</span>
              </button>
            </div>
            {error && (
              <div className="mt-6 text-center p-3 bg-red-500/50 rounded-lg max-w-sm mx-auto">
                <p>{error}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Hidden File Input */}
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
        />

        {/* Camera Live View */}
        <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-contain ${mode === 'camera' ? 'block' : 'hidden'}`}></video>

        {/* Preview View */}
        {mode === 'preview' && capturedImage && <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />}
        <canvas ref={canvasRef} className="hidden"></canvas>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col items-center">
        {mode === 'camera' && (
           <button onClick={handleCapture} className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-4 border-black/30 hover:bg-gray-200 transition-colors" aria-label="Capture image">
             <CameraIcon size={32} className="text-gray-800" />
           </button>
        )}
        {mode === 'preview' && (
          <div className="w-full max-w-2xl flex flex-col items-center gap-4">
             <div className="relative w-full">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask a question about the image..."
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

      <VoiceInputModal isListening={isListening} onStop={stopListening} />
    </div>
  );
};

export default CameraView;
