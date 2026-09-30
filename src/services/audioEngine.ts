/**
 * Audio Engine for Gefle Bells Carillon
 * - Web Audio API Polyphonic Sample Player with Intelligent Pitch-Shifting
 * - Physical modeling Carillon Bell Synthesizer (5 tuned partials + clapper strike)
 * - Bell Tower Convolution Reverb
 * - Immediate background preloading on startup
 * - IndexedDB Custom Sample loader
 */

import { AudioSettings, BellData, NoteEvent } from '../types/carillon';
import { getAllSamplesFromDb } from './storageService';
import { BELL_MAP, GEFLE_BELLS } from '../data/gefleBellsData';

class CarillonAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;

  // Decoded audio buffers: bellId -> AudioBuffer
  private sampleBuffers = new Map<string, AudioBuffer>();
  private customSampleMetadata = new Map<string, string>(); // bellId -> filename

  // Initialization & preloading
  private initPromise: Promise<void> | null = null;
  private sampleListeners = new Set<(count: number) => void>();

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

  public onSamplesUpdated(cb: (count: number) => void): () => void {
    this.sampleListeners.add(cb);
    cb(this.sampleBuffers.size);
    return () => this.sampleListeners.delete(cb);
  }

  private notifySamplesUpdated(): void {
    const count = this.sampleBuffers.size;
    this.sampleListeners.forEach((cb) => {
      try {
        cb(count);
      } catch {}
    });
  }

  /**
   * Immediately setups the AudioContext and begins parallel loading
   * of all bundled and IndexedDB samples so sound is available instantly.
   */
  public init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        if (!this.ctx && typeof window !== 'undefined') {
          const AudioCtxClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
        }

        // Concurrently load user custom samples from IndexedDB and bundled samples
        await Promise.allSettled([
          this.loadStoredSamples(),
          this.preloadBundledSamples(),
        ]);
      } catch (err) {
        console.warn('AudioEngine init error:', err);
      }
    })();

    return this.initPromise;
  }

  /**
   * Resumes AudioContext on user interaction
   */
  public async wake(): Promise<void> {
    await this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (err) {
        console.warn('Could not resume AudioContext:', err);
      }
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
      const decay = Math.exp(-t * 2.2);
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
          this.notifySamplesUpdated();
        } catch (err) {
          console.warn(`Could not decode custom sample for ${item.bellId}`, err);
        }
      }
    } catch (e) {
      console.error('Failed reading IndexedDB samples', e);
    }
  }

  /**
   * Automatically attempts to preload bundled audio samples from public/samples/
   * If found in repository, decodes and caches in memory.
   */
  public async preloadBundledSamples(): Promise<number> {
    if (!this.ctx) return 0;
    const baseUrl = (import.meta.env.BASE_URL || './').replace(/\/+$/, '') + '/';
    let loadedCount = 0;

    await Promise.allSettled(
      GEFLE_BELLS.map(async (bell) => {
        // If already loaded from IndexedDB, don't overwrite
        if (this.sampleBuffers.has(bell.id)) return;

        const file = bell.expectedFileName;
        const candidates = [
          `${baseUrl}samples/${file}`,
          `${baseUrl}samples/${encodeURIComponent(file)}`,
          `${baseUrl}samples/${file.toLowerCase()}`,
          `${baseUrl}samples/${file.replace('#', 's')}`,
          `${baseUrl}samples/${file.replace('#', '%23')}`,
        ];

        for (const url of candidates) {
          try {
            const response = await fetch(url);
            if (!response.ok) continue;

            const contentType = response.headers.get('content-type') || '';
            // If response returned html (Vite SPA index.html fallback on 404), skip
            if (contentType.includes('text/html')) continue;

            const arrayBuffer = await response.arrayBuffer();
            if (arrayBuffer.byteLength < 500) continue;

            const decoded = await this.ctx!.decodeAudioData(arrayBuffer);
            this.sampleBuffers.set(bell.id, decoded);
            this.customSampleMetadata.set(bell.id, bell.expectedFileName);
            loadedCount++;
            this.notifySamplesUpdated();
            break;
          } catch {
            // File not present or decode error, skip
          }
        }
      })
    );

    return loadedCount;
  }

  /**
   * Sets custom sample from a File/Blob directly into engine & IndexedDB
   */
  public async loadSampleFile(bellId: string, file: File | Blob, fileName: string): Promise<boolean> {
    await this.wake();
    if (!this.ctx) return false;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bufferForDecode = arrayBuffer.slice(0);
      const decoded = await this.ctx.decodeAudioData(bufferForDecode);

      this.sampleBuffers.set(bellId, decoded);
      this.customSampleMetadata.set(bellId, fileName);
      this.notifySamplesUpdated();
      return true;
    } catch (err) {
      console.error(`Failed to decode sample file ${fileName}:`, err);
      return false;
    }
  }

  public removeCustomSample(bellId: string): void {
    this.sampleBuffers.delete(bellId);
    this.customSampleMetadata.delete(bellId);
    this.notifySamplesUpdated();
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
   * Finds the nearest loaded sample in pitch (by minimum MIDI distance)
   * to pitch-shift authentic sound across the carillon keyboard.
   */
  private findNearestLoadedSample(targetMidi: number): { buffer: AudioBuffer; midiNote: number } | null {
    if (this.sampleBuffers.size === 0) return null;

    let closestBellId: string | null = null;
    let minDistance = Infinity;

    for (const [id, buffer] of this.sampleBuffers.entries()) {
      if (!buffer) continue;
      const bell = BELL_MAP.get(id);
      if (!bell) continue;

      const dist = Math.abs(bell.midiNote - targetMidi);
      if (dist < minDistance) {
        minDistance = dist;
        closestBellId = id;
      }
    }

    if (closestBellId) {
      const b = BELL_MAP.get(closestBellId);
      const buf = this.sampleBuffers.get(closestBellId);
      if (b && buf) {
        return { buffer: buf, midiNote: b.midiNote };
      }
    }

    return null;
  }

  /**
   * Strike a bell by its ID (e.g. "C1", "G1", "A3")
   * @param bellId The bell identifier
   * @param velocity Strike strength between 0.2 and 1.0
   * @param isPedal Whether this strike came from a foot pedal
   */
  public async strike(bellId: string, velocity = 0.9, isPedal = false): Promise<void> {
    const bell = BELL_MAP.get(bellId);
    if (!bell) return;

    if (!this.ctx || this.ctx.state === 'suspended') {
      this.wake().catch(() => {});
    }

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

    // 1. Direct hit with exact authentic recorded sample
    const directBuffer = this.sampleBuffers.get(bellId);
    if (directBuffer) {
      this.playSampleBuffer(directBuffer, velocity, isPedal, 1.0);
      return;
    }

    // 2. If preloading is actively in progress and no sample has decoded yet, wait up to 150ms
    if (this.initPromise && this.sampleBuffers.size === 0) {
      try {
        await Promise.race([
          this.initPromise,
          new Promise((resolve) => setTimeout(resolve, 150)),
        ]);
        const retry = this.sampleBuffers.get(bellId);
        if (retry) {
          this.playSampleBuffer(retry, velocity, isPedal, 1.0);
          return;
        }
      } catch {}
    }

    // 3. Pitch-shift from nearest authentic carillon sample
    const nearest = this.findNearestLoadedSample(bell.midiNote);
    if (nearest) {
      const semitoneDiff = bell.midiNote - nearest.midiNote;
      const playbackRate = Math.pow(2, semitoneDiff / 12);
      this.playSampleBuffer(nearest.buffer, velocity, isPedal, playbackRate);
      return;
    }

    // 4. Physical modeling fallback only if no sample exists anywhere in the library
    if (this.settings.useSynthesisFallback) {
      this.synthesizeBellStrike(bell, velocity, isPedal);
    }
  }

  /**
   * Play sample buffer with optional pitch-shift playbackRate
   */
  private playSampleBuffer(
    buffer: AudioBuffer,
    velocity: number,
    isPedal: boolean,
    playbackRate = 1.0
  ): void {
    if (!this.ctx || !this.dryGain || !this.convolver) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    if (playbackRate !== 1.0) {
      source.playbackRate.setValueAtTime(playbackRate, this.ctx.currentTime);
    }

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

      const detuneCents = Math.random() * 6 - 3;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f0 * p.ratio, now);
      osc.detune.setValueAtTime(detuneCents, now);

      const pDuration = baseDuration * p.decayFactor;
      const initialAmp = p.amp * (bell.isSharp ? 0.92 : 1.0);

      pGain.gain.setValueAtTime(0, now);
      pGain.gain.linearRampToValueAtTime(initialAmp, now + 0.003);
      pGain.gain.exponentialRampToValueAtTime(0.0001, now + pDuration);

      osc.connect(pGain);
      pGain.connect(bellBus);

      osc.start(now);
      osc.stop(now + pDuration + 0.1);
    });

    // Clapper strike impact noise burst
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

// Auto-start preloading immediately when script loads in browser
if (typeof window !== 'undefined') {
  audioEngine.init().catch(() => {});
}
