import React, { useState } from 'react';
import { BellData } from '../types/carillon';
import { GEFLE_BELLS } from '../data/gefleBellsData';
import { Keyboard, Layers, Footprints, Hand } from 'lucide-react';

interface CarillonClavierProps {
  activeBellIds: Set<string>;
  onStrike: (bellId: string, velocity?: number, isPedal?: boolean) => void;
  onRelease: (bellId: string) => void;
  customKeybinds: Record<string, { code: string; label: string }>;
  onOpenKeybinds: () => void;
}

export const CarillonClavier: React.FC<CarillonClavierProps> = ({
  activeBellIds,
  onStrike,
  onRelease,
  customKeybinds,
  onOpenKeybinds,
}) => {
  const [octaveFilter, setOctaveFilter] = useState<'all' | '1' | '2' | '3' | 'pedals'>('all');
  const [showPedals, setShowPedals] = useState<boolean>(true);

  // Filter bells based on octave selector
  const displayedBells = GEFLE_BELLS.filter((bell) => {
    if (octaveFilter === 'all') return true;
    if (octaveFilter === '1') return bell.octave === 1;
    if (octaveFilter === '2') return bell.octave === 2;
    if (octaveFilter === '3') return bell.octave === 3 || bell.octave === 4;
    if (octaveFilter === 'pedals') return bell.hasPedal;
    return true;
  });

  const diatonicBells = displayedBells.filter((b) => !b.isSharp);
  const pedalBells = GEFLE_BELLS.filter((b) => b.hasPedal); // Exactly 19 bells (C1 to G2)
  const pedalDiatonicBells = pedalBells.filter((b) => !b.isSharp); // 12 natural pedals: C1 to G2

  const getKeyLabel = (bell: BellData, isPedal = false): string => {
    if (isPedal && bell.pedalKeyLabel) return bell.pedalKeyLabel;
    if (customKeybinds[bell.id]) return customKeybinds[bell.id].label;
    return bell.defaultKeyLabel;
  };

  const handlePointerDown = (bellId: string, isPedal: boolean, event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeY = (event.clientY - rect.top) / rect.height;
    const velocity = Math.min(1.0, Math.max(0.5, 0.6 + relativeY * 0.4));
    onStrike(bellId, velocity, isPedal);
  };

  // Find chromatic bell that sits above/between two diatonics on manual
  const getChromaticForNatural = (naturalBellId: string): BellData | null => {
    const sharpMap: Record<string, string> = {
      'D1': 'Ds1',
      'F1': 'Fs1',
      'G1': 'Gs1',
      'A1': 'As1',
      'C2': 'Cs2',
      'D2': 'Ds2',
      'F2': 'Fs2',
      'G2': 'Gs2',
      'A2': 'As2',
      'C3': 'Cs3',
      'D3': 'Ds3',
      'F3': 'Fs3',
      'G3': 'Gs3',
      'A3': 'As3',
    };
    const sharpId = sharpMap[naturalBellId];
    if (!sharpId) return null;
    return displayedBells.find((b) => b.id === sharpId) || null;
  };

  // Find chromatic pedal that sits above/between two natural pedals
  const getChromaticForNaturalPedal = (naturalBellId: string): BellData | null => {
    const sharpMap: Record<string, string> = {
      'D1': 'Ds1',
      'F1': 'Fs1',
      'G1': 'Gs1',
      'A1': 'As1',
      'C2': 'Cs2',
      'D2': 'Ds2',
      'F2': 'Fs2',
    };
    const sharpId = sharpMap[naturalBellId];
    if (!sharpId) return null;
    return pedalBells.find((b) => b.id === sharpId) || null;
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Control bar above clavier */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900/70 p-3 rounded-2xl border border-stone-800">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider mr-1 hidden sm:inline">
            Диапазон:
          </span>
          <button
            onClick={() => setOctaveFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              octaveFilter === 'all'
                ? 'bg-amber-900/60 text-amber-200 border border-amber-600/50 shadow-sm'
                : 'bg-stone-800/60 text-stone-400 hover:text-stone-200'
            }`}
          >
            Все 36 колоколов
          </button>
          <button
            onClick={() => setOctaveFilter('1')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              octaveFilter === '1'
                ? 'bg-amber-900/60 text-amber-200 border border-amber-600/50 shadow-sm'
                : 'bg-stone-800/60 text-stone-400 hover:text-stone-200'
            }`}
          >
            Октава 1 (Бас · Бурдон)
          </button>
          <button
            onClick={() => setOctaveFilter('2')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              octaveFilter === '2'
                ? 'bg-amber-900/60 text-amber-200 border border-amber-600/50 shadow-sm'
                : 'bg-stone-800/60 text-stone-400 hover:text-stone-200'
            }`}
          >
            Октава 2 (Тенор)
          </button>
          <button
            onClick={() => setOctaveFilter('3')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              octaveFilter === '3'
                ? 'bg-amber-900/60 text-amber-200 border border-amber-600/50 shadow-sm'
                : 'bg-stone-800/60 text-stone-400 hover:text-stone-200'
            }`}
          >
            Октава 3–4 (Дисканты)
          </button>
          <button
            onClick={() => setOctaveFilter('pedals')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              octaveFilter === 'pedals'
                ? 'bg-amber-900/60 text-amber-200 border border-amber-600/50 shadow-sm'
                : 'bg-stone-800/60 text-stone-400 hover:text-stone-200'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>Педали</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPedals(!showPedals)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
              showPedals
                ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                : 'bg-stone-800/60 border-stone-700/60 text-stone-400 hover:text-stone-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showPedals ? 'Педали включены' : 'Показать педали'}</span>
          </button>

          <button
            onClick={onOpenKeybinds}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-stone-800/80 hover:bg-stone-700/80 border border-stone-700 text-stone-300 transition-colors"
            title="Настройка клавиш клавиатуры"
          >
            <Keyboard className="w-3.5 h-3.5 text-amber-400" />
            <span>Клавиши</span>
          </button>
        </div>
      </div>

      {/* Clavier Console Frame */}
      <div className="relative rounded-2xl bg-gradient-to-b from-[#241711] via-[#1a110c] to-[#120b08] p-4 sm:p-6 border-4 border-[#3d2719] shadow-2xl overflow-hidden">
        {/* Subtle wood grain background */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

        {/* Console Nameplate */}
        <div className="flex items-center justify-between mb-4 border-b border-amber-900/40 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-600 shadow-sm shadow-amber-500"></span>
            <span className="font-display tracking-widest text-xs uppercase text-amber-300/80 font-bold">
              Gefle Rådhus Klockspel · Bergholtz
            </span>
          </div>
        </div>

        {/* Manual Section Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Hand className="w-4 h-4 text-amber-400" />
            <span className="font-display text-xs tracking-wider text-amber-400 uppercase font-bold">
              МАНУАЛ
            </span>
          </div>
        </div>

        {/* Manual Batons (Natural bottom row + Chromatic top batons aligned directly above) */}
        <div className="relative overflow-x-auto pb-4 pt-2 select-none">
          <div className="min-w-[880px] flex justify-center">
            <div className="inline-flex">
              {diatonicBells.map((natBell) => {
                const natActive = activeBellIds.has(natBell.id);
                const natKey = getKeyLabel(natBell);

                // Chromatic sharp associated with this natural slot (placed directly above)
                const sharpBell = getChromaticForNatural(natBell.id);
                const sharpActive = sharpBell ? activeBellIds.has(sharpBell.id) : false;
                const sharpKey = sharpBell ? getKeyLabel(sharpBell) : '';

                return (
                  <div
                    key={`column-${natBell.id}`}
                    className="flex flex-col items-center w-10 sm:w-11 relative"
                  >
                    {/* Upper Chromatic Baton Slot */}
                    <div className="h-24 w-full flex items-end justify-center relative mb-1">
                      {sharpBell ? (
                        <button
                          type="button"
                          onPointerDown={(e) => handlePointerDown(sharpBell.id, false, e)}
                          onPointerUp={() => onRelease(sharpBell.id)}
                          onPointerLeave={() => onRelease(sharpBell.id)}
                          className={`group relative w-7 sm:w-8 h-20 rounded-b-xl transition-transform duration-75 flex flex-col items-center justify-between py-1 shadow-lg border ${
                            sharpActive
                              ? 'translate-y-2 bg-gradient-to-b from-amber-700 via-amber-800 to-amber-900 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.6)]'
                              : 'bg-gradient-to-b from-[#2b1810] via-[#1f100a] to-[#120704] border-[#4a2b1c] hover:border-amber-600/70 hover:from-[#3a2016]'
                          }`}
                          title={`${sharpBell.name} (${sharpBell.russianName}) · ${sharpBell.weightKg} кг\n${sharpBell.hasPedal ? 'Мануал + Педаль' : 'Только мануал'}\nФайл: ${sharpBell.expectedFileName}`}
                        >
                          <span className="w-3 h-3 rounded-full bg-[#170a05] border border-amber-950/60 shadow-inner flex items-center justify-center text-[8px] text-amber-500 font-mono">
                            ·
                          </span>
                          <span className="text-[11px] font-bold text-amber-200 font-display">
                            {sharpBell.name}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1 py-0.5 rounded transition-colors ${
                              sharpActive
                                ? 'bg-amber-400 text-stone-950 font-bold'
                                : 'bg-stone-900/90 text-amber-300 border border-stone-700/60 group-hover:border-amber-500/60'
                            }`}
                          >
                            {sharpKey}
                          </span>
                        </button>
                      ) : (
                        <div className="w-7 sm:w-8 h-20 opacity-0 pointer-events-none" />
                      )}
                    </div>

                    {/* Lower Diatonic Baton */}
                    <div className="h-32 w-full flex items-start justify-center border-t border-amber-950/80 pt-1">
                      <button
                        type="button"
                        onPointerDown={(e) => handlePointerDown(natBell.id, false, e)}
                        onPointerUp={() => onRelease(natBell.id)}
                        onPointerLeave={() => onRelease(natBell.id)}
                        className={`group relative w-8 sm:w-9 h-28 rounded-b-2xl transition-transform duration-75 flex flex-col items-center justify-between py-2 shadow-xl border ${
                          natActive
                            ? 'translate-y-2.5 bg-gradient-to-b from-[#b45309] via-[#92400e] to-[#78350f] border-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.7)]'
                            : 'bg-gradient-to-b from-[#5c3a21] via-[#482c18] to-[#341e10] border-[#6b4226] hover:border-amber-500/80 hover:from-[#6b4427]'
                        }`}
                        title={`${natBell.name} (${natBell.russianName}) · ${natBell.weightKg} кг\n${natBell.hasPedal ? 'Мануал + Педаль' : 'Только мануал'}\nФайл: ${natBell.expectedFileName}`}
                      >
                        <div className="w-3.5 h-3.5 rounded-full bg-[#3d2313] border border-amber-900/50 shadow-inner flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600/40"></span>
                        </div>

                        <div className="flex flex-col items-center">
                          <span className="text-sm font-bold text-amber-100 font-display">
                            {natBell.name}
                          </span>
                          <span className="text-[8px] text-amber-300/60 font-mono">
                            {natBell.weightKg}k
                          </span>
                        </div>

                        <span
                          className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded shadow-sm transition-colors ${
                            natActive
                              ? 'bg-amber-300 text-stone-950 font-bold'
                              : 'bg-stone-950/80 text-amber-200 border border-amber-900/60 group-hover:border-amber-500'
                          }`}
                        >
                          {natKey}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pedalboard Section */}
        {showPedals && (
          <div className="mt-4 pt-4 border-t-2 border-[#382315] bg-[#140c07]/80 rounded-xl p-3">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Footprints className="w-4 h-4 text-amber-400" />
                <span className="font-display text-xs tracking-wider text-amber-400 uppercase font-bold">
                  ПЕДАЛИ
                </span>
              </div>
            </div>

            {/* Authentic 2-tier Pedalboard layout */}
            <div className="relative overflow-x-auto pb-2 select-none">
              <div className="min-w-[760px] flex justify-center">
                <div className="inline-flex">
                  {pedalDiatonicBells.map((natPedal) => {
                    const natActive = activeBellIds.has(natPedal.id);
                    const natPedalKey = getKeyLabel(natPedal, true);

                    const sharpPedal = getChromaticForNaturalPedal(natPedal.id);
                    const sharpActive = sharpPedal ? activeBellIds.has(sharpPedal.id) : false;
                    const sharpPedalKey = sharpPedal ? getKeyLabel(sharpPedal, true) : '';

                    return (
                      <div
                        key={`pedal-col-${natPedal.id}`}
                        className="flex flex-col items-center w-12 sm:w-14 relative"
                      >
                        {/* Upper Chromatic Pedal Slot */}
                        <div className="h-16 w-full flex items-end justify-center relative mb-1">
                          {sharpPedal ? (
                            <button
                              type="button"
                              onPointerDown={(e) => handlePointerDown(sharpPedal.id, true, e)}
                              onPointerUp={() => onRelease(sharpPedal.id)}
                              onPointerLeave={() => onRelease(sharpPedal.id)}
                              className={`group relative w-7 sm:w-8 h-15 rounded-b-lg transition-transform duration-75 flex flex-col items-center justify-between py-1 shadow-lg border ${
                                sharpActive
                                  ? 'translate-y-2 bg-gradient-to-b from-amber-700 to-amber-900 border-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.8)]'
                                  : 'bg-gradient-to-b from-[#20120b] to-[#0e0704] border-[#442817] hover:border-amber-600'
                              }`}
                              title={`Педаль: ${sharpPedal.name} (${sharpPedal.russianName}) · ${sharpPedal.weightKg} кг\nФайл: ${sharpPedal.expectedFileName}`}
                            >
                              <span className="text-[10px] font-bold text-amber-200 font-display">
                                {sharpPedal.name}
                              </span>
                              <span
                                className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                                  sharpActive
                                    ? 'bg-amber-300 text-stone-950 font-bold'
                                    : 'bg-stone-950/90 text-amber-300 border border-stone-800'
                                }`}
                              >
                                {sharpPedalKey}
                              </span>
                            </button>
                          ) : (
                            <div className="w-7 sm:w-8 h-15 opacity-0 pointer-events-none" />
                          )}
                        </div>

                        {/* Lower Natural Pedal */}
                        <div className="h-28 w-full flex items-start justify-center border-t border-amber-950/80 pt-1">
                          <button
                            type="button"
                            onPointerDown={(e) => handlePointerDown(natPedal.id, true, e)}
                            onPointerUp={() => onRelease(natPedal.id)}
                            onPointerLeave={() => onRelease(natPedal.id)}
                            className={`group relative w-9 sm:w-10 h-24 rounded-b-xl transition-transform duration-75 flex flex-col items-center justify-between py-1.5 shadow-xl border ${
                              natActive
                                ? 'translate-y-2.5 bg-gradient-to-b from-amber-700 to-amber-900 border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.8)]'
                                : 'bg-gradient-to-b from-[#4d301b] to-[#2c190d] border-[#653e24] hover:border-amber-500'
                            }`}
                            title={`Педаль: ${natPedal.name} (${natPedal.russianName}) · ${natPedal.weightKg} кг\nФайл: ${natPedal.expectedFileName}`}
                          >
                            <span className="text-xs font-bold text-amber-100 font-display">
                              {natPedal.name}
                            </span>
                            <span className="text-[8px] text-amber-300/60 font-mono">
                              {natPedal.weightKg}k
                            </span>
                            <span
                              className={`text-[10px] font-mono px-1 py-0.5 rounded ${
                                natActive
                                  ? 'bg-amber-300 text-stone-950 font-bold'
                                  : 'bg-stone-950/90 text-amber-200 border border-stone-800'
                              }`}
                            >
                              {natPedalKey}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
