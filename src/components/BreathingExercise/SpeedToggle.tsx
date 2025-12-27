import { motion } from 'framer-motion';
import type { BreathSpeedId } from '../../types/breathing';
import styles from './SpeedToggle.module.css';

interface SpeedToggleProps {
  selectedSpeedId: BreathSpeedId;
  onSpeedChange: (speedId: BreathSpeedId) => void;
  disabled?: boolean;
}

export const SpeedToggle = ({ selectedSpeedId, onSpeedChange, disabled }: SpeedToggleProps) => {
  const isIceManActive = selectedSpeedId === 'ice-man';
  const isSpaceManActive = selectedSpeedId === 'space-man';

  const handleIceManClick = () => {
    if (disabled !== true && !isIceManActive) {
      onSpeedChange('ice-man');
    }
  };

  const handleSpaceManClick = () => {
    if (disabled !== true && !isSpaceManActive) {
      onSpeedChange('space-man');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, speedId: BreathSpeedId) => {
    if (disabled === true) return;
    
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (selectedSpeedId !== speedId) {
        onSpeedChange(speedId);
      }
    }
  };

  return (
    <div className={styles.toggleContainer} role="radiogroup" aria-label="Выбор скорости дыхания">
      <div className={styles.toggleWrapper}>
        <motion.button
          type="button"
          className={`${styles.option} ${styles.iceMan} ${isIceManActive ? styles.iceManActive : ''} ${isIceManActive ? styles.animated : ''}`}
          onClick={handleIceManClick}
          onKeyDown={(e) => handleKeyDown(e, 'ice-man')}
          disabled={disabled}
          aria-label="Ice Man - быстрый режим дыхания"
          aria-checked={isIceManActive}
          role="radio"
          whileHover={disabled !== true ? { scale: 1.05 } : {}}
          whileTap={disabled !== true ? { scale: 0.95 } : {}}
          transition={{ duration: 0.2 }}
        >
          Ice Man
        </motion.button>
        
        <motion.button
          type="button"
          className={`${styles.option} ${styles.spaceMan} ${isSpaceManActive ? styles.spaceManActive : ''} ${isSpaceManActive ? styles.animated : ''}`}
          onClick={handleSpaceManClick}
          onKeyDown={(e) => handleKeyDown(e, 'space-man')}
          disabled={disabled}
          aria-label="Space Man - медленный режим дыхания"
          aria-checked={isSpaceManActive}
          role="radio"
          whileHover={disabled !== true ? { scale: 1.05 } : {}}
          whileTap={disabled !== true ? { scale: 0.95 } : {}}
          transition={{ duration: 0.2 }}
        >
          Space Man
        </motion.button>
      </div>
    </div>
  );
};





