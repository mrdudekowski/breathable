import { motion } from 'framer-motion';
import styles from './RoundNotification.module.css';

interface RoundNotificationProps {
  roundIndex: number;
  totalRounds: number;
}

export const RoundNotification = ({ roundIndex, totalRounds }: RoundNotificationProps) => {
  return (
    <motion.div
      className={styles.notification}
      initial={{ opacity: 0, y: -10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.9 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      Раунд {roundIndex} / {totalRounds}
    </motion.div>
  );
};
