import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Stars, Image, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { AppMode, ParticleData } from '../types';

// Augment global JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      div: any; span: any; h1: any; h2: any; h3: any; p: any; button: any; input: any; label: any; video: any; audio: any; img: any;
      ambientLight: any; pointLight: any; group: any; mesh: any; 
      sphereGeometry: any; meshStandardMaterial: any; boxGeometry: any; 
      octahedronGeometry: any; planeGeometry: any; coneGeometry: any; tetrahedronGeometry: any;
      extrudeGeometry: any;
    }
  }
}

interface VisualsProps {
  mode: AppMode;
  particles: ParticleData[];
  handX: number;
  handY: number;
  handZ: number;
  handRotation: number;
  hoveredPhotoId: string | null;
  onHoverPhoto: (id: string | null) => void;
}

// Pre-compute Star Shape to avoid re-creation
const starShape = new THREE.Shape();
const points = 5;
const outerRadius = 1;
const innerRadius = 0.45;
for (let i = 0; i < points * 2; i++) {
  // Start at Math.PI / 2 to point upwards
  const angle = (i * Math.PI) / points + Math.PI / 2;
  const r = i % 2 === 0 ? outerRadius : innerRadius;
  const x = Math.cos(angle) * r;
  const y = Math.sin(angle) * r;
  if (i === 0) starShape.moveTo(x, y);
  else starShape.lineTo(x, y);
}
starShape.closePath();

const starExtrudeSettings = {
  depth: 0.4,
  bevelEnabled: true,
  bevelThickness: 0.1,
  bevelSize: 0.1,
  bevelSegments: 2
};

const PhotoFrame: React.FC<{ 
  url: string; 
  color: string; 
  isRevealed: boolean;
  isHighlighted: boolean;
}> = ({ url, color, isRevealed, isHighlighted }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Blinking/Pulsing effect for highlight
  useFrame((state) => {
    if (meshRef.current) {
        if (isRevealed) {
             // NO EFFECTS when zoomed: Static, no glow/pulse, just the photo
             const mat = meshRef.current.material as THREE.MeshStandardMaterial;
             mat.emissiveIntensity = 0;
             mat.emissive.setHex(0x000000);
             // Ensure backing is dark to not bleed through
             mat.color.setHex(0x000000);
        } else if (isHighlighted) {
            // Pulse between 0.4 and 0.8 intensity when hovered
            const t = state.clock.elapsedTime * 8; 
            const intensity = 0.4 + (Math.sin(t) * 0.4 + 0.4); 
            const mat = meshRef.current.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = intensity;
            mat.emissive.setHex(0xFFFACD); // Pale Gold
            mat.color.setHex(0xFFD700);
        } else {
             // Default dim state
             const mat = meshRef.current.material as THREE.MeshStandardMaterial;
             mat.emissiveIntensity = 0.2;
             mat.emissive.setHex(0xB8860B);
             mat.color.setHex(0xFFD700);
        }
    }
  });

  return (
    <group>
      {/* Gold Frame Backing */}
      <mesh ref={meshRef} position={[0, 0, -0.1]}>
        <boxGeometry args={[1.2, 1.2, 0.05]} />
        <meshStandardMaterial 
          color="#FFD700"
          metalness={1.0} 
          roughness={0.1} 
          emissive="#B8860B"
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* The Photo */}
      <Image 
        url={url} 
        transparent 
        scale={[1, 1]} 
        position={[0, 0, 0.05]}
        toneMapped={false}
      />
    </group>
  );
};

const ParticleInstance: React.FC<{ 
    data: ParticleData; 
    mode: AppMode; 
    hoveredPhotoId: string | null; 
    handZ: number 
}> = ({ data, mode, hoveredPhotoId, handZ }) => {
  const meshRef = useRef<THREE.Group>(null);
  const color = useMemo(() => new THREE.Color(data.color), [data.color]);
  
  const isCandidate = data.id === hoveredPhotoId;
  const isSelected = isCandidate && mode === AppMode.ZOOM;
  const isHighlighted = isCandidate && mode !== AppMode.ZOOM;

  const isPhoto = data.type === 'photo';

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    let targetPos = new THREE.Vector3();
    let targetScale = data.scale;
    
    // Scale up significantly if highlighted to show focus
    if (isHighlighted) {
        targetScale = data.scale * 1.3;
    }

    let targetRotX = data.rotation[0];
    let targetRotY = data.rotation[1];
    let targetRotZ = data.rotation[2];

    if (mode === AppMode.TREE) {
      targetPos.set(...data.treePos);
    } else if (mode === AppMode.SCATTER) {
      targetPos.set(...data.scatterPos);
      
      // Drift
      const time = state.clock.elapsedTime;
      targetPos.x += Math.cos(time * 0.2 + data.scatterPos[1]) * 0.05;
      targetPos.y += Math.sin(time * 0.2 + data.scatterPos[0]) * 0.05;
    } else if (mode === AppMode.ZOOM) {
      if (isSelected && isPhoto) {
        targetPos.set(0, 0, 6); // Move closer in zoom
        targetScale = 5.0; 
        
        // Face camera (0,0,0) when zoomed
        targetRotX = 0;
        targetRotY = 0;
        targetRotZ = 0;
      } else {
        // Push others away
        targetPos.set(data.scatterPos[0] * 3.5, data.scatterPos[1] * 3.5, data.scatterPos[2] - 40);
      }
    }

    // Dynamic Lerp Speed
    // If selected photo in Zoom mode: Snap quickly (factor 15) to remove "swirling/effect" feel
    // Otherwise normal smooth movement (factor 2.5)
    const lerpSpeed = (isSelected && isPhoto) ? delta * 15 : delta * 2.5;

    // Lerp Position
    meshRef.current.position.lerp(targetPos, lerpSpeed);
    
    // Lerp Scale
    const currentScale = meshRef.current.scale.x;
    const newScale = THREE.MathUtils.lerp(currentScale, targetScale, lerpSpeed);
    meshRef.current.scale.setScalar(newScale);

    // Rotation Logic
    if (mode === AppMode.SCATTER && isPhoto) {
         // In Scatter mode, photos always face the camera to be visible
         meshRef.current.lookAt(state.camera.position);
    } else {
        // Unified Rotation Lerp for other modes
        meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotX, lerpSpeed);
        meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotY, lerpSpeed);
        meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRotZ, lerpSpeed);
    }

    if (data.type === 'diamond' || data.type === 'star') {
        meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group ref={meshRef} position={data.treePos}>
      {data.type === 'sphere' && (
        <mesh>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color={color} metalness={0.9} roughness={0.1} emissive={color} emissiveIntensity={0.3}/>
        </mesh>
      )}
      {data.type === 'cube' && (
        <mesh>
          <boxGeometry args={[0.7, 0.7, 0.7]} />
          <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} emissive={color} emissiveIntensity={0.1}/>
        </mesh>
      )}
      {data.type === 'snowflake' && (
        <group>
            <mesh><octahedronGeometry args={[0.8, 0]} /><meshStandardMaterial color="#E0FFFF" metalness={0.8} roughness={0.2} emissive="#FFFFFF" emissiveIntensity={0.5} /></mesh>
            <mesh rotation={[0, 0, Math.PI/4]}><octahedronGeometry args={[0.8, 0]} /><meshStandardMaterial color="#E0FFFF" metalness={0.8} roughness={0.2} /></mesh>
        </group>
      )}
      {data.type === 'bell' && (
        <mesh position={[0, -0.2, 0]}>
            <coneGeometry args={[0.4, 0.8, 16]} />
            <meshStandardMaterial color="#FFD700" metalness={1} roughness={0.2} />
        </mesh>
      )}
      {data.type === 'diamond' && (
        <mesh>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#FFD700" metalness={1} roughness={0} emissive="#FFD700" emissiveIntensity={2}/>
        </mesh>
      )}
      {data.type === 'star' && (
        <mesh position={[0, 0, -0.2]}>
          <extrudeGeometry args={[starShape, starExtrudeSettings]} />
          <meshStandardMaterial color="#FFD700" metalness={1} roughness={0.1} emissive="#FFD700" emissiveIntensity={2}/>
        </mesh>
      )}
      {isPhoto && data.textureUrl && (
         <PhotoFrame url={data.textureUrl} color={data.color} isRevealed={isSelected} isHighlighted={isHighlighted}/>
      )}
    </group>
  );
};

const FocusManager: React.FC<{
    particles: ParticleData[];
    mode: AppMode;
    onFocusChange: (id: string | null) => void;
}> = ({ particles, mode, onFocusChange }) => {
    useFrame((state) => {
        // Do not update focus if we are already zoomed in
        if (mode === AppMode.ZOOM) return;

        // Find the photo closest to the camera direction
        const photoParticles = particles.filter(p => p.type === 'photo');
        if (photoParticles.length === 0) return;

        const camDir = state.camera.position.clone().normalize();
        
        let bestId = null;
        let maxDot = -Infinity;
        
        photoParticles.forEach(p => {
            const pos = new THREE.Vector3(
                mode === AppMode.TREE ? p.treePos[0] : p.scatterPos[0],
                mode === AppMode.TREE ? p.treePos[1] : p.scatterPos[1],
                mode === AppMode.TREE ? p.treePos[2] : p.scatterPos[2]
            );
            pos.normalize();
            
            const dot = camDir.dot(pos);
            if (dot > maxDot) {
                maxDot = dot;
                bestId = p.id;
            }
        });

        // Reduced threshold from 0.8 to 0.65 to make selection stickier and easier
        // Also added a distance check logic implicitly by using dot product (angular distance)
        if (maxDot > 0.65) {
            onFocusChange(bestId);
        } else {
            onFocusChange(null);
        }
    });

    return null;
}

export const Visuals: React.FC<VisualsProps> = ({ mode, particles, handX, handY, handZ, handRotation, hoveredPhotoId, onHoverPhoto }) => {

  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: false, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.5 }}>
      <CameraRig handX={handX} handY={handY} handZ={handZ} handRotation={handRotation} mode={mode} />
      
      {/* Dynamic Focus Logic reporting back to App */}
      <FocusManager particles={particles} mode={mode} onFocusChange={onHoverPhoto} />

      <Environment preset="night" />
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={2} color="#FFD700" />
      <pointLight position={[-10, 5, 10]} intensity={2} color="#FFD700" />
      <pointLight position={[0, 0, 0]} intensity={3} distance={25} color="#FFA500" />

      <Stars radius={100} depth={50} count={7000} factor={4} saturation={0} fade speed={0.5} />
      <Sparkles count={400} scale={40} size={6} speed={0.3} opacity={0.6} color="#FFD700" />
      <Sparkles count={500} scale={[25, 25, 25]} position={[0, 0, 0]} size={8} speed={0.5} opacity={0.8} color="#FFD700" noise={1}/>

      <group>
        {particles.map((p) => (
          <ParticleInstance 
            key={p.id} 
            data={p} 
            mode={mode} 
            hoveredPhotoId={hoveredPhotoId}
            handZ={handZ}
          />
        ))}
      </group>

      {/* Disable effects when Zoomed to show raw photo */}
      {mode !== AppMode.ZOOM && (
        <EffectComposer enableNormalPass={false}>
            <Bloom luminanceThreshold={0.55} mipmapBlur intensity={1.8} radius={0.7} />
            <Vignette eskil={false} offset={0.2} darkness={0.9} />
        </EffectComposer>
      )}
    </Canvas>
  );
};

const CameraRig = ({ handX, handY, handZ, handRotation, mode }: { handX: number, handY: number, handZ: number, handRotation: number, mode: AppMode }) => {
  useFrame((state) => {
    // 1:1 Direct Mapping
    // Hand Center (0.5) = Angle 0.
    // Full Sweep: 0 maps to -PI (left), 1 maps to +PI (right) -> 360 degree coverage
    const targetAzimuth = (handX - 0.5) * Math.PI * 2.5; 
    
    // Vertical angle
    // INCREASED RANGE: Multiplier increased from 12 to 35 to allow viewing top/bottom particles
    const targetPolar = (handY - 0.5) * 35; 

    // No extra rotation/roll based on hand rotation
    state.camera.rotation.z = 0;

    if (mode === AppMode.SCATTER) {
      // SCATTER Mode Logic
      // Increased baseDistance from 22 to 30 to accommodate larger sphere (r=18)
      const baseDistance = 30; 
      
      const camX = Math.sin(targetAzimuth) * baseDistance;
      const camZ = Math.cos(targetAzimuth) * baseDistance;

      state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, camX, 0.1);
      state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, camZ, 0.1);
      state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetPolar, 0.1);
      state.camera.lookAt(0, 0, 0);

    } else if (mode === AppMode.TREE) {
      const baseDistance = 28;
      
      const camX = Math.sin(targetAzimuth) * baseDistance;
      const camZ = Math.cos(targetAzimuth) * baseDistance;

      state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, camX, 0.1);
      state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, camZ, 0.1);
      state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetPolar, 0.1);
      state.camera.lookAt(0, 0, 0);

    } else if (mode === AppMode.ZOOM) {
      // Zoom locks
      state.camera.position.lerp(new THREE.Vector3(0, 0, 10), 0.05);
      state.camera.lookAt(0, 0, 0);
    }
  });
  return null;
};