
export enum AppMode {
  TREE = 'TREE',      // Fist
  SCATTER = 'SCATTER', // Open Palm
  ZOOM = 'ZOOM'       // Pinch/Grab
}

export interface HandGestureData {
  gesture: 'Closed_Fist' | 'Open_Palm' | 'Pointing_Up' | 'Unknown' | 'Pinch';
  x: number; // Normalized 0-1 (Horizontal)
  y: number; // Normalized 0-1 (Vertical)
  z: number; // Normalized 0-1 (Depth/Proximity)
  rotation: number; // Hand rotation in radians (Roll)
}

export interface ParticleData {
  id: string;
  type: 'sphere' | 'cube' | 'photo' | 'diamond' | 'snowflake' | 'bell' | 'star';
  treePos: [number, number, number];
  scatterPos: [number, number, number];
  color: string;
  textureUrl?: string;
  rotation: [number, number, number];
  scale: number;
}