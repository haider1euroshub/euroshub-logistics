import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '../../utils/cn.js';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
 id: string;
 type: ToastType;
 message: string;
}

interface ToastContextType {
 toast: (message: string, type?: ToastType) => void;
 success: (message: string) => void;
 error: (message: string) => void;
 info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const [toasts, setToasts] = useState<ToastItem[]>([]);

 const removeToast = useCallback((id: string) => {
 setToasts((prev) => prev.filter((t) => t.id !== id));
 }, []);

 const addToast = useCallback(
 (message: string, type: ToastType = 'info') => {
 const id = Math.random().toString(36).substring(2, 9);
 setToasts((prev) => [...prev, { id, type, message }]);
 setTimeout(() => removeToast(id), 4000);
 },
 [removeToast]
 );

 return (
 <ToastContext.Provider
 value={{
 toast: addToast,
 success: (msg) => addToast(msg, 'success'),
 error: (msg) => addToast(msg, 'error'),
 info: (msg) => addToast(msg, 'info'),
 }}
 >
 {children}
 <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
 {toasts.map((t) => (
 <div
 key={t.id}
 className={cn(
 'pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl shadow-lg border text-sm font-medium transition-all animate-in slide-in-from-bottom-2',
 t.type === 'success' &&
 'bg-white text-slate-800 border-emerald-500/30 ',
 t.type === 'error' &&
 'bg-white text-slate-800 border-red-500/30 ',
 t.type === 'info' &&
 'bg-white text-slate-800 border-slate-200 '
 )}
 >
 <div className="flex items-center gap-2.5">
 {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
 {t.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
 {t.type === 'info' && <Info className="w-4 h-4 text-sky-500 shrink-0" />}
 <span>{t.message}</span>
 </div>
 <button
 onClick={() => removeToast(t.id)}
 className="p-1 text-slate-400 hover:text-slate-600 "
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

// ─── Simple inline Toast component ────────────────────────────────────────────
// Used by pages that manage their own toast state via useState and render
// a single toast inline (not via the global ToastProvider queue).

export interface ToastProps {
 message: string;
 variant?: 'success' | 'error' | 'info';
 onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, variant = 'info', onClose }) => {
 const icons = {
 success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
 error: <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />,
 info: <Info className="w-4 h-4 text-sky-500 shrink-0" />,
 };
 const borders = {
 success: 'border-emerald-500/30 ',
 error: 'border-red-500/30 ',
 info: 'border-slate-200 ',
 };

 return (
 <div
 className={cn(
 'fixed bottom-4 right-4 z-50 flex items-center justify-between gap-3 p-3.5 rounded-xl shadow-lg border text-sm font-medium bg-white text-slate-800 max-w-sm w-full animate-in slide-in-from-bottom-2',
 borders[variant]
 )}
 >
 <div className="flex items-center gap-2.5">
 {icons[variant]}
 <span>{message}</span>
 </div>
 {onClose && (
 <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 ">
 <X className="w-3.5 h-3.5" />
 </button>
 )}
 </div>
 );
};
