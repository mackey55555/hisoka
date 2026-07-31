'use client';

import { Button } from '@/components/ui/button';

interface ApplyCtaButtonProps {
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  variant?: 'primary' | 'secondary';
  label?: string;
  className?: string;
}

/**
 * 「このプランで申し込む」ボタン。押すと申し込みフォームの希望プランを
 * このプランに切り替え（CustomEvent）、#apply へスクロールする。
 */
export function ApplyCtaButton({
  plan,
  variant = 'primary',
  label = 'このプランで申し込む',
  className = 'w-full py-3 text-base',
}: ApplyCtaButtonProps) {
  const onClick = () => {
    window.dispatchEvent(new CustomEvent('hisoka:select-plan', { detail: plan }));
    document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <Button type="button" variant={variant} onClick={onClick} className={className}>
      {label}
    </Button>
  );
}
