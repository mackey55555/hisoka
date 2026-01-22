'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { createUser } from '@/lib/actions/admin';

export function CreateUserForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createUser(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setIsOpen(false);
    setLoading(false);
    // ページをリロードして最新のユーザー一覧を表示
    window.location.reload();
  };

  return (
    <>
      <Button variant="primary" onClick={() => setIsOpen(true)}>
        + 新規ユーザー作成
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setError('');
        }}
        title="新規ユーザー作成"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <Input
            type="password"
            label="パスワード（8文字以上）"
            name="password"
            required
            minLength={8}
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
              className="w-full px-4 py-3 bg-background border border-border rounded-lg"
            >
              <option value="">選択してください</option>
              <option value="admin">管理者</option>
              <option value="trainer">トレーナー</option>
              <option value="trainee">トレーニー</option>
            </select>
          </div>
          {error && (
            <div className="text-error text-sm">{error}</div>
          )}
          <div className="flex gap-4">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? '作成中...' : '作成'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsOpen(false);
                setError('');
              }}
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

