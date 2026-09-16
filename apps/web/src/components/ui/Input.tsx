import React from 'react';
import { cn } from '../../utils/cn.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
 label?: string;
 error?: string;
 helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
 ({ className, label, error, helperText, id, ...props }, ref) => {
 const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

 return (
 <div className="w-full space-y-1">
 {label && (
 <label
 htmlFor={inputId}
 className="block text-xs font-semibold uppercase tracking-wider text-slate-700 "
 >
 {label}
 </label>
 )}
 <input
 id={inputId}
 ref={ref}
 className={cn(
 'block w-full rounded-lg border bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors',
 'border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
 ' ',
 'disabled:cursor-not-allowed disabled:opacity-50',
 error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20 ',
 className
 )}
 {...props}
 />
 {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
 {helperText && !error && (
 <p className="text-xs text-slate-500 mt-1">{helperText}</p>
 )}
 </div>
 );
 }
);

Input.displayName = 'Input';
