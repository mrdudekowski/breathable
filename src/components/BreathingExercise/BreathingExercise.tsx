import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BreathingCircle } from './BreathingCircle';
import { RoundNotification } from './RoundNotification';
import { SpeedToggle } from './SpeedToggle';
import { PauseTimer } from './PauseTimer';
import { PhaseLabel } from './PhaseLabel';
import { useBreathingExercise } from '../../hooks/useBreathingExercise';
import type { BreathingPracticeConfig, BreathSpeedId } from '../../types/breathing';
import { PHASE_METADATA } from '../../config/phaseMetadata';
import {
  getPhaseDurationWithSpeed,
  getSpecialPhaseDuration,
  isFinalHold as checkIsFinalHold,
} from '../../utils/breathingHelpers';
import styles from './BreathingExercise.module.css';

interface BreathingExerciseProps {
  practice: BreathingPracticeConfig;
  onBack: () => void;
}

// Единая state machine для управления UI переходами
type UIState =
  | { type: 'idle' }
  | { type: 'showing-notification'; roundIndex: number; notificationDuration: number }
  | { type: 'counting-down'; secondsRemaining: number }
  | { type: 'exercising' };

export const BreathingExercise = ({ practice, onBack }: BreathingExerciseProps) => {
  const [cyclesOverride, setCyclesOverride] = useState<number>(30);
  const [selectedSpeedId, setSelectedSpeedId] = useState<BreathSpeedId>(
    practice.defaultSpeedId || 'ice-man'
  );

  // Единое состояние UI
  const [uiState, setUIState] = useState<UIState>({ type: 'idle' });

  // Отслеживаем предыдущую фазу для определения перехода в 'pause'
  const previousPhaseRef = useRef<string | undefined>(undefined);
  const prevIsRunningRef = useRef(false);

  // Единый таймер для переходов UI
  const transitionTimerRef = useRef<number | null>(null);

  // Модифицируем практику с переопределенным количеством циклов и выбранной скоростью
  // Используем useMemo для оптимизации и гарантии обновления при изменении cyclesOverride или selectedSpeedId
  const modifiedPractice: BreathingPracticeConfig = useMemo(() => {
    return practice.rounds
      ? {
          ...practice,
          rounds: practice.rounds.map(round => ({
            ...round,
            cycles: cyclesOverride,
            breathSpeedId: selectedSpeedId, // Применяем выбранную скорость ко всем раундам
          })),
        }
      : practice;
  }, [practice, cyclesOverride, selectedSpeedId]);

  const { state, startExercise, pauseExercise, resumeExercise, stopExercise, resetExercise } =
    useBreathingExercise({
      practice: modifiedPractice,
      callbacks: {
        onComplete: () => {
          setTimeout(() => {
            onBack();
          }, 2000);
        },
        onPhaseChange: _phase => {
          // Логика скрытия уведомления перенесена в useEffect для избежания race condition
        },
      },
    });

  useEffect(() => {
    return () => {
      stopExercise();
    };
  }, [stopExercise]);

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
    };
  }, []);

  // Сброс состояния при остановке упражнения
  useEffect(() => {
    // Сбрасываем только если упражнение БЫЛО запущено и СТАЛО остановленным
    if (prevIsRunningRef.current && !state.isRunning && uiState.type !== 'idle') {
      setUIState({ type: 'idle' });
      previousPhaseRef.current = undefined;
    }
    // Обновляем ref для следующего рендера
    prevIsRunningRef.current = state.isRunning;
  }, [state.isRunning, uiState.type]);

  // Refs для функций, чтобы избежать их включения в зависимости useEffect
  const startExerciseRef = useRef(startExercise);
  const resumeExerciseRef = useRef(resumeExercise);

  useEffect(() => {
    startExerciseRef.current = startExercise;
    resumeExerciseRef.current = resumeExercise;
  }, [startExercise, resumeExercise]);

  // Единый эффект управления UI transitions
  useEffect(() => {
    // Очищаем предыдущий таймер
    if (transitionTimerRef.current !== null) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    switch (uiState.type) {
      case 'showing-notification':
        // Через 2 секунды переходим к countdown
        transitionTimerRef.current = window.setTimeout(() => {
          setUIState({ type: 'counting-down', secondsRemaining: 3 });
        }, uiState.notificationDuration);
        break;

      case 'counting-down':
        if (uiState.secondsRemaining <= 0) {
          // Countdown завершён, запускаем упражнение
          setUIState({ type: 'exercising' });

          // Запускаем или возобновляем упражнение
          if (!state.isRunning) {
            startExerciseRef.current(false); // Начинаем сразу с inhale
          } else {
            resumeExerciseRef.current(); // Возобновляем после паузы между раундами
          }
        } else {
          // Уменьшаем счётчик через 1 секунду
          transitionTimerRef.current = window.setTimeout(() => {
            setUIState({
              type: 'counting-down',
              secondsRemaining: uiState.secondsRemaining - 1,
            });
          }, 1000);
        }
        break;
    }

    return () => {
      if (transitionTimerRef.current !== null) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
    };
  }, [uiState, state.isRunning]);

  // Обработка перехода между раундами (для раундов 2, 3 и т.д.)
  useEffect(() => {
    // Определяем переход в фазу 'pause' между раундами
    const isEnteringPause =
      state.currentPhase === 'pause' &&
      previousPhaseRef.current !== 'pause' &&
      state.currentRoundIndex !== undefined &&
      state.totalRounds !== undefined &&
      state.isRunning &&
      !state.isPaused &&
      uiState.type === 'exercising';

    // Показываем уведомление, если есть следующий раунд (не последний)
    if (
      isEnteringPause &&
      state.currentRoundIndex !== undefined &&
      state.totalRounds !== undefined &&
      state.currentRoundIndex < state.totalRounds
    ) {
      // Останавливаем основной таймер во время показа уведомления
      pauseExercise();

      // Показываем уведомление о следующем раунде
      setUIState({
        type: 'showing-notification',
        roundIndex: state.currentRoundIndex + 1,
        notificationDuration: 2000,
      });
    }

    // Обновляем предыдущую фазу
    previousPhaseRef.current = state.currentPhase;
  }, [
    state.currentPhase,
    state.currentRoundIndex,
    state.totalRounds,
    state.isRunning,
    state.isPaused,
    uiState.type,
    pauseExercise,
  ]);

  const handleTogglePause = () => {
    if (state.isPaused) {
      resumeExercise();
    } else {
      pauseExercise();
    }
  };

  const handleStop = () => {
    // Очищаем таймер
    if (transitionTimerRef.current !== null) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    // Сбрасываем состояние
    setUIState({ type: 'idle' });

    stopExercise();
    resetExercise();
    onBack();
  };

  const handleStart = () => {
    // Проверяем, что упражнение не запущено и мы в состоянии idle
    if (state.isRunning || uiState.type !== 'idle') {
      return;
    }

    if (practice.rounds && practice.rounds.length > 0) {
      // Показываем уведомление о первом раунде
      setUIState({
        type: 'showing-notification',
        roundIndex: 1,
        notificationDuration: 2000,
      });
    } else {
      // Старая логика без раундов - сразу запускаем
      startExercise();
      setUIState({ type: 'exercising' });
    }
  };

  // Определяем, является ли текущая задержка финальной (с учётом раундов)
  const isFinalHold = checkIsFinalHold(state, practice);

  // Получаем текущий раунд для синхронизации анимации со скоростью дыхания
  const currentRound = modifiedPractice.rounds?.find(r => r.index === state.currentRoundIndex);

  // Определяем, является ли текущая фаза специальной переходной фазой
  // Специальные переходные фазы: вдох после зелёной задержки, выдох после синей задержки
  const isSpecialInhaleAfterGreenHold =
    state.currentPhase === 'inhale' && state.previousHoldType === 'round-exhale';

  const isSpecialExhaleAfterBlueHold =
    state.currentPhase === 'exhale' &&
    (state.previousHoldType === 'global-inhale' || state.previousHoldType === 'round-inhale');

  // Вычисляем базовую длительность фазы с учётом скорости дыхания из раунда
  // Это обеспечивает синхронизацию анимации круга с темпом дыхания
  let phaseDuration = getPhaseDurationWithSpeed(
    state.currentPhase,
    modifiedPractice,
    currentRound,
    isFinalHold
  );

  // Применяем специальную длительность для переходных фаз
  // Ice Man: в 2 раза дольше, Space Man: остаётся такой же
  if (isSpecialInhaleAfterGreenHold || isSpecialExhaleAfterBlueHold) {
    const speedId = currentRound?.breathSpeedId ?? modifiedPractice.defaultSpeedId;
    phaseDuration = getSpecialPhaseDuration(phaseDuration, speedId);
  }

  const isHoldPhase = state.currentPhase === 'hold' && state.currentHoldType !== undefined;

  // Вычисляем видимость подсказки "Вдох" (слева от кольца)
  // Элемент не привязан к таймингам дыхания, появляется сразу при смене фазы
  const shouldShowInhaleLabel = useMemo(() => {
    // Показываем только на фазе inhale
    if (state.currentPhase !== 'inhale' || !state.isRunning) {
      return false;
    }

    // Не показываем на inhale после exhale hold (round-exhale)
    if (state.previousHoldType === 'round-exhale') {
      return false;
    }

    return true;
  }, [state.currentPhase, state.isRunning, state.previousHoldType]);

  // Вычисляем видимость подсказки "Выдох" (справа от кольца)
  // Элемент не привязан к таймингам дыхания, появляется сразу при смене фазы
  const shouldShowExhaleLabel = useMemo(() => {
    // Показываем только на фазе exhale
    if (state.currentPhase !== 'exhale' || !state.isRunning) {
      return false;
    }

    // Не показываем на exhale после inhale hold (round-inhale или global-inhale)
    if (state.previousHoldType === 'round-inhale' || state.previousHoldType === 'global-inhale') {
      return false;
    }

    return true;
  }, [state.currentPhase, state.isRunning, state.previousHoldType]);

  return (
    <motion.div
      className={styles.exercise}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <button
        className={styles.backButton}
        onClick={handleStop}
        type="button"
        aria-label="Вернуться в главное меню и остановить упражнение"
      >
        ← Назад
      </button>

      <div className={styles.content}>
        <div className={styles.headerControls}>
          <p className={styles.cyclesInfo}>
            Ползунок - фича для разработки. Рекомендуемое количество циклов - 30.
          </p>
          <label htmlFor="cycles-slider" className={styles.cyclesLabel}>
            Циклов: {cyclesOverride}
          </label>
          <input
            id="cycles-slider"
            type="range"
            min="1"
            max="30"
            value={cyclesOverride}
            onChange={e => setCyclesOverride(Number(e.target.value))}
            className={styles.cyclesSlider}
            disabled={state.isRunning}
            aria-label="Количество циклов дыхания"
            aria-valuetext={`${cyclesOverride} ${cyclesOverride === 1 ? 'цикл' : cyclesOverride < 5 ? 'цикла' : 'циклов'}`}
            aria-valuemin={1}
            aria-valuemax={30}
            aria-valuenow={cyclesOverride}
          />
        </div>

        <h1 className={styles.practiceName}>{practice.name}</h1>

        <SpeedToggle
          selectedSpeedId={selectedSpeedId}
          onSpeedChange={setSelectedSpeedId}
          disabled={state.isRunning}
        />

        <div className={styles.circleWrapper}>
          <BreathingCircle
            phase={state.currentPhase}
            timeRemaining={state.phaseTimeRemaining}
            phaseDuration={phaseDuration}
            isFinalHold={isFinalHold}
            currentCycle={state.currentCycle}
            roundCycle={state.roundCycle}
            currentRoundIndex={state.currentRoundIndex}
            holdType={state.currentHoldType}
            previousHoldType={state.previousHoldType}
            isRunning={state.isRunning}
          />

          {/* Подсказки "Вдох" и "Выдох" - позиционируются относительно .circleWrapper */}
          <AnimatePresence>
            {shouldShowInhaleLabel && (
              <PhaseLabel
                key="inhale-label"
                text={PHASE_METADATA.inhale.label}
                position="left"
                phase={state.currentPhase}
              />
            )}
            {shouldShowExhaleLabel && (
              <PhaseLabel
                key="exhale-label"
                text={PHASE_METADATA.exhale.label}
                position="right"
                phase={state.currentPhase}
              />
            )}
          </AnimatePresence>
        </div>

        <motion.div
          className={styles.timersAndNotificationsContainer}
          initial={false}
          animate={{ opacity: 1 }}
        >
          {/* Общий AnimatePresence для уведомления и таймера паузы */}
          <AnimatePresence mode="wait">
            {/* Уведомление о раунде */}
            {!isHoldPhase && uiState.type === 'showing-notification' && (
              <RoundNotification
                key={`notification-${uiState.roundIndex}`}
                roundIndex={uiState.roundIndex}
                totalRounds={state.totalRounds ?? practice.rounds?.length ?? 1}
              />
            )}

            {/* Обратный отсчет перед раундом */}
            {uiState.type === 'counting-down' && (
              <PauseTimer
                key={`countdown-${state.currentRoundIndex ?? 'initial'}`}
                timeRemaining={uiState.secondsRemaining}
              />
            )}
          </AnimatePresence>
        </motion.div>

        <div className={styles.controls}>
          {!state.isRunning && uiState.type === 'idle' ? (
            <motion.button
              className={styles.startButton}
              onClick={handleStart}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
            >
              Начать
            </motion.button>
          ) : (
            <>
              <motion.button
                className={styles.pauseButton}
                onClick={handleTogglePause}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={!state.isRunning && uiState.type !== 'exercising'}
              >
                {state.isPaused ? 'Продолжить' : 'Пауза'}
              </motion.button>
              <motion.button
                className={styles.stopButton}
                onClick={handleStop}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Стоп
              </motion.button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};
