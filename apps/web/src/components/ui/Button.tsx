import React from 'react';
import { cn } from '../../utils/cn.js';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
 variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
 size?: 'sm' | 'md' | 'lg';
 isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
 (
 {
 className,
 variant = 'primary',
 size = 'md',
 isLoading = false,
 disabled,
 children,
 ...props
 },
 ref
 ) => {
 const baseStyles =
 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

 const variants = {
 primary:
 'bg-brand-600 hover:bg-brand-700 text-white focus:ring-brand-500 shadow-sm ',
 secondary:
 'bg-slate-100 hover:bg-slate-200 text-slate-800 focus:ring-slate-400',
 danger:
 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm ',
 outline:
 'border border-slate-300 bg-transparent hover:bg-slate-100 text-slate-700 focus:ring-slate-400',
 ghost:
 'bg-transparent hover:bg-slate-100 text-slate-700 focus:ring-slate-400',
 };

 const sizes = {
 sm: 'text-xs px-2.5 py-1.5 gap-1.5',
 md: 'text-sm px-4 py-2 gap-2',
 lg: 'text-base px-5 py-2.5 gap-2.5',
 };

 return (
 <button
 ref={ref}
 disabled={disabled || isLoading}
 className={cn(baseStyles, variants[variant], sizes[size], className)}
 {...props}
 >
 {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
 {children}
 </button>
 );
 }
);

Button.displayName = 'Button';
