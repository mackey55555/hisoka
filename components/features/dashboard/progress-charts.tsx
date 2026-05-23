'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ProgressChartsProps {
  activities: Array<{
    created_at: string;
  }>;
}

export function ProgressCharts({ activities }: ProgressChartsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const monthlyActivities = (() => {
    const monthMap = new Map<string, number>();
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, 0);
    }

    activities.forEach((activity) => {
      const date = new Date(activity.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthMap.has(key)) {
        monthMap.set(key, (monthMap.get(key) || 0) + 1);
      }
    });

    return Array.from(monthMap.entries()).map(([month, count]) => ({
      month: month.split('-')[1] + '月',
      count,
    }));
  })();

  return (
    <Card className="mb-8">
      <h3 className="text-lg font-bold text-text-primary mb-4">月別活動数</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={monthlyActivities}>
          <CartesianGrid strokeDasharray="3 3" stroke="#D4CFC7" />
          <XAxis dataKey="month" stroke="#6B6B6B" />
          <YAxis stroke="#6B6B6B" allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #D4CFC7',
              borderRadius: '8px',
            }}
            formatter={(value: number | undefined) => [`${value || 0}件`, '活動']}
          />
          <Bar dataKey="count" fill="#5D7A6E" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
