import type {
  BreathingPhase,
  BreathingPracticeConfig,
  BreathingRoundConfig,
  BreathSpeedId,
  ExerciseState,
} from '../types/breathing';

/**
 * Единая функция расчёта длительности фазы.
 *
 * Для фазы hold:
 * - если isFinalHold === true и задано finalHoldDuration, используется именно оно (для зелёной задержки round-exhale);
 * - для синей задержки (global-inhale) используется globalInhaleHoldDuration;
 * - иначе берётся обычная holdDuration.
 *
 * Для фазы pause:
 * - используется pauseDuration из конфигурации (по умолчанию 4 секунды для паузы между раундами).
 */
export const getPhaseDuration = (
  phase: BreathingPhase,
  practice: BreathingPracticeConfig,
  isFinalHold: boolean
): number => {
  switch (phase) {
    case 'inhale':
      return practice.inhaleDuration;
    case 'hold':
      if (isFinalHold && practice.finalHoldDuration !== undefined) {
        // Зелёная задержка после выдоха (round-exhale)
        return practice.finalHoldDuration;
      }
      // Для синей задержки (global-inhale) длительность задаётся через globalInhaleHoldDuration в логике переходов
      return practice.holdDuration;
    case 'exhale':
      return practice.exhaleDuration;
    case 'pause':
      // Пауза между раундами (4 секунды по умолчанию)
      return practice.pauseDuration || 4;
    default:
      return 0;
  }
};

/**
 * Единая функция расчёта длительности фазы с учётом скорости дыхания из раунда.
 *
 * Фундаментальная структура синхронизации темпа анимации со скоростью дыхания.
 * Используется для синхронизации анимации круга с темпом дыхания в различных практиках.
 *
 * Для фаз inhale/exhale:
 * - Если есть currentRound и practice.availableSpeeds, использует скорость из раунда
 * - Иначе использует базовые значения из practice
 *
 * Для других фаз (hold, pause):
 * - Использует логику из getPhaseDuration
 *
 * @param phase - Текущая фаза дыхания
 * @param practice - Конфигурация практики
 * @param currentRound - Текущий раунд (опционально)
 * @param isFinalHold - Является ли задержка финальной (для hold фазы)
 * @returns Длительность фазы в секундах
 */
export const getPhaseDurationWithSpeed = (
  phase: BreathingPhase,
  practice: BreathingPracticeConfig,
  currentRound?: BreathingRoundConfig,
  isFinalHold?: boolean
): number => {
  // Для hold фазы с isFinalHold используем currentRound.finalHoldDuration если доступен
  if (phase === 'hold' && isFinalHold === true && currentRound?.finalHoldDuration !== undefined) {
    return currentRound.finalHoldDuration;
  }

  // Для фаз inhale/exhale используем скорость из раунда, если доступна
  if ((phase === 'inhale' || phase === 'exhale') && currentRound && practice.availableSpeeds) {
    const speedId = currentRound.breathSpeedId ?? practice.defaultSpeedId;
    const speed = practice.availableSpeeds.find(s => s.id === speedId);

    if (speed) {
      return phase === 'inhale' ? speed.inhaleDuration : speed.exhaleDuration;
    }
  }

  // Для остальных фаз или если нет раунда/скорости, используем базовую логику
  return getPhaseDuration(phase, practice, isFinalHold ?? false);
};

/**
 * Вычисляет длительность специальных переходных фаз (вдох после зелёной задержки, выдох после синей задержки).
 *
 * Правила:
 * - Ice Man: в 2 раза дольше обычной длительности
 * - Space Man: остаётся такой же как обычная длительность
 *
 * @param baseDuration - Базовая длительность фазы из скорости дыхания
 * @param speedId - ID скорости дыхания
 * @returns Специальная длительность фазы
 */
export const getSpecialPhaseDuration = (
  baseDuration: number,
  speedId: BreathSpeedId | undefined
): number => {
  if (speedId === 'ice-man') {
    return baseDuration * 2;
  }
  // Для Space Man и других скоростей остаётся такой же
  return baseDuration;
};

/**
 * Определяет, является ли текущая задержка финальной (с учётом раундов).
 *
 * Финальная задержка определяется по двум сценариям:
 * 1. Старая логика (без раундов): последний цикл практики с заданным finalHoldDuration
 * 2. Новая логика (с раундами): задержка в конце раунда (round-exhale, round-inhale) или глобальная задержка на вдохе (global-inhale)
 *
 * @param state - Текущее состояние упражнения
 * @param practice - Конфигурация практики дыхания
 * @returns true, если текущая фаза является финальной задержкой, иначе false
 */
export const isFinalHold = (state: ExerciseState, practice: BreathingPracticeConfig): boolean => {
  // Проверяем, что текущая фаза - это задержка
  if (state.currentPhase !== 'hold') {
    return false;
  }

  // Старая логика (без раундов): последний цикл с заданным finalHoldDuration
  const isLegacyFinalHold =
    (state.currentRoundIndex == null || state.currentRoundIndex === 0) &&
    state.currentCycle === practice.cycles &&
    practice.finalHoldDuration !== undefined;

  // Новая логика (с раундами): задержка в конце раунда или глобальная задержка на вдохе
  const isRoundBasedFinalHold =
    state.currentRoundIndex !== undefined &&
    state.totalRounds !== undefined &&
    (state.currentHoldType === 'round-exhale' ||
      state.currentHoldType === 'round-inhale' ||
      state.currentHoldType === 'global-inhale');

  return isLegacyFinalHold || isRoundBasedFinalHold;
};
