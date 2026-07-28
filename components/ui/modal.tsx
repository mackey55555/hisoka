'use client';

import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** 横幅。既定 md。チャット等の広めの用途は lg / xl */
  size?: 'md' | 'lg' | 'xl';
}

const SIZE_CLASS: Record<NonNullable<ModalProps['size']>, string> = {
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  // モーダル表示中は背面(body)のスクロールを止める（背景がスクロールする問題の対策）
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-surface rounded-xl shadow-lg ${SIZE_CLASS[size]} w-full flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
            <h2 className="text-xl font-bold text-text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary text-lg leading-none"
              aria-label="閉じる"
            >
              ✕
            </button>
          </div>
        )}
        {/* 本文だけをスクロールさせる。overscroll-contain で背面への連鎖スクロールを防ぐ */}
        <div className={`px-6 overflow-y-auto overscroll-contain ${title ? 'pb-6' : 'py-6'}`}>
          {children}
        </div>
      </div>
    </div>
  );
};
