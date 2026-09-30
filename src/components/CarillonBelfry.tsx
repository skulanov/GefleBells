import React from 'react';
import { BellData } from '../types/carillon';
import { GEFLE_BELLS } from '../data/gefleBellsData';

interface CarillonBelfryProps {
  activeBellIds: Set<string>;
  onStrike: (bellId: string, velocity?: number) => void;
  onRelease: (bellId: string) => void;
  customKeybinds: Record<string, { code: string; label: string }>;
}

export const CarillonBelfry: React.FC<CarillonBelfryProps> = ({
  activeBellIds,
  onStrike,
  onRelease,
  customKeybinds,
}) => {
  // Group bells into 3 tiers matching carillon architectural layout:
  // Tier 1: Bourdon & Bass Bells (Octave 1: C1 – B1, 11 bells)
  // Tier 2: Tenor & Middle Bells (Octave 2: C2 – B2, 12 bells)
  // Tier 3: Treble & High Bells (Octaves 3 & 4: C3 – C4, 13 bells)
  const tier3Bells = GEFLE_BELLS.filter((b) => b.octave === 3 || b.octave === 4);
  const tier2Bells = GEFLE_BELLS.filter((b) => b.octave === 2);
  const tier1Bells = GEFLE_BELLS.filter((b) => b.octave === 1);

  const getKeyLabel = (bell: BellData): string => {
    if (customKeybinds[bell.id]) return customKeybinds[bell.id].label;
    return bell.defaultKeyLabel;
  };

  const renderBell = (bell: BellData) => {
    const isActive = activeBellIds.has(bell.id);
    const keyLabel = getKeyLabel(bell);

    // Compute scale from weight (8.5kg to 285kg)
    const normalizedWeight = (bell.weightKg - 8.5) / (285 - 8.5);
    // Size multiplier between 0.65 and 1.35
    const scale = 0.65 + normalizedWeight * 0.7;
    const widthPx = Math.round(52 * scale);
    const heightPx = Math.round(56 * scale);

    return (
      <div
        key={`belfry-bell-${bell.id}`}
        className="flex flex-col items-center justify-end relative m-1"
        style={{ width: `${Math.max(48, widthPx + 8)}px` }}
      >
        {/* Suspension beam link */}
        <div className="w-1.5 h-3 bg-stone-700/80 rounded-t-sm mb-[-2px] z-0"></div>

        {/* Bell Button */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            onStrike(bell.id, 0.95);
          }}
          onPointerUp={() => onRelease(bell.id)}
          onPointerLeave={() => onRelease(bell.id)}
          className={`group relative flex flex-col items-center justify-center transition-all duration-100 cursor-pointer focus:outline-none z-10 ${
            isActive ? 'scale-105' : 'hover:scale-102'
          }`}
          title={`${bell.name} (${bell.russianName})\nМасса: ${bell.weightKg} кг · Частота: ${Math.round(bell.frequency)} Гц\nКлавиша: ${keyLabel}`}
        >
          {/* Concentric acoustic resonance waves on active strike */}
          {isActive && (
            <div className="absolute inset-0 rounded-full border-2 border-amber-400/80 animate-ping pointer-events-none"></div>
          )}

          {/* SVG Bronze Bell Profile with Clapper */}
          <div
            className="relative"
            style={{ width: `${widthPx}px`, height: `${heightPx}px` }}
          >
            <svg
              viewBox="0 0 100 110"
              className={`w-full h-full drop-shadow-md transition-all duration-100 ${
                isActive
                  ? 'filter drop-shadow-[0_0_12px_rgba(245,158,11,0.9)]'
                  : 'group-hover:drop-shadow-[0_0_6px_rgba(217,119,6,0.5)]'
              }`}
            >
              <defs>
                {/* Bronze Metallic Gradient */}
                <linearGradient id={`bronzeGrad-${bell.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={isActive ? '#d97706' : '#78350f'} />
                  <stop offset="25%" stopColor={isActive ? '#fbbf24' : '#b45309'} />
                  <stop offset="50%" stopColor={isActive ? '#fef3c7' : '#d97706'} />
                  <stop offset="75%" stopColor={isActive ? '#f59e0b' : '#92400e'} />
                  <stop offset="100%" stopColor={isActive ? '#b45309' : '#451a03'} />
                </linearGradient>

                {/* Darker Inscription band gradient */}
                <linearGradient id={`bandGrad-${bell.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#291307" />
                  <stop offset="50%" stopColor="#54280f" />
                  <stop offset="100%" stopColor="#1a0b04" />
                </linearGradient>
              </defs>

              {/* Bell Crown / Top Mount */}
              <rect x="42" y="4" width="16" height="8" rx="2" fill="#451a03" />

              {/* Clapper (Язык колокола) */}
              <g
                className={`origin-[50px_10px] transition-transform duration-100 ${
                  isActive ? 'rotate-[18deg]' : 'rotate-0'
                }`}
              >
                <line x1="50" y1="12" x2="50" y2="92" stroke="#262626" strokeWidth="3" />
                <circle cx="50" cy="94" r="8" fill="#171717" stroke="#404040" strokeWidth="1" />
              </g>

              {/* Traditional Bell Waist & Soundbow Path */}
              <path
                d="M 40,12 
                   C 36,25 32,55 24,78 
                   C 18,92 8,98 8,102 
                   C 8,106 18,107 50,107 
                   C 82,107 92,106 92,102 
                   C 92,98 82,92 76,78 
                   C 68,55 64,25 60,12 
                   Z"
                fill={`url(#bronzeGrad-${bell.id})`}
                stroke={isActive ? '#fef08a' : '#451a03'}
                strokeWidth="2"
              />

              {/* Soundbow rim highlight */}
              <ellipse cx="50" cy="102" rx="42" ry="5" fill="none" stroke={isActive ? '#fef08a' : '#92400e'} strokeWidth="2" />

              {/* Inscription Band across the waist */}
              <path
                d="M 28,68 Q 50,74 72,68 L 74,74 Q 50,80 26,74 Z"
                fill={`url(#bandGrad-${bell.id})`}
                opacity="0.85"
              />

              {/* Note text stamped onto bell */}
              <text
                x="50"
                y="55"
                textAnchor="middle"
                fontSize={bell.weightKg > 80 ? '22' : '26'}
                fontWeight="bold"
                fill={isActive ? '#451a03' : '#1c0f06'}
                fontFamily="Cinzel, serif"
                className="select-none"
              >
                {bell.pitchName}
              </text>
            </svg>
          </div>

          {/* Key shortcut badge below the bell */}
          <div className="mt-1 flex flex-col items-center">
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm border transition-colors ${
                isActive
                  ? 'bg-amber-400 text-stone-950 border-amber-300'
                  : 'bg-stone-900/90 text-amber-200 border-stone-700/80 group-hover:border-amber-500'
              }`}
            >
              {keyLabel}
            </span>
            <span className="text-[9px] text-stone-400 font-mono mt-0.5">
              {bell.weightKg} кг
            </span>
          </div>
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Belfry Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900/70 p-3 rounded-2xl border border-stone-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
          <span className="font-display font-bold text-amber-200 text-sm">
            Звонница ратуши Евле (Gävle Rådhus)
          </span>
          <span className="text-xs text-stone-400 font-mono hidden sm:inline">
            · 36 колоколов Bergholtz (1972)
          </span>
        </div>
        <div className="text-xs text-stone-400">
          Нажмите на любой колокол мышью или клавишей клавиатуры
        </div>
      </div>

      {/* Belfry Architectural Frame */}
      <div className="relative rounded-2xl bg-gradient-to-b from-[#181311] via-[#120e0d] to-[#0a0807] p-4 sm:p-6 border-4 border-[#3d2719] shadow-2xl overflow-hidden">
        {/* Timber Belfry Arches Background */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-600 via-stone-900 to-black"></div>

        {/* Tier 3: High Trebles (Octaves 3 & 4, 13 Bells: C3 – C4) */}
        <div className="mb-6 pb-6 border-b border-stone-800/80">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="font-display text-xs uppercase tracking-wider text-amber-400 font-semibold">
              Ярус 3: Малые колокола (Дисканты · C3 – C4)
            </span>
            <span className="text-[11px] font-mono text-stone-500">
              8.5 кг — 16.5 кг · Звонкий прозрачный отклик
            </span>
          </div>
          {/* Wooden support beam */}
          <div className="h-2.5 w-full bg-gradient-to-r from-[#3e2415] via-[#5c3720] to-[#3e2415] rounded-sm shadow-inner mb-1"></div>
          <div className="flex flex-wrap justify-center items-end gap-1 sm:gap-2">
            {tier3Bells.map(renderBell)}
          </div>
        </div>

        {/* Tier 2: Tenor & Middle Bells (Octave 2, 12 Bells: C2 – B2) */}
        <div className="mb-6 pb-6 border-b border-stone-800/80">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="font-display text-xs uppercase tracking-wider text-amber-400 font-semibold">
              Ярус 2: Средние колокола (Тенора · C2 – B2)
            </span>
            <span className="text-[11px] font-mono text-stone-500">
              18 кг — 65 кг · Основная гармоническая линия
            </span>
          </div>
          <div className="h-3 w-full bg-gradient-to-r from-[#3e2415] via-[#5c3720] to-[#3e2415] rounded-sm shadow-inner mb-1"></div>
          <div className="flex flex-wrap justify-center items-end gap-1.5 sm:gap-3">
            {tier2Bells.map(renderBell)}
          </div>
        </div>

        {/* Tier 1: Bourdon & Heavy Bass Bells (Octave 1, 11 Bells: C1 – B1) */}
        <div>
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="font-display text-xs uppercase tracking-wider text-amber-400 font-semibold">
              Ярус 1: Басовые колокола и Бурдон (C1 – B1)
            </span>
            <span className="text-[11px] font-mono text-stone-500">
              72 кг — 285 кг · Мощный фундаментальный гул
            </span>
          </div>
          <div className="h-3.5 w-full bg-gradient-to-r from-[#3e2415] via-[#5c3720] to-[#3e2415] rounded-sm shadow-inner mb-1"></div>
          <div className="flex flex-wrap justify-center items-end gap-2 sm:gap-4">
            {tier1Bells.map(renderBell)}
          </div>
        </div>
      </div>
    </div>
  );
};
