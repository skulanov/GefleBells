import React from 'react';
import { ViewMode } from '../types/carillon';
import { Volume2, VolumeX, Sliders, Music, Info, GitBranch, Radio, Disc } from 'lucide-react';

interface HeaderProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  masterVolume: number;
  onVolumeChange: (vol: number) => void;
  reverbAmount: number;
  onReverbChange: (amount: number) => void;
  isMidiConnected: boolean;
  midiDeviceName: string;
  customSampleCount: number;
  isRecording: boolean;
  onOpenInfo: () => void;
  onOpenGitModal: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  masterVolume,
  onVolumeChange,
  reverbAmount,
  onReverbChange,
  isMidiConnected,
  midiDeviceName,
  customSampleCount,
  isRecording,
  onOpenInfo,
  onOpenGitModal,
  onOpenSettings,
}) => {
  const isMuted = masterVolume === 0;

  return (
    <header className="border-b border-stone-800 bg-stone-950/90 backdrop-blur-md px-4 lg:px-8 py-3 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-900 flex items-center justify-center shadow-inner border border-amber-500/30 text-amber-200">
              <span className="font-display font-bold text-lg">G</span>
            </div>
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

          {/* Reverb ambience toggle */}
          <button
            onClick={() => onReverbChange(reverbAmount > 0.1 ? 0.05 : 0.45)}
            className={`p-2 rounded-lg border transition-all ${
              reverbAmount > 0.1
                ? 'bg-amber-950/40 border-amber-700/50 text-amber-300'
                : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
            title={`Акустика башни (реверберация): ${Math.round(reverbAmount * 100)}%`}
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* About Info Modal */}
          <button
            onClick={onOpenInfo}
            className="p-2 rounded-lg bg-stone-900/60 border border-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
            title="О карильоне Gefle Bells"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* GitHub Repo info & push modal */}
          <button
            onClick={onOpenGitModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-medium transition-all"
            title="Экспорт репозитория GefleBells на GitHub"
          >
            <GitBranch className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">GitHub</span>
          </button>
        </div>
      </div>
    </header>
  );
};
