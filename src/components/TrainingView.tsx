import React, { useState, useEffect, useRef } from 'react';
import { TrainingSong } from '../types/carillon';
import { PRESET_SONGS } from '../data/presetSongs';
import { BELL_MAP } from '../data/gefleBellsData';
import { audioEngine } from '../services/audioEngine';
import { Play, Pause, RotateCcw, Volume2, Award, Zap, Clock, Repeat, CheckCircle2 } from 'lucide-react';

interface TrainingViewProps {
  onStrike: (bellId: string, velocity?: number, isPedal?: boolean) => void;
  onRelease: (bellId: string) => void;
  activeBellIds: Set<string>;
  customKeybinds: Record<string, { code: string; label: string }>;
  lastStruckBell: { id: string; time: number } | null;
}

export const TrainingView: React.FC<TrainingViewProps> = ({
  onStrike,
  onRelease,
  activeBellIds,
  customKeybinds,
  lastStruckBell,
}) => {
  const [selectedSongId, setSelectedSongId] = useState<string>(PRESET_SONGS[0].id);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [autoPlay, setAutoPlay] = useState<boolean>(false); // listen vs practice
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [metronomeEnabled, setMetronomeEnabled] = useState<boolean>(true);

  // Playback timeline in ms
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const song = PRESET_SONGS.find((s) => s.id === selectedSongId) || PRESET_SONGS[0];

  // Scoring
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [hitFeedback, setHitFeedback] = useState<{ text: string; color: string } | null>(null);
  const scoredNotesRef = useRef<Set<number>>(new Set());

  // Animation frame loop
  const animFrameRef = useRef<number | null>(null);
  const lastWallTimeRef = useRef<number>(0);

  // Calculate song duration
  const lastNote = song.notes[song.notes.length - 1];
  const songDurationMs = lastNote ? lastNote.timeMs + lastNote.durationMs + 1500 : 10000;

  // Roll lookahead window (how many ms of upcoming notes are visible on screen)
  const rollWindowMs = 2500;

  const getKeyLabel = (bellId: string): string => {
    if (customKeybinds[bellId]) return customKeybinds[bellId].label;
    const b = BELL_MAP.get(bellId);
    return b ? b.defaultKeyLabel : bellId;
  };

  // Reset when song changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTimeMs(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    scoredNotesRef.current.clear();
  }, [selectedSongId]);

  // Main playback tick
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    lastWallTimeRef.current = performance.now();

    const loop = (wallTime: number) => {
      const delta = (wallTime - lastWallTimeRef.current) * playbackSpeed;
      lastWallTimeRef.current = wallTime;

      setCurrentTimeMs((prev) => {
        const nextTime = prev + delta;

        // Auto-play notes if enabled
        if (autoPlay) {
          song.notes.forEach((n, idx) => {
            if (prev < n.timeMs && nextTime >= n.timeMs) {
              const isPedal = n.hand === 'P';
              onStrike(n.bellId, 0.9, isPedal);
              setTimeout(() => onRelease(n.bellId), 300);
            }
          });
        }

        // Metronome beat check
        if (metronomeEnabled) {
          const beatIntervalMs = (60000 / song.tempoBpm);
          const prevBeat = Math.floor(prev / beatIntervalMs);
          const nextBeat = Math.floor(nextTime / beatIntervalMs);
          if (nextBeat > prevBeat) {
            const isFirstBeat = nextBeat % 4 === 0;
            audioEngine.playMetronomeClick(isFirstBeat);
          }
        }

        // Song end check
        if (nextTime >= songDurationMs) {
          if (isLooping) {
            scoredNotesRef.current.clear();
            return 0;
          } else {
            setIsPlaying(false);
            return songDurationMs;
          }
        }

        return nextTime;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, autoPlay, playbackSpeed, isLooping, metronomeEnabled, song, songDurationMs, onStrike, onRelease]);

  // Handle user strikes in Practice mode
  useEffect(() => {
    if (!isPlaying || autoPlay || !lastStruckBell) return;

    const hitThresholdMs = 280; // +/- tolerance window
    let bestMatchIdx = -1;
    let minDiff = Infinity;

    song.notes.forEach((note, idx) => {
      if (note.bellId === lastStruckBell.id && !scoredNotesRef.current.has(idx)) {
        const diff = Math.abs(currentTimeMs - note.timeMs);
        if (diff < hitThresholdMs && diff < minDiff) {
          minDiff = diff;
          bestMatchIdx = idx;
        }
      }
    });

    if (bestMatchIdx !== -1) {
      scoredNotesRef.current.add(bestMatchIdx);
      const diff = currentTimeMs - song.notes[bestMatchIdx].timeMs;

      if (Math.abs(diff) < 90) {
        setHitFeedback({ text: 'ИДЕАЛЬНО!', color: 'text-amber-300' });
        setScore((s) => s + 100);
      } else if (diff < 0) {
        setHitFeedback({ text: 'ЧУТЬ РАНЬШЕ', color: 'text-blue-300' });
        setScore((s) => s + 60);
      } else {
        setHitFeedback({ text: 'ЧУТЬ ПОЗЖЕ', color: 'text-orange-300' });
        setScore((s) => s + 60);
      }

      setCombo((c) => {
        const nc = c + 1;
        setMaxCombo((m) => Math.max(m, nc));
        return nc;
      });
    }
  }, [lastStruckBell, isPlaying, autoPlay, currentTimeMs, song.notes]);

  const handlePlayToggle = () => {
    if (currentTimeMs >= songDurationMs) {
      setCurrentTimeMs(0);
      scoredNotesRef.current.clear();
      setScore(0);
      setCombo(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setIsPlaying(false);
    setCurrentTimeMs(0);
    scoredNotesRef.current.clear();
    setScore(0);
    setCombo(0);
  };

  // Visible upcoming notes
  const visibleNotes = song.notes.filter(
    (n) => n.timeMs >= currentTimeMs - 400 && n.timeMs <= currentTimeMs + rollWindowMs
  );

  // Distinct bells used in this piece
  const songBells = Array.from(new Set(song.notes.map((n) => n.bellId))).map(
    (id) => BELL_MAP.get(id)!
  ).sort((a, b) => a.midiNote - b.midiNote);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Practice Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900/80 p-3 rounded-2xl border border-stone-800">
        {/* Song Select */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400 font-medium">Пьеса:</span>
          <select
            value={selectedSongId}
            onChange={(e) => setSelectedSongId(e.target.value)}
            className="bg-stone-800 text-amber-200 border border-stone-700 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            {PRESET_SONGS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.difficulty === 'easy' ? 'Простой' : s.difficulty === 'medium' ? 'Средний' : 'Сложный'})
              </option>
            ))}
          </select>
        </div>

        {/* Transport controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayToggle}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all ${
              isPlaying
                ? 'bg-amber-600 text-stone-950 hover:bg-amber-500'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Пауза' : 'Старт'}</span>
          </button>

          <button
            onClick={handleRestart}
            className="p-1.5 rounded-lg bg-stone-800 text-stone-300 hover:text-white transition-colors"
            title="Сначала"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`p-1.5 rounded-lg border transition-colors ${
              isLooping
                ? 'bg-amber-950/60 border-amber-700 text-amber-300'
                : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200'
            }`}
            title="Зациклить воспроизведение"
          >
            <Repeat className="w-4 h-4" />
          </button>

          <button
            onClick={() => setMetronomeEnabled(!metronomeEnabled)}
            className={`p-1.5 rounded-lg border transition-colors ${
              metronomeEnabled
                ? 'bg-amber-950/60 border-amber-700 text-amber-300'
                : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200'
            }`}
            title="Метроном"
          >
            <Clock className="w-4 h-4" />
          </button>
        </div>

        {/* Mode: Practice vs Auto-play & Speed */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-stone-950/80 p-0.5 rounded-lg border border-stone-800 text-xs">
            <button
              onClick={() => setAutoPlay(false)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                !autoPlay ? 'bg-amber-800/80 text-amber-100 font-semibold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Играть самому
            </button>
            <button
              onClick={() => setAutoPlay(true)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                autoPlay ? 'bg-amber-800/80 text-amber-100 font-semibold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Демонстрация
            </button>
          </div>

          {/* Speed selector */}
          <div className="flex items-center gap-1 text-xs font-mono text-stone-400">
            <span>Скорость:</span>
            {[0.75, 1.0, 1.25].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-1.5 py-0.5 rounded ${
                  playbackSpeed === speed ? 'bg-amber-500 text-stone-950 font-bold' : 'bg-stone-800 hover:text-stone-200'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Song details & score banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-stone-900/40 rounded-xl border border-stone-800 text-xs">
        <div>
          <span className="font-display font-bold text-amber-200 text-sm mr-2">{song.title}</span>
          <span className="text-stone-400">{song.subtitle}</span>
        </div>

        {!autoPlay && (
          <div className="flex items-center gap-4 font-mono">
            {hitFeedback && (
              <span className={`font-bold animate-bounce ${hitFeedback.color}`}>
                {hitFeedback.text}
              </span>
            )}
            <div className="flex items-center gap-1 text-amber-400 font-bold">
              <Zap className="w-3.5 h-3.5" />
              <span>Комбо: {combo} (макс: {maxCombo})</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-400 font-bold">
              <Award className="w-3.5 h-3.5" />
              <span>Очки: {score}</span>
            </div>
          </div>
        )}
      </div>

      {/* Visual Falling Note Roll (Synthesia-style for carillon) */}
      <div className="relative h-64 sm:h-72 w-full bg-[#140e0b] rounded-2xl border-4 border-[#352115] shadow-inner overflow-hidden select-none">
        {/* Background Grid Lines for each active bell column */}
        <div className="absolute inset-0 flex">
          {songBells.map((bell) => (
            <div
              key={`grid-${bell.id}`}
              className={`flex-1 border-r border-stone-800/40 flex flex-col justify-end ${
                bell.isSharp ? 'bg-black/30' : 'bg-transparent'
              }`}
            >
              <span className="text-[10px] text-stone-600 font-mono text-center mb-8">
                {bell.name}
              </span>
            </div>
          ))}
        </div>

        {/* Strike Target Bar (Line of action) */}
        <div className="absolute bottom-6 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-300 to-amber-600 shadow-[0_0_12px_#f59e0b] z-20 flex items-center justify-between px-3">
          <span className="text-[9px] font-mono uppercase tracking-wider text-amber-400 bg-stone-950 px-1 py-0.2 rounded border border-amber-700/60">
            Линия удара
          </span>
          <span className="text-[9px] font-mono text-amber-400 bg-stone-950 px-1 py-0.2 rounded border border-amber-700/60">
            {Math.round((currentTimeMs / songDurationMs) * 100)}%
          </span>
        </div>

        {/* Falling Notes */}
        {visibleNotes.map((note, index) => {
          const bellIndex = songBells.findIndex((b) => b.id === note.bellId);
          if (bellIndex === -1) return null;

          const colWidthPercent = 100 / songBells.length;
          const leftPercent = bellIndex * colWidthPercent;

          // Compute vertical position (bottom-up: 0% is at the strike line)
          // timeMs = currentTimeMs -> position = 24px (bottom-6)
          const timeDelta = note.timeMs - currentTimeMs;
          const bottomPx = 24 + (timeDelta / rollWindowMs) * 200;
          const heightPx = Math.max(22, (note.durationMs / rollWindowMs) * 200);

          const isStruck = scoredNotesRef.current.has(index);
          const isPedal = note.hand === 'P';

          return (
            <div
              key={`note-${note.bellId}-${note.timeMs}-${index}`}
              className={`absolute rounded-lg transition-opacity flex items-center justify-center border shadow-lg ${
                isPedal
                  ? 'bg-gradient-to-b from-red-600 to-red-800 border-red-300 text-white'
                  : note.hand === 'L'
                  ? 'bg-gradient-to-b from-blue-600 to-blue-800 border-blue-300 text-white'
                  : 'bg-gradient-to-b from-amber-500 to-amber-700 border-amber-200 text-stone-950'
              } ${isStruck ? 'opacity-30' : 'opacity-95'}`}
              style={{
                left: `${leftPercent + 0.5}%`,
                width: `${colWidthPercent - 1}%`,
                bottom: `${bottomPx}px`,
                height: `${heightPx}px`,
              }}
            >
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold font-mono">
                  {getKeyLabel(note.bellId)}
                </span>
                {isPedal && <span className="text-[8px] font-mono font-semibold">Педаль</span>}
              </div>
            </div>
          );
        })}

        {/* Progress Bar along the top of the roll */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-stone-900">
          <div
            className="h-full bg-amber-500 transition-all duration-75"
            style={{ width: `${Math.min(100, (currentTimeMs / songDurationMs) * 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Clavier Batons for the song's bells */}
      <div className="bg-gradient-to-b from-[#241711] to-[#120b08] p-3 rounded-2xl border border-[#3d2719]">
        <div className="text-xs text-amber-400 font-display font-semibold mb-2 px-1">
          Используемые колокола в пьесе ({songBells.length}):
        </div>
        <div className="flex justify-center gap-1 sm:gap-2 flex-wrap">
          {songBells.map((bell) => {
            const isActive = activeBellIds.has(bell.id);
            const keyLabel = getKeyLabel(bell.id);

            return (
              <button
                key={`train-baton-${bell.id}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  onStrike(bell.id, 0.95);
                }}
                onPointerUp={() => onRelease(bell.id)}
                className={`flex flex-col items-center justify-between p-2 rounded-xl transition-all border ${
                  bell.isSharp
                    ? 'w-10 sm:w-12 h-20 bg-stone-900 border-stone-700'
                    : 'w-11 sm:w-14 h-24 bg-[#4a2e1a] border-[#6b4226]'
                } ${
                  isActive
                    ? 'translate-y-2 bg-amber-600 border-amber-300 shadow-[0_0_12px_#f59e0b]'
                    : 'hover:border-amber-500'
                }`}
              >
                <span className="text-[10px] font-bold text-amber-100 font-display">
                  {bell.name}
                </span>
                <span
                  className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-amber-300 text-stone-950' : 'bg-stone-950/80 text-amber-300 border border-stone-800'
                  }`}
                >
                  {keyLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
