export type BreathingPhase = 'inhale' | 'hold' | 'exhale' | 'pause';

export type BreathSpeedId = 'space-man' | 'ice-man';

export type HoldPhase = 'inhale' | 'exhale';

export type HoldType = 'round-exhale' | 'round-inhale' | 'global-inhale';

export interface BreathSpeedConfig {
  id: BreathSpeedId;
  name: string;
  inhaleDuration: number;
  exhaleDuration: number;
}

export interface BreathingRoundConfig {
  id: string;
  index: number;
  label?: string;
  breathSpeedId: BreathSpeedId;
  cycles: number;
  finalHoldPhase: HoldPhase;
  finalHoldDuration: number;
}

export interface BreathingPracticeConfig {
  id: string;
  name: string;
  description: string;
  benefits?: string[];
  inhaleDuration: number;
  holdDuration: number;
  exhaleDuration: number;
  pauseDuration: number;
  cycles: number;
  finalHoldDuration?: number;
  defaultSpeedId?: BreathSpeedId;
  availableSpeeds?: BreathSpeedConfig[];
  rounds?: BreathingRoundConfig[];
  globalInhaleHoldDuration?: number;
}

export interface ExerciseState {
  currentPhase: BreathingPhase;
  currentCycle: number;
  phaseTimeRemaining: number;
  totalTimeElapsed: number;
  isRunning: boolean;
  isPaused: boolean;
  currentRoundIndex?: number;
  roundCycle?: number;
  totalRounds?: number;
  currentHoldType?: HoldType;
  previousHoldType?: HoldType; // Для отслеживания предыдущей задержки (чтобы определить выдох после синей задержки)
}

export interface BreathingExerciseCallbacks {
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onComplete: () => void;
  onPhaseChange: (phase: BreathingPhase) => void;
  onCycleComplete: (cycle: number) => void;
}
