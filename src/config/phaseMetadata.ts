import type { BreathingPhase } from '../types/breathing';

interface PhaseMetadata {
  label: string;
  shortLabel: string;
}

export const PHASE_METADATA: Record<BreathingPhase, PhaseMetadata> = {
  inhale: {
    label: 'Вдох',
    shortLabel: 'Вдох',
  },
  hold: {
    label: 'Задержка дыхания',
    shortLabel: 'Задержка',
  },
  exhale: {
    label: 'Выдох',
    shortLabel: 'Выдох',
  },
  pause: {
    label: 'Пауза',
    shortLabel: 'Пауза',
  },
};
