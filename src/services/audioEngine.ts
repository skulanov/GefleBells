/**
 * Audio Engine for Gefle Bells Carillon
 * - Web Audio API Polyphonic Sample Player
 * - Physical modeling Carillon Bell Synthesizer (5 tuned partials + clapper strike)
 * - Bell Tower Convolution Reverb
 * - IndexedDB Custom Sample loader
 */

import { AudioSettings, BellData, NoteEvent } from '../types/carillon';
import { getAllSamplesFromDb } from './storageService';
import { BELL_MAP } from '../data/gefleBellsData';

class CarillonAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;

  // Decoded audio buffers: bellId -> AudioBuffer
  private sampleBuffers = new Map<string, AudioBuffer>();
  private customSampleMetadata = new Map<string, string>(); // bellId -> filename

  // Settings
  private settings: AudioSettings = {
    masterVolume: 0.85,
    reverbAmount: 0.35,
    decayMultiplier: 1.0,
    strikeHardness: 1.0,
    useSynthesisFallback: true,
    synthDamping: 1.0,
  };

  // Recording
  private isRecording = false;
  private recordStartTime = 0;
  private recordedNotes: NoteEvent[] = [];

  // Active playing voices to allow dampening if needed
  private activeVoices = new Set<{ stop: () => void }>();

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.settings.masterVolume, this.ctx.currentTime);
    }
    if (this.wetGain && this.dryGain && this.ctx) {
      const wet = Math.min(1, Math.max(0, this.settings.reverbAmount));
      this.wetGain.gain.setValueAtTime(wet, this.ctx.currentTime);
      this.dryGain.gain.setValueAtTime(1 - wet * 0.4, this.ctx.currentTime);
    }
  }

  /**
   * Initializes or wakes up the AudioContext on user interaction
   */
  public async wake(): Promise<void> {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      // Master gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.settings.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Reverb routing
      this.dryGain = this.ctx.createGain();
      this.wetGain = this.ctx.createGain();
      this.wetGain.gain.setValueAtTime(this.settings.reverbAmount, this.ctx.currentTime);
      this.dryGain.gain.setValueAtTime(1 - this.settings.reverbAmount * 0.4, this.ctx.currentTime);

      this.convolver = this.ctx.createConvolver();
      this.convolver.buffer = this.createBelfryImpulseResponse(this.ctx);

      this.dryGain.connect(this.masterGain);
      this.convolver.connect(this.wetGain);
      this.wetGain.connect(this.masterGain);

      // Load user custom samples from IndexedDB
      await this.loadStoredSamples();
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /**
   * Generate algorithmic impulse response simulating the acoustic resonance
   * of a stone & timber bell chamber (Gävle Town Hall tower).
   */
  private createBelfryImpulseResponse(ctx: AudioContext): AudioBuffer {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * 2.8); // 2.8 sec reverberation
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / rate;
      // Exponential decay envelope with warm high-frequency absorption
      const decay = Math.exp(-t * 2.2);
      // Discrete early reflections + diffuse tail
      const noiseL = (Math.random() * 2 - 1) * decay;
      const noiseR = (Math.random() * 2 - 1) * decay;

      left[i] = noiseL;
      right[i] = noiseR;
    }

    return impulse;
  }

  /**
   * Loads all samples previously saved in IndexedDB
   */
  public async loadStoredSamples(): Promise<void> {
    if (!this.ctx) return;
    try {
      const stored = await getAllSamplesFromDb();
      for (const item of stored) {
        try {
          const arrayBuffer = await item.blob.arrayBuffer();
          const decoded = await this.ctx.decodeAudioData(arrayBuffer);
          this.sampleBuffers.set(item.bellId, decoded);
          this.customSampleMetadata.set(item.bellId, item.fileName);
        } catch (err) {
          console.warn(`Could not decode custom sample for ${item.bellId}`, err);
        }
      }
    } catch (e) {
      console.error('Failed reading IndexedDB samples', e);
    }
  }

  /**
   * Sets custom sample from a File/Blob directly into engine & IndexedDB
   */
  public async loadSampleFile(bellId: string, file: File | Blob, fileName: string): Promise<boolean> {
    await this.wake();
    if (!this.ctx) return false;

    try {
      const arrayBuffer = await file.arrayBuffer();
      // Make a copy for decodeAudioData since it detaches the buffer
      const bufferForDecode = arrayBuffer.slice(0);
      const decoded = await this.ctx.decodeAudioData(bufferForDecode);

      this.sampleBuffers.set(bellId, decoded);
      this.customSampleMetadata.set(bellId, fileName);
      return true;
    } catch (err) {
      console.error(`Failed to decode sample file ${fileName}:`, err);
      return false;
    }
  }

  public removeCustomSample(bellId: string): void {
    this.sampleBuffers.delete(bellId);
    this.customSampleMetadata.delete(bellId);
  }

  public hasCustomSample(bellId: string): boolean {
    return this.sampleBuffers.has(bellId);
  }

  public getSampleFileName(bellId: string): string | undefined {
    return this.customSampleMetadata.get(bellId);
  }

  public getAllLoadedSampleIds(): string[] {
    return Array.from(this.sampleBuffers.keys());
  }

  /**
   * Strike a bell by its ID (e.g. "C4", "Cs4", "A5")
   * @param bellId The bell identifier
   * @param velocity Strike strength between 0.2 and 1.0
   * @param isPedal Whether this strike came from a foot pedal
   */
  public strike(bellId: string, velocity = 0.9, isPedal = false): void {
    const bell = BELL_MAP.get(bellId);
    if (!bell) return;

    this.wake().catch(() => {});
    if (!this.ctx || !this.dryGain || !this.convolver) return;

    // Track recording
    if (this.isRecording) {
      const timestamp = Date.now() - this.recordStartTime;
      this.recordedNotes.push({
        bellId,
        timestamp,
        duration: 800,
        velocity,
        isPedal,
      });
    }

    const customBuffer = this.sampleBuffers.get(bellId);

    if (customBuffer) {
      // Play decoded authentic sample
      this.playSampleBuffer(customBuffer, velocity, isPedal);
    } else if (this.settings.useSynthesisFallback) {
      // Play physically modeled bell
      this.synthesizeBellStrike(bell, velocity, isPedal);
    }
  }

  /**
   * Play user-uploaded sample buffer
   */
  private playSampleBuffer(buffer: AudioBuffer, velocity: number, isPedal: boolean): void {
    if (!this.ctx || !this.dryGain || !this.convolver) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    // Bell voice gain with velocity
    const voiceGain = this.ctx.createGain();
    const gainValue = Math.min(1.0, Math.max(0.1, velocity * (isPedal ? 1.15 : 1.0)));
    voiceGain.gain.setValueAtTime(gainValue, this.ctx.currentTime);

    source.connect(voiceGain);
    voiceGain.connect(this.dryGain);
    voiceGain.connect(this.convolver);

    source.start(0);

    const voiceRef = {
      stop: () => {
        try {
          source.stop();
        } catch {
          // ignore
        }
      },
    };
    this.activeVoices.add(voiceRef);
    source.onended = () => {
      this.activeVoices.delete(voiceRef);
    };
  }

  /**
   * Physical Modeling Synthesizer for Authentic Carillon Bronze Bell
   * Tuned partials:
   * 1. Hum Tone (Sub-octave, ratio 0.5) - heavy sustained foundation
   * 2. Prime / Strike note (ratio 1.0)
   * 3. Tierce (Minor third, ratio 1.1892) - signature carillon bell color
   * 4. Quint (Fifth, ratio 1.4983)
   * 5. Nominal (Octave, ratio 2.0)
   * 6. Supernominal (ratio 2.67)
   * + Clapper impact transient (white noise burst)
   */
  private synthesizeBellStrike(bell: BellData, velocity: number, isPedal: boolean): void {
    if (!this.ctx || !this.dryGain || !this.convolver) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const f0 = bell.frequency;

    // Weight affects decay duration: 285kg bourdon decays over ~6-7s, high treble decays in ~1.5-2s
    const baseDuration = (2.0 + (bell.weightKg / 285) * 5.0) * this.settings.decayMultiplier;

    // Master node for this specific strike
    const bellBus = ctx.createGain();
    const strikeVol = velocity * (isPedal ? 1.1 : 0.95);
    bellBus.gain.setValueAtTime(strikeVol, now);

    // Carillon partial ratios and relative amplitudes
    const partials = [
      { ratio: 0.50, amp: 0.65, decayFactor: 1.25 }, // Hum tone (longer sustain)
      { ratio: 1.00, amp: 0.85, decayFactor: 1.00 }, // Prime / Fundamental
      { ratio: 1.1892, amp: 0.55, decayFactor: 0.85 }, // Tierce (Minor third)
      { ratio: 1.4983, amp: 0.40, decayFactor: 0.70 }, // Quint (Fifth)
      { ratio: 2.00, amp: 0.45, decayFactor: 0.55 }, // Nominal (Octave)
      { ratio: 2.67, amp: 0.25, decayFactor: 0.35 }, // Supernominal
      { ratio: 3.90, amp: 0.15, decayFactor: 0.20 }, // High shimmer
    ];

    partials.forEach((p) => {
      const osc = ctx.createOscillator();
      const pGain = ctx.createGain();

      // Slightly detune partials to create natural bronze acoustic beating
      const detuneCents = (Math.random() * 6 - 3);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f0 * p.ratio, now);
      osc.detune.setValueAtTime(detuneCents, now);

      const pDuration = baseDuration * p.decayFactor;
      const initialAmp = p.amp * (bell.isSharp ? 0.92 : 1.0);

      pGain.gain.setValueAtTime(0, now);
      // Fast attack (1-2ms)
      pGain.gain.linearRampToValueAtTime(initialAmp, now + 0.003);
      // Natural exponential decay
      pGain.gain.exponentialRampToValueAtTime(0.0001, now + pDuration);

      osc.connect(pGain);
      pGain.connect(bellBus);

      osc.start(now);
      osc.stop(now + pDuration + 0.1);
    });

    // Clapper strike impact noise burst (metallic clack in first 10-20ms)
    const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.025), ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.006));
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(Math.min(6000, f0 * 3.5), now);
    noiseFilter.Q.setValueAtTime(2.0, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35 * this.settings.strikeHardness * velocity, now);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(bellBus);

    noiseSource.start(now);

    // Route bell bus to dry and reverb
    bellBus.connect(this.dryGain);
    bellBus.connect(this.convolver);
  }

  /**
   * Metronome Click generator
   */
  public playMetronomeClick(isHighBeat: boolean): void {
    if (!this.ctx || !this.dryGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isHighBeat ? 1600 : 1000, now);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.dryGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Recording controls
  public startRecording(): void {
    this.isRecording = true;
    this.recordStartTime = Date.now();
    this.recordedNotes = [];
  }

  public stopRecording(): NoteEvent[] {
    this.isRecording = false;
    return [...this.recordedNotes];
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  public stopAllVoices(): void {
    this.activeVoices.forEach((v) => v.stop());
    this.activeVoices.clear();
  }
}

export const audioEngine = new CarillonAudioEngine();
