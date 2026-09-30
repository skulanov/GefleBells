import React, { useState, useEffect } from 'react';
import { BellData } from '../types/carillon';
import { GEFLE_BELLS } from '../data/gefleBellsData';
import { X, RotateCcw, Keyboard, Check } from 'lucide-react';

interface KeybindModalProps {
  isOpen: boolean;
  onClose: () => void;
  customKeybinds: Record<string, { code: string; label: string }>;
  onSaveKeybinds: (binds: Record<string, { code: string; label: string }>) => void;
}

export const KeybindModal: React.FC<KeybindModalProps> = ({
  isOpen,
  onClose,
  customKeybinds,
  onSaveKeybinds,
}) => {
  const [activeBindingBellId, setActiveBindingBellId] = useState<string | null>(null);
  const [localKeybinds, setLocalKeybinds] = useState<Record<string, { code: string; label: string }>>({});

  useEffect(() => {
    setLocalKeybinds(customKeybinds);
  }, [customKeybinds, isOpen]);

  useEffect(() => {
    if (!activeBindingBellId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === 'Escape') {
        setActiveBindingBellId(null);
        return;
      }

      // Convert code to clean label (e.g. KeyA -> A, Digit1 -> 1)
      let label = e.key.toUpperCase();
      if (e.code.startsWith('Key')) {
        label = e.code.replace('Key', '');
      } else if (e.code.startsWith('Digit')) {
        label = e.code.replace('Digit', '');
      } else if (e.code === 'Minus') {
        label = '-';
      } else if (e.code === 'Equal') {
        label = '=';
      } else if (e.code === 'BracketLeft') {
        label = '[';
      } else if (e.code === 'BracketRight') {
        label = ']';
      } else if (e.code === 'Semicolon') {
        label = ';';
      } else if (e.code === 'Quote') {
        label = "'";
      } else if (e.code === 'Comma') {
        label = ',';
      } else if (e.code === 'Period') {
        label = '.';
      } else if (e.code === 'Slash') {
        label = '/';
      }

      setLocalKeybinds((prev) => ({
        ...prev,
        [activeBindingBellId]: {
          code: e.code,
          label,
        },
      }));

      setActiveBindingBellId(null);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [activeBindingBellId]);

  if (!isOpen) return null;

  const handleResetDefaults = () => {
    setLocalKeybinds({});
    onSaveKeybinds({});
  };

  const handleSave = () => {
    onSaveKeybinds(localKeybinds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-amber-400" />
            <h3 className="font-display font-bold text-base text-amber-100">
              Настройка клавиш клавиатуры
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-xs text-stone-400 mb-4">
            Нажмите на колокол, затем нажмите любую клавишу на клавиатуре. Клавиши привязаны к физическому положению кнопок (event.code), поэтому переключать раскладку между русской и английской не требуется.
          </p>

          {activeBindingBellId && (
            <div className="mb-4 p-3 rounded-xl bg-amber-950/60 border border-amber-600 text-center animate-pulse text-xs text-amber-200">
              Нажмите желаемую клавишу на клавиатуре для колокола <span className="font-bold">{activeBindingBellId}</span> (или Esc для отмены)...
            </div>
          )}

          {/* Grid of bells */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {GEFLE_BELLS.map((bell) => {
              const currentKey = localKeybinds[bell.id]?.label || bell.defaultKeyLabel;
              const isBindingThis = activeBindingBellId === bell.id;

              return (
                <button
                  key={`bind-${bell.id}`}
                  onClick={() => setActiveBindingBellId(bell.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all text-left ${
                    isBindingThis
                      ? 'border-amber-400 bg-amber-900/40 ring-2 ring-amber-400/50'
                      : 'border-stone-800 bg-stone-950/60 hover:border-amber-700/60 hover:bg-stone-800/40'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-display font-bold text-xs text-amber-200">
                      {bell.name}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {bell.pitchName} · {bell.weightKg} кг
                    </span>
                  </div>

                  <span className="px-2 py-1 rounded bg-stone-900 border border-stone-700 font-mono text-xs font-bold text-amber-400">
                    {currentKey}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-800 bg-stone-950/60">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Сбросить на стандартные</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs rounded-xl text-stone-400 hover:text-stone-200 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 shadow-md transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Сохранить</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
