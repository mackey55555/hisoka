'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ProgressChartsProps {
  goals: Array<{
    id: string;
    status: string;
    deadline: string;
    created_at: string;
  }>;
  activities: Array<{
    created_at: string;
  }>;
}

const COLORS = ['#5D7A6E', '#7BA383', '#C47C7C', '#D4A574'];

export function ProgressCharts({ goals, activities }: ProgressChartsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }
  // 月別活動数のデータを準備
  const monthlyActivities = (() => {
    const monthMap = new Map<string, number>();
    const now = new Date();
    
    // 過去6ヶ月分のデータを準備
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, 0);
    }

    activities.forEach(activity => {
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

  // 目標ステータス分布のデータを準備
  const statusDistribution = (() => {
    const statusMap = new Map<string, number>();
    goals.forEach(goal => {
      const status = goal.status === 'achieved' ? '達成' : 
                    goal.status === 'cancelled' ? '中止' : '進行中';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });

    return Array.from(statusMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  })();

  // 目標達成率の推移（月別）
  const achievementRate = (() => {
    const monthMap = new Map<string, { total: number; achieved: number }>();
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, { total: 0, achieved: 0 });
    }

    goals.forEach(goal => {
      const createdDate = new Date(goal.created_at);
      const key = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
      const data = monthMap.get(key);
      if (data) {
        data.total++;
        if (goal.status === 'achieved') {
          data.achieved++;
        }
      }
    });

    return Array.from(monthMap.entries()).map(([month, data]) => ({
      month: month.split('-')[1] + '月',
      rate: data.total > 0 ? Math.round((data.achieved / data.total) * 100) : 0,
    }));
  })();

  return (
    <div className="grid md:grid-cols-2 gap-6 mb-8">
      {/* 月別活動数 */}
      <Card>
        <h3 className="text-lg font-bold text-text-primary mb-4">月別活動数</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={monthlyActivities}>
            <CartesianGrid strokeDasharray="3 3" stroke="#D4CFC7" />
            <XAxis dataKey="month" stroke="#6B6B6B" />
            <YAxis stroke="#6B6B6B" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#FFFFFF', 
                border: '1px solid #D4CFC7',
                borderRadius: '8px'
              }} 
            />
            <Bar dataKey="count" fill="#5D7A6E" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* 目標ステータス分布 */}
      <Card>
        <h3 className="text-lg font-bold text-text-primary mb-4">目標ステータス分布</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={statusDistribution}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {statusDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#FFFFFF', 
                border: '1px solid #D4CFC7',
                borderRadius: '8px'
              }}
              formatter={(value: number | undefined, name: string | undefined) => {
                const total = statusDistribution.reduce((sum, item) => sum + item.value, 0);
                const percent = value && total > 0 ? ((value / total) * 100).toFixed(0) : '0';
                return [`${value || 0}件 (${percent}%)`, name || ''];
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              wrapperStyle={{ fontSize: '14px' }}
              formatter={(value: string) => {
                const item = statusDistribution.find(d => d.name === value);
                if (!item) return value;
                const total = statusDistribution.reduce((sum, d) => sum + d.value, 0);
                const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
                return `${value} (${percent}%)`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* 目標達成率の推移 */}
      {achievementRate.some(d => d.rate > 0) && (
        <Card className="md:col-span-2">
          <h3 className="text-lg font-bold text-text-primary mb-4">目標達成率の推移</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={achievementRate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D4CFC7" />
              <XAxis dataKey="month" stroke="#6B6B6B" />
              <YAxis stroke="#6B6B6B" domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#FFFFFF', 
                  border: '1px solid #D4CFC7',
                  borderRadius: '8px'
                }}
                formatter={(value: number | undefined) => value !== undefined ? `${value}%` : ''}
              />
              <Line 
                type="monotone" 
                dataKey="rate" 
                stroke="#5D7A6E" 
                strokeWidth={2}
                dot={{ fill: '#5D7A6E', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

