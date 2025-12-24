import type { BreathingPracticeConfig, BreathSpeedConfig, BreathingRoundConfig } from '../types/breathing';

const BEGINNER_SPEEDS: BreathSpeedConfig[] = [
  { id: 'space-man', name: 'Space Man', inhaleDuration: 4, exhaleDuration: 4 },
  { id: 'ice-man', name: 'Ice Man', inhaleDuration: 2, exhaleDuration: 2 },
];

const BEGINNER_ROUNDS: BreathingRoundConfig[] = [
  { id: 'round1', index: 1, label: 'Раунд 1', breathSpeedId: 'ice-man', cycles: 30, finalHoldPhase: 'exhale', finalHoldDuration: 30 },
  { id: 'round2', index: 2, label: 'Раунд 2', breathSpeedId: 'ice-man', cycles: 30, finalHoldPhase: 'exhale', finalHoldDuration: 60 },
  { id: 'round3', index: 3, label: 'Раунд 3', breathSpeedId: 'ice-man', cycles: 30, finalHoldPhase: 'exhale', finalHoldDuration: 90 },
];

/**
 * Базовая практика по умолчанию.
 * На ней строится вся текущая логика дыхания и анимации.
 */
export const BREATHING_PRACTICES: Record<string, BreathingPracticeConfig> = {
  beginner: {
    id: 'beginner',
    name: 'Ice Man',
    description: 'Мощнейшая дыхательная практика для повышения энергии и концентрации',
    benefits: [
      'Укрепление иммунитета',
      'Снижение воспалений',
      'Повышение энергии',
      'Улучшение концентрации',
      'Снижение стресса',
      'Улучшение качества сна',
    ],
    inhaleDuration: 4,
    holdDuration: 2,
    exhaleDuration: 4,
    pauseDuration: 4, // Пауза между раундами после синей задержки (4 секунды)
    cycles: 30,
    defaultSpeedId: 'ice-man',
    availableSpeeds: BEGINNER_SPEEDS,
    rounds: BEGINNER_ROUNDS,
    globalInhaleHoldDuration: 15, // Синяя задержка на вдохе (15 секунд)
  },
};

export const getBreathingPracticeById = (id: string): BreathingPracticeConfig | undefined => {
  return BREATHING_PRACTICES[id];
};

export const getAllBreathingPractices = (): BreathingPracticeConfig[] => {
  return Object.values(BREATHING_PRACTICES);
};
