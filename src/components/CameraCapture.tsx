import React, { useState, useRef } from 'react';
import { Camera, RefreshCw, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  label: string;
  captureCount?: number;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, label, captureCount = 0 }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setIsCapturing(false);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        alert("Camera access denied. Please enable camera permissions in your browser settings or use the 'Upload' option.");
      }
      
      // Fallback to file input
      fileInputRef.current?.click();
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        onCapture(dataUrl);
        // Don't stop camera, allow multiple photos
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCapturing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          onCapture(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  return (
    <div className="relative w-full space-y-4">
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        multiple
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      
      {!isCapturing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={startCamera}
            className="h-48 bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-emerald-500/50 transition-colors group active:scale-95 focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none"
          >
            <div className="p-4 bg-zinc-800 rounded-full group-hover:bg-emerald-500/10 transition-colors">
              <Camera className="w-8 h-8 text-zinc-400 group-hover:text-emerald-500" />
            </div>
            <span className="text-zinc-400 font-medium uppercase tracking-wider text-sm">Live Camera</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-48 bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-blue-500/50 transition-colors group active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
          >
            <div className="p-4 bg-zinc-800 rounded-full group-hover:bg-blue-500/10 transition-colors">
              <ImageIcon className="w-8 h-8 text-zinc-400 group-hover:text-blue-500" />
            </div>
            <span className="text-zinc-400 font-medium uppercase tracking-wider text-sm">Upload Image</span>
          </button>
        </div>
      ) : (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="flex-1 object-cover"
          />
          <div className="p-8 bg-zinc-900 flex justify-between items-center">
            <button 
              type="button"
              aria-label={captureCount > 0 ? "Stop camera and finish" : "Cancel and stop camera"}
              onClick={stopCamera}
              className="px-6 py-2 bg-zinc-800 text-white rounded-full font-bold text-sm focus-visible:ring-2 focus-visible:ring-zinc-400 outline-none"
            >
              {captureCount > 0 ? `Finish (${captureCount})` : 'Cancel'}
            </button>
            <button
              type="button"
              aria-label="Take photo"
              onClick={takePhoto}
              className="w-20 h-20 bg-white rounded-full border-4 border-zinc-300 active:scale-90 transition-transform focus-visible:ring-2 focus-visible:ring-white outline-none"
            />
            <div className="w-16" /> {/* Spacer */}
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
};
