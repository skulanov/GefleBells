/**
 * Web MIDI API integration for physical MIDI keyboards & carillon practice consoles
 */

import { audioEngine } from './audioEngine';
import { GEFLE_BELLS } from '../data/gefleBellsData';

type MidiNoteCallback = (bellId: string, velocity: number, isNoteOn: boolean) => void;

class MidiService {
  private midiAccess: MIDIAccess | null = null;
  private isSupported = false;
  private isConnected = false;
  private activeDeviceName = '';
  private listeners = new Set<MidiNoteCallback>();

  // Map MIDI note numbers (60 = C4) to BellData
  private noteToBellMap = new Map<number, string>();

  constructor() {
    GEFLE_BELLS.forEach((bell) => {
      this.noteToBellMap.set(bell.midiNote, bell.id);
    });
  }

  public async init(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.requestMIDIAccess) {
      this.isSupported = false;
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this.isSupported = true;
      this.setupInputs();

      this.midiAccess.onstatechange = () => {
        this.setupInputs();
      };

      return true;
    } catch {
      this.isSupported = false;
      return false;
    }
  }

  private setupInputs(): void {
    if (!this.midiAccess) return;

    const inputs = Array.from(this.midiAccess.inputs.values());
    if (inputs.length > 0) {
      this.isConnected = true;
      this.activeDeviceName = inputs.map((i) => i.name).filter(Boolean).join(', ') || 'MIDI-клавиатура';

      inputs.forEach((input) => {
        input.onmidimessage = (event) => this.handleMidiMessage(event);
      });
    } else {
      this.isConnected = false;
      this.activeDeviceName = '';
    }
  }

  private handleMidiMessage(event: MIDIMessageEvent): void {
    if (!event.data || event.data.length < 3) return;

    const [statusByte, noteNumber, velocityByte] = event.data;
    const command = statusByte >> 4;

    // 9 = Note On, 8 = Note Off
    if (command === 9 && velocityByte > 0) {
      const bellId = this.noteToBellMap.get(noteNumber);
      if (bellId) {
        const normalizedVelocity = velocityByte / 127;
        const isPedal = noteNumber < 72; // Lower notes can count as pedals or manuals
        audioEngine.strike(bellId, normalizedVelocity, isPedal);
        this.notifyListeners(bellId, normalizedVelocity, true);
      }
    } else if (command === 8 || (command === 9 && velocityByte === 0)) {
      const bellId = this.noteToBellMap.get(noteNumber);
      if (bellId) {
        this.notifyListeners(bellId, 0, false);
      }
    }
  }

  public onNote(callback: MidiNoteCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(bellId: string, velocity: number, isNoteOn: boolean): void {
    this.listeners.forEach((fn) => {
      try {
        fn(bellId, velocity, isNoteOn);
      } catch (err) {
        console.error('Error in MIDI callback', err);
      }
    });
  }

  public getStatus(): { isSupported: boolean; isConnected: boolean; deviceName: string } {
    return {
      isSupported: this.isSupported,
      isConnected: this.isConnected,
      deviceName: this.activeDeviceName,
    };
  }
}

export const midiService = new MidiService();
