import { useState } from 'react';
import { motion } from 'framer-motion';
import { getAllBreathingPractices } from '../../config/breathingPractices';
import type { BreathingPracticeConfig } from '../../types/breathing';
import styles from './MainMenu.module.css';

interface MainMenuProps {
  onSelectPractice: (practice: BreathingPracticeConfig) => void;
}

export const MainMenu = ({ onSelectPractice }: MainMenuProps) => {
  const practices = getAllBreathingPractices();
  const [isFlipped, setIsFlipped] = useState(false);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  };

  const practice = practices[0] ?? null;

  const handleCardClick = (e: React.MouseEvent) => {
    // Предотвращаем переворот при клике на кнопку "Подышать"
    const target = e.target as HTMLElement;
    if (target.closest(`.${styles.breatheButton}`)) {
      return;
    }
    setIsFlipped((prev) => !prev);
  };

  const handleBreatheClick = () => {
    onSelectPractice(practice);
  };

  return (
    <motion.div
      className={styles.menu}
      initial="hidden"
      animate="visible"
    >
      <motion.h1 className={styles.title} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        Breathable
      </motion.h1>
      <motion.p className={styles.subtitle} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }}>
        Базовая дыхательная практика
      </motion.p>
      <div className={styles.practices}>
        {practice !== null && (
          <motion.div
            key={practice.id}
            className={styles.flipContainer}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              className={styles.flipCard}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.7, ease: 'easeInOut' }}
              onClick={handleCardClick}
            >
              {/* Лицевая сторона */}
              <div className={styles.cardFront}>
                <div className={styles.imageWrapper}>
                  <img 
                    src="/assets/iceman-card/iceman.webp" 
                    srcSet="/assets/iceman-card/iceman.webp 1x, /assets/iceman-card/iceman.webp 2x"
                    sizes="(max-width: 360px) 100vw, (max-width: 600px) 90vw, 500px"
                    alt={`${practice.name} breathing practice`}
                    className={styles.practiceImage}
                  />
                </div>
                <h2 className={styles.practiceName}>{practice.name}</h2>
                <p className={styles.practiceDescription}>{practice.description}</p>
                {practice.benefits && practice.benefits.length > 0 && (
                  <ul className={styles.benefitsList}>
                    {practice.benefits.map((benefit, index) => (
                      <li key={index} className={styles.benefitItem}>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                )}
                <div className={styles.practiceInfo}>
                  <span>{practice.cycles} циклов</span>
                </div>
              </div>

              {/* Обратная сторона */}
              <div 
                className={styles.cardBack}
                style={{
                  backgroundImage: "image-set(url('/assets/iceman-card/wim.webp') 1x, url('/assets/iceman-card/wim.webp') 2x)",
                }}
              >
                {/* Градиентный оверлей через ::before */}
                
                <div className={styles.warningHeaderBlock}>
                  <div className={styles.warningHeader}>
                    <svg 
                      className={styles.warningIcon}
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 512 512"
                      aria-hidden="true"
                    >
                      <path d="M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480H40c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24V296c0 13.3 10.7 24 24 24s24-10.7 24-24V184c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"/>
                    </svg>
                    <h3 className={styles.warningTitle}>Важная информация</h3>
                  </div>
                </div>
                
                <div className={styles.symptomsBlock}>
                  <p className={styles.warningText}>
                    Во время практики вы можете испытывать:
                  </p>
                  <ul className={styles.warningList}>
                    <li>Покалывание в конечностях</li>
                    <li>Головокружение</li>
                    <li>Изменение температуры тела</li>
                  </ul>
                </div>
                
                <div className={styles.drivingWarning}>
                  <svg 
                    className={styles.drivingWarningIcon}
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 512 512"
                    aria-hidden="true"
                  >
                    <path d="M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480H40c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24V296c0 13.3 10.7 24 24 24s24-10.7 24-24V184c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"/>
                  </svg>
                  <p className={styles.drivingWarningText}>
                    Не занимайтесь этой практикой во время вождения автомобиля или управления механизмами.
                  </p>
                </div>
                
                <div className={styles.discomfortBlock}>
                  <p className={styles.warningText}>
                    Если вы чувствуете сильный дискомфорт, прекратите упражнение и вернитесь к нормальному дыханию.
                  </p>
                </div>
                
                <motion.button
                  type="button"
                  className={styles.breatheButton}
                  onClick={handleBreatheClick}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Начать практику"
                >
                  Подышать
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
