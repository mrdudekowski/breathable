import { motion } from 'framer-motion';
import styles from './PauseTimer.module.css';

interface PauseTimerProps {
  timeRemaining: number;
}

export const PauseTimer = ({ timeRemaining }: PauseTimerProps) => {
  return (
    <motion.div
      className={styles.timer}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.time}>{timeRemaining}</div>
    </motion.div>
  );
};
