import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn.js';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const MAX_TOASTS = 5;
const AUTO_DISMISS_MS = 3200;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => {
        const next = [...prev, { id, type, message }];
        if (next.length > MAX_TOASTS) {
          const oldest = next[0];
          const oldTimer = timersRef.current.get(oldest.id);
          if (oldTimer) {
            clearTimeout(oldTimer);
            timersRef.current.delete(oldest.id);
          }
          return next.slice(next.length - MAX_TOASTS);
        }
        return next;
      });

      const timer = setTimeout(() => {
        removeToast(id);
      }, AUTO_DISMISS_MS);

      timersRef.current.set(id, timer);
    },
    [removeToast]
  );

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider
      value={{
        toast: addToast,
        showToast: addToast,
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error'),
        info: (msg) => addToast(msg, 'info'),
        warning: (msg) => addToast(msg, 'warning'),
      }}
    >
      {children}
      <div
        className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none max-w-sm w-full"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl shadow-lg border text-sm font-medium bg-white transition-all transform animate-in slide-in-from-bottom-2',
              t.type === 'success' && 'text-slate-800 border-emerald-500/30',
              t.type === 'error' && 'text-slate-800 border-red-500/30',
              t.type === 'warning' && 'text-slate-800 border-amber-500/30',
              t.type === 'info' && 'text-slate-800 border-slate-200'
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
              {t.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
              {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
              {t.type === 'info' && <Info className="w-4 h-4 text-sky-500 shrink-0" />}
              <span className="truncate">{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
