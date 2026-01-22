'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { assignTraineesToTrainer } from '@/lib/actions/admin';

interface TrainerDetailProps {
  trainer: {
    id: string;
    name: string;
    email: string;
    created_at: string;
  };
  allTrainees: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  assignedTraineeIds: string[];
  assignmentMap: Record<string, string>; // trainee_id -> trainer_id のマップ
}

export function TrainerDetail({
  trainer,
  allTrainees,
  assignedTraineeIds: initialAssignedIds,
  assignmentMap,
}: TrainerDetailProps) {
  const router = useRouter();
  const [selectedTraineeIds, setSelectedTraineeIds] = useState<string[]>(initialAssignedIds);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setSelectedTraineeIds(initialAssignedIds);
  }, [initialAssignedIds]);

  const handleToggleTrainee = (traineeId: string) => {
    setSelectedTraineeIds(prev => {
      if (prev.includes(traineeId)) {
        return prev.filter(id => id !== traineeId);
      } else {
        return [...prev, traineeId];
      }
    });
  };

  const handleSave = async () => {
    setError('');
    setSuccess(false);
    setLoading(true);

    const result = await assignTraineesToTrainer(trainer.id, selectedTraineeIds);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    // 少し待ってからページをリロード
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6 mt-4">
        <Button variant="ghost" onClick={() => router.back()}>
          ← 戻る
        </Button>
      </div>

      <Card className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-4">
          {trainer.name}さんの紐付け管理
        </h1>
        <p className="text-text-secondary mb-4">{trainer.email}</p>
      </Card>

      <Card className="mb-6">
        <h2 className="text-xl font-bold text-text-primary mb-4">
          担当トレーニーを選択
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          チェックを入れたトレーニーが担当トレーニーとして紐付けられます
        </p>

        {allTrainees.length > 0 ? (
          <div className="space-y-2 mb-6">
            {allTrainees.map((trainee) => {
              const isSelected = selectedTraineeIds.includes(trainee.id);
              const currentTrainerId = assignmentMap[trainee.id];
              const isAssignedToOther = currentTrainerId && currentTrainerId !== trainer.id;
              const isDisabled = isAssignedToOther && !isSelected;

              return (
                <label
                  key={trainee.id}
                  className={`flex items-center p-4 border rounded-lg transition-colors ${
                    isDisabled
                      ? 'border-border bg-background opacity-50 cursor-not-allowed'
                      : isSelected
                      ? 'border-primary bg-primary/10 cursor-pointer'
                      : 'border-border hover:bg-background cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleTrainee(trainee.id)}
                    disabled={isDisabled}
                    className="mr-3 w-5 h-5 text-primary disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-text-primary">{trainee.name}</p>
                    <p className="text-sm text-text-secondary">{trainee.email}</p>
                    {isAssignedToOther && !isSelected && (
                      <p className="text-xs text-warning mt-1">
                        ※ 既に他のトレーナーに紐付けられています
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-text-secondary text-center py-8">
            トレーニーが存在しません
          </p>
        )}

        {error && (
          <div className="mb-4 text-error text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 text-success text-sm">
            紐付けを保存しました
          </div>
        )}

        <div className="flex gap-4">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? '保存中...' : '保存'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.back()}
            disabled={loading}
          >
            キャンセル
          </Button>
        </div>
      </Card>
    </div>
  );
}

