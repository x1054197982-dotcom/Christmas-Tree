import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import { HandGestureData } from '../types';

interface HandManagerProps {
  onGestureUpdate: (data: HandGestureData) => void;
}

export const HandManager: React.FC<HandManagerProps> = ({ onGestureUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    let isActive = true;

    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        if (!isActive) return;

        // Use CPU delegate for maximum compatibility and to avoid GPU context loss issues
        gestureRecognizerRef.current = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "CPU" 
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        if (isActive) {
          setIsLoaded(true);
          startCamera();
        }
      } catch (err) {
        console.error("MediaPipe Init Error:", err);
        if (isActive) setError("Failed to load AI model. Check connection.");
      }
    };

    init();

    return () => {
      isActive = false;
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const startCamera = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', predict);
        }
      } catch (err) {
        console.error("Camera error:", err);
        setError("Camera access denied.");
      }
    } else {
        setError("Camera API not supported.");
    }
  };

  const predict = () => {
    if (gestureRecognizerRef.current && videoRef.current) {
      const nowInMs = Date.now();
      if (videoRef.current.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = videoRef.current.currentTime;
        
        try {
            const results = gestureRecognizerRef.current.recognizeForVideo(videoRef.current, nowInMs);

            if (results.gestures.length > 0 && results.landmarks.length > 0) {
            const gestureName = results.gestures[0][0].categoryName;
            const landmarks = results.landmarks[0];
            
            // Calculate Center of Palm (approximate)
            const palmBase = landmarks[0];
            const middleFingerKnuckle = landmarks[9];
            const centerX = (palmBase.x + middleFingerKnuckle.x) / 2;
            const centerY = (palmBase.y + middleFingerKnuckle.y) / 2;

            // Estimate Depth (Z)
            const handSize = Math.sqrt(
                Math.pow(palmBase.x - middleFingerKnuckle.x, 2) + 
                Math.pow(palmBase.y - middleFingerKnuckle.y, 2)
            );
            const zRaw = (handSize - 0.05) * 4; 
            const z = Math.max(0, Math.min(1, zRaw));

            // Calculate Rotation (Roll)
            // Vector from Wrist (0) to Middle Finger MCP (9)
            const dx = middleFingerKnuckle.x - palmBase.x;
            const dy = middleFingerKnuckle.y - palmBase.y;
            // atan2(dy, dx) gives angle. 
            const rotation = Math.atan2(dy, dx); 

            // Custom Pinch Detection
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            const distance = Math.sqrt(
                Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2)
            );
            
            let mappedGesture: HandGestureData['gesture'] = 'Unknown';

            // Priority Logic:
            // 1. If Model says Closed_Fist -> Closed_Fist (Tree Mode)
            // 2. If Model says Open_Palm -> Open_Palm (Scatter Mode)
            // 3. If Not Fist/Palm BUT distance is small -> Pinch (Zoom Mode)
            
            if (gestureName === 'Closed_Fist') {
                mappedGesture = 'Closed_Fist';
            } else if (gestureName === 'Open_Palm') {
                mappedGesture = 'Open_Palm';
            } else if (distance < 0.06) { // Threshold for pinch
                mappedGesture = 'Pinch';
            } else {
                // Fallback for Pointing or others
                 if (gestureName === 'Pointing_Up') mappedGesture = 'Pointing_Up';
            }

            onGestureUpdate({
                gesture: mappedGesture,
                x: 1 - centerX, // Mirror X
                y: centerY,
                z: z, 
                rotation: rotation
            });
            } else {
                onGestureUpdate({ gesture: 'Unknown', x: 0.5, y: 0.5, z: 0, rotation: 0 });
            }
        } catch (e) {
            console.warn("Prediction error:", e);
        }
      }
    }
    requestRef.current = requestAnimationFrame(predict);
  };

  return (
    <div className="fixed bottom-4 right-4 w-32 h-24 border-2 border-metal-gold rounded-lg overflow-hidden bg-black z-50 shadow-[0_0_15px_rgba(212,175,55,0.5)]">
      {!isLoaded && !error && <div className="absolute inset-0 flex items-center justify-center text-xs text-metal-gold text-center px-1">Loading Hand Tracking...</div>}
      {error && <div className="absolute inset-0 flex items-center justify-center text-xs text-red-500 bg-black/80 text-center p-1">{error}</div>}
      <video 
        ref={videoRef} 
        className="w-full h-full object-cover transform -scale-x-100" 
        autoPlay 
        playsInline 
        muted 
      />
    </div>
  );
};