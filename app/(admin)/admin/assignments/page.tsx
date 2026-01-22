'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { formatDateTime } from '@/lib/utils/helpers';

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [trainees, setTrainees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [selectedTrainee, setSelectedTrainee] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    
    // 紐付け一覧
    const { data: assignmentsData } = await supabase
      .from('trainer_trainees')
      .select('*, trainer:users!trainer_trainees_trainer_id_fkey(id, name, email), trainee:users!trainer_trainees_trainee_id_fkey(id, name, email)')
      .order('created_at', { ascending: false });

    // 全ユーザー
    const { data: usersData } = await supabase
      .from('users')
      .select('id, name, email, roles(name)')
      .order('name');

    // トレーナーとトレーニーを分離
    const trainersData =
      usersData?.filter((u: any) => (u.roles as any)?.name === 'trainer') || [];
    const traineesData =
      usersData?.filter((u: any) => (u.roles as any)?.name === 'trainee') || [];

    setAssignments(assignmentsData || []);
    setUsers(usersData || []);
    setTrainers(trainersData);
    setTrainees(traineesData);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!selectedTrainer || !selectedTrainee) {
      alert('トレーナーとトレーニーを選択してください');
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('trainer_trainees')
      .insert({
        trainer_id: selectedTrainer,
        trainee_id: selectedTrainee,
      });

    if (error) {
      alert('紐付けの作成に失敗しました: ' + error.message);
      return;
    }

    setSelectedTrainer('');
    setSelectedTrainee('');
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この紐付けを削除しますか？')) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('trainer_trainees')
      .delete()
      .eq('id', id);

    if (error) {
      alert('削除に失敗しました: ' + error.message);
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
      <h1 className="text-2xl font-bold text-text-primary mb-6">
        紐付け管理
      </h1>

      <Card className="mb-6 p-6">
        <h2 className="text-lg font-bold text-text-primary mb-4">
          新規紐付け作成
        </h2>
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
        <h2 className="text-xl font-bold text-text-primary mb-4">
          既存の紐付け
        </h2>
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
                  <Button
                    variant="ghost"
                    onClick={() => handleDelete(assignment.id)}
                  >
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

