import React from 'react';
import { ViewMode } from '../types/carillon';
import { Volume2, VolumeX, Radio, Disc } from 'lucide-react';

interface HeaderProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  masterVolume: number;
  onVolumeChange: (vol: number) => void;
  reverbAmount?: number;
  onReverbChange?: (amount: number) => void;
  isMidiConnected: boolean;
  midiDeviceName: string;
  customSampleCount: number;
  isRecording: boolean;
  onOpenInfo?: () => void;
  onOpenGitModal?: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  masterVolume,
  onVolumeChange,
  isMidiConnected,
  midiDeviceName,
  customSampleCount,
  isRecording,
}) => {
  const isMuted = masterVolume === 0;

  return (
    <header className="border-b border-stone-800 bg-stone-950/90 backdrop-blur-md px-4 lg:px-8 py-3 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src={`${import.meta.env.BASE_URL}favicon.svg`}
              alt="Gefle Bells"
              className="w-8 h-8 rounded-lg shadow-md border border-amber-600/40 select-none object-contain"
            />
            <div>
              <span className="font-display text-xl font-bold tracking-tight text-amber-100">
                Gefle Bells
              </span>
              <span className="text-xs text-stone-400 ml-2 hidden sm:inline">
                Gävle Carillon (36 колоколов)
              </span>
            </div>
          </div>

          {isRecording && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-950/80 border border-red-800/80 text-red-300 text-xs font-mono animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>REC</span>
            </div>
          )}
        </div>

        {/* Zone 2: Navigation Links (Single row tabs) */}
        <nav className="flex items-center gap-1 bg-stone-900/80 p-1 rounded-xl border border-stone-800/80 text-sm font-medium">
          <button
            onClick={() => onViewChange('clavier')}
            className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              currentView === 'clavier'
                ? 'bg-amber-900/50 text-amber-200 border border-amber-700/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
            }`}
          >
            Консоль (Мануал)
          </button>

          <button
            onClick={() => onViewChange('belfry')}
            className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              currentView === 'belfry'
                ? 'bg-amber-900/50 text-amber-200 border border-amber-700/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
            }`}
          >
            Звонница (Башня)
          </button>

          <button
            onClick={() => onViewChange('trainer')}
            className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              currentView === 'trainer'
                ? 'bg-amber-900/50 text-amber-200 border border-amber-700/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
            }`}
          >
            Тренажёр
          </button>

          <button
            onClick={() => onViewChange('samples')}
            className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
              currentView === 'samples'
                ? 'bg-amber-900/50 text-amber-200 border border-amber-700/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
            }`}
          >
            <Disc className="w-3.5 h-3.5 text-amber-400" />
            <span>Сэмплы</span>
            {customSampleCount > 0 && (
              <span className="text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full border border-amber-500/30">
                {customSampleCount}/36
              </span>
            )}
          </button>
        </nav>

        {/* Zone 3: Primary Actions & Audio Controls */}
        <div className="flex items-center gap-2.5">
          {/* MIDI indicator */}
          <div
            title={isMidiConnected ? `MIDI подключен: ${midiDeviceName}` : 'MIDI не подключен (подключите клавиатуру)'}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono border ${
              isMidiConnected
                ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
                : 'bg-stone-900/40 border-stone-800/60 text-stone-500'
            }`}
          >
            <Radio className={`w-3 h-3 ${isMidiConnected ? 'animate-pulse text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">MIDI</span>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2 bg-stone-900/60 border border-stone-800/60 px-2.5 py-1 rounded-lg">
            <button
              onClick={() => onVolumeChange(isMuted ? 0.8 : 0)}
              className="text-stone-400 hover:text-stone-200 transition-colors"
              aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={masterVolume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-16 accent-amber-500 cursor-pointer h-1.5 bg-stone-700 rounded-lg appearance-none"
              title={`Громкость: ${Math.round(masterVolume * 100)}%`}
            />
          </div>
        </div>
      </div>
    </header>
  );
};
