import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { AppLayout } from './components/Layout/AppLayout';
import { MainMenu } from './components/MainMenu/MainMenu';
import { BreathingExercise } from './components/BreathingExercise/BreathingExercise';
import type { BreathingPracticeConfig } from './types/breathing';

type AppScreen = 'menu' | 'exercise';

function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('menu');
  const [selectedPractice, setSelectedPractice] = useState<BreathingPracticeConfig | null>(null);

  const handleSelectPractice = (practice: BreathingPracticeConfig) => {
    setSelectedPractice(practice);
    setCurrentScreen('exercise');
  };

  const handleBackToMenu = () => {
    setCurrentScreen('menu');
    setSelectedPractice(null);
  };

  return (
    <ErrorBoundary>
      <AppLayout>
        <AnimatePresence mode="wait">
          {currentScreen === 'menu' ? (
            <MainMenu key="menu" onSelectPractice={handleSelectPractice} />
          ) : selectedPractice ? (
            <BreathingExercise
              key="exercise"
              practice={selectedPractice}
              onBack={handleBackToMenu}
            />
          ) : null}
        </AnimatePresence>
      </AppLayout>
    </ErrorBoundary>
  );
}

export default App;
