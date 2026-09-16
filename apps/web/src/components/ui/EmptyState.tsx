import React from 'react';
import { PackageOpen } from 'lucide-react';
import { Button } from './Button.js';

export interface EmptyStateProps {
 title: string;
 description: string;
 icon?: React.ComponentType<{ className?: string }>;
 actionLabel?: string;
 onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
 title,
 description,
 icon: Icon = PackageOpen,
 actionLabel,
 onAction,
}) => {
 return (
 <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50 ">
 <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
 <Icon className="w-7 h-7" />
 </div>
 <h3 className="text-base font-bold text-slate-900 mb-1">
 {title}
 </h3>
 <p className="text-sm text-slate-500 max-w-sm mb-5">
 {description}
 </p>
 {actionLabel && onAction && (
 <Button variant="primary" size="sm" onClick={onAction}>
 {actionLabel}
 </Button>
 )}
 </div>
 );
};
