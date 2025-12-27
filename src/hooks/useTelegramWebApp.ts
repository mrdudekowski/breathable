import { useEffect } from 'react';
import {
  isDesktop,
  calculateMobileScaleFactor,
  calculateDesktopScaleFactor,
  calculateDesktopAdditionalScale,
} from '../utils/viewportHelpers';

/**
 * Интерфейс для Telegram WebApp API.
 * Определяет минимальный набор методов и свойств, используемых в приложении.
 */
interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  viewportHeight?: number;
  viewportStableHeight?: number;
  themeParams?: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
  };
  onEvent?: (eventType: string, eventHandler: (payload?: unknown) => void) => void;
  offEvent?: (eventType: string, eventHandler: (payload?: unknown) => void) => void;
}

interface SafeAreaInsets {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

/**
 * Type guard для проверки, является ли значение экземпляром TelegramWebApp.
 *
 * @param value - Значение для проверки
 * @returns true, если value является TelegramWebApp
 */
function isTelegramWebApp(value: unknown): value is TelegramWebApp {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ready' in value &&
    typeof (value as { ready: unknown }).ready === 'function' &&
    'expand' in value &&
    typeof (value as { expand: unknown }).expand === 'function'
  );
}

/**
 * Примерная высота контента для расчета дополнительного масштаба на десктоп
 * Включает: заголовок + карточка + отступы
 */
const ESTIMATED_CONTENT_HEIGHT = 1000; // px

const isSafeAreaInsets = (value: unknown): value is SafeAreaInsets => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const keys = ['top', 'bottom', 'left', 'right'];
  return keys.some(key => typeof candidate[key] === 'number');
};

/**
 * Хук инициализирует Telegram WebApp и настраивает тему.
 * Отвечает только за побочные эффекты (ready/expand, цвета), данные не возвращает.
 */
export const useTelegramWebApp = () => {
  useEffect(() => {
    let WebApp: TelegramWebApp | null = null;
    let updateViewport: (() => void) | null = null;
    let removeViewportChanged: (() => void) | null = null;
    let removeThemeChanged: (() => void) | null = null;
    let removeContentSafeAreaChanged: (() => void) | null = null;
    let bindViewportCssVars: ((formatter?: (key: string) => string) => unknown) | null = null;
    let requestViewportData: (() => Promise<unknown>) | null = null;
    let getSafeAreaInsets: (() => SafeAreaInsets | undefined) | null = null;
    let resizeHandler: (() => void) | null = null;

    const applyFallbackViewport = () => {
      if (typeof window === 'undefined') return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const isDesktopView = isDesktop(viewportWidth);

      document.documentElement.style.setProperty(
        '--tg-viewport-stable-height',
        `${viewportHeight}px`
      );

      // Рассчитываем scale factor в зависимости от типа устройства
      let scaleFactor: number;
      if (isDesktopView) {
        scaleFactor = calculateDesktopScaleFactor(viewportHeight, viewportWidth);
        document.documentElement.setAttribute('data-device', 'desktop');

        // Дополнительный масштаб для десктоп
        const additionalScale = calculateDesktopAdditionalScale(
          viewportHeight,
          ESTIMATED_CONTENT_HEIGHT
        );
        document.documentElement.style.setProperty(
          '--tg-desktop-scale',
          additionalScale.toString()
        );
      } else {
        scaleFactor = calculateMobileScaleFactor(viewportHeight);
        document.documentElement.setAttribute('data-device', 'mobile');
        document.documentElement.style.setProperty('--tg-desktop-scale', '1');
      }

      document.documentElement.style.setProperty('--tg-scale-factor', scaleFactor.toString());
    };

    const initTelegramWebApp = async () => {
      try {
        // Проверяем, доступен ли WebApp через window.Telegram
        if (typeof window !== 'undefined') {
          const windowWithTelegram = window as {
            Telegram?: {
              WebApp?: unknown;
            };
          };

          if (windowWithTelegram.Telegram?.WebApp != null) {
            const webAppCandidate = windowWithTelegram.Telegram.WebApp;
            if (isTelegramWebApp(webAppCandidate)) {
              WebApp = webAppCandidate;
            }
          }
        }

        // Если WebApp не найден через window, пытаемся загрузить SDK
        if (!WebApp) {
          try {
            const sdk = await import('@twa-dev/sdk');
            const sdkDefault = sdk.default;
            if (isTelegramWebApp(sdkDefault)) {
              WebApp = sdkDefault;
            }
            // Проверяем наличие методов SDK (могут отсутствовать в некоторых версиях)
            if ('bindViewportCssVars' in sdk && typeof sdk.bindViewportCssVars === 'function') {
              bindViewportCssVars = sdk.bindViewportCssVars as (
                formatter?: (key: string) => string
              ) => unknown;
            }
            if ('requestViewport' in sdk && typeof sdk.requestViewport === 'function') {
              requestViewportData = sdk.requestViewport as () => Promise<unknown>;
            }
            if ('safeAreaInsets' in sdk && typeof sdk.safeAreaInsets === 'function') {
              getSafeAreaInsets = sdk.safeAreaInsets as () => SafeAreaInsets | undefined;
            }
          } catch (sdkError) {
            console.warn('Telegram WebApp SDK not available, running in standalone mode');
            applyFallbackViewport();
            return;
          }
        }

        if (WebApp) {
          WebApp.ready();
          WebApp.expand();

          const themeParams = WebApp.themeParams;
          const applyTheme = (params?: TelegramWebApp['themeParams']) => {
            if (params?.bg_color != null && params.bg_color !== '') {
              document.documentElement.style.setProperty('--tg-theme-bg-color', params.bg_color);
            }
            if (params?.text_color != null && params.text_color !== '') {
              document.documentElement.style.setProperty(
                '--tg-theme-text-color',
                params.text_color
              );
            }
            if (params?.hint_color != null && params.hint_color !== '') {
              document.documentElement.style.setProperty(
                '--tg-theme-hint-color',
                params.hint_color
              );
            }
            if (params?.link_color != null && params.link_color !== '') {
              document.documentElement.style.setProperty(
                '--tg-theme-link-color',
                params.link_color
              );
            }
            if (params?.button_color != null && params.button_color !== '') {
              document.documentElement.style.setProperty(
                '--tg-theme-button-color',
                params.button_color
              );
            }
            if (params?.button_text_color != null && params.button_text_color !== '') {
              document.documentElement.style.setProperty(
                '--tg-theme-button-text-color',
                params.button_text_color
              );
            }
          };
          applyTheme(themeParams);

          // Связываем CSS переменные через SDK, если доступно
          if (bindViewportCssVars && typeof bindViewportCssVars === 'function') {
            try {
              bindViewportCssVars(key => `--tg-viewport-${key}`);
            } catch (bindError) {
              console.warn(
                'bindViewportCssVars failed, fallback to manual viewport binding',
                bindError
              );
            }
          }

          const applySafeArea = (insets?: SafeAreaInsets) => {
            if (!insets || !isSafeAreaInsets(insets)) return;
            if (typeof insets.top === 'number') {
              document.documentElement.style.setProperty('--tg-safe-area-top', `${insets.top}px`);
            }
            if (typeof insets.bottom === 'number') {
              document.documentElement.style.setProperty(
                '--tg-safe-area-bottom',
                `${insets.bottom}px`
              );
            }
            if (typeof insets.left === 'number') {
              document.documentElement.style.setProperty('--tg-safe-area-left', `${insets.left}px`);
            }
            if (typeof insets.right === 'number') {
              document.documentElement.style.setProperty(
                '--tg-safe-area-right',
                `${insets.right}px`
              );
            }
          };

          if (getSafeAreaInsets) {
            applySafeArea(getSafeAreaInsets());
          }

          // Обработка viewport для корректного масштабирования
          updateViewport = () => {
            if (!WebApp && typeof window === 'undefined') return;

            const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
            const viewportHeight =
              WebApp?.viewportStableHeight ??
              (typeof window !== 'undefined' ? window.innerHeight : 0);
            const isDesktopView = isDesktop(viewportWidth);

            // Устанавливаем viewport height
            if (WebApp?.viewportHeight !== undefined) {
              document.documentElement.style.setProperty(
                '--tg-viewport-height',
                `${WebApp.viewportHeight}px`
              );
            }

            if (WebApp?.viewportStableHeight !== undefined) {
              document.documentElement.style.setProperty(
                '--tg-viewport-stable-height',
                `${WebApp.viewportStableHeight}px`
              );
            } else if (typeof window !== 'undefined') {
              document.documentElement.style.setProperty(
                '--tg-viewport-stable-height',
                `${viewportHeight}px`
              );
            }

            // Рассчитываем scale factor в зависимости от типа устройства
            let scaleFactor: number;
            if (isDesktopView) {
              scaleFactor = calculateDesktopScaleFactor(viewportHeight, viewportWidth);
              document.documentElement.setAttribute('data-device', 'desktop');

              // Дополнительный масштаб для десктоп (для финальной корректировки)
              const additionalScale = calculateDesktopAdditionalScale(
                viewportHeight,
                ESTIMATED_CONTENT_HEIGHT
              );
              document.documentElement.style.setProperty(
                '--tg-desktop-scale',
                additionalScale.toString()
              );
            } else {
              scaleFactor = calculateMobileScaleFactor(viewportHeight);
              document.documentElement.setAttribute('data-device', 'mobile');
              document.documentElement.style.setProperty('--tg-desktop-scale', '1');
            }

            document.documentElement.style.setProperty('--tg-scale-factor', scaleFactor.toString());
          };

          // Устанавливаем viewport при инициализации
          updateViewport();

          // Подписываемся на изменения размера окна для десктоп версии
          if (typeof window !== 'undefined' && updateViewport != null) {
            resizeHandler = () => {
              if (updateViewport) {
                updateViewport();
              }
            };
            window.addEventListener('resize', resizeHandler);
          }

          // Подписываемся на изменения viewport
          if (WebApp.onEvent != null && updateViewport != null) {
            const handler = (payload?: unknown) => {
              const stable =
                typeof payload === 'object' &&
                payload !== null &&
                'is_state_stable' in (payload as Record<string, unknown>) &&
                typeof (payload as { is_state_stable?: unknown }).is_state_stable === 'boolean'
                  ? (payload as { is_state_stable?: boolean }).is_state_stable
                  : true;
              if (stable !== true) return;
              if (updateViewport != null) {
                updateViewport();
              }
            };
            WebApp.onEvent('viewportChanged', handler);
            removeViewportChanged = () => {
              WebApp?.offEvent?.('viewportChanged', handler);
            };
          }

          // Запрашиваем актуальные данные viewport, если SDK предоставляет
          if (requestViewportData) {
            requestViewportData().catch(() => {
              // тихий fallback на событие
            });
          }

          // Слушаем safe area изменения, если есть
          if (WebApp.onEvent && getSafeAreaInsets) {
            const safeAreaHandler = (payload?: unknown) => {
              const stable =
                typeof payload === 'object' &&
                payload !== null &&
                'is_state_stable' in (payload as Record<string, unknown>) &&
                typeof (payload as { is_state_stable?: unknown }).is_state_stable === 'boolean'
                  ? (payload as { is_state_stable?: boolean }).is_state_stable
                  : true;
              if (stable !== true) return;
              if (isSafeAreaInsets(payload)) {
                applySafeArea(payload);
              } else {
                applySafeArea(getSafeAreaInsets?.());
              }
            };
            WebApp.onEvent('content_safe_area_changed', safeAreaHandler);
            removeContentSafeAreaChanged = () => {
              WebApp?.offEvent?.('content_safe_area_changed', safeAreaHandler);
            };
          }

          if (WebApp.onEvent) {
            const themeHandler = (payload?: unknown) => {
              const params =
                typeof payload === 'object' && payload !== null
                  ? (payload as { theme_params?: TelegramWebApp['themeParams'] }).theme_params
                  : undefined;
              applyTheme(params ?? WebApp?.themeParams);
            };
            WebApp.onEvent('theme_changed', themeHandler);
            removeThemeChanged = () => {
              WebApp?.offEvent?.('theme_changed', themeHandler);
            };
          }
        }
      } catch (error) {
        console.warn('Telegram WebApp initialization error:', error);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        void initTelegramWebApp();
      });
    } else {
      void initTelegramWebApp();
    }

    // Cleanup при размонтировании компонента
    return () => {
      removeViewportChanged?.();
      removeThemeChanged?.();
      removeContentSafeAreaChanged?.();
      if (resizeHandler && typeof window !== 'undefined') {
        window.removeEventListener('resize', resizeHandler);
      }
    };
  }, []);

  return {};
};
