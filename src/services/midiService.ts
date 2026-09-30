/**
 * Web MIDI API integration for physical MIDI keyboards & carillon practice consoles
 */

import { audioEngine } from './audioEngine';
import { GEFLE_BELLS } from '../data/gefleBellsData';

type MidiNoteCallback = (bellId: string, velocity: number, isNoteOn: boolean) => void;
export type MidiStatus = { isSupported: boolean; isConnected: boolean; deviceName: string };

class MidiService {
  private midiAccess: MIDIAccess | null = null;
  private isSupported = false;
  private isConnected = false;
  private activeDeviceName = '';
  private listeners = new Set<MidiNoteCallback>();
  private stateChangeListeners = new Set<(status: MidiStatus) => void>();

  // Map MIDI note numbers (60 = C4) to BellData
  private noteToBellMap = new Map<number, string>();

  constructor() {
    GEFLE_BELLS.forEach((bell) => {
      this.noteToBellMap.set(bell.midiNote, bell.id);
    });
  }

  /**
   * Explicitly requests MIDI access upon user interaction.
   * Does NOT run automatically on page load to prevent unwanted permission prompts.
   */
  public async init(): Promise<{ success: boolean; isConnected: boolean; deviceName: string; error?: string }> {
    if (typeof navigator === 'undefined' || !navigator.requestMIDIAccess) {
      this.isSupported = false;
      this.isConnected = false;
      this.activeDeviceName = '';
      this.notifyStateChange();
      return {
        success: false,
        isConnected: false,
        deviceName: '',
        error: 'Web MIDI API не поддерживается данным браузером',
      };
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this.isSupported = true;
      this.setupInputs();

      this.midiAccess.onstatechange = () => {
        this.setupInputs();
      };

      return {
        success: true,
        isConnected: this.isConnected,
        deviceName: this.activeDeviceName,
      };
    } catch {
      this.isSupported = false;
      this.isConnected = false;
      this.activeDeviceName = '';
      this.notifyStateChange();
      return {
        success: false,
        isConnected: false,
        deviceName: '',
        error: 'Доступ к MIDI отклонён или устройство недоступно',
      };
    }
  }

  public disconnect(): void {
    if (this.midiAccess) {
      this.midiAccess.inputs.forEach((input) => {
        input.onmidimessage = null;
      });
      this.midiAccess.onstatechange = null;
      this.midiAccess = null;
    }
    this.isConnected = false;
    this.activeDeviceName = '';
    this.notifyStateChange();
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
    this.notifyStateChange();
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

  public onStateChange(callback: (status: MidiStatus) => void): () => void {
    this.stateChangeListeners.add(callback);
    callback(this.getStatus());
    return () => {
      this.stateChangeListeners.delete(callback);
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

  private notifyStateChange(): void {
    const status = this.getStatus();
    this.stateChangeListeners.forEach((fn) => {
      try {
        fn(status);
      } catch (err) {
        console.error('Error in MIDI state callback', err);
      }
    });
  }

  public getStatus(): MidiStatus {
    return {
      isSupported: this.isSupported,
      isConnected: this.isConnected,
      deviceName: this.activeDeviceName,
    };
  }
}

export const midiService = new MidiService();
