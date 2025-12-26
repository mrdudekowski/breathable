/**
 * Утилиты для работы с viewport и определения типа устройства
 * Используются для адаптивного масштабирования UI
 */

/**
 * Базовая высота для мобильных устройств (Telegram Mini App)
 * Используется как референс для масштабирования на мобильных экранах
 */
export const BASE_MOBILE_HEIGHT = 650; // px

/**
 * Базовая высота для десктоп версии
 * Используется как референс для масштабирования на больших экранах
 */
export const BASE_DESKTOP_HEIGHT = 900; // px

/**
 * Минимальная ширина для определения десктоп устройства
 */
export const DESKTOP_MIN_WIDTH = 768; // px

/**
 * Определяет, является ли устройство десктопом
 * @param viewportWidth - Ширина viewport в пикселях
 * @returns true если десктоп (ширина >= 768px)
 */
export const isDesktop = (viewportWidth: number): boolean => {
  return viewportWidth >= DESKTOP_MIN_WIDTH;
};

/**
 * Вычисляет scale factor для мобильных устройств
 * Масштабирует UI относительно базовой высоты для корректного отображения на разных экранах
 * 
 * @param viewportHeight - Высота viewport в пикселях
 * @returns Scale factor в диапазоне [0.7, 1.2]
 */
export const calculateMobileScaleFactor = (viewportHeight: number): number => {
  // Масштабируем относительно базовой высоты
  // Для экранов меньше базового - уменьшаем, для больших - увеличиваем
  const scale = viewportHeight / BASE_MOBILE_HEIGHT;
  // Ограничиваем диапазон масштабирования для предотвращения слишком маленьких/больших элементов
  return Math.max(0.7, Math.min(1.2, scale));
};

/**
 * Вычисляет scale factor для десктоп версии
 * На десктопе масштабируем более агрессивно, чтобы поместить контент в viewport
 * 
 * @param viewportHeight - Высота viewport в пикселях
 * @param viewportWidth - Ширина viewport в пикселях
 * @returns Scale factor в диапазоне [0.6, 1.0]
 */
export const calculateDesktopScaleFactor = (
  viewportHeight: number,
  viewportWidth: number
): number => {
  // Используем меньшую из высоты или ширины для расчета
  // Это гарантирует, что контент поместится в оба измерения
  const baseDimension = Math.min(viewportHeight, viewportWidth);
  
  // Рассчитываем scale относительно базовой высоты десктоп
  const scale = baseDimension / BASE_DESKTOP_HEIGHT;
  
  // Для десктоп ограничиваем диапазон масштабирования [0.6, 1.0]
  // 0.6 - минимальный масштаб (для очень больших экранов)
  // 1.0 - максимальный масштаб (для стандартных десктоп)
  return Math.max(0.6, Math.min(1.0, scale));
};

/**
 * Вычисляет дополнительный масштаб для десктоп на основе соотношения контента к viewport
 * Используется для финальной корректировки, чтобы гарантировать отсутствие скролла
 * 
 * @param viewportHeight - Высота viewport в пикселях
 * @param estimatedContentHeight - Примерная высота контента в пикселях
 * @returns Дополнительный scale factor в диапазоне [0.7, 1.0]
 */
export const calculateDesktopAdditionalScale = (
  viewportHeight: number,
  estimatedContentHeight: number
): number => {
  // Рассчитываем соотношение высоты контента к viewport
  const viewportRatio = viewportHeight / estimatedContentHeight;
  // Применяем 95% для небольшого запаса от краев
  const additionalScale = Math.min(1.0, viewportRatio * 0.95);
  // Ограничиваем минимальным значением для читаемости
  return Math.max(0.7, additionalScale);
};

