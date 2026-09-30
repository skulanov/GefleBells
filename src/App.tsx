/**
 * Gefle Bells — Carillon Simulator & Trainer
 * Gävle Town Hall Carillon (36 Bells, Bergholtz 1972)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ViewMode, BellData } from './types/carillon';
import { GEFLE_BELLS, BELL_MAP } from './data/gefleBellsData';
import { audioEngine } from './services/audioEngine';
import { midiService } from './services/midiService';
import { getCustomKeybinds, saveCustomKeybinds } from './services/storageService';

import { Header } from './components/Header';
import { CarillonClavier } from './components/CarillonClavier';
import { CarillonBelfry } from './components/CarillonBelfry';
import { TrainingView } from './components/TrainingView';
import { SampleManagerModal } from './components/SampleManagerModal';
import { KeybindModal } from './components/KeybindModal';
import { RecorderBar } from './components/RecorderBar';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('clavier');
  const [activeBellIds, setActiveBellIds] = useState<Set<string>>(new Set());
  const [lastStruckBell, setLastStruckBell] = useState<{ id: string; time: number } | null>(null);

  // Audio settings
  const [masterVolume, setMasterVolume] = useState<number>(0.85);
  const [reverbAmount, setReverbAmount] = useState<number>(0.35);

  // Custom keybindings
  const [customKeybinds, setCustomKeybinds] = useState<Record<string, { code: string; label: string }>>({});

  // Modals
  const [isKeybindsOpen, setIsKeybindsOpen] = useState(false);

  // MIDI status
  const [midiConnected, setMidiConnected] = useState(false);
  const [midiDeviceName, setMidiDeviceName] = useState('');

  // Sample status
  const [sampleCount, setSampleCount] = useState<number>(0);

  // Recording status
  const [isRecording, setIsRecording] = useState<boolean>(false);

  // Key code to bell map lookup for rapid keyboard lookup
  const keyToBellMapRef = useRef<Map<string, { bellId: string; isPedal: boolean }>>(new Map());

  // Refresh keyboard lookup table
  const refreshKeyLookup = useCallback((keybinds: Record<string, { code: string; label: string }>) => {
    const map = new Map<string, { bellId: string; isPedal: boolean }>();

    GEFLE_BELLS.forEach((bell) => {
      // Manual key
      const manualCode = keybinds[bell.id]?.code || bell.defaultKeyCode;
      if (manualCode) {
        map.set(manualCode, { bellId: bell.id, isPedal: false });
      }

      // Pedal key
      if (bell.hasPedal && bell.pedalKeyCode) {
        map.set(bell.pedalKeyCode, { bellId: bell.id, isPedal: true });
      }
    });

    keyToBellMapRef.current = map;
  }, []);

  // Initialize
  useEffect(() => {
    // 1. Load stored keybinds
    const binds = getCustomKeybinds();
    setCustomKeybinds(binds);
    refreshKeyLookup(binds);

    // 2. Initialize Web MIDI
    midiService.init().then(() => {
      const status = midiService.getStatus();
      setMidiConnected(status.isConnected);
      setMidiDeviceName(status.deviceName);
    });

    const unsubscribeMidi = midiService.onNote((bellId, velocity, isNoteOn) => {
      if (isNoteOn) {
        handleStrike(bellId, velocity, false);
      } else {
        handleRelease(bellId);
      }
    });

    // 3. Audio settings
    audioEngine.updateSettings({ masterVolume, reverbAmount });

    // 4. Update sample counter
    setSampleCount(audioEngine.getAllLoadedSampleIds().length);

    return () => {
      unsubscribeMidi();
    };
  }, [refreshKeyLookup]);

  // Strike handler
  const handleStrike = useCallback((bellId: string, velocity = 0.9, isPedal = false) => {
    audioEngine.strike(bellId, velocity, isPedal);
    setActiveBellIds((prev) => {
      const next = new Set(prev);
      next.add(bellId);
      return next;
    });
    setLastStruckBell({ id: bellId, time: Date.now() });
  }, []);

  // Release handler
  const handleRelease = useCallback((bellId: string) => {
    setActiveBellIds((prev) => {
      const next = new Set(prev);
      next.delete(bellId);
      return next;
    });
  }, []);

  // Release all
  const handleReleaseAll = useCallback(() => {
    setActiveBellIds(new Set());
  }, []);

  // Physical Keyboard Listeners (event.code based - layout independent)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;

      // Ignore when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const match = keyToBellMapRef.current.get(e.code);
      if (match) {
        e.preventDefault();
        handleStrike(match.bellId, 0.92, match.isPedal);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const match = keyToBellMapRef.current.get(e.code);
      if (match) {
        handleRelease(match.bellId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleReleaseAll);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleReleaseAll);
    };
  }, [handleStrike, handleRelease, handleReleaseAll]);

  // Volume change
  const handleVolumeChange = (vol: number) => {
    setMasterVolume(vol);
    audioEngine.updateSettings({ masterVolume: vol });
  };

  // Reverb change
  const handleReverbChange = (amount: number) => {
    setReverbAmount(amount);
    audioEngine.updateSettings({ reverbAmount: amount });
  };

  // Save keybinds
  const handleSaveKeybinds = (binds: Record<string, { code: string; label: string }>) => {
    setCustomKeybinds(binds);
    saveCustomKeybinds(binds);
    refreshKeyLookup(binds);
  };

  // Samples updated
  const handleSampleChange = () => {
    setSampleCount(audioEngine.getAllLoadedSampleIds().length);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-800 selection:text-amber-100">
      {/* Top Bar Header */}
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        masterVolume={masterVolume}
        onVolumeChange={handleVolumeChange}
        isMidiConnected={midiConnected}
        midiDeviceName={midiDeviceName}
        customSampleCount={sampleCount}
        isRecording={isRecording}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 flex flex-col gap-6">
        {currentView === 'clavier' && (
          <CarillonClavier
            activeBellIds={activeBellIds}
            onStrike={handleStrike}
            onRelease={handleRelease}
            customKeybinds={customKeybinds}
            onOpenKeybinds={() => setIsKeybindsOpen(true)}
          />
        )}

        {currentView === 'belfry' && (
          <CarillonBelfry
            activeBellIds={activeBellIds}
            onStrike={handleStrike}
            onRelease={handleRelease}
            customKeybinds={customKeybinds}
          />
        )}

        {currentView === 'trainer' && (
          <TrainingView
            onStrike={handleStrike}
            onRelease={handleRelease}
            activeBellIds={activeBellIds}
            customKeybinds={customKeybinds}
            lastStruckBell={lastStruckBell}
          />
        )}

        {currentView === 'samples' && (
          <SampleManagerModal
            onSampleChange={handleSampleChange}
            onStrikeTest={(id) => handleStrike(id, 0.9)}
          />
        )}

        {/* Global Bottom Control Bar with Audio Recorder */}
        <div className="mt-auto pt-6 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <RecorderBar
              onStrike={handleStrike}
              onRelease={handleRelease}
              isRecording={isRecording}
              setIsRecording={setIsRecording}
            />
          </div>

          <div className="flex items-center gap-4 text-xs text-stone-400">
            <span className="font-display text-amber-300">
              Gefle Bells (Gävle Rådhus)
            </span>
            <span className="text-stone-600">·</span>
            <span>Bergholtz Klockgjuteri 1972</span>
            <span className="text-stone-600">·</span>
            <a
              href="https://github.com/skulanov/GefleBells"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400/90 hover:text-amber-300 hover:underline"
            >
              skulanov/GefleBells
            </a>
          </div>
        </div>
      </main>

      {/* Modals */}
      <KeybindModal
        isOpen={isKeybindsOpen}
        onClose={() => setIsKeybindsOpen(false)}
        customKeybinds={customKeybinds}
        onSaveKeybinds={handleSaveKeybinds}
      />
    </div>
  );
}
