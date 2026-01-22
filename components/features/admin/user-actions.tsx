'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { updateUser, deleteUser, getUserDetails } from '@/lib/actions/admin';
import { formatDateTime } from '@/lib/utils/helpers';
import { createClient } from '@/lib/supabase/client';
import type { Role } from '@/types';

interface UserActionsProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
  onUpdate: () => void;
}

export function UserActions({ user, onUpdate }: UserActionsProps) {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userDetails, setUserDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    // 現在のユーザーIDを取得
    const getCurrentUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  const isCurrentUser = currentUserId === user.id;
  const canDelete = !isCurrentUser;

  const handleEdit = () => {
    setIsEditModalOpen(true);
    setError('');
  };

  const handleDetail = async () => {
    setIsDetailModalOpen(true);
    setLoadingDetails(true);
    setError('');

    const { data, error: detailError } = await getUserDetails(user.id);
    if (detailError) {
      setError(detailError);
    } else {
      setUserDetails(data);
    }
    setLoadingDetails(false);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateUser(user.id, formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setIsEditModalOpen(false);
    setLoading(false);
    onUpdate();
  };

  const handleDelete = async () => {
    setError('');
    setLoading(true);

    const result = await deleteUser(user.id);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setIsDeleteConfirmOpen(false);
    setLoading(false);
    onUpdate();
  };

  const roleLabels: Record<Role, string> = {
    admin: '管理者',
    trainer: 'トレーナー',
    trainee: 'トレーニー',
  };

  return (
    <>
      <div className="flex gap-2 items-center">
        <Button
          variant="ghost"
          className="text-sm px-3 py-1"
          onClick={handleEdit}
        >
          編集
        </Button>
        <Button
          variant="ghost"
          className="text-sm px-3 py-1"
          onClick={handleDetail}
        >
          詳細
        </Button>
        {user.role === 'trainer' && (
          <Button
            variant="ghost"
            className="text-sm px-3 py-1"
            onClick={() => router.push(`/admin/trainers/${user.id}`)}
          >
            紐付け
          </Button>
        )}
        <Button
          variant="ghost"
          className={`text-sm px-3 py-1 ${
            canDelete
              ? 'text-error hover:text-error'
              : 'text-text-secondary cursor-not-allowed opacity-50'
          }`}
          onClick={() => setIsDeleteConfirmOpen(true)}
          disabled={!canDelete}
          title={!canDelete ? '自分自身は削除できません' : ''}
        >
          削除
        </Button>
      </div>

      {/* 編集モーダル */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setError('');
        }}
        title="ユーザーを編集"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            type="text"
            label="お名前"
            name="name"
            defaultValue={user.name}
            required
            disabled={loading}
          />
          <Input
            type="email"
            label="メールアドレス"
            name="email"
            defaultValue={user.email}
            required
            disabled={loading}
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              ロール
            </label>
            <select
              name="role"
              defaultValue={user.role}
              required
              disabled={loading}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg"
            >
              <option value="admin">管理者</option>
              <option value="trainer">トレーナー</option>
              <option value="trainee">トレーニー</option>
            </select>
          </div>
          <div>
            <Input
              type="password"
              label="パスワード（変更する場合のみ入力、8文字以上）"
              name="password"
              minLength={8}
              disabled={loading}
              placeholder="変更しない場合は空欄のまま"
            />
            <p className="text-xs text-text-secondary mt-1">
              パスワードを変更する場合のみ入力してください。空欄の場合は変更されません。
            </p>
          </div>
          {error && (
            <div className="text-error text-sm">{error}</div>
          )}
          <div className="flex gap-4">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? '更新中...' : '更新'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                setError('');
              }}
              disabled={loading}
            >
              キャンセル
            </Button>
          </div>
        </form>
      </Modal>

      {/* 詳細モーダル */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setUserDetails(null);
          setError('');
        }}
        title="ユーザー詳細"
      >
        {loadingDetails ? (
          <p>読み込み中...</p>
        ) : error ? (
          <div className="text-error text-sm">{error}</div>
        ) : userDetails ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-text-secondary mb-1">名前</p>
              <p className="text-text-primary">{userDetails.name}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary mb-1">メールアドレス</p>
              <p className="text-text-primary">{userDetails.email}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary mb-1">ロール</p>
              <p className="text-text-primary">
                {roleLabels[(userDetails.roles as any)?.name as Role] || '不明'}
              </p>
            </div>
            <div>
              <p className="text-sm text-text-secondary mb-1">登録日</p>
              <p className="text-text-primary">
                {formatDateTime(userDetails.created_at)}
              </p>
            </div>
            <div>
              <p className="text-sm text-text-secondary mb-1">更新日</p>
              <p className="text-text-primary">
                {formatDateTime(userDetails.updated_at)}
              </p>
            </div>
            {userDetails.assignments && (
              <div>
                <p className="text-sm text-text-secondary mb-2">
                  {(userDetails.roles as any)?.name === 'trainer' ? '担当トレーニー' : '担当トレーナー'}
                </p>
                {Array.isArray(userDetails.assignments) ? (
                  userDetails.assignments.length > 0 ? (
                    <div className="space-y-2">
                      {userDetails.assignments.map((assignment: any) => {
                        const trainee = assignment.trainee || assignment.trainer;
                        return (
                          <Card key={assignment.trainee_id || assignment.trainer_id} className="p-3">
                            <p className="font-medium text-text-primary">{trainee?.name}</p>
                            <p className="text-sm text-text-secondary">{trainee?.email}</p>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-text-secondary">なし</p>
                  )
                ) : userDetails.assignments ? (
                  <Card className="p-3">
                    <p className="font-medium text-text-primary">
                      {userDetails.assignments.trainer?.name}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {userDetails.assignments.trainer?.email}
                    </p>
                  </Card>
                ) : (
                  <p className="text-text-secondary">なし</p>
                )}
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* 削除確認モーダル */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setError('');
        }}
        title="ユーザーを削除"
      >
        <div className="space-y-4">
          {isCurrentUser ? (
            <>
              <p className="text-error">
                自分自身を削除することはできません。
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setError('');
                }}
              >
                閉じる
              </Button>
            </>
          ) : (
            <>
              <p className="text-text-primary">
                本当に「{user.name}」を削除しますか？
              </p>
              <p className="text-sm text-text-secondary">
                この操作は取り消せません。ユーザーのすべてのデータが削除されます。
              </p>
              {error && (
                <div className="text-error text-sm">{error}</div>
              )}
              <div className="flex gap-4">
                <Button
                  variant="primary"
                  onClick={handleDelete}
                  disabled={loading}
                  className="bg-error hover:bg-error/90"
                >
                  {loading ? '削除中...' : '削除'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    setError('');
                  }}
                  disabled={loading}
                >
                  キャンセル
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}

