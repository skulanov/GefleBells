import React, { useState, useRef } from 'react';
import { BellData } from '../types/carillon';
import { GEFLE_BELLS } from '../data/gefleBellsData';
import { audioEngine } from '../services/audioEngine';
import { saveSampleToDb, deleteSampleFromDb, clearAllSamplesFromDb } from '../services/storageService';
import { Upload, Trash2, Play, CheckCircle, AlertCircle, FileAudio, RefreshCw, Sparkles } from 'lucide-react';

interface SampleManagerModalProps {
  onSampleChange: () => void;
  onStrikeTest: (bellId: string) => void;
}

export const SampleManagerModal: React.FC<SampleManagerModalProps> = ({
  onSampleChange,
  onStrikeTest,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedBellForUpload, setSelectedBellForUpload] = useState<string | null>(null);

  // Exact matching for psgbells_*_b.wav files and standard note variations
  const findBellIdFromFilename = (fileName: string): string | null => {
    const rawClean = fileName.trim().toLowerCase();
    const withoutExt = rawClean.replace(/\.[^/.]+$/, '');

    // 1. Direct match with expectedFileName (e.g. psgbells_c1_b.wav -> C1, psgbells_d#1_b.wav -> Ds1)
    for (const b of GEFLE_BELLS) {
      const expWithoutExt = b.expectedFileName.replace(/\.[^/.]+$/, '').toLowerCase();
      if (rawClean === b.expectedFileName.toLowerCase() || withoutExt === expWithoutExt) {
        return b.id;
      }
    }

    // 2. Normalized matching (handles URL encoding %23 for #, "sharp", "s", spaces)
    const normalize = (s: string) =>
      s
        .replace(/%23/g, '#')
        .replace(/♯/g, '#')
        .replace(/_sharp_/g, '#')
        .replace(/sharp/g, '#')
        .replace(/s(\d)/g, '#$1') // e.g. ds1 -> d#1
        .replace(/[_\s-]+/g, '')
        .toLowerCase();

    const normFile = normalize(withoutExt);

    for (const b of GEFLE_BELLS) {
      const expNorm = normalize(b.expectedFileName.replace(/\.[^/.]+$/, ''));
      if (normFile === expNorm || normFile.includes(expNorm)) {
        return b.id;
      }
      // Also match note name without prefix: e.g. c1_b, d#1_b, or c1, d#1
      const noteNorm = normalize(b.id);
      if (normFile === `psgbells${noteNorm}b` || normFile === `${noteNorm}b` || normFile === noteNorm) {
        return b.id;
      }
    }

    // 3. Fallback pattern match for note + octave (e.g. c1, d1, d#1, c#2)
    const match = withoutExt.match(/(?:^|[^a-z0-9])([a-g][#s]?\d)(?:[^a-z0-9]|$)/i);
    if (match) {
      const parsedNote = match[1].replace(/s/i, '#').toUpperCase();
      for (const b of GEFLE_BELLS) {
        if (b.name.replace('/', '').toUpperCase().includes(parsedNote)) {
          return b.id;
        }
      }
    }

    // 4. Sequential index 1 to 36
    const numMatch = withoutExt.match(/(?:bell[_-]?)?(\d+)/i);
    if (numMatch) {
      const idx = parseInt(numMatch[1], 10);
      if (idx >= 1 && idx <= GEFLE_BELLS.length) {
        return GEFLE_BELLS[idx - 1].id;
      }
    }

    return null;
  };

  // Process files
  const processFiles = async (files: FileList | File[]) => {
    setIsProcessing(true);
    let matchedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const matchedBellId = findBellIdFromFilename(file.name);

      if (matchedBellId) {
        const success = await audioEngine.loadSampleFile(matchedBellId, file, file.name);
        if (success) {
          await saveSampleToDb(matchedBellId, file.name, file);
          matchedCount++;
        } else {
          failedCount++;
        }
      } else {
        failedCount++;
      }
    }

    setIsProcessing(false);
    onSampleChange();

    if (matchedCount > 0) {
      setUploadStatusMsg({
        text: `Успешно загружено и привязано сэмплов: ${matchedCount} из 36${failedCount > 0 ? ` (не распознано: ${failedCount})` : ''}`,
        type: 'success',
      });
    } else {
      setUploadStatusMsg({
        text: 'Не удалось автоматически сопоставить файлы с нотами Gefle Bells (psgbells_*_b.wav или C1–C4). Вы можете загрузить сэмпл для каждого колокола вручную кнопкой «Загрузить» в таблице ниже.',
        type: 'error',
      });
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  // Single file upload for specific bell
  const handleSingleBellUploadClick = (bellId: string) => {
    setSelectedBellForUpload(bellId);
    if (singleFileInputRef.current) {
      singleFileInputRef.current.value = '';
      singleFileInputRef.current.click();
    }
  };

  const handleSingleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedBellForUpload || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsProcessing(true);
    const success = await audioEngine.loadSampleFile(selectedBellForUpload, file, file.name);
    if (success) {
      await saveSampleToDb(selectedBellForUpload, file.name, file);
      setUploadStatusMsg({
        text: `Сэмпл для колокола ${selectedBellForUpload} успешно обновлен (${file.name})`,
        type: 'success',
      });
      onSampleChange();
    } else {
      setUploadStatusMsg({
        text: `Не удалось загрузить аудиофайл ${file.name}. Проверьте формат.`,
        type: 'error',
      });
    }
    setIsProcessing(false);
  };

  // Remove single sample
  const handleRemoveSample = async (bellId: string) => {
    audioEngine.removeCustomSample(bellId);
    await deleteSampleFromDb(bellId);
    onSampleChange();
    setUploadStatusMsg({
      text: `Сэмпл для ${bellId} удален. Колокол переключен на физический синтез.`,
      type: 'info',
    });
  };

  // Clear all
  const handleClearAll = async () => {
    if (window.confirm('Вы уверены, что хотите удалить все пользовательские сэмплы и вернуться к синтезу по умолчанию?')) {
      GEFLE_BELLS.forEach((b) => audioEngine.removeCustomSample(b.id));
      await clearAllSamplesFromDb();
      onSampleChange();
      setUploadStatusMsg({
        text: 'Все сэмплы очищены. Карильон использует физический синтез звона.',
        type: 'info',
      });
    }
  };

  const loadedSampleIds = new Set(audioEngine.getAllLoadedSampleIds());

  const filteredBells = GEFLE_BELLS.filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.id.toLowerCase().includes(q) ||
      b.name.toLowerCase().includes(q) ||
      b.russianName.toLowerCase().includes(q) ||
      b.expectedFileName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Status & Description */}
      <div className="bg-stone-900/80 p-5 rounded-2xl border border-stone-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="font-display font-bold text-lg text-amber-200">
                Управление сэмплами карильона Gefle Bells
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1 max-w-2xl">
              Загрузите оригинальные сэмплы Gefle Bells (<code className="text-amber-300 font-mono">psgbells_c1_b.wav</code> – <code className="text-amber-300 font-mono">psgbells_c4_b.wav</code>). Сэмплы сохраняются в IndexedDB браузера и мгновенно звучат при нажатии рукояток и педалей.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center gap-2">
              <span className="text-xs text-stone-400">Загружено:</span>
              <span className="font-mono text-sm font-bold text-amber-300">
                {loadedSampleIds.size} / 36
              </span>
            </div>

            <button
              onClick={() => batchFileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs shadow-md transition-colors whitespace-nowrap cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Выбрать файлы</span>
            </button>

            {loadedSampleIds.size > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-red-950/60 hover:text-red-300 text-stone-400 text-xs border border-stone-700 transition-colors"
                title="Очистить все пользовательские сэмплы"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Очистить все</span>
              </button>
            )}
          </div>
        </div>

        {/* Hidden inputs */}
        <input
          ref={batchFileInputRef}
          type="file"
          multiple
          accept="audio/*,.wav,.mp3,.ogg,.flac,.m4a"
          className="hidden"
          onChange={(e) => e.target.files && processFiles(e.target.files)}
        />

        <input
          ref={singleFileInputRef}
          type="file"
          accept="audio/*,.wav,.mp3,.ogg,.flac,.m4a"
          className="hidden"
          onChange={handleSingleFileSelected}
        />

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-amber-400 bg-amber-950/30 scale-[1.01]'
              : 'border-stone-700 hover:border-amber-600/60 bg-stone-950/50'
          }`}
          onClick={() => batchFileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-stone-800/80 flex items-center justify-center text-amber-400 mb-1">
              <FileAudio className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-stone-200">
              Перетащите сюда ваши аудиофайлы Gefle Bells (или нажмите для выбора)
            </div>
            <div className="text-xs text-stone-400 max-w-lg">
              Имена файлов сопоставляются автоматически: например <code className="text-amber-300 font-mono">psgbells_c1_b.wav</code>, <code className="text-amber-300 font-mono">psgbells_d#1_b.wav</code>, <code className="text-amber-300 font-mono">psgbells_c4_b.wav</code>.
            </div>
          </div>
        </div>

        {/* Status Message Notification */}
        {uploadStatusMsg && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
              uploadStatusMsg.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                : uploadStatusMsg.type === 'error'
                ? 'bg-red-950/60 border-red-800 text-red-200'
                : 'bg-stone-800 border-stone-700 text-stone-300'
            }`}
          >
            {uploadStatusMsg.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
            {uploadStatusMsg.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
            {uploadStatusMsg.type === 'info' && <RefreshCw className="w-4 h-4 text-amber-400 shrink-0" />}
            <span>{uploadStatusMsg.text}</span>
          </div>
        )}
      </div>

      {/* 36 Bells Sample Table */}
      <div className="bg-stone-900/80 rounded-2xl border border-stone-800 overflow-hidden">
        {/* Table Search & Filter */}
        <div className="p-4 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-sm text-amber-200">
              Карта сэмплов карильона Gefle Bells (36 колоколов)
            </span>
          </div>
          <input
            type="text"
            placeholder="Поиск ноты или файла (например: C1, d#1, psgbells...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-200 placeholder:text-stone-500 focus:outline-none focus:border-amber-500 w-72"
          />
        </div>

        {/* Table list */}
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950 text-stone-400 font-mono border-b border-stone-800 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-4">Нота</th>
                <th className="py-2.5 px-3">Название</th>
                <th className="py-2.5 px-3">Ожидаемый файл</th>
                <th className="py-2.5 px-3">Управление</th>
                <th className="py-2.5 px-3">Масса / Частота</th>
                <th className="py-2.5 px-4">Текущий статус</th>
                <th className="py-2.5 px-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-sans">
              {filteredBells.map((bell) => {
                const hasCustom = loadedSampleIds.has(bell.id);
                const customFileName = audioEngine.getSampleFileName(bell.id);

                return (
                  <tr
                    key={`table-bell-${bell.id}`}
                    className="hover:bg-stone-800/40 transition-colors"
                  >
                    {/* Bell identifier */}
                    <td className="py-3 px-4 font-display font-bold text-sm text-amber-100">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span>{bell.name}</span>
                      </div>
                    </td>

                    {/* Russian name */}
                    <td className="py-3 px-3 text-stone-300">
                      {bell.russianName}
                    </td>

                    {/* Expected filename */}
                    <td className="py-3 px-3 font-mono text-amber-300/80">
                      <code className="bg-stone-950 px-2 py-0.5 rounded border border-stone-800 text-[11px]">
                        {bell.expectedFileName}
                      </code>
                    </td>

                    {/* Pedal + Manual vs Manual only */}
                    <td className="py-3 px-3">
                      {bell.hasPedal ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950/50 text-amber-300 border border-amber-800/60">
                          <span>Педали + Мануал</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-stone-900 text-stone-400 border border-stone-800">
                          <span>Только мануал</span>
                        </span>
                      )}
                    </td>

                    {/* Weight & Hz */}
                    <td className="py-3 px-3 font-mono text-stone-400">
                      <span>{bell.weightKg} кг</span>
                      <span className="text-stone-600 mx-1.5">·</span>
                      <span>{Math.round(bell.frequency)} Гц</span>
                    </td>

                    {/* Status Source */}
                    <td className="py-3 px-4">
                      {hasCustom ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[180px]" title={customFileName}>
                            {customFileName || 'Загруженный сэмпл'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-stone-400">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500/70 shrink-0" />
                          <span>Физический синтез</span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Play test button */}
                        <button
                          onClick={() => onStrikeTest(bell.id)}
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-amber-900/60 hover:text-amber-200 text-stone-300 transition-colors"
                          title="Прослушать удар"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>

                        {/* Upload single file */}
                        <button
                          onClick={() => handleSingleBellUploadClick(bell.id)}
                          className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 hover:border-amber-500 transition-colors"
                        >
                          {hasCustom ? 'Заменить' : 'Загрузить'}
                        </button>

                        {/* Reset / delete */}
                        {hasCustom && (
                          <button
                            onClick={() => handleRemoveSample(bell.id)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                            title="Сбросить на физический синтез"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
