import { TrainingSong } from '../types/carillon';

export const PRESET_SONGS: TrainingSong[] = [
  {
    id: 'gavle-chimes',
    title: 'Куранты Ратуши Евле',
    subtitle: 'Gävle Rådhus Klockspel — традиционный бой башенных часов',
    difficulty: 'easy',
    tempoBpm: 90,
    timeSignature: '4/4',
    notes: [
      { bellId: 'C2', timeMs: 0, durationMs: 600, hand: 'R' },
      { bellId: 'E2', timeMs: 666, durationMs: 600, hand: 'R' },
      { bellId: 'D2', timeMs: 1333, durationMs: 600, hand: 'R' },
      { bellId: 'G1', timeMs: 2000, durationMs: 1200, hand: 'L' },

      { bellId: 'C2', timeMs: 3333, durationMs: 600, hand: 'R' },
      { bellId: 'D2', timeMs: 4000, durationMs: 600, hand: 'R' },
      { bellId: 'E2', timeMs: 4666, durationMs: 600, hand: 'R' },
      { bellId: 'C2', timeMs: 5333, durationMs: 1200, hand: 'R' },

      { bellId: 'E2', timeMs: 6666, durationMs: 600, hand: 'R' },
      { bellId: 'C2', timeMs: 7333, durationMs: 600, hand: 'R' },
      { bellId: 'D2', timeMs: 8000, durationMs: 600, hand: 'R' },
      { bellId: 'G1', timeMs: 8666, durationMs: 1200, hand: 'L' },

      { bellId: 'G1', timeMs: 10000, durationMs: 600, hand: 'L' },
      { bellId: 'D2', timeMs: 10666, durationMs: 600, hand: 'R' },
      { bellId: 'E2', timeMs: 11333, durationMs: 600, hand: 'R' },
      { bellId: 'C2', timeMs: 12000, durationMs: 1600, hand: 'R' },
      { bellId: 'C1', timeMs: 13600, durationMs: 3000, hand: 'P' }, // Bourdon pedal strike!
    ],
  },
  {
    id: 'westminster',
    title: 'Вестминстерский перезвон',
    subtitle: 'Классический карильонный бой четырех колоколов',
    difficulty: 'easy',
    tempoBpm: 80,
    timeSignature: '4/4',
    notes: [
      { bellId: 'Gs1', timeMs: 0, durationMs: 700, hand: 'L' },
      { bellId: 'Fs1', timeMs: 750, durationMs: 700, hand: 'L' },
      { bellId: 'E1', timeMs: 1500, durationMs: 700, hand: 'L' },
      { bellId: 'B1', timeMs: 2250, durationMs: 1400, hand: 'R' },

      { bellId: 'E1', timeMs: 3750, durationMs: 700, hand: 'L' },
      { bellId: 'Gs1', timeMs: 4500, durationMs: 700, hand: 'L' },
      { bellId: 'Fs1', timeMs: 5250, durationMs: 700, hand: 'L' },
      { bellId: 'B1', timeMs: 6000, durationMs: 1400, hand: 'R' },

      { bellId: 'E1', timeMs: 7500, durationMs: 700, hand: 'L' },
      { bellId: 'Fs1', timeMs: 8250, durationMs: 700, hand: 'L' },
      { bellId: 'Gs1', timeMs: 9000, durationMs: 700, hand: 'L' },
      { bellId: 'E1', timeMs: 9750, durationMs: 1400, hand: 'L' },

      { bellId: 'Gs1', timeMs: 11250, durationMs: 700, hand: 'L' },
      { bellId: 'E1', timeMs: 12000, durationMs: 700, hand: 'L' },
      { bellId: 'Fs1', timeMs: 12750, durationMs: 700, hand: 'L' },
      { bellId: 'B1', timeMs: 13500, durationMs: 1800, hand: 'R' },
      { bellId: 'E1', timeMs: 15300, durationMs: 3000, hand: 'P' }, // Bourdon pedal!
    ],
  },
  {
    id: 'blomstertid',
    title: 'Den blomstertid nu kommer',
    subtitle: 'Шведский летний гимн для карильона (1695)',
    difficulty: 'medium',
    tempoBpm: 92,
    timeSignature: '3/4',
    notes: [
      { bellId: 'C2', timeMs: 0, durationMs: 650, hand: 'R' },
      { bellId: 'C1', timeMs: 0, durationMs: 1200, hand: 'P' },
      { bellId: 'E2', timeMs: 650, durationMs: 650, hand: 'R' },
      { bellId: 'F2', timeMs: 1300, durationMs: 650, hand: 'R' },
      { bellId: 'G2', timeMs: 1950, durationMs: 1300, hand: 'R' },
      { bellId: 'C1', timeMs: 1950, durationMs: 1300, hand: 'P' },
      { bellId: 'G2', timeMs: 3250, durationMs: 650, hand: 'R' },

      { bellId: 'A2', timeMs: 3900, durationMs: 650, hand: 'R' },
      { bellId: 'F1', timeMs: 3900, durationMs: 1300, hand: 'L' },
      { bellId: 'B2', timeMs: 4550, durationMs: 650, hand: 'R' },
      { bellId: 'C3', timeMs: 5200, durationMs: 1300, hand: 'R' },
      { bellId: 'C1', timeMs: 5200, durationMs: 1300, hand: 'P' },
      { bellId: 'G2', timeMs: 6500, durationMs: 650, hand: 'R' },

      { bellId: 'F2', timeMs: 7150, durationMs: 650, hand: 'R' },
      { bellId: 'E2', timeMs: 7800, durationMs: 650, hand: 'R' },
      { bellId: 'D2', timeMs: 8450, durationMs: 1300, hand: 'R' },
      { bellId: 'G1', timeMs: 8450, durationMs: 1300, hand: 'L' },
      { bellId: 'C2', timeMs: 9750, durationMs: 1950, hand: 'R' },
      { bellId: 'C1', timeMs: 9750, durationMs: 3000, hand: 'P' },
    ],
  },
  {
    id: 'russian-festive',
    title: 'Праздничный перезвон и трезвон',
    subtitle: 'По аналогии с традицией звонниц: зазвоны, подзвоны и благовестник',
    difficulty: 'medium',
    tempoBpm: 110,
    timeSignature: '4/4',
    notes: [
      // Благовест (педаль баса)
      { bellId: 'C1', timeMs: 0, durationMs: 2000, hand: 'P' },
      // Подзвоны
      { bellId: 'G1', timeMs: 250, durationMs: 400, hand: 'L' },
      { bellId: 'C2', timeMs: 500, durationMs: 400, hand: 'L' },
      { bellId: 'E2', timeMs: 750, durationMs: 400, hand: 'L' },

      // Зазвонный рисунок (верхние колокола)
      { bellId: 'G2', timeMs: 1000, durationMs: 250, hand: 'R' },
      { bellId: 'A2', timeMs: 1250, durationMs: 250, hand: 'R' },
      { bellId: 'C3', timeMs: 1500, durationMs: 250, hand: 'R' },
      { bellId: 'G2', timeMs: 1750, durationMs: 250, hand: 'R' },

      // Второй благовест
      { bellId: 'C1', timeMs: 2000, durationMs: 2000, hand: 'P' },
      { bellId: 'E2', timeMs: 2250, durationMs: 350, hand: 'L' },
      { bellId: 'G2', timeMs: 2500, durationMs: 350, hand: 'L' },
      { bellId: 'C3', timeMs: 2750, durationMs: 350, hand: 'R' },

      { bellId: 'E3', timeMs: 3000, durationMs: 250, hand: 'R' },
      { bellId: 'D3', timeMs: 3250, durationMs: 250, hand: 'R' },
      { bellId: 'C3', timeMs: 3500, durationMs: 250, hand: 'R' },
      { bellId: 'B2', timeMs: 3750, durationMs: 250, hand: 'R' },

      // Финал
      { bellId: 'C1', timeMs: 4000, durationMs: 3000, hand: 'P' },
      { bellId: 'G1', timeMs: 4000, durationMs: 2500, hand: 'L' },
      { bellId: 'C2', timeMs: 4000, durationMs: 2000, hand: 'R' },
      { bellId: 'E2', timeMs: 4000, durationMs: 2000, hand: 'R' },
      { bellId: 'C3', timeMs: 4000, durationMs: 2000, hand: 'R' },
    ],
  },
  {
    id: 'nordic-folk',
    title: 'Vem kan segla förutan vind',
    subtitle: 'Старинная скандинавская баллада',
    difficulty: 'easy',
    tempoBpm: 84,
    timeSignature: '3/4',
    notes: [
      { bellId: 'D2', timeMs: 0, durationMs: 700, hand: 'R' },
      { bellId: 'D1', timeMs: 0, durationMs: 1400, hand: 'P' },
      { bellId: 'A2', timeMs: 714, durationMs: 700, hand: 'R' },
      { bellId: 'A2', timeMs: 1428, durationMs: 700, hand: 'R' },
      { bellId: 'G2', timeMs: 2142, durationMs: 700, hand: 'R' },
      { bellId: 'F2', timeMs: 2856, durationMs: 700, hand: 'R' },
      { bellId: 'G2', timeMs: 3570, durationMs: 1400, hand: 'R' },
      { bellId: 'G1', timeMs: 2856, durationMs: 2000, hand: 'L' },

      { bellId: 'A2', timeMs: 4998, durationMs: 700, hand: 'R' },
      { bellId: 'F2', timeMs: 5712, durationMs: 700, hand: 'R' },
      { bellId: 'D2', timeMs: 6426, durationMs: 1400, hand: 'R' },
      { bellId: 'D1', timeMs: 6426, durationMs: 2000, hand: 'P' },
    ],
  },
];
