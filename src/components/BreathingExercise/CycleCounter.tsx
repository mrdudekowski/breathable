import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { BreathingPhase } from '../../types/breathing';
import styles from './CycleCounter.module.css';

interface CycleCounterProps {
  cycle: number;
  phase: BreathingPhase;
  progress: number;
  animationDuration: number; // Половина длительности фазы для fade анимации
}

export const CycleCounter = ({ 
  cycle, 
  phase, 
  progress,
  animationDuration 
}: CycleCounterProps) => {
  // Вычисляем динамический opacity на основе прогресса фазы
  // Синхронизируется с анимацией круга дыхания (обновляется каждую секунду)
  const dynamicOpacity = useMemo(() => {
    if (phase === 'inhale') {
      // Fade in завершается к 50% (когда круг расширился на 50%)
      // Начинаем fade in с 0.2, чтобы к 0.5 был opacity = 1
      if (progress < 0.2) {
        return 0;
      }
      if (progress >= 0.5) {
        return 1;
      }
      // Fade in от 0.2 до 0.5
      const fadeProgress = (progress - 0.2) / 0.3;
      return fadeProgress;
    } else if (phase === 'exhale') {
      // Fade out завершается к 50% (когда круг сжался на 50%)
      // Начинаем fade out с 0.0, завершаем к 0.5
      if (progress >= 0.5) {
        return 0;
      }
      // Fade out от 0.0 до 0.5
      const fadeProgress = progress / 0.5;
      return 1 - fadeProgress;
    }
    return 1;
  }, [phase, progress]);

  return (
    <motion.div
      className={styles.counter}
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: dynamicOpacity
      }}
      exit={{ opacity: 0 }}
      transition={{ 
        opacity: {
          duration: 0.3,
          ease: 'easeInOut'
        }
      }}
    >
      {cycle}
    </motion.div>
  );
};
