import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { CloseIcon } from '../icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-(--color-bg-elevated) rounded-lg shadow-xl max-w-lg w-full mx-4 z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-(--color-border-light)">
          <h2 className="text-lg font-semibold text-(--color-text-primary)">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-(--color-bg-hover) transition-colors text-(--color-text-secondary)"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
