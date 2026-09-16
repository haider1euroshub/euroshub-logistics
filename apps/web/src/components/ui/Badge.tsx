import React from 'react';
import { cn } from '../../utils/cn.js';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
 variant?: 'success' | 'info' | 'warning' | 'danger' | 'default';
 size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
 className,
 variant = 'default',
 size = 'md',
 children,
 ...props
}) => {
 const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
 success:
 'bg-emerald-50 text-emerald-700 border-emerald-200 ',
 info:
 'bg-sky-50 text-sky-700 border-sky-200 ',
 warning:
 'bg-amber-50 text-amber-700 border-amber-200 ',
 danger:
 'bg-rose-50 text-rose-700 border-rose-200 ',
 default:
 'bg-slate-100 text-slate-700 border-slate-200 ',
 };

 const dots: Record<NonNullable<BadgeProps['variant']>, string> = {
 success: 'bg-emerald-500',
 info: 'bg-sky-500',
 warning: 'bg-amber-500',
 danger: 'bg-rose-500',
 default: 'bg-slate-400',
 };

 const sizes = {
 sm: 'px-1.5 py-0 text-[10px] gap-1',
 md: 'px-2.5 py-0.5 text-xs gap-1.5',
 };

 return (
 <span
 className={cn(
 'inline-flex items-center rounded-full font-semibold border transition-colors',
 variants[variant],
 sizes[size],
 className
 )}
 {...props}
 >
 <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dots[variant])} />
 {children}
 </span>
 );
};
