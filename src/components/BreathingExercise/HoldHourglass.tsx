import { motion } from 'framer-motion';
import { HourglassIcon } from './HourglassIcon';
import styles from './HoldHourglass.module.css';

export const HoldHourglass = () => {
  return (
    <motion.div
      className={styles.hourglass}
      initial={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
      animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
      exit={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
      transition={{ duration: 0.5 }}
      style={{ transformOrigin: 'center center' }}
    >
      <div className={styles.iconWrapper}>
        <HourglassIcon size={32} className={styles.icon} />
      </div>
    </motion.div>
  );
};
