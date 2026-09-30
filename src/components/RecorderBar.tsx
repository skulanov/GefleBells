import React, { useState, useEffect } from 'react';
import { audioEngine } from '../services/audioEngine';
import { NoteEvent } from '../types/carillon';
import { Disc, Square, Play, Download, Trash2 } from 'lucide-react';

interface RecorderBarProps {
  onStrike: (bellId: string, velocity?: number, isPedal?: boolean) => void;
  onRelease: (bellId: string) => void;
  isRecording: boolean;
  setIsRecording: (rec: boolean) => void;
}

export const RecorderBar: React.FC<RecorderBarProps> = ({
  onStrike,
  onRelease,
  isRecording,
  setIsRecording,
}) => {
  const [recordedNotes, setRecordedNotes] = useState<NoteEvent[]>([]);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer while recording
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const handleStartRecording = () => {
    audioEngine.startRecording();
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    const notes = audioEngine.stopRecording();
    setIsRecording(false);
    setRecordedNotes(notes);
  };

  const handlePlayback = () => {
    if (recordedNotes.length === 0 || isPlayingBack) return;
    setIsPlayingBack(true);

    recordedNotes.forEach((note) => {
      setTimeout(() => {
        onStrike(note.bellId, note.velocity || 0.85, note.isPedal);
        setTimeout(() => onRelease(note.bellId), 300);
      }, note.timestamp);
    });

    const last = recordedNotes[recordedNotes.length - 1];
    const totalDuration = last ? last.timestamp + 1200 : 2000;
    setTimeout(() => {
      setIsPlayingBack(false);
    }, totalDuration);
  };

  const handleExportJson = () => {
    if (recordedNotes.length === 0) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(recordedNotes, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `gefle_carillon_recording_${Date.now()}.json`);
    dlAnchor.click();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2.5 bg-stone-900/90 border border-stone-800 px-3.5 py-1.5 rounded-xl text-xs">
      <div className="text-stone-400 font-medium hidden sm:inline">Запись:</div>

      {!isRecording ? (
        <button
          onClick={handleStartRecording}
          disabled={isPlayingBack}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/70 hover:bg-red-900/80 border border-red-800 text-red-300 font-medium transition-colors"
          title="Начать запись колокольного звона"
        >
          <Disc className="w-3.5 h-3.5 text-red-500 fill-current" />
          <span>Запись</span>
        </button>
      ) : (
        <button
          onClick={handleStopRecording}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-colors animate-pulse"
          title="Остановить запись"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>Стоп ({formatTime(elapsedSeconds)})</span>
        </button>
      )}

      {recordedNotes.length > 0 && !isRecording && (
        <>
          <button
            onClick={handlePlayback}
            disabled={isPlayingBack}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
              isPlayingBack
                ? 'bg-amber-600 text-stone-950 font-bold border-amber-400'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
            }`}
            title="Воспроизвести записанную мелодию"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>{isPlayingBack ? 'Играет...' : `Слушать (${recordedNotes.length})`}</span>
          </button>

          <button
            onClick={handleExportJson}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-200 transition-colors"
            title="Экспорт записи в файл JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setRecordedNotes([])}
            className="p-1 rounded-lg text-stone-400 hover:text-red-400 transition-colors"
            title="Удалить запись"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
};
