import { ParticleData } from '../types';
import * as THREE from 'three';

const COUNT = 1200; // Slightly reduced count to accommodate larger size performance
const RADIUS_BASE = 9.0; 
const HEIGHT = 24; 

export const generateParticles = (photos: string[]): ParticleData[] => {
  const particles: ParticleData[] = [];
  
  // Festive Palette
  const colors = {
    gold: ['#FFD700', '#FDB931', '#D4AF37'],
    red: ['#8B0000', '#DC143C', '#B22222'],
    green: ['#006400', '#228B22', '#556B2F'],
    silver: ['#C0C0C0', '#E5E4E2', '#FFFFFF'],
    blue: ['#87CEEB', '#E0FFFF'] // For snowflakes
  };

  const allColors = [...colors.gold, ...colors.red, ...colors.green, ...colors.silver];

  // 1. Generate Photos (DNA HELIX on Surface)
  if (photos.length > 0) {
    const helixCount = photos.length;
    // We want the photos to span the height in a spiral
    
    for (let i = 0; i < helixCount; i++) {
        // Map 0..1 to 0.05..0.85 to avoid floor and Star tip
        const rawT = i / helixCount;
        const t = 0.05 + (rawT * 0.8); 

        // Compress Vertical Height to 80% to shorten spacing (clustered more tightly)
        const y = ((t * HEIGHT) - (HEIGHT / 2)) * 0.8;
        
        // Helix winding frequency - INCREASED further to 8.0 for tighter packing
        const frequency = 8.0; 
        const theta = t * Math.PI * 2 * frequency;
        
        // Calculate Radius - Increased slightly to float above larger ornaments
        const heightFactor = Math.pow(1 - t, 0.8); 
        const r = heightFactor * RADIUS_BASE + 3.0; // Pushed out further
        
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;

        // Scatter pos (Uniform volume) - LESS COMPACT
        // Increased radius from 10 to 15 for better spacing
        const rScatter = 15 * Math.cbrt(Math.random());
        const sTheta = Math.random() * Math.PI * 2;
        const sPhi = Math.acos((Math.random() * 2) - 1);
        const sx = rScatter * Math.sin(sPhi) * Math.cos(sTheta);
        const sy = rScatter * Math.sin(sPhi) * Math.sin(sTheta);
        const sz = rScatter * Math.cos(sPhi);

        particles.push({
            id: `p-photo-${i}`,
            type: 'photo',
            textureUrl: photos[i],
            treePos: [x, y, z],
            scatterPos: [sx, sy, sz],
            color: '#FFD700',
            // Face outwards: default plane is Z+, so rotate Y to align with normal vector
            rotation: [0, -theta + Math.PI / 2, 0], 
            scale: 0.8 // Reduced from 1.0 to 0.8 for smaller photos
        });
    }
  }

  // 2. Generate Ornaments & Foliage
  for (let i = 0; i < COUNT; i++) {
    const t = i / COUNT;
    const angle = i * 2.39996;
    const y = (t * HEIGHT) - (HEIGHT / 2);
    
    const heightFactor = Math.pow(1 - t, 0.9);
    const maxRadiusAtHeight = heightFactor * RADIUS_BASE;
    
    // Volume distribution
    const r = maxRadiusAtHeight * Math.sqrt(Math.random() * 0.9 + 0.1);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;

    // Scatter Pos - LESS COMPACT
    // Increased radius from 12 to 18 for better spacing
    const rScatter = 18 * Math.cbrt(Math.random());
    const sTheta = Math.random() * Math.PI * 2;
    const sPhi = Math.acos((Math.random() * 2) - 1);
    const sx = rScatter * Math.sin(sPhi) * Math.cos(sTheta);
    const sy = rScatter * Math.sin(sPhi) * Math.sin(sTheta);
    const sz = rScatter * Math.cos(sPhi);

    // Determine Decoration Type
    let type: ParticleData['type'] = 'sphere';
    let scale = Math.random() * 0.3 + 0.3; 
    let color = allColors[Math.floor(Math.random() * allColors.length)];
    const rand = Math.random();

    if (rand > 0.95) {
        type = 'snowflake';
        color = colors.silver[Math.floor(Math.random() * colors.silver.length)];
        scale = 0.6; 
    } else if (rand > 0.90) {
        type = 'bell';
        color = '#FFD700';
        scale = 0.7; 
    } else if (rand > 0.85) {
        type = 'cube'; // Gift box
        color = colors.red[0];
        scale = 0.8; 
    } else {
        // Standard ball
        type = 'sphere';
        if (Math.random() > 0.8) scale = 0.7; // Occasional large baubles
    }

    particles.push({
      id: `p-${i}`,
      type,
      treePos: [x, y, z],
      scatterPos: [sx, sy, sz],
      color,
      rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
      scale
    });
  }

  // Top Star
  particles.push({
    id: 'star',
    type: 'star',
    treePos: [0, HEIGHT/2 + 1.0, 0], 
    scatterPos: [0, 0, 0],
    color: '#FFD700',
    rotation: [0, 0, 0],
    scale: 1.5 
  });

  return particles;
};