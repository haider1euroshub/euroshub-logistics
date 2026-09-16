import React, { useEffect } from 'react';
import { cn } from '../../utils/cn.js';
import { X } from 'lucide-react';

export interface ModalProps {
 isOpen: boolean;
 onClose: () => void;
 title: string;
 description?: string;
 children: React.ReactNode;
 footer?: React.ReactNode;
 maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
 /** Alias for maxWidth */
 size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
 isOpen,
 onClose,
 title,
 description,
 children,
 footer,
 maxWidth,
 size,
}) => {
 const resolvedSize = (maxWidth || size || 'md') as 'sm' | 'md' | 'lg' | 'xl' | '2xl';
 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.key === 'Escape' && isOpen) onClose();
 };
 window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
 }, [isOpen, onClose]);

 if (!isOpen) return null;

 const maxWidths = {
 sm: 'max-w-sm',
 md: 'max-w-md',
 lg: 'max-w-lg',
 xl: 'max-w-xl',
 '2xl': 'max-w-2xl',
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
 <div
 className="fixed inset-0"
 onClick={onClose}
 aria-hidden="true"
 />
 <div
 role="dialog"
 aria-modal="true"
 aria-labelledby="modal-title"
 className={cn(
 'relative w-full overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 transition-all z-10 max-h-[90vh] flex flex-col',
 maxWidths[resolvedSize]
 )}
 >
 {/* Header */}
 <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 ">
 <div>
 <h3 id="modal-title" className="text-lg font-bold text-slate-900 ">
 {title}
 </h3>
 {description && (
 <p className="text-xs text-slate-500 mt-0.5">{description}</p>
 )}
 </div>
 <button
 onClick={onClose}
 className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
 aria-label="Close modal"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Body */}
 <div className="overflow-y-auto px-6 py-4 flex-1">{children}</div>

 {/* Footer */}
 {footer && (
 <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-3.5 ">
 {footer}
 </div>
 )}
 </div>
 </div>
 );
};
