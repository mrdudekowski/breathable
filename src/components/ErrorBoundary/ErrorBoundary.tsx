import { Component, type ReactNode, type ErrorInfo } from 'react';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary компонент для обработки ошибок в React компонентах.
 * 
 * Перехватывает ошибки в дочерних компонентах, логирует их и отображает fallback UI
 * вместо полного краха приложения.
 * 
 * Подготовлен для будущей интеграции с Sentry для логирования ошибок в production.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Обновляем состояние, чтобы следующий render показал fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Логируем ошибку для отладки
    // В будущем здесь будет интеграция с Sentry
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // TODO: Интегрировать с Sentry для production логирования
    // if (import.meta.env.PROD) {
    //   Sentry.captureException(error, {
    //     contexts: {
    //       react: {
    //         componentStack: errorInfo.componentStack,
    //       },
    //     },
    //   });
    // }
  }

  handleReset = () => {
    // Сбрасываем состояние ошибки, чтобы попытаться перерендерить компоненты
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Если есть кастомный fallback, используем его
      if (this.props.fallback != null) {
        return this.props.fallback;
      }

      // Иначе показываем стандартный fallback UI
      return (
        <div className={styles.errorBoundary}>
          <div className={styles.errorContent}>
            <h1 className={styles.errorTitle}>Что-то пошло не так</h1>
            <p className={styles.errorMessage}>
              Произошла ошибка в приложении. Пожалуйста, попробуйте обновить страницу.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details className={styles.errorDetails}>
                <summary className={styles.errorSummary}>Детали ошибки (только в dev-режиме)</summary>
                <pre className={styles.errorStack}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <button
              type="button"
              onClick={this.handleReset}
              className={styles.resetButton}
              aria-label="Попробовать снова"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
