import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useBreathingExercise } from '../useBreathingExercise';
import type { BreathingPracticeConfig } from '../../types/breathing';

// Mock для таймеров
jest.useFakeTimers();

describe('useBreathingExercise', () => {
  const mockPractice: BreathingPracticeConfig = {
    id: 'test-practice',
    name: 'Test Practice',
    description: 'Test practice for unit tests',
    cycles: 3,
    inhaleDuration: 2,
    exhaleDuration: 2,
    holdDuration: 1,
    finalHoldDuration: 5,
    globalInhaleHoldDuration: 15,
    pauseDuration: 4,
    defaultSpeedId: 'ice-man',
    availableSpeeds: [
      {
        id: 'ice-man',
        name: 'Ice Man',
        inhaleDuration: 2,
        exhaleDuration: 2,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllTimers();
  });

  it('должен инициализироваться с правильным начальным состоянием', () => {
    const { result } = renderHook(() => useBreathingExercise({ practice: mockPractice }));

    expect(result.current.state.currentPhase).toBe('inhale');
    expect(result.current.state.currentCycle).toBe(1);
    expect(result.current.state.isRunning).toBe(false);
    expect(result.current.state.isPaused).toBe(false);
  });

  it('должен запускать упражнение при вызове startExercise', () => {
    const { result } = renderHook(() => useBreathingExercise({ practice: mockPractice }));

    act(() => {
      result.current.startExercise();
    });

    expect(result.current.state.isRunning).toBe(true);
    expect(result.current.state.isPaused).toBe(false);
    expect(result.current.state.currentPhase).toBe('inhale');
  });

  it('должен ставить упражнение на паузу', () => {
    const { result } = renderHook(() => useBreathingExercise({ practice: mockPractice }));

    act(() => {
      result.current.startExercise();
      result.current.pauseExercise();
    });

    expect(result.current.state.isRunning).toBe(true);
    expect(result.current.state.isPaused).toBe(true);
  });

  it('должен возобновлять упражнение после паузы', () => {
    const { result } = renderHook(() => useBreathingExercise({ practice: mockPractice }));

    act(() => {
      result.current.startExercise();
      result.current.pauseExercise();
      result.current.resumeExercise();
    });

    expect(result.current.state.isRunning).toBe(true);
    expect(result.current.state.isPaused).toBe(false);
  });

  it('должен останавливать упражнение', () => {
    const { result } = renderHook(() => useBreathingExercise({ practice: mockPractice }));

    act(() => {
      result.current.startExercise();
      result.current.stopExercise();
    });

    expect(result.current.state.isRunning).toBe(false);
    expect(result.current.state.isPaused).toBe(false);
  });

  it('должен сбрасывать упражнение в начальное состояние', () => {
    const { result } = renderHook(() => useBreathingExercise({ practice: mockPractice }));

    act(() => {
      result.current.startExercise();
      // Продвигаем время на несколько секунд
      jest.advanceTimersByTime(5000);
      result.current.resetExercise();
    });

    expect(result.current.state.currentCycle).toBe(1);
    expect(result.current.state.currentPhase).toBe('inhale');
    expect(result.current.state.isRunning).toBe(false);
    expect(result.current.state.isPaused).toBe(false);
  });

  it('должен вызывать callback onStart при запуске', () => {
    const onStart = jest.fn();
    const { result } = renderHook(() =>
      useBreathingExercise({
        practice: mockPractice,
        callbacks: { onStart },
      })
    );

    act(() => {
      result.current.startExercise();
    });

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('должен вызывать callback onPause при паузе', () => {
    const onPause = jest.fn();
    const { result } = renderHook(() =>
      useBreathingExercise({
        practice: mockPractice,
        callbacks: { onPause },
      })
    );

    act(() => {
      result.current.startExercise();
      result.current.pauseExercise();
    });

    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('должен вызывать callback onResume при возобновлении', () => {
    const onResume = jest.fn();
    const { result } = renderHook(() =>
      useBreathingExercise({
        practice: mockPractice,
        callbacks: { onResume },
      })
    );

    act(() => {
      result.current.startExercise();
      result.current.pauseExercise();
      result.current.resumeExercise();
    });

    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('должен вызывать callback onStop при остановке', () => {
    const onStop = jest.fn();
    const { result } = renderHook(() =>
      useBreathingExercise({
        practice: mockPractice,
        callbacks: { onStop },
      })
    );

    act(() => {
      result.current.startExercise();
      result.current.stopExercise();
    });

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  describe('Критичные сценарии из breathing-exercise-issues.md', () => {
    it('должен сохранять previousHoldType при переходе от зелёной задержки к вдоху', () => {
      const practiceWithRounds: BreathingPracticeConfig = {
        ...mockPractice,
        rounds: [{
          id: 'round1',
          index: 1,
          cycles: 1,
          finalHoldPhase: 'exhale',
          finalHoldDuration: 2,
          breathSpeedId: 'ice-man',
        }],
      };
      
      const { result } = renderHook(() => 
        useBreathingExercise({ practice: practiceWithRounds })
      );
      
      act(() => {
        result.current.startExercise();
      });
      
      // Продвигаем до завершения выдоха (последний цикл)
      act(() => {
        jest.advanceTimersByTime(2000); // inhale
        jest.advanceTimersByTime(2000); // exhale
      });
      
      // Проверяем, что началась зелёная задержка
      expect(result.current.state.currentPhase).toBe('hold');
      expect(result.current.state.currentHoldType).toBe('round-exhale');
      
      // Продвигаем до завершения зелёной задержки
      act(() => {
        jest.advanceTimersByTime(2000); // зелёная задержка
      });
      
      // Проверяем, что previousHoldType сохранен
      expect(result.current.state.currentPhase).toBe('inhale');
      expect(result.current.state.previousHoldType).toBe('round-exhale');
    });

    it('должен переходить к синей задержке только после зелёной задержки', () => {
      const practiceWithRounds: BreathingPracticeConfig = {
        ...mockPractice,
        rounds: [
          {
            id: 'round1',
            index: 1,
            cycles: 1,
            finalHoldPhase: 'exhale',
            finalHoldDuration: 2,
            breathSpeedId: 'ice-man',
          },
          {
            id: 'round2',
            index: 2,
            cycles: 1,
            finalHoldPhase: 'exhale',
            finalHoldDuration: 2,
            breathSpeedId: 'ice-man',
          },
        ],
        globalInhaleHoldDuration: 15,
      };
      
      const { result } = renderHook(() => 
        useBreathingExercise({ practice: practiceWithRounds })
      );
      
      act(() => {
        result.current.startExercise();
      });
      
      // Продвигаем до завершения выдоха
      act(() => {
        jest.advanceTimersByTime(2000); // inhale
        jest.advanceTimersByTime(2000); // exhale
      });
      
      // Продвигаем до завершения зелёной задержки
      act(() => {
        jest.advanceTimersByTime(2000); // зелёная задержка
      });
      
      // Проверяем, что previousHoldType установлен
      expect(result.current.state.previousHoldType).toBe('round-exhale');
      
      // Продвигаем до завершения вдоха после зелёной задержки
      act(() => {
        jest.advanceTimersByTime(4000); // вдох (Ice Man: 2 * 2 = 4 сек)
      });
      
      // Проверяем, что началась синяя задержка (round-inhale для первого раунда, так как есть второй)
      expect(result.current.state.currentPhase).toBe('hold');
      expect(result.current.state.currentHoldType).toBe('round-inhale');
    });

    it('не должен переходить к синей задержке для обычного вдоха на последнем цикле', () => {
      const practiceWithRounds: BreathingPracticeConfig = {
        ...mockPractice,
        rounds: [{
          id: 'round1',
          index: 1,
          cycles: 2,
          finalHoldPhase: 'exhale',
          finalHoldDuration: 2,
          breathSpeedId: 'ice-man',
        }],
        globalInhaleHoldDuration: 15,
      };
      
      const { result } = renderHook(() => 
        useBreathingExercise({ practice: practiceWithRounds })
      );
      
      act(() => {
        result.current.startExercise();
      });
      
      // Продвигаем до второго цикла (последний цикл)
      act(() => {
        jest.advanceTimersByTime(2000); // inhale цикл 1
        jest.advanceTimersByTime(2000); // exhale цикл 1
        jest.advanceTimersByTime(2000); // inhale цикл 2 (последний)
      });
      
      // Проверяем, что НЕ началась синяя задержка (previousHoldType не установлен)
      expect(result.current.state.currentPhase).toBe('exhale');
      expect(result.current.state.previousHoldType).toBeUndefined();
    });
  });
});
