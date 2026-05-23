'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TutorialOverlay } from './tutorial-overlay';

interface Props {
  teamSlug: string;
}

export function TutorialBanner({ teamSlug }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="font-bold text-text-primary mb-1">
            はじめての方へ：チュートリアル
          </h3>
          <p className="text-sm text-text-secondary">
            目標 → 活動 → 振り返り の流れを 3 分で体験できます。
          </p>
        </div>
        <Button variant="primary" onClick={() => setOpen(true)}>
          チュートリアルを始める
        </Button>
      </div>
      {open && (
        <TutorialOverlay
          teamSlug={teamSlug}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
