'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateInquiryStatus, type InquiryStatus } from '@/lib/actions/super-admin';

const STATUSES: { value: InquiryStatus; label: string }[] = [
  { value: 'new', label: '未対応' },
  { value: 'contacted', label: '対応中' },
  { value: 'closed', label: '完了' },
];

export function InquiryStatusButtons({ id, current }: { id: string; current: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(current);
  const [loading, setLoading] = useState(false);

  const change = async (s: InquiryStatus) => {
    if (s === status || loading) return;
    setLoading(true);
    const res = await updateInquiryStatus(id, s);
    setLoading(false);
    if (!res.error) {
      setStatus(s);
      router.refresh();
    }
  };

  return (
    <div className="flex gap-1">
      {STATUSES.map((st) => (
        <button
          key={st.value}
          onClick={() => change(st.value)}
          disabled={loading}
          className={`text-xs px-2.5 py-1 rounded transition-colors disabled:opacity-50 ${
            status === st.value
              ? 'bg-primary text-white'
              : 'bg-background text-text-secondary hover:bg-border'
          }`}
        >
          {st.label}
        </button>
      ))}
    </div>
  );
}
