'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { inviteUser, getTrainersForSelect } from '@/lib/actions/admin';

type Trainer = { id: string; name: string; email: string };

export function CreateUserForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [role, setRole] = useState<string>('');
  const [trainers, setTrainers] = useState<Trainer[]>([]);

  useEffect(() => {
    if (isOpen && trainers.length === 0) {
      getTrainersForSelect().then((res) => {
        if (res.data) setTrainers(res.data as Trainer[]);
      });
    }
  }, [isOpen, trainers.length]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await inviteUser(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.warning) {
      setInfo(result.warning);
      setLoading(false);
      setTimeout(() => {
        setIsOpen(false);
        setInfo('');
        window.location.reload();
      }, 2500);
      return;
    }

    setIsOpen(false);
    setLoading(false);
    window.location.reload();
  };

  const closeModal = () => {
    setIsOpen(false);
    setError('');
    setInfo('');
    setRole('');
  };

  return (
    <>
      <Button variant="primary" onClick={() => setIsOpen(true)}>
        + ユーザーを招待
      </Button>

      <Modal isOpen={isOpen} onClose={closeModal} title="ユーザーを招待">
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-text-secondary">
            入力したメールアドレスに招待メールを送信します。招待された方はメール内のリンクからパスワードを設定してログインできます。
          </p>
          <Input
            type="text"
            label="お名前"
            name="name"
            required
            disabled={loading}
          />
          <Input
            type="email"
            label="メールアドレス"
            name="email"
            required
            disabled={loading}
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              ロール
            </label>
            <select
              name="role"
              required
              disabled={loading}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg"
            >
              <option value="">選択してください</option>
              <option value="admin">管理者</option>
              <option value="trainer">トレーナー</option>
              <option value="trainee">トレーニー</option>
            </select>
          </div>
          {role === 'trainee' && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                担当トレーナー（任意）
              </label>
              <select
                name="trainerId"
                disabled={loading}
                className="w-full px-4 py-3 bg-background border border-border rounded-lg"
              >
                <option value="">後で紐付ける</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}（{t.email}）
                  </option>
                ))}
              </select>
            </div>
          )}
          {error && <div className="text-error text-sm">{error}</div>}
          {info && <div className="text-warning text-sm">{info}</div>}
          <div className="flex gap-4">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? '送信中...' : '招待を送信'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={closeModal}
              disabled={loading}
            >
              キャンセル
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
