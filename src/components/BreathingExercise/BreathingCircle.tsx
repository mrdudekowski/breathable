import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useRef, useEffect } from 'react';
import type { BreathingPhase, HoldType } from '../../types/breathing';
import { PHASE_METADATA } from '../../config/phaseMetadata';
import { getRgbaFromVariable } from '../../utils/colorHelpers';
import { CycleCounter } from './CycleCounter';
import { HoldHourglass } from './HoldHourglass';
import { HoldTimer } from './HoldTimer';
import { PhaseLabel } from './PhaseLabel';
import styles from './BreathingCircle.module.css';

interface BreathingCircleProps {
  phase: BreathingPhase;
  timeRemaining: number;
  phaseDuration: number;
  isFinalHold?: boolean;
  currentCycle?: number;
  roundCycle?: number;
  currentRoundIndex?: number;
  holdType?: HoldType;
  previousHoldType?: HoldType;
  isRunning: boolean;
}

/**
 * Вычисляет целевой масштаб для фазы дыхания
 * Вынесено за пределы компонента для оптимизации - не создается на каждом рендере
 */
const getActiveScaleTarget = (
  currentPhase: BreathingPhase,
  minScale: number,
  maxScale: number
): number => {
  switch (currentPhase) {
    case 'inhale':
      return maxScale;
    case 'exhale':
      return minScale;
    case 'pause':
      return minScale;
    default:
      return minScale;
  }
};

/**
 * Вычисляет угол градиента для создания эффекта вращения
 * Угол меняется в зависимости от фазы и прогресса для визуального отображения движения дыхания
 */
const getGradientAngle = (
  currentPhase: BreathingPhase,
  currentProgress: number
): number => {
  if (currentPhase === 'inhale') {
    return 135 + (currentProgress * 90);
  } else if (currentPhase === 'exhale') {
    return 225 + (currentProgress * 90);
  }
  return 180;
};

export const BreathingCircle = ({
  phase,
  timeRemaining,
  phaseDuration,
  isFinalHold = false,
  currentCycle,
  roundCycle,
  holdType,
  previousHoldType,
  isRunning,
}: BreathingCircleProps) => {
  // Минимальный размер (маленький круг в центре) и максимальный размер (100% кольца)
  // Базовый размер круга = --circle-base-size (60-80px)
  // Размер контейнера = --circle-container-size (240-320px)
  // Кольцо имеет r="48" в viewBox="0 0 100 100", что означает 96% от размера контейнера
  // Расчет: (container * 0.96) / base = (240-320 * 0.96) / (60-80) = 230.4-307.2 / 60-80 = 3.84-4.27
  // Используем 4.0 для гарантированного заполнения кольца с небольшим запасом
  const minScale: number = 0.15; // Маленький круг (15% от базового размера)
  const maxScale: number = 4.0; // Заполняет кольцо (400% от базового размера = размер контейнера)

  const idleMinScale: number = minScale * 0.9;
  const idleMaxScale: number = minScale * 1.1;

  const activeScaleTarget: number = getActiveScaleTarget(phase, minScale, maxScale);

  // Отслеживаем первый вход в mint hold для одноразового перехода от выдоха
  const isFirstMintHoldEntry = useRef(true);
  const previousIsMintHold = useRef(false);

  const rawProgress: number =
    phaseDuration > 0 ? (phaseDuration - timeRemaining) / phaseDuration : 0;
  const clampedProgress: number = Math.min(Math.max(rawProgress, 0), 1);
  const progress: number = isRunning ? clampedProgress : 0;

  // Мемоизируем цвета для оптимизации - избегаем повторных вызовов getRgbaFromVariable
  const mintColors = useMemo(() => ({
    high: getRgbaFromVariable('--color-mint-primary-rgb', 0.9),
    medium: getRgbaFromVariable('--color-mint-primary-rgb', 0.7),
    low: getRgbaFromVariable('--color-mint-primary-rgb', 0.6),
    veryLow: getRgbaFromVariable('--color-mint-primary-rgb', 0.4),
  }), []);

  const bluePrimaryColors = useMemo(() => ({
    high: getRgbaFromVariable('--color-blue-primary-rgb', 0.9),
    medium: getRgbaFromVariable('--color-blue-primary-rgb', 0.5),
    low: getRgbaFromVariable('--color-blue-primary-rgb', 0.3),
    veryLow: getRgbaFromVariable('--color-blue-primary-rgb', 0.25),
  }), []);

  const turquoiseColors = useMemo(() => ({
    high: getRgbaFromVariable('--color-turquoise-primary-rgb', 0.9),
    low: getRgbaFromVariable('--color-turquoise-primary-rgb', 0.3),
  }), []);

  const lavenderColors = useMemo(() => ({
    high: getRgbaFromVariable('--color-lavender-primary-rgb', 0.9),
  }), []);

  // Статичный цвет для mint hold (используется в анимации пульсации)
  const mintHoldColor = useMemo(() => {
    // Статичный цвет mint hold
    return `radial-gradient(circle, ${mintColors.high} 0%, ${mintColors.medium} 100%)`;
  }, [mintColors]);

  // Определяем цвета и градиент в зависимости от фазы
  // Используем мятный цвет для round-exhale, чтобы визуально отличать от обычных фаз
  // и создать ассоциацию с холодным, спокойным состоянием задержки
  const circleStyle = useMemo((): { 
    background: string; 
    ringColor: string;
  } => {
    // Проверяем задержки только когда phase === 'hold', чтобы правильно применять градиенты для задержек
    if (phase === 'hold' && holdType === 'round-exhale') {
      return {
        background: `radial-gradient(circle, ${mintColors.high} 0%, ${mintColors.medium} 100%)`,
        ringColor: mintColors.low,
      };
    } else if (phase === 'hold' && (holdType === 'global-inhale' || holdType === 'round-inhale')) {
      // Используем градиент выдоха (бирюза → лаванда) для задержки на вдохе, продолжая визуальный поток выдоха
      // Угол вычисляется на основе прогресса задержки для плавного вращения
      const holdProgress = phaseDuration > 0 ? (phaseDuration - timeRemaining) / phaseDuration : 0;
      const angle = 225 + (holdProgress * 90); // Вращение от 225deg до 315deg, как для выдоха
      return {
        background: `linear-gradient(${angle}deg, ${turquoiseColors.high} 0%, ${lavenderColors.high} 100%)`,
        ringColor: turquoiseColors.low,
      };
    } else if (phase === 'inhale') {
      // Вращающийся градиент создает ощущение расширения и движения
      const angle = getGradientAngle(phase, progress);
      return {
        background: `linear-gradient(${angle}deg, ${bluePrimaryColors.high} 0%, ${turquoiseColors.high} 100%)`,
        ringColor: bluePrimaryColors.low,
      };
    } else if (phase === 'exhale') {
      // Вращающийся градиент создает ощущение сжатия и успокоения
      const angle = getGradientAngle(phase, progress);
      return {
        background: `linear-gradient(${angle}deg, ${turquoiseColors.high} 0%, ${lavenderColors.high} 100%)`,
        ringColor: turquoiseColors.low,
      };
    } else {
      // Статичный градиент для паузы - не отвлекает от состояния покоя
      return {
        background: `radial-gradient(circle, ${bluePrimaryColors.medium} 0%, ${bluePrimaryColors.low} 100%)`,
        ringColor: bluePrimaryColors.low,
      };
    }
  }, [holdType, phase, progress, timeRemaining, phaseDuration, mintColors, bluePrimaryColors, turquoiseColors, lavenderColors]);

  // Мягкое свечение с размытием
  // Интенсивность свечения меняется динамически для создания эффекта пульсации дыхания
  const glowEffect = useMemo((): { blur: string; boxShadow: string | string[] } => {
    // Проверяем задержки только когда phase === 'hold', чтобы правильно применять свечение для задержек
    if (phase === 'hold' && holdType === 'round-exhale') {
      // Статичное свечение для задержки - пульсация создается только через scale, чтобы избежать клипания
      return {
        blur: '8px',
        boxShadow: `0 0 25px ${mintColors.high}, 0 0 37px ${mintColors.low}`,
      };
    }
    
    if (phase === 'hold' && (holdType === 'global-inhale' || holdType === 'round-inhale')) {
      // Пульсирующее свечение создает динамический эффект для задержки на вдохе, используя цвета выдоха
      const turquoiseHigh = getRgbaFromVariable('--color-turquoise-primary-rgb', 0.9);
      const turquoiseMedium = getRgbaFromVariable('--color-turquoise-primary-rgb', 0.6);
      const lavenderHigh = getRgbaFromVariable('--color-lavender-primary-rgb', 0.8);
      const lavenderMedium = getRgbaFromVariable('--color-lavender-primary-rgb', 0.5);
      return {
        blur: '10px',
        boxShadow: [
          `0 0 40px ${turquoiseHigh}, 0 0 60px ${turquoiseMedium}`,
          `0 0 50px ${lavenderHigh}, 0 0 70px ${lavenderMedium}`,
          `0 0 40px ${turquoiseHigh}, 0 0 60px ${turquoiseMedium}`,
        ],
      };
    }

    // Динамическое свечение синхронизировано с дыханием для визуальной обратной связи
    const glowIntensity = phase === 'inhale'
      ? 0.4 + (progress * 0.3)
      : phase === 'exhale'
      ? 0.7 - (progress * 0.3)
      : 0.4;

    const blurAmount = phase === 'inhale'
      ? `${5 + progress * 10}px`
      : phase === 'exhale'
      ? `${15 - progress * 10}px`
      : '5px';

    const shadowSize = phase === 'inhale'
      ? 20 + (progress * 20)
      : phase === 'exhale'
      ? 40 - (progress * 20)
      : 20;

    // Используем динамическую интенсивность для создания плавного перехода свечения
    const dynamicBlueHigh = getRgbaFromVariable('--color-blue-primary-rgb', glowIntensity);
    const dynamicBlueLow = getRgbaFromVariable('--color-blue-primary-rgb', glowIntensity * 0.5);
    const boxShadow = `0 0 ${shadowSize}px ${dynamicBlueHigh}, 0 0 ${shadowSize * 1.5}px ${dynamicBlueLow}`;

    return {
      blur: blurAmount,
      boxShadow,
    };
  }, [phase, progress, holdType, mintColors]);

  const isIdle: boolean = !isRunning;
  const isHoldPhase: boolean = phase === 'hold' && holdType !== undefined;
  const isMintHold: boolean = isHoldPhase && holdType === 'round-exhale';
  const isBlueHold: boolean = isHoldPhase && (holdType === 'global-inhale' || holdType === 'round-inhale');
  const isPausePhase: boolean = phase === 'pause';
  
  // Вычисляем видимость счетчика циклов на основе прогресса фазы
  // Inhale: fade in завершается к 50% (когда круг расширился на 50%)
  // Exhale: fade out завершается к 50% (когда круг сжался на 50%)
  // НЕ показываем на hold/pause фазах и на inhale/exhale после соответствующих hold
  // Плавность обеспечивается через dynamicOpacity в CycleCounter
  const shouldShowCycleCounter = useMemo(() => {
    // Базовое условие: только на inhale/exhale, не на hold/pause
    if (phase === 'hold' || phase === 'pause' || isHoldPhase || isPausePhase || roundCycle === undefined) {
      return false;
    }
    
    // Не показываем счетчик на inhale после exhale hold (round-exhale)
    if (phase === 'inhale' && previousHoldType === 'round-exhale') {
      return false;
    }
    
    // Не показываем счетчик на exhale после inhale hold (round-inhale или global-inhale)
    if (phase === 'exhale' && (previousHoldType === 'round-inhale' || previousHoldType === 'global-inhale')) {
      return false;
    }
    
    if (phase === 'inhale') {
      // Монтируем с 0.2, чтобы fade in завершился к 0.5
      return progress >= 0.2;
    } else if (phase === 'exhale') {
      // Размонтируем при 0.5, когда fade out завершился
      return progress < 0.5;
    }
    
    return false;
  }, [phase, isHoldPhase, isPausePhase, progress, roundCycle, previousHoldType]);

  // Вычисляем видимость подсказки "Вдох" (слева от кольца)
  // Элемент не привязан к таймингам дыхания, появляется сразу при смене фазы
  const shouldShowInhaleLabel = useMemo(() => {
    // Показываем только на фазе inhale
    if (phase !== 'inhale' || !isRunning) {
      return false;
    }
    
    // Не показываем на inhale после exhale hold (round-exhale)
    if (previousHoldType === 'round-exhale') {
      return false;
    }
    
    return true;
  }, [phase, isRunning, previousHoldType]);

  // Вычисляем видимость подсказки "Выдох" (справа от кольца)
  // Элемент не привязан к таймингам дыхания, появляется сразу при смене фазы
  const shouldShowExhaleLabel = useMemo(() => {
    // Показываем только на фазе exhale
    if (phase !== 'exhale' || !isRunning) {
      return false;
    }
    
    // Не показываем на exhale после inhale hold (round-inhale или global-inhale)
    if (previousHoldType === 'round-inhale' || previousHoldType === 'global-inhale') {
      return false;
    }
    
    return true;
  }, [phase, isRunning, previousHoldType]);

  // Сбрасываем флаг при выходе из mint hold и после первого цикла анимации
  useEffect(() => {
    if (!isMintHold && previousIsMintHold.current) {
      // Выходим из mint hold - сбрасываем флаг для следующего входа
      isFirstMintHoldEntry.current = true;
    }
    previousIsMintHold.current = isMintHold;

    if (isMintHold && isFirstMintHoldEntry.current) {
      // Сбрасываем флаг после завершения перехода (0.8 секунды)
      const timer = setTimeout(() => {
        isFirstMintHoldEntry.current = false;
      }, 800);  // После завершения перехода (0.8 сек)
      return () => clearTimeout(timer);
    }
  }, [isMintHold]);

  // Получаем текстовое описание текущей фазы для accessibility
  const phaseDescription = useMemo(() => {
    if (phase === 'hold' && holdType) {
      if (holdType === 'round-exhale') {
        return 'Задержка дыхания после выдоха';
      } else if (holdType === 'global-inhale' || holdType === 'round-inhale') {
        return 'Задержка дыхания после вдоха';
      }
    }
    
    const metadata = PHASE_METADATA[phase];
    return metadata?.label ?? phase;
  }, [phase, holdType]);

  return (
    <div className={styles.container}>
      {/* Скрытый элемент для screen readers с объявлением текущей фазы */}
      <div 
        aria-live="polite" 
        aria-atomic="true"
        className={styles.visuallyHidden}
      >
        {isRunning && `Фаза дыхания: ${phaseDescription}`}
      </div>
      
      {/* Внешнее кольцо - фиксированное, служит границей максимального вдоха */}
      <div className={styles.outerRing}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          style={{ overflow: 'visible' }}
        >
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke={circleStyle.ringColor}
            strokeWidth="2"
            className={styles.ringCircle}
          />
        </svg>
      </div>

      {/* Слой размытия для свечения */}
      <motion.div
        className={styles.glowLayer}
        initial={false}
        animate={
          isIdle
            ? {
                scale: [idleMinScale, idleMaxScale, idleMinScale],
                filter: 'blur(8px)',
              }
            : isMintHold
            ? {
                // Синхронизируем glowLayer с основным кругом для mint hold
                scale: isFirstMintHoldEntry.current
                  ? minScale * 5  // Синхронизация с основным кругом
                  : [minScale * 5, minScale * 5 * 1.3, minScale * 5],
                filter: `blur(${glowEffect.blur})`,
              }
            : isBlueHold
            ? {
                // Синхронизируем glowLayer с основным кругом для задержки на вдохе
                scale: maxScale,
                filter: `blur(${glowEffect.blur})`,
              }
            : {
                scale: activeScaleTarget,
                filter: `blur(${glowEffect.blur})`,
              }
        }
        transition={
          isIdle
            ? {
                duration: 1,
                ease: 'easeInOut',
                repeat: Infinity,
              }
            : isMintHold
            ? {
                // Пульсация для glowLayer (синхронизация с основным кругом)
                duration: isFirstMintHoldEntry.current ? 0.8 : 1.5,
                ease: 'easeInOut',
                ...(isFirstMintHoldEntry.current ? {} : {
                  repeat: Infinity,
                  repeatType: 'loop',
                }),
              }
            : isBlueHold
            ? {
                // Пульсирующее свечение для задержки на вдохе (бирюзово-лавандовое)
                duration: 2,
                ease: 'easeInOut',
                repeat: Infinity,
                repeatType: 'loop',
              }
            : {
                duration: phaseDuration,
                ease: phase === 'inhale' || phase === 'exhale' ? 'easeInOut' : 'linear',
              }
        }
      />

      {/* Основной круг */}
      <motion.div
        className={`${styles.circle} ${isHoldPhase ? styles.holdCircle : ''}`}
        initial={
          isMintHold && isFirstMintHoldEntry.current
            ? { scale: minScale }  // Начало с 0.15 для плавного перехода
            : false
        }
        animate={
          isIdle
            ? {
                // Сердцебиение в idle состоянии показывает, что приложение активно и готово к работе
                scale: [idleMinScale, idleMaxScale, idleMinScale],
                background: circleStyle.background,
                boxShadow: `0 0 18px ${bluePrimaryColors.medium}, 0 0 28px ${bluePrimaryColors.veryLow}`,
              }
            : isMintHold
            ? {
                // Мятная задержка: плавный переход от выдоха к пульсирующему кругу (только первый раз)
                scale: isFirstMintHoldEntry.current
                  ? minScale * 5  // Статичное значение для перехода (0.15 → 0.75 через initial)
                  : [minScale * 5, minScale * 5 * 1.3, minScale * 5], // Пульсация
                background: mintHoldColor,
                boxShadow: glowEffect.boxShadow,
              }
            : isBlueHold
            ? {
                // Задержка на вдохе: заполненный круг с градиентом выдоха (бирюза → лаванда)
                scale: maxScale,
                background: circleStyle.background,
                boxShadow: glowEffect.boxShadow,
              }
            : isPausePhase
            ? {
                // Легкое сердцебиение визуально показывает, что упражнение на паузе, но не завершено
                scale: [minScale, minScale * 1.1, minScale],
                background: circleStyle.background,
                boxShadow: `0 0 18px ${bluePrimaryColors.medium}, 0 0 28px ${bluePrimaryColors.veryLow}`,
              }
            : {
                // Обычное дыхание: inhale/exhale с вращающимся градиентом
                scale: activeScaleTarget,
                background: circleStyle.background,
                boxShadow: glowEffect.boxShadow,
              }
        }
        transition={
          isIdle
            ? {
                duration: 1,
                ease: 'easeInOut',
                repeat: Infinity,
              }
            : isMintHold
            ? {
                // Отдельные transition для scale и boxShadow для плавной пульсации без клипания
                scale: {
                  duration: isFirstMintHoldEntry.current ? 0.8 : 1.5,  // 0.8 сек для плавного перехода
                  ease: 'easeInOut',
                  // НЕТ times для первого входа (простой переход)
                  // НЕТ repeat для первого входа (переход один раз)
                  ...(isFirstMintHoldEntry.current ? {} : {
                    repeat: Infinity,
                    repeatType: 'loop',
                  }),
                },
                background: {
                  duration: 0,
                  ease: 'linear',
                },
                boxShadow: {
                  duration: 0,
                  ease: 'linear',
                },
              }
            : isBlueHold
            ? {
                // Плавный переход к градиенту выдоха для задержки на вдохе
                // boxShadow анимируется отдельно через массив значений в glowEffect
                default: {
                  duration: 0.3,
                  ease: 'easeInOut',
                },
                background: {
                  duration: phaseDuration,
                  ease: 'linear',
                },
                boxShadow: {
                  duration: 2,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatType: 'loop',
                },
              }
            : isPausePhase
            ? {
                // Плавный переход фона и свечения (0.8 сек), затем пульсация scale
                default: {
                  duration: 0.8,
                  ease: 'easeOut',
                },
                scale: {
                  duration: 1,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatType: 'loop',
                },
                background: {
                  duration: 0.8,
                  ease: 'easeOut',
                },
                boxShadow: {
                  duration: 0.8,
                  ease: 'easeOut',
                },
              }
            : {
                // Обычное дыхание
                duration: phaseDuration,
                ease: phase === 'inhale' || phase === 'exhale' ? 'easeInOut' : 'linear',
              }
        }
      >
      </motion.div>

      {/* Надпись "Задержка" - только для финальной задержки без типа (старая логика без раундов) */}
      {phase === 'hold' && isFinalHold && !holdType && (
        <motion.div
          className={styles.phaseLabel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {PHASE_METADATA.hold.label}
        </motion.div>
      )}

      {/* Счетчик цикла - позиционирован относительно контейнера, а не масштабируемого круга */}
      <AnimatePresence>
        {shouldShowCycleCounter && (
          <CycleCounter 
            key={`cycle-${roundCycle ?? currentCycle ?? 1}`}
            cycle={roundCycle ?? currentCycle ?? 1} 
            phase={phase}
            progress={progress}
            animationDuration={phaseDuration / 2}
          />
        )}
      </AnimatePresence>

      {/* Иконка песочных часов - строго в центре */}
      <AnimatePresence>
        {isHoldPhase && (
          <HoldHourglass key="hold-hourglass" />
        )}
      </AnimatePresence>

      {/* Обратный отсчет - под иконкой */}
      <AnimatePresence>
        {isHoldPhase && (
          <HoldTimer key="hold-timer" timeRemaining={timeRemaining} />
        )}
      </AnimatePresence>

      {/* Подсказки "Вдох" и "Выдох" - синхронизированный переход */}
      <AnimatePresence>
        {shouldShowInhaleLabel && (
          <PhaseLabel
            key="inhale-label"
            text={PHASE_METADATA.inhale.label}
            position="left"
            phase={phase}
          />
        )}
        {shouldShowExhaleLabel && (
          <PhaseLabel
            key="exhale-label"
            text={PHASE_METADATA.exhale.label}
            position="right"
            phase={phase}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
