import React, { useState } from 'react';
import { X, GitBranch, Copy, Check, Terminal, ExternalLink } from 'lucide-react';

interface GitExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitExportModal: React.FC<GitExportModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const commandWithGh = `gh repo create skulanov/GefleBells --public --source=. --remote=origin --push`;

  const commandsStandardGit = `# 1. Добавить удаленный репозиторий:
git remote add origin https://github.com/skulanov/GefleBells.git

# 2. Переименовать ветку в main (если требуется) и отправить код:
git branch -M main
git push -u origin main`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <GitBranch className="w-5 h-5 text-amber-400" />
            <h3 className="font-display font-bold text-base text-amber-100">
              Создание репозитория GefleBells на GitHub
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-stone-300 leading-relaxed">
          <p className="text-stone-300">
            Все исходные файлы приложения, включая симулятор 36 колоколов, консоль, загрузчик сэмплов, физический синтез звука и документацию, подготовлены в локальном репозитории.
          </p>

          <div className="p-4 rounded-xl bg-stone-950/80 border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>Вариант 1: Быстрое создание через GitHub CLI (рекомендуется)</span>
              </span>
              <button
                onClick={() => copyToClipboard(commandWithGh, 1)}
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
              >
                {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedIndex === 1 ? 'Скопировано!' : 'Копировать'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-black text-amber-200 font-mono text-[11px] overflow-x-auto border border-stone-800">
              {commandWithGh}
            </pre>
          </div>

          <div className="p-4 rounded-xl bg-stone-950/80 border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>Вариант 2: Стандартные команды Git</span>
              </span>
              <button
                onClick={() => copyToClipboard(commandsStandardGit, 2)}
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
              >
                {copiedIndex === 2 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedIndex === 2 ? 'Скопировано!' : 'Копировать'}</span>
              </button>
            </div>
            <p className="text-stone-400 text-[11px]">
              Создайте репозиторий <code className="text-amber-300">GefleBells</code> на GitHub (в аккаунте skulanov) и выполните в терминале:
            </p>
            <pre className="p-3 rounded-lg bg-black text-amber-200 font-mono text-[11px] overflow-x-auto border border-stone-800">
              {commandsStandardGit}
            </pre>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-950/20 border border-amber-900/40 text-[11px] text-amber-200/90">
            <span>Целевой URL репозитория:</span>
            <a
              href="https://github.com/skulanov/GefleBells"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-mono text-amber-400 hover:underline"
            >
              <span>https://github.com/skulanov/GefleBells</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-800 bg-stone-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
};
