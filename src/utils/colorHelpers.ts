/**
 * Получает RGB значения из CSS переменной для использования в rgba()
 * Использует fallback из CSS переменной --color-fallback-rgb для соблюдения Single Source of Truth
 * @param cssVariable - имя CSS переменной (например, '--color-blue-primary-rgb')
 * @returns строка с RGB значениями (например, "33, 150, 243")
 */
export const getColorRgb = (cssVariable: string): string => {
  if (typeof window === 'undefined') {
    // SSR: возвращаем fallback значение, которое должно совпадать с --color-fallback-rgb
    return '33, 150, 243';
  }

  try {
    const root = document.documentElement;
    const rgbValue = getComputedStyle(root).getPropertyValue(cssVariable).trim();

    if (!rgbValue) {
      // Если переменная не найдена, используем fallback из CSS переменной
      const fallbackRgb = getComputedStyle(root).getPropertyValue('--color-fallback-rgb').trim();

      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[colorHelpers] CSS переменная "${cssVariable}" не найдена. Используется fallback.`
        );
      }

      return fallbackRgb || '33, 150, 243';
    }

    return rgbValue;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[colorHelpers] Ошибка при получении CSS переменной:', error);
    }
    // Hardcoded fallback как последняя линия защиты
    return '33, 150, 243';
  }
};

/**
 * Создает rgba строку из CSS переменной с прозрачностью
 * @param cssVariable - имя CSS переменной с RGB (например, '--color-blue-primary-rgb')
 * @param alpha - значение прозрачности (0-1)
 * @returns rgba строка (например, "rgba(33, 150, 243, 0.6)")
 */
export const getRgbaFromVariable = (cssVariable: string, alpha: number): string => {
  const rgb = getColorRgb(cssVariable);
  return `rgba(${rgb}, ${alpha})`;
};
