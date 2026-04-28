'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/helpers';
import {
  listTeamUsers,
  listTeamAssignments,
  createAssignment,
  removeAssignment,
} from '@/lib/actions/admin';
import { useCurrentTeam } from '@/lib/context/current-team-client';

export default function AssignmentsPage() {
  const { slug } = useCurrentTeam();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [trainees, setTrainees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [selectedTrainee, setSelectedTrainee] = useState('');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: members }, { data: aRows }] = await Promise.all([
      listTeamUsers(slug),
      listTeamAssignments(slug),
    ]);
    setTrainers((members as any[]).filter((u) => u.role === 'trainer'));
    setTrainees((members as any[]).filter((u) => u.role === 'trainee'));
    setAssignments(aRows as any[]);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!selectedTrainer || !selectedTrainee) {
      alert('トレーナーとトレーニーを選択してください');
      return;
    }
    const res = await createAssignment(slug, selectedTrainer, selectedTrainee);
    if (res.error) {
      alert(res.error);
      return;
    }
    setSelectedTrainer('');
    setSelectedTrainee('');
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この紐付けを削除しますか？')) return;
    const res = await removeAssignment(slug, id);
    if (res.error) {
      alert(res.error);
      return;
    }
    loadData();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text-primary mb-6">紐付け管理</h1>

      <Card className="mb-6 p-6">
        <h2 className="text-lg font-bold text-text-primary mb-4">新規紐付け作成</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              トレーナー
            </label>
            <select
              value={selectedTrainer}
              onChange={(e) => setSelectedTrainer(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg"
            >
              <option value="">選択してください</option>
              {trainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.name} ({trainer.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              トレーニー
            </label>
            <select
              value={selectedTrainee}
              onChange={(e) => setSelectedTrainee(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg"
            >
              <option value="">選択してください</option>
              {trainees.map((trainee) => (
                <option key={trainee.id} value={trainee.id}>
                  {trainee.name} ({trainee.email})
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button variant="primary" onClick={handleCreate}>
          紐付けを作成
        </Button>
      </Card>

      <div>
        <h2 className="text-xl font-bold text-text-primary mb-4">既存の紐付け</h2>
        {assignments.length > 0 ? (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <Card key={assignment.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-text-primary mb-2">
                      {(assignment.trainer as any)?.name} → {(assignment.trainee as any)?.name}
                    </h3>
                    <div className="text-sm text-text-secondary">
                      <p>トレーナー: {(assignment.trainer as any)?.email}</p>
                      <p>トレーニー: {(assignment.trainee as any)?.email}</p>
                      <p>作成日: {formatDateTime(assignment.created_at)}</p>
                    </div>
                  </div>
                  <Button variant="ghost" onClick={() => handleDelete(assignment.id)}>
                    削除
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-text-secondary text-center py-8">
              まだ紐付けがありません
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
