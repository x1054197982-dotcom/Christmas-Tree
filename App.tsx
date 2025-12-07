import React, { useState, useCallback, useEffect } from 'react';
import { Visuals } from './components/Visuals';
import { HandManager } from './components/HandManager';
import { Controls } from './components/Controls';
import { generateParticles } from './utils/geometry';
import { AppMode, HandGestureData, ParticleData } from './types';

// Debounce helper to prevent flickering states
const useDebouncedState = <T,>(initialValue: T, delay: number): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [state, setState] = useState<T>(initialValue);
  const [tempState, setTempState] = useState<T>(initialValue);

  useEffect(() => {
    const handler = setTimeout(() => {
      setState(tempState);
    }, delay);
    return () => clearTimeout(handler);
  }, [tempState, delay]);

  return [state, setTempState];
};

const App: React.FC = () => {
  const [mode, setMode] = useDebouncedState<AppMode>(AppMode.TREE, 300); // 300ms debounce
  const [handPos, setHandPos] = useState({ x: 0.5, y: 0.5, z: 0, rotation: 0 });
  const [photos, setPhotos] = useState<string[]>([]);
  const [particles, setParticles] = useState<ParticleData[]>([]);
  const [hoveredPhotoId, setHoveredPhotoId] = useState<string | null>(null);

  // Initial generation - No Default Photos
  useEffect(() => {
    setParticles(generateParticles([]));
  }, []);

  // Regenerate particles when photos change
  useEffect(() => {
    if (photos.length > 0) {
      setParticles(generateParticles(photos));
    }
  }, [photos]);

  const handleGestureUpdate = useCallback((data: HandGestureData) => {
    setHandPos({ x: data.x, y: data.y, z: data.z || 0, rotation: data.rotation });

    // State Machine Transition Logic
    switch (data.gesture) {
      case 'Closed_Fist':
        // Contextual: If we are hovering a photo and NOT already in Zoom, 'Grab' it.
        // Otherwise, return to Tree state.
        // If we are IN Zoom state, Fist means "Close/Exit" -> Tree.
        setMode((currentMode) => {
           if (currentMode !== AppMode.ZOOM && hoveredPhotoId) {
               return AppMode.ZOOM;
           }
           return AppMode.TREE;
        });
        break;
      case 'Open_Palm':
        // Open Five Fingers -> Scatter State
        setMode(AppMode.SCATTER);
        break;
      case 'Pinch':
        // Pinch always means Zoom/Grab
        setMode(AppMode.ZOOM);
        break;
      case 'Pointing_Up':
         // Treat as idle/default -> Tree
         setMode(AppMode.TREE);
         break;
      case 'Unknown':
        // No gesture detected -> Default to Tree
        setMode(AppMode.TREE);
        break;
      default:
        // Any other state -> Default to Tree
        setMode(AppMode.TREE);
        break;
    }
  }, [setMode, hoveredPhotoId]);

  const handlePhotoUpload = (files: FileList) => {
    const newPhotos: string[] = [];
    Array.from(files).forEach(file => {
      newPhotos.push(URL.createObjectURL(file));
    });
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const handleMusicUpload = (url: string) => {
    console.log("Music loaded:", url);
  };

  return (
    <div className="relative w-full h-full bg-black">
      <Visuals 
        mode={mode} 
        particles={particles} 
        handX={handPos.x} 
        handY={handPos.y}
        handZ={handPos.z} 
        handRotation={handPos.rotation}
        hoveredPhotoId={hoveredPhotoId}
        onHoverPhoto={setHoveredPhotoId}
      />
      
      <Controls 
        currentMode={mode} 
        onMusicUpload={handleMusicUpload}
        onPhotoUpload={handlePhotoUpload}
      />
      
      <HandManager onGestureUpdate={handleGestureUpdate} />
    </div>
  );
};

export default App;