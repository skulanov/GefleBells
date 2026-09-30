/**
 * Types for Gefle Bells Carillon Trainer
 */

export interface BellData {
  id: string; // e.g. "C4", "Ds4", "A5"
  name: string; // e.g. "C4", "D#4 / E♭4"
  russianName: string; // e.g. "До 1-й октавы"
  midiNote: number; // 60 for C4
  frequency: number; // Hz (261.63 for C4)
  octave: number; // 4, 5, 6
  isSharp: boolean; // chromatic raised baton vs diatonic lower baton
  pitchName: 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';
  weightKg: number; // Estimated mass of the bell in Gävle carillon (285kg down to 8kg)
  diameterCm: number; // Approximate bell diameter in cm (80cm down to 18cm)
  defaultKeyCode: string; // e.g. "KeyZ", "Digit1"
  defaultKeyLabel: string; // e.g. "Z", "1"
  hasPedal: boolean; // available in the pedalboard (lower 1.5 octaves)
  pedalKeyCode?: string; // pedal keyboard shortcut
  pedalKeyLabel?: string;
  expectedFileName: string; // e.g. "psgbells_c1_b.wav"
  hasCustomSample?: boolean;
  sampleFileName?: string;
}

export type ViewMode = 'clavier' | 'belfry' | 'trainer' | 'samples';

export interface NoteEvent {
  bellId: string;
  timestamp: number; // ms from start
  duration: number; // ms
  velocity?: number; // 0 to 1
  isPedal?: boolean;
}

export interface TrainingSong {
  id: string;
  title: string;
  subtitle: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tempoBpm: number;
  timeSignature: string;
  notes: {
    bellId: string;
    timeMs: number;
    durationMs: number;
    hand?: 'L' | 'R' | 'P'; // Left hand, Right hand, Pedal
  }[];
}

export interface AudioSettings {
  masterVolume: number; // 0 to 1
  reverbAmount: number; // 0 to 1 (acoustic bell tower ambience)
  decayMultiplier: number; // 0.5 to 2.0
  strikeHardness: number; // 0.5 to 1.5
  useSynthesisFallback: boolean; // synthesize if no sample
  synthDamping: number; // bell resonance
}

export interface StrikeHistoryItem {
  id: string;
  bellId: string;
  timestamp: number;
  source: 'keyboard' | 'mouse' | 'touch' | 'midi' | 'trainer';
}
