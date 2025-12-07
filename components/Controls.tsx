import React, { useRef, useState } from 'react';
import { AppMode } from '../types';

interface ControlsProps {
  currentMode: AppMode;
  onMusicUpload: (url: string) => void;
  onPhotoUpload: (files: FileList) => void;
}

export const Controls: React.FC<ControlsProps> = ({ currentMode, onMusicUpload, onPhotoUpload }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHelp, setShowHelp] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      onMusicUpload(url);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Centered High-End Title */}
      <div className="absolute top-8 left-0 w-full flex justify-center items-center pointer-events-none z-10">
        <h1 
          className="text-4xl md:text-5xl font-display tracking-[0.2em] text-center"
          style={{
            // Gold and White Inlaid Effect
            background: 'linear-gradient(to bottom, #FFFFFF 0%, #FFF8E7 40%, #D4AF37 60%, #B8860B 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 10px rgba(212, 175, 55, 0.5)) drop-shadow(0 2px 2px rgba(0,0,0,0.8))'
          }}
        >
          MERRY CHRISTMAS
        </h1>
      </div>

      {/* Right Sidebar Controls */}
      <div className="absolute top-1/2 right-6 transform -translate-y-1/2 flex flex-col gap-6 pointer-events-auto z-20">
        <div className="flex flex-col gap-4">
          <label className="cursor-pointer group relative">
             <div className="w-12 h-12 flex items-center justify-center rounded-full border border-metal-gold/50 bg-black/40 backdrop-blur-md hover:bg-metal-gold/20 transition-all duration-300 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                <span className="text-xl text-metal-gold">♫</span>
             </div>
             <span className="absolute right-14 top-1/2 -translate-y-1/2 text-metal-gold text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black/60 px-2 py-1 rounded">
               Upload Music
             </span>
             <input type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
          </label>

          <label className="cursor-pointer group relative">
             <div className="w-12 h-12 flex items-center justify-center rounded-full border border-metal-gold/50 bg-black/40 backdrop-blur-md hover:bg-metal-gold/20 transition-all duration-300 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                <span className="text-xl text-metal-gold">📷</span>
             </div>
             <span className="absolute right-14 top-1/2 -translate-y-1/2 text-metal-gold text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black/60 px-2 py-1 rounded">
               Upload Photos
             </span>
             <input 
                type="file" 
                accept="image/*" 
                multiple 
                onChange={(e) => e.target.files && onPhotoUpload(e.target.files)} 
                className="hidden" 
             />
          </label>

          <button 
            onClick={() => setShowHelp(!showHelp)}
            className="w-12 h-12 rounded-full border border-white/30 bg-white/5 text-white flex items-center justify-center hover:bg-white/20 transition-all"
          >
            ?
          </button>
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-matte-green/95 border border-metal-gold p-8 rounded-xl backdrop-blur-xl pointer-events-auto text-center max-w-md shadow-[0_0_50px_rgba(0,0,0,0.9)] z-50">
          <h3 className="text-2xl font-display text-metal-gold mb-6 border-b border-metal-gold/30 pb-2">Gestures</h3>
          <div className="space-y-4 text-white font-serif text-left">
            <div className="flex items-center justify-between">
              <span>✊ Fist</span>
              <span className="text-metal-gold text-sm uppercase tracking-wider">Close / Tree</span>
            </div>
            <div className="flex items-center justify-between">
              <span>✋ Open Palm</span>
              <span className="text-metal-gold text-sm uppercase tracking-wider">Scatter / Sphere</span>
            </div>
            <div className="flex items-center justify-between">
              <span>👌 Grab/Pinch</span>
              <span className="text-metal-gold text-sm uppercase tracking-wider">View Photo</span>
            </div>
             <div className="flex items-center justify-between mt-2 text-sm text-gray-300 italic">
              <span>👋 Rotate Hand to Spin View</span>
            </div>
          </div>
          <button 
            onClick={() => setShowHelp(false)}
            className="mt-8 px-8 py-2 bg-gradient-to-r from-metal-gold to-[#B8860B] text-black font-bold font-display tracking-widest rounded hover:brightness-110 transition shadow-[0_0_15px_rgba(212,175,55,0.4)]"
          >
            BEGIN
          </button>
        </div>
      )}

      <audio ref={audioRef} loop className="hidden" />
    </div>
  );
};