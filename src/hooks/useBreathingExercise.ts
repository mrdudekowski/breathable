import { useState, useEffect, useRef, useCallback } from 'react';
import type { BreathingPhase, BreathingPracticeConfig, ExerciseState, BreathingExerciseCallbacks, BreathingRoundConfig, HoldType } from '../types/breathing';
import { getPhaseDuration as getPhaseDurationForPhase, getPhaseDurationWithSpeed, getSpecialPhaseDuration } from '../utils/breathingHelpers';

/**
 * Хук управления дыхательной практикой.
 *
 * Инварианты:
 * - Основной цикл состоит только из фаз: inhale -> exhale.
 * - Фазы hold/pause используются только для финальной задержки дыхания (finalHold) в конце раунда или последнего цикла.
 * - Время тика — 1 секунда, счётчик totalTimeElapsed растёт на 1 при каждом тике, пока практика запущена.
 * - Если практика использует раунды, каждый раунд содержит фиксированное количество циклов (например, 30).
 */

interface UseBreathingExerciseOptions {
  practice: BreathingPracticeConfig;
  callbacks?: Partial<BreathingExerciseCallbacks>;
}

const PHASE_ORDER: BreathingPhase[] = ['inhale', 'exhale'];

/**
 * Получить текущий раунд по индексу.
 */
const getCurrentRound = (practice: BreathingPracticeConfig, index?: number): BreathingRoundConfig | undefined => {
  if (practice.rounds == null || practice.rounds.length === 0 || index == null || index === 0) return undefined;
  return practice.rounds.find((r) => r.index === index);
};

interface PhaseTransitionResult {
  nextState: ExerciseState;
  nextIsFinalHold: boolean;
  nextIsGlobalInhaleHold: boolean;
  nextHoldType?: HoldType;
  phaseChangedTo?: BreathingPhase;
  completedCycle?: number;
  exerciseCompleted?: boolean;
}

/**
 * Обработка завершения зелёной задержки на выдохе (round-exhale).
 * Переход к вдоху, который затем приведёт к синей задержке.
 * 
 * Вдох после зелёной задержки является специальной переходной фазой:
 * - Ice Man: в 2 раза дольше обычного вдоха (2 * 2 = 4 сек)
 * - Space Man: остаётся такой же как обычный вдох (4 сек)
 */
const handleGreenHoldCompletion = (
  prevState: ExerciseState,
  practice: BreathingPracticeConfig,
  currentRound: BreathingRoundConfig
): PhaseTransitionResult => {
  // Вычисляем базовую длительность вдоха из скорости дыхания
  const baseInhaleDuration = getPhaseDurationWithSpeed('inhale', practice, currentRound);
  // Определяем скорость дыхания для применения специального множителя
  const speedId = currentRound.breathSpeedId ?? practice.defaultSpeedId;
  // Применяем специальную длительность для переходной фазы
  const inhaleDuration = getSpecialPhaseDuration(baseInhaleDuration, speedId);
  
  return {
    nextState: {
      ...prevState,
      currentPhase: 'inhale',
      phaseTimeRemaining: inhaleDuration,
      totalTimeElapsed: prevState.totalTimeElapsed + 1,
      currentHoldType: undefined,
      previousHoldType: 'round-exhale', // Сохраняем тип зелёной задержки для последующей проверки при переходе к синей задержке
    },
    nextIsFinalHold: false,
    nextIsGlobalInhaleHold: false,
    nextHoldType: undefined,
    phaseChangedTo: 'inhale',
  };
};

/**
 * Обработка завершения синей задержки на вдохе (global-inhale).
 * Переход к выдоху (критически важно: после синей задержки должен быть выдох).
 * 
 * Выдох после синей задержки является специальной переходной фазой:
 * - Ice Man: в 2 раза дольше обычного выдоха (2 * 2 = 4 сек)
 * - Space Man: остаётся такой же как обычный выдох (4 сек)
 */
const handleBlueHoldCompletion = (
  prevState: ExerciseState,
  practice: BreathingPracticeConfig,
  currentRound: BreathingRoundConfig | undefined
): PhaseTransitionResult => {
  // После синей задержки переходим к выдоху
  // Вычисляем базовую длительность выдоха из скорости дыхания
  const baseExhaleDuration = getPhaseDurationWithSpeed('exhale', practice, currentRound);
  // Определяем скорость дыхания для применения специального множителя
  const speedId = currentRound?.breathSpeedId ?? practice.defaultSpeedId;
  // Применяем специальную длительность для переходной фазы
  const exhaleDuration = getSpecialPhaseDuration(baseExhaleDuration, speedId);
  
  return {
    nextState: {
      ...prevState,
      currentPhase: 'exhale',
      phaseTimeRemaining: exhaleDuration,
      totalTimeElapsed: prevState.totalTimeElapsed + 1,
      currentHoldType: undefined,
      previousHoldType: prevState.currentHoldType, // Сохраняем тип синей задержки
    },
    nextIsFinalHold: false,
    nextIsGlobalInhaleHold: false,
    nextHoldType: undefined,
    phaseChangedTo: 'exhale',
  };
};

/**
 * Обработка завершения паузы между раундами.
 * Переход к следующему раунду или завершение упражнения.
 */
const handlePauseCompletion = (
  prevState: ExerciseState,
  practice: BreathingPracticeConfig
): PhaseTransitionResult => {
  const isLastRound = prevState.currentRoundIndex === prevState.totalRounds;
  
  if (isLastRound) {
    // Последний раунд завершён — упражнение завершено
    return {
      nextState: {
        ...prevState,
        isRunning: false,
        totalTimeElapsed: prevState.totalTimeElapsed + 1,
        currentHoldType: undefined,
      },
      nextIsFinalHold: false,
      nextIsGlobalInhaleHold: false,
      nextHoldType: undefined,
      exerciseCompleted: true,
    };
  } else {
    // Переход к следующему раунду или начало первого раунда
    const isFirstRound = prevState.currentRoundIndex === 1 && prevState.roundCycle === 1;
    const nextRoundIndex = isFirstRound 
      ? 1 
      : (prevState.currentRoundIndex ?? 1) + 1;
    const nextRound = getCurrentRound(practice, nextRoundIndex);
    const nextInhaleDuration = getPhaseDurationWithSpeed('inhale', practice, nextRound);
    
    return {
      nextState: {
        ...prevState,
        currentRoundIndex: nextRoundIndex,
        roundCycle: 1,
        currentCycle: 1,
        currentPhase: 'inhale',
        phaseTimeRemaining: nextInhaleDuration,
        totalTimeElapsed: prevState.totalTimeElapsed + 1,
        currentHoldType: undefined,
        previousHoldType: undefined, // Сбрасываем previousHoldType при начале нового раунда для чистоты состояния
      },
      nextIsFinalHold: false,
      nextIsGlobalInhaleHold: false,
      nextHoldType: undefined,
      phaseChangedTo: 'inhale',
    };
  }
};

/**
 * Чистая функция, рассчитывающая новое состояние упражнения на один тик таймера.
 */
const getNextStateOnTick = (
  prevState: ExerciseState,
  practice: BreathingPracticeConfig,
  phaseOrder: BreathingPhase[],
  isFinalHold: boolean,
  isGlobalInhaleHold: boolean
): PhaseTransitionResult => {
  const newTimeRemaining = prevState.phaseTimeRemaining - 1;

      // Время фазы ещё не вышло — просто уменьшаем счётчик.
      if (newTimeRemaining > 0) {
        return {
          nextState: {
            ...prevState,
            phaseTimeRemaining: newTimeRemaining,
            totalTimeElapsed: prevState.totalTimeElapsed + 1,
          },
          nextIsFinalHold: isFinalHold,
          nextIsGlobalInhaleHold: isGlobalInhaleHold,
          nextHoldType: prevState.currentHoldType,
        };
      }

  const currentPhaseIndex = phaseOrder.indexOf(prevState.currentPhase);
  const isLastPhase = currentPhaseIndex === phaseOrder.length - 1;
  const currentRound = getCurrentRound(practice, prevState.currentRoundIndex);

  // Логика с раундами
  if (currentRound && prevState.roundCycle !== undefined && prevState.totalRounds !== undefined) {
    // Обработка завершения паузы между раундами
    // Пауза происходит после hold-фазы перед следующим раундом
    if (prevState.currentPhase === 'pause' && prevState.currentRoundIndex !== undefined && prevState.totalRounds !== undefined) {
      return handlePauseCompletion(prevState, practice);
    }

    // Если сейчас фаза hold (задержка в конце раунда или глобальная задержка)
    if (prevState.currentPhase === 'hold') {
      
      // Проверяем, это глобальная задержка на вдохе или задержка раунда на вдохе
      // Оба типа синей задержки (global-inhale и round-inhale) должны обрабатываться одинаково
      // - через handleBlueHoldCompletion, который переводит к выдоху
      if (isGlobalInhaleHold || prevState.currentHoldType === 'round-inhale') {
        // Завершение синей задержки на вдохе — переходим к выдоху
        return handleBlueHoldCompletion(prevState, practice, currentRound);
      }
      
      // Завершение задержки раунда
      // Обрабатываем разные типы задержек
      const isLastRound = prevState.currentRoundIndex === prevState.totalRounds;
      
      // Примечание: round-inhale теперь обрабатывается выше через handleBlueHoldCompletion
      // Старая логика для round-inhale удалена, так как она пропускала выдох и паузу
      
      if (prevState.currentHoldType === 'round-exhale' && currentRound != null && currentRound.finalHoldPhase === 'exhale' && practice.globalInhaleHoldDuration !== undefined) {
        // После зелёной задержки на выдохе сразу переходим к вдоху (без паузы)
        // Затем при заполнении кольца перейдём к синей задержке на вдохе
        return handleGreenHoldCompletion(prevState, practice, currentRound);
      } else if (currentRound != null && currentRound.finalHoldPhase === 'inhale') {
        // Если задержка была на вдохе, сразу переходим к следующему этапу
        if (isLastRound) {
          // Последний раунд завершён — завершаем упражнение
          return {
            nextState: {
              ...prevState,
              isRunning: false,
              totalTimeElapsed: prevState.totalTimeElapsed + 1,
              currentHoldType: undefined,
            },
            nextIsFinalHold: isFinalHold,
            nextIsGlobalInhaleHold: false,
            nextHoldType: undefined,
            exerciseCompleted: true,
          };
        } else {
          // Переход к следующему раунду
          const nextRoundIndex = (prevState.currentRoundIndex ?? 1) + 1;
          const nextRound = getCurrentRound(practice, nextRoundIndex);
          const nextInhaleDuration = getPhaseDurationWithSpeed('inhale', practice, nextRound);
          
          return {
            nextState: {
              ...prevState,
              currentRoundIndex: nextRoundIndex,
              roundCycle: 1,
              currentCycle: 1,
              currentPhase: 'inhale',
              phaseTimeRemaining: nextInhaleDuration,
              totalTimeElapsed: prevState.totalTimeElapsed + 1,
              currentHoldType: undefined,
            },
            nextIsFinalHold: false,
            nextIsGlobalInhaleHold: false,
            nextHoldType: undefined,
            phaseChangedTo: 'inhale',
          };
        }
      } else {
        // Fallback: если нет глобальной задержки на вдохе
        if (isLastRound) {
          return {
            nextState: {
              ...prevState,
              isRunning: false,
              totalTimeElapsed: prevState.totalTimeElapsed + 1,
              currentHoldType: undefined,
            },
            nextIsFinalHold: isFinalHold,
            nextIsGlobalInhaleHold: false,
            nextHoldType: undefined,
            exerciseCompleted: true,
          };
        } else {
          const nextRoundIndex = (prevState.currentRoundIndex ?? 1) + 1;
          const nextRound = getCurrentRound(practice, nextRoundIndex);
          const nextInhaleDuration = getPhaseDurationWithSpeed('inhale', practice, nextRound);
          
          return {
            nextState: {
              ...prevState,
              currentRoundIndex: nextRoundIndex,
              roundCycle: 1,
              currentCycle: 1,
              currentPhase: 'inhale',
              phaseTimeRemaining: nextInhaleDuration,
              totalTimeElapsed: prevState.totalTimeElapsed + 1,
              currentHoldType: undefined,
            },
            nextIsFinalHold: false,
            nextIsGlobalInhaleHold: false,
            nextHoldType: undefined,
            phaseChangedTo: 'inhale',
          };
        }
      }
    }

    // Обработка последней фазы цикла (exhale) в раунде
    // Исключаем выдох после синей задержки - он обрабатывается отдельно ниже (строка 468)
    if (isLastPhase && currentRound != null && 
        !(prevState.roundCycle === currentRound.cycles && 
          (prevState.previousHoldType === 'global-inhale' || prevState.previousHoldType === 'round-inhale'))) {
      const newRoundCycle = (prevState.roundCycle ?? 1) + 1;
      const isLastCycleInRound = newRoundCycle > currentRound.cycles;

        if (isLastCycleInRound) {
          // Завершение всех циклов раунда — переходим к задержке
          // Если newRoundCycle > currentRound.cycles, значит мы завершили последний цикл
          // Это работает для любого количества циклов (включая 3, 10, 30 и т.д.)
          if (currentRound.finalHoldPhase === 'exhale') {
            // Задержка на выдохе — сразу после exhale (зелёная задержка)
            // После завершения зелёной задержки мы перейдём к вдоху, который затем приведёт к синей задержке на вдохе
            return {
              nextState: {
                ...prevState,
                roundCycle: currentRound.cycles,
                currentPhase: 'hold',
                phaseTimeRemaining: currentRound.finalHoldDuration,
                totalTimeElapsed: prevState.totalTimeElapsed + 1,
                currentHoldType: 'round-exhale',
              },
              nextIsFinalHold: true,
              nextIsGlobalInhaleHold: false,
              nextHoldType: 'round-exhale',
              phaseChangedTo: 'hold',
            };
          } else if (currentRound.finalHoldPhase === 'inhale') {
            // Задержка на вдохе — сначала делаем вдох, потом задержку
            const inhaleDuration = getPhaseDurationWithSpeed('inhale', practice, currentRound);
            return {
              nextState: {
                ...prevState,
                roundCycle: currentRound.cycles,
                currentPhase: 'inhale',
                phaseTimeRemaining: inhaleDuration,
                totalTimeElapsed: prevState.totalTimeElapsed + 1,
              },
              nextIsFinalHold: false,
              nextIsGlobalInhaleHold: false,
              phaseChangedTo: 'inhale',
            };
          }
        } else if (currentRound != null) {
          // Переход к следующему циклу в раунде
          const nextInhaleDuration = getPhaseDurationWithSpeed('inhale', practice, currentRound);
            return {
              nextState: {
                ...prevState,
                roundCycle: newRoundCycle,
                currentCycle: prevState.currentCycle + 1,
                currentPhase: 'inhale',
                phaseTimeRemaining: nextInhaleDuration,
                totalTimeElapsed: prevState.totalTimeElapsed + 1,
                currentHoldType: undefined,
              },
              nextIsFinalHold: isFinalHold,
              nextIsGlobalInhaleHold: false,
              nextHoldType: undefined,
              completedCycle: prevState.currentCycle,
              phaseChangedTo: 'inhale',
            };
        }
      }

    // Если мы на inhale после зелёной задержки (round-exhale), переходим к синей задержке на вдохе (15 сек)
    // Это происходит когда: roundCycle === cycles, finalHoldPhase === 'exhale', и мы завершили inhale
    if (prevState.currentPhase === 'inhale' && currentRound != null && practice.globalInhaleHoldDuration !== undefined) {
      // Проверяем, что мы завершили вдох после зелёной задержки на выдохе
      // Критически важно: проверяем previousHoldType === 'round-exhale', чтобы гарантировать,
      // что переход к синей задержке происходит ТОЛЬКО после зелёной задержки, а не для любого вдоха на последнем цикле
      if (prevState.roundCycle === currentRound.cycles && 
          currentRound.finalHoldPhase === 'exhale' && 
          prevState.previousHoldType === 'round-exhale') {
        const isLastRound = prevState.currentRoundIndex === prevState.totalRounds;
        return {
          nextState: {
            ...prevState,
            currentPhase: 'hold',
            phaseTimeRemaining: practice.globalInhaleHoldDuration,
            totalTimeElapsed: prevState.totalTimeElapsed + 1,
            currentHoldType: isLastRound ? 'global-inhale' : 'round-inhale',
          },
          nextIsFinalHold: true,
          nextIsGlobalInhaleHold: isLastRound,
          nextHoldType: isLastRound ? 'global-inhale' : 'round-inhale',
          phaseChangedTo: 'hold',
        };
      }
    }

    // Если мы на inhale и это последний цикл раунда с задержкой на вдохе (не после паузы)
    if (prevState.currentPhase === 'inhale' && currentRound != null && prevState.roundCycle === currentRound.cycles && currentRound.finalHoldPhase === 'inhale') {
      const isLastRound = prevState.currentRoundIndex === prevState.totalRounds;
      
      if (isLastRound && practice.globalInhaleHoldDuration !== undefined) {
        // Последний раунд, сразу переходим к глобальной задержке на вдохе
        return {
          nextState: {
            ...prevState,
            currentPhase: 'hold',
            phaseTimeRemaining: practice.globalInhaleHoldDuration,
            totalTimeElapsed: prevState.totalTimeElapsed + 1,
            currentHoldType: 'global-inhale',
          },
          nextIsFinalHold: true,
          nextIsGlobalInhaleHold: true,
          nextHoldType: 'global-inhale',
          phaseChangedTo: 'hold',
        };
      } else {
        // Переходим к задержке раунда на вдохе
        return {
          nextState: {
            ...prevState,
            currentPhase: 'hold',
            phaseTimeRemaining: currentRound.finalHoldDuration,
            totalTimeElapsed: prevState.totalTimeElapsed + 1,
            currentHoldType: 'round-inhale',
          },
          nextIsFinalHold: true,
          nextIsGlobalInhaleHold: false,
          nextHoldType: 'round-inhale',
          phaseChangedTo: 'hold',
        };
      }
    }

    // Обработка завершения выдоха после синей задержки
    // Проверяем: если мы на выдохе, roundCycle === cycles, и предыдущая задержка была синей (global-inhale или round-inhale)
    if (prevState.currentPhase === 'exhale' && currentRound != null && 
        prevState.roundCycle === currentRound.cycles && 
        (prevState.previousHoldType === 'global-inhale' || prevState.previousHoldType === 'round-inhale')) {
      // Выдох после синей задержки завершён — переходим к паузе
      const isLastRound = prevState.currentRoundIndex === prevState.totalRounds;
      
      if (isLastRound) {
        // Последний раунд — упражнение завершено
        return {
          nextState: {
            ...prevState,
            isRunning: false,
            totalTimeElapsed: prevState.totalTimeElapsed + 1,
            currentHoldType: undefined,
            previousHoldType: undefined,
          },
          nextIsFinalHold: false,
          nextIsGlobalInhaleHold: false,
          nextHoldType: undefined,
          exerciseCompleted: true,
        };
      } else {
        // Переход к паузе перед следующим раундом
        // Компонент сам управляет задержкой через notification + countdown
        // Здесь мы только сигнализируем о переходе в фазу 'pause'
        const pauseDuration = 0;
        return {
          nextState: {
            ...prevState,
            currentPhase: 'pause',
            phaseTimeRemaining: pauseDuration,
            totalTimeElapsed: prevState.totalTimeElapsed + 1,
            currentHoldType: undefined,
            previousHoldType: undefined,
          },
          nextIsFinalHold: false,
          nextIsGlobalInhaleHold: false,
          nextHoldType: undefined,
          phaseChangedTo: 'pause',
        };
      }
    }

    // Переход к следующей фазе в рамках цикла (inhale -> exhale) с учётом скорости
    if (currentRound != null) {
      const nextPhase = phaseOrder[currentPhaseIndex + 1];
      const nextPhaseDuration = getPhaseDurationWithSpeed(nextPhase, practice, currentRound);

      return {
        nextState: {
          ...prevState,
          currentPhase: nextPhase,
          phaseTimeRemaining: nextPhaseDuration,
          totalTimeElapsed: prevState.totalTimeElapsed + 1,
          currentHoldType: undefined,
        },
        nextIsFinalHold: isFinalHold,
        nextIsGlobalInhaleHold: false,
        nextHoldType: undefined,
        phaseChangedTo: nextPhase,
      };
    }
  }

  // Старая логика (без раундов) — для обратной совместимости
  const isLastCycle = prevState.currentCycle >= practice.cycles;

  // Обработка последней фазы цикла (exhale).
  if (isLastPhase) {
    // Переходим в финальный hold, если есть finalHoldDuration и мы его ещё не делали.
    if (isLastCycle && practice.finalHoldDuration !== undefined && !isFinalHold) {
      return {
        nextState: {
          ...prevState,
          currentPhase: 'hold',
          phaseTimeRemaining: practice.finalHoldDuration,
          totalTimeElapsed: prevState.totalTimeElapsed + 1,
          currentHoldType: undefined, // Старая логика без типа задержки
        },
        nextIsFinalHold: true,
        nextIsGlobalInhaleHold: false,
        nextHoldType: undefined,
        phaseChangedTo: 'hold',
      };
    }

    // Завершение финального hold.
    if (isLastCycle && isFinalHold) {
      return {
        nextState: {
          ...prevState,
          isRunning: false,
          totalTimeElapsed: prevState.totalTimeElapsed + 1,
          currentHoldType: undefined,
        },
        nextIsFinalHold: isFinalHold,
        nextIsGlobalInhaleHold: false,
        nextHoldType: undefined,
        exerciseCompleted: true,
      };
    }

    // Последний цикл без финальной задержки.
    if (isLastCycle) {
      return {
        nextState: {
          ...prevState,
          isRunning: false,
          totalTimeElapsed: prevState.totalTimeElapsed + 1,
          currentHoldType: undefined,
        },
        nextIsFinalHold: isFinalHold,
        nextIsGlobalInhaleHold: false,
        nextHoldType: undefined,
        exerciseCompleted: true,
      };
    }

    // Переход к следующему циклу: начинаем новый inhale.
    return {
      nextState: {
        ...prevState,
        currentCycle: prevState.currentCycle + 1,
        currentPhase: 'inhale',
        phaseTimeRemaining: practice.inhaleDuration,
        totalTimeElapsed: prevState.totalTimeElapsed + 1,
        currentHoldType: undefined,
      },
      nextIsFinalHold: isFinalHold,
      nextIsGlobalInhaleHold: false,
      nextHoldType: undefined,
      completedCycle: prevState.currentCycle,
      phaseChangedTo: 'inhale',
    };
  }

  // Переход к следующей фазе в рамках цикла (inhale -> exhale).
  const nextPhase = phaseOrder[currentPhaseIndex + 1];
  const nextPhaseDuration = getPhaseDurationForPhase(nextPhase, practice, isFinalHold);

  return {
    nextState: {
      ...prevState,
      currentPhase: nextPhase,
      phaseTimeRemaining: nextPhaseDuration,
      totalTimeElapsed: prevState.totalTimeElapsed + 1,
      currentHoldType: undefined,
    },
    nextIsFinalHold: isFinalHold,
    nextIsGlobalInhaleHold: false,
    nextHoldType: undefined,
    phaseChangedTo: nextPhase,
  };
};

export const useBreathingExercise = ({ practice, callbacks }: UseBreathingExerciseOptions) => {
  const [state, setState] = useState<ExerciseState>({
    currentPhase: 'inhale',
    currentCycle: 1,
    phaseTimeRemaining: practice.inhaleDuration,
    totalTimeElapsed: 0,
    isRunning: false,
    isPaused: false,
  });

  const [isFinalHold, setIsFinalHold] = useState(false);
  const [isGlobalInhaleHold, setIsGlobalInhaleHold] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const phaseOrderRef = useRef<BreathingPhase[]>(PHASE_ORDER);
  const practiceRef = useRef(practice);
  const callbacksRef = useRef(callbacks);
  const isFinalHoldRef = useRef(false);
  const isGlobalInhaleHoldRef = useRef(false);
  
  // Обновляем refs при изменении
  useEffect(() => {
    practiceRef.current = practice;
    callbacksRef.current = callbacks;
  }, [practice, callbacks]);

  // Синхронизируем refs для isFinalHold и isGlobalInhaleHold
  // Это предотвращает race conditions при использовании этих значений в интервале
  useEffect(() => {
    isFinalHoldRef.current = isFinalHold;
    isGlobalInhaleHoldRef.current = isGlobalInhaleHold;
  }, [isFinalHold, isGlobalInhaleHold]);

  // Удаляем getPhaseDuration из зависимостей useEffect, так как он не используется в интервале

  const startExercise = useCallback((prepareFirst: boolean = false) => {
    setIsFinalHold(false);
    setIsGlobalInhaleHold(false);
    const currentPractice = practiceRef.current;
    const currentCallbacks = callbacksRef.current;
    currentCallbacks?.onStart?.();
    
    // Валидация практики
    if (currentPractice.rounds && currentPractice.rounds.length > 0) {
      // Проверяем, что все раунды имеют корректную конфигурацию
      const invalidRound = currentPractice.rounds.find(
        (round) => !round.cycles || round.cycles <= 0 || !round.finalHoldDuration || round.finalHoldDuration <= 0
      );
      if (invalidRound) {
        console.error('Invalid round configuration:', invalidRound);
        return;
      }
      const firstRound = currentPractice.rounds[0];
      
      if (prepareFirst) {
        // Подготовка к первому раунду: начинаем с паузы для обратного отсчета
        setState({
          currentPhase: 'pause',
          currentCycle: 1,
          phaseTimeRemaining: 3,
          totalTimeElapsed: 0,
          isRunning: true,
          isPaused: false,
          currentRoundIndex: 1,
          roundCycle: 1,
          totalRounds: currentPractice.rounds.length,
          currentHoldType: undefined,
        });
      } else {
        const initialInhaleDuration = getPhaseDurationWithSpeed('inhale', currentPractice, firstRound);
        setState({
          currentPhase: 'inhale',
          currentCycle: 1,
          phaseTimeRemaining: initialInhaleDuration,
          totalTimeElapsed: 0,
          isRunning: true,
          isPaused: false,
          currentRoundIndex: 1,
          roundCycle: 1,
          totalRounds: currentPractice.rounds.length,
          currentHoldType: undefined,
        });
      }
    } else {
      // Старая логика без раундов
      setState({
        currentPhase: 'inhale',
        currentCycle: 1,
        phaseTimeRemaining: currentPractice.inhaleDuration,
        totalTimeElapsed: 0,
        isRunning: true,
        isPaused: false,
        currentHoldType: undefined,
      });
    }
  }, []);

  const pauseExercise = useCallback(() => {
    setState((prevState) => {
      if (!prevState.isRunning || prevState.isPaused) return prevState;
      
      callbacksRef.current?.onPause?.();
      return {
        ...prevState,
        isPaused: true,
      };
    });
  }, []);

  const resumeExercise = useCallback(() => {
    setState((prevState) => {
      if (!prevState.isRunning || !prevState.isPaused) return prevState;
      
      callbacksRef.current?.onResume?.();
      return {
        ...prevState,
        isPaused: false,
      };
    });
  }, []);

  const stopExercise = useCallback(() => {
    setState((prevState) => {
      if (!prevState.isRunning) return prevState;
      
      callbacksRef.current?.onStop?.();
      return {
        ...prevState,
        isRunning: false,
        isPaused: false,
      };
    });
  }, []);

  const resetExercise = useCallback(() => {
    const currentPractice = practiceRef.current;
    setIsFinalHold(false);
    setIsGlobalInhaleHold(false);
    
    // Валидация практики
    if (currentPractice.rounds && currentPractice.rounds.length > 0) {
      // Проверяем, что все раунды имеют корректную конфигурацию
      const invalidRound = currentPractice.rounds.find(
        (round) => !round.cycles || round.cycles <= 0 || !round.finalHoldDuration || round.finalHoldDuration <= 0
      );
      if (invalidRound) {
        console.error('Invalid round configuration:', invalidRound);
        return;
      }
      const firstRound = currentPractice.rounds[0];
      const initialInhaleDuration = getPhaseDurationWithSpeed('inhale', currentPractice, firstRound);
      
      setState({
        currentPhase: 'inhale',
        currentCycle: 1,
        phaseTimeRemaining: initialInhaleDuration,
        totalTimeElapsed: 0,
        isRunning: false,
        isPaused: false,
        currentRoundIndex: 1,
        roundCycle: 1,
        totalRounds: currentPractice.rounds.length,
        currentHoldType: undefined,
      });
    } else {
      // Старая логика без раундов
      setState({
        currentPhase: 'inhale',
        currentCycle: 1,
        phaseTimeRemaining: currentPractice.inhaleDuration,
        totalTimeElapsed: 0,
        isRunning: false,
        isPaused: false,
        currentHoldType: undefined,
      });
    }
  }, []);

  useEffect(() => {
    if (state.isRunning && !state.isPaused) {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = window.setInterval(() => {
        setState((prevState) => {
          if (!prevState.isRunning || prevState.isPaused) {
            return prevState;
          }

          const currentPractice = practiceRef.current;
          const currentCallbacks = callbacksRef.current;
          const phaseOrder = phaseOrderRef.current;

          const {
            nextState,
            nextIsFinalHold,
            nextIsGlobalInhaleHold,
            nextHoldType,
            phaseChangedTo,
            completedCycle,
            exerciseCompleted,
          } = getNextStateOnTick(prevState, currentPractice, phaseOrder, isFinalHoldRef.current, isGlobalInhaleHoldRef.current);

          setIsFinalHold(nextIsFinalHold);
          setIsGlobalInhaleHold(nextIsGlobalInhaleHold);
          
          // Обновляем currentHoldType и previousHoldType в состоянии
          if (nextHoldType !== undefined) {
            // Сохраняем текущий тип задержки как предыдущий перед обновлением
            if (prevState.currentHoldType !== undefined) {
              nextState.previousHoldType = prevState.currentHoldType;
            }
            nextState.currentHoldType = nextHoldType;
          } else if (prevState.currentPhase === 'hold' && prevState.currentHoldType !== undefined) {
            // Если мы выходим из задержки, сохраняем её тип как предыдущий
            nextState.previousHoldType = prevState.currentHoldType;
          } else if (prevState.currentPhase === 'exhale' && prevState.previousHoldType !== undefined) {
            // Если мы на выдохе после синей задержки, сохраняем previousHoldType
            nextState.previousHoldType = prevState.previousHoldType;
          }

          if (phaseChangedTo) {
            currentCallbacks?.onPhaseChange?.(phaseChangedTo);
          }

          if (completedCycle !== undefined) {
            currentCallbacks?.onCycleComplete?.(completedCycle);
          }

          if (exerciseCompleted === true) {
            currentCallbacks?.onComplete?.();
          }

          return nextState;
        });
      }, 1000);
    } else {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isRunning, state.isPaused]);

  return {
    state,
    startExercise,
    pauseExercise,
    resumeExercise,
    stopExercise,
    resetExercise,
  };
};
