'use client';

import * as React from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  onRetry?: () => void | Promise<void>;
}

interface ToastProps extends Toast {
  onClose: (id: string) => void;
}

const variantStyles: Record<
  ToastVariant,
  { icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  success: {
    icon: CheckCircle2,
    className: 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400',
  },
  error: {
    icon: AlertCircle,
    className: 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400',
  },
  info: {
    icon: Info,
    className: 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400',
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  },
};

/**
 * Einzelne Toast-Komponente
 */
function ToastComponent({
  id,
  title,
  description,
  variant = 'info',
  duration = 5000,
  onRetry,
  onClose,
}: ToastProps) {
  const [isVisible, setIsVisible] = React.useState(true);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const closeToast = React.useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onClose(id);
    }, 200);
  }, [onClose, id]);

  React.useEffect(() => {
    if (duration > 0 && !isRetrying) {
      timeoutRef.current = setTimeout(() => {
        closeToast();
      }, duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [duration, isRetrying, closeToast]);

  // handleClose is now closeToast

  async function handleRetry() {
    if (!onRetry) return;

    setIsRetrying(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    try {
      await onRetry();
      // Schließe Toast nach erfolgreichem Retry
      closeToast();
    } catch (error) {
      // Toast bleibt offen bei Fehler
      setIsRetrying(false);
    }
  }

  const variantStyle = variantStyles[variant];
  const Icon = variantStyle.icon;

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 rounded-lg border p-4 shadow-lg transition-all animate-in slide-in-from-top-5',
        variantStyle.className
      )}
      role="alert"
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 space-y-2">
        {title && <div className="font-semibold text-sm">{title}</div>}
        {description && <div className="text-sm opacity-90">{description}</div>}
        {onRetry && variant === 'error' && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetry}
            disabled={isRetrying}
            className="h-7 text-xs"
          >
            {isRetrying ? (
              <>
                <RotateCw className="h-3 w-3 mr-1 animate-spin" />
                Wiederhole...
              </>
            ) : (
              <>
                <RotateCw className="h-3 w-3 mr-1" />
                Erneut versuchen
              </>
            )}
          </Button>
        )}
      </div>
      <button
        onClick={handleClose}
        className="shrink-0 rounded-md p-1 opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
        aria-label="Toast schließen"
        disabled={isRetrying}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

/**
 * Toast-Provider für globales State-Management
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

/**
 * Toast-Container für die Anzeige aller Toasts
 */
function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none"
      aria-live="polite"
      aria-label="Benachrichtigungen"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastComponent {...toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
}

/**
 * Hook zum Verwenden von Toasts
 */
export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
