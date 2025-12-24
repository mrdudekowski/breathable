import { motion } from 'framer-motion';
import type { BreathingPhase } from '../../types/breathing';
import styles from './PhaseLabel.module.css';

interface PhaseLabelProps {
  text: string;
  position: 'left' | 'right' | 'bottom';
  phase: BreathingPhase;
}

export const PhaseLabel = ({
  text,
  position,
  phase,
}: PhaseLabelProps) => {
  const positionClass = styles[position];

  return (
    <motion.div
      className={`${styles.label} ${positionClass}`}
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: 1,
        transition: {
          opacity: {
            delay: 0.1,
            duration: 0.75,
            ease: 'easeInOut',
          },
        },
      }}
      exit={{ 
        opacity: 0,
        transition: {
          opacity: {
            delay: 0.1,
            duration: 0.75,
            ease: 'easeInOut',
          },
        },
      }}
    >
      {text}
    </motion.div>
  );
};

