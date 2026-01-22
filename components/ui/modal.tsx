'use client';

import React from 'react';
import { Button } from './button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-xl shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {title && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-text-primary">{title}</h2>
              <button
                onClick={onClose}
                className="text-text-secondary hover:text-text-primary"
              >
                ✕
              </button>
            </div>
          )}
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
};

