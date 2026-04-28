'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useCurrentTeamOptional } from '@/lib/context/current-team-client';

interface TeamSummary {
  id: string;
  slug: string;
  name: string;
  role: 'admin' | 'trainer' | 'trainee';
}

interface Props {
  teams: TeamSummary[];
  isSuperAdmin: boolean;
  compact?: boolean;
}

export function HeaderTeamSwitcher({ teams, isSuperAdmin, compact = false }: Props) {
  const current = useCurrentTeamOptional();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasMultiple = teams.length > 1;

  return (
    <div ref={ref} className="flex items-center gap-2 relative">
      {isSuperAdmin && (
        <Link
          href="/super-admin"
          className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-medium hidden sm:inline-block"
          title="Super Admin ダッシュボード"
        >
          [Super Admin]
        </Link>
      )}

      {current && !hasMultiple && (
        <span className={`text-text-secondary ${compact ? 'text-xs' : 'text-sm'} truncate max-w-[160px]`}>
          {current.name}
        </span>
      )}

      {current && hasMultiple && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`flex items-center gap-1 text-text-primary hover:bg-background rounded px-2 py-1 ${
              compact ? 'text-xs' : 'text-sm'
            }`}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <span className="truncate max-w-[160px]">{current.name}</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border rounded-lg shadow-lg overflow-hidden z-40"
            >
              {teams.map((t) => (
                <Link
                  key={t.id}
                  href={`/t/${t.slug}/dashboard`}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-2 text-sm hover:bg-background ${
                    t.slug === current.slug ? 'bg-primary/10 font-medium' : ''
                  }`}
                >
                  <div className="text-text-primary truncate">{t.name}</div>
                  <div className="text-xs text-text-secondary">{t.role}</div>
                </Link>
              ))}
              <Link
                href="/teams"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-primary border-t border-border hover:bg-background"
              >
                全所属チーム一覧へ
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
