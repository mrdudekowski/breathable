import { describe, it, expect } from '@jest/globals';
import { getPhaseDuration, getPhaseDurationWithSpeed } from '../breathingHelpers';
import type { BreathingPracticeConfig, BreathingRoundConfig } from '../../types/breathing';

describe('breathingHelpers', () => {
  const mockPractice: BreathingPracticeConfig = {
    id: 'test-practice',
    name: 'Test Practice',
    description: 'Test practice for unit tests',
    cycles: 30,
    inhaleDuration: 2,
    exhaleDuration: 2,
    holdDuration: 1,
    finalHoldDuration: 30,
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
      {
        id: 'space-man',
        name: 'Space Man',
        inhaleDuration: 4,
        exhaleDuration: 4,
      },
    ],
  };

  describe('getPhaseDuration', () => {
    it('должен возвращать правильную длительность для inhale', () => {
      expect(getPhaseDuration('inhale', mockPractice, false)).toBe(2);
    });

    it('должен возвращать правильную длительность для exhale', () => {
      expect(getPhaseDuration('exhale', mockPractice, false)).toBe(2);
    });

    it('должен возвращать правильную длительность для hold (не финальная)', () => {
      expect(getPhaseDuration('hold', mockPractice, false)).toBe(1);
    });

    it('должен возвращать правильную длительность для hold (финальная)', () => {
      expect(getPhaseDuration('hold', mockPractice, true)).toBe(30);
    });

    it('должен возвращать правильную длительность для pause', () => {
      expect(getPhaseDuration('pause', mockPractice, false)).toBe(4);
    });

    // Тест для неизвестной фазы удалён, так как TypeScript не позволяет передать неверный тип
  });

  describe('getPhaseDurationWithSpeed', () => {
    const mockRound: BreathingRoundConfig = {
      id: 'round1',
      index: 1,
      cycles: 30,
      finalHoldPhase: 'exhale',
      finalHoldDuration: 30,
      breathSpeedId: 'ice-man',
    };

    it('должен использовать скорость из раунда для inhale', () => {
      const duration = getPhaseDurationWithSpeed('inhale', mockPractice, mockRound);
      expect(duration).toBe(2); // Ice Man inhale duration
    });

    it('должен использовать скорость из раунда для exhale', () => {
      const duration = getPhaseDurationWithSpeed('exhale', mockPractice, mockRound);
      expect(duration).toBe(2); // Ice Man exhale duration
    });

    it('должен использовать defaultSpeedId, если breathSpeedId не указан в раунде', () => {
      const roundWithoutSpeed: BreathingRoundConfig = {
        ...mockRound,
        breathSpeedId: undefined as unknown as 'ice-man' | 'space-man',
      };
      const duration = getPhaseDurationWithSpeed('inhale', mockPractice, roundWithoutSpeed);
      expect(duration).toBe(2); // defaultSpeedId = 'ice-man'
    });

    it('должен использовать базовую длительность, если скорость не найдена', () => {
      const roundWithInvalidSpeed: BreathingRoundConfig = {
        ...mockRound,
        breathSpeedId: 'invalid-speed' as 'ice-man' | 'space-man',
      };
      const duration = getPhaseDurationWithSpeed('inhale', mockPractice, roundWithInvalidSpeed);
      expect(duration).toBe(2); // Базовая длительность из practice
    });

    it('должен использовать базовую логику для hold фазы', () => {
      const duration = getPhaseDurationWithSpeed('hold', mockPractice, mockRound, true);
      expect(duration).toBe(30); // finalHoldDuration
    });

    it('должен использовать базовую логику для pause фазы', () => {
      const duration = getPhaseDurationWithSpeed('pause', mockPractice, mockRound);
      expect(duration).toBe(4); // pauseDuration
    });

    it('должен использовать базовую логику, если раунд не передан', () => {
      const duration = getPhaseDurationWithSpeed('inhale', mockPractice);
      expect(duration).toBe(2); // Базовая длительность
    });

    it('должен использовать базовую логику, если availableSpeeds не определены', () => {
      const practiceWithoutSpeeds: BreathingPracticeConfig = {
        ...mockPractice,
        availableSpeeds: undefined,
      };
      const duration = getPhaseDurationWithSpeed('inhale', practiceWithoutSpeeds, mockRound);
      expect(duration).toBe(2); // Базовая длительность
    });

    it('должен использовать Space Man скорость, если она указана в раунде', () => {
      const roundWithSpaceMan: BreathingRoundConfig = {
        ...mockRound,
        breathSpeedId: 'space-man',
      };
      const duration = getPhaseDurationWithSpeed('inhale', mockPractice, roundWithSpaceMan);
      expect(duration).toBe(4); // Space Man inhale duration
    });
  });
});
