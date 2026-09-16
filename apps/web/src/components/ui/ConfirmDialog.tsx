import React from 'react';
import { Modal } from './Modal.js';
import { Button } from './Button.js';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
 isOpen: boolean;
 onClose?: () => void;
 onCancel?: () => void; // alias for onClose
 onConfirm: () => void;
 title: string;
 message: string;
 confirmText?: string;
 confirmLabel?: string; // alias for confirmText
 cancelText?: string;
 variant?: 'danger' | 'primary';
 isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
 isOpen,
 onClose,
 onCancel,
 onConfirm,
 title,
 message,
 confirmText,
 confirmLabel,
 cancelText = 'Cancel',
 variant = 'danger',
 isLoading = false,
}) => {
 const handleClose = onClose ?? onCancel ?? (() => {});
 const resolvedConfirmText = confirmText ?? confirmLabel ?? 'Confirm';
 return (
 <Modal
 isOpen={isOpen}
 onClose={handleClose}
 title={title}
 maxWidth="sm"
 footer={
 <>
 <Button variant="outline" size="sm" onClick={handleClose} disabled={isLoading}>
 {cancelText}
 </Button>
 <Button
 variant={variant}
 size="sm"
 onClick={onConfirm}
 isLoading={isLoading}
 >
 {resolvedConfirmText}
 </Button>
 </>
 }
 >
 <div className="flex items-start gap-3.5 py-2">
 <div className="rounded-full bg-red-100 p-2 text-red-600 ">
 <AlertTriangle className="w-5 h-5" />
 </div>
 <p className="text-sm text-slate-600 leading-relaxed">
 {message}
 </p>
 </div>
 </Modal>
 );
};
