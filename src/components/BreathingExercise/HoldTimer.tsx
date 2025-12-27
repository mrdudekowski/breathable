import { motion } from 'framer-motion';
import styles from './HoldTimer.module.css';

interface HoldTimerProps {
  timeRemaining: number;
}

export const HoldTimer = ({ timeRemaining }: HoldTimerProps) => {
  return (
    <motion.div
      className={styles.timer}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5 }}
    >
      <div className={styles.time}>{timeRemaining}</div>
    </motion.div>
  );
};
