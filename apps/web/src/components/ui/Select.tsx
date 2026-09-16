import React from 'react';
import { cn } from '../../utils/cn.js';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
 label?: string;
 error?: string;
 options?: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
 ({ className, label, error, options, children, id, ...props }, ref) => {
 const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

 return (
 <div className="w-full space-y-1">
 {label && (
 <label
 htmlFor={selectId}
 className="block text-xs font-semibold uppercase tracking-wider text-slate-700 "
 >
 {label}
 </label>
 )}
 <select
 id={selectId}
 ref={ref}
 className={cn(
 'block w-full rounded-lg border bg-white px-3.5 py-2 text-sm text-slate-900 transition-colors',
 'border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
 ' ',
 'disabled:cursor-not-allowed disabled:opacity-50',
 error && 'border-red-500 focus:border-red-500 ',
 className
 )}
 {...props}
 >
 {options
 ? options.map((opt) => (
 <option key={opt.value} value={opt.value}>
 {opt.label}
 </option>
 ))
 : children}
 </select>
 {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
 </div>
 );
 }
);

Select.displayName = 'Select';
