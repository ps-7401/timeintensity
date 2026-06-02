export interface CurvePoint {
  t: number;         // Time of point (0 to maxTime)
  intensity: number; // Intensity (0 to maxIntensity)
}

export interface SamplingSettings {
  maxTime: number;       // Maximum time (seconds)
  maxIntensity: number;  // Maximum intensity scale
  interval: number;      // Sampling interval in seconds (resolution)
  attributeName: string; // Name of sensory attribute (e.g. Sweetness, Pain)
}

export type AppMode = 'freehand' | 'realtime';
