'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { CreateUserForm } from '@/components/features/admin/create-user-form';
import { UserActions } from '@/components/features/admin/user-actions';
import { createClient } from '@/lib/supabase/client';
import { formatDateTime } from '@/lib/utils/helpers';

type Role = 'admin' | 'trainer' | 'trainee';
type SortField = 'name' | 'email' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
  role: Role;
}

const ITEMS_PER_PAGE = 10;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Role>('trainee');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const supabase = createClient();

    // ロールIDを取得
    const { data: roles } = await supabase
      .from('roles')
      .select('id, name')
      .in('name', ['admin', 'trainer', 'trainee']);

    if (!roles) {
      setLoading(false);
      return;
    }

    const roleMap = roles.reduce((acc, role) => {
      acc[role.id] = role.name as Role;
      return acc;
    }, {} as Record<string, Role>);

    // 全ユーザーを取得
    const { data: usersData } = await supabase
      .from('users')
      .select('id, name, email, created_at, role_id')
      .order('created_at', { ascending: false });

    if (usersData) {
      const usersWithRoles: User[] = usersData.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
        role: roleMap[user.role_id] || 'trainee',
      }));
      setUsers(usersWithRoles);
    }

    setLoading(false);
  };

  // フィルタリングとソート
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(user => user.role === activeTab);

    // 検索フィルタ
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        user =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    // ソート
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, activeTab, searchQuery, sortField, sortDirection]);

  // ページネーション
  const totalPages = Math.ceil(filteredAndSortedUsers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedUsers = filteredAndSortedUsers.slice(startIndex, endIndex);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleTabChange = (tab: Role) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchQuery('');
  };

  const roleLabels: Record<Role, string> = {
    admin: '管理者',
    trainer: 'トレーナー',
    trainee: 'トレーニー',
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">
          ユーザー管理
        </h1>
        <CreateUserForm />
      </div>

      {/* タブ */}
      <div className="mb-6 border-b border-border">
        <div className="flex gap-4">
          {(['trainee', 'trainer', 'admin'] as Role[]).map((role) => (
            <button
              key={role}
              onClick={() => handleTabChange(role)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === role
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {roleLabels[role]} ({users.filter(u => u.role === role).length})
            </button>
          ))}
        </div>
      </div>

      {/* 検索 */}
      <div className="mb-4">
        <Input
          type="text"
          placeholder="名前またはメールアドレスで検索..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="max-w-md"
        />
      </div>

      {/* テーブル */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                sortable
                onClick={() => handleSort('name')}
              >
                名前
              </TableHead>
              <TableHead
                sortable
                onClick={() => handleSort('email')}
              >
                メールアドレス
              </TableHead>
              <TableHead
                sortable
                onClick={() => handleSort('created_at')}
              >
                登録日
              </TableHead>
              <TableHead className="w-48">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.length > 0 ? (
              paginatedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{formatDateTime(user.created_at)}</TableCell>
                  <TableCell>
                    <UserActions user={user} onUpdate={loadUsers} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-text-secondary">
                  {searchQuery ? '検索結果が見つかりませんでした' : 'ユーザーが存在しません'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            前へ
          </Button>
          <span className="text-text-secondary">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="secondary"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            次へ
          </Button>
        </div>
      )}

      {/* 件数表示 */}
      <div className="mt-4 text-sm text-text-secondary">
        表示中: {startIndex + 1} - {Math.min(endIndex, filteredAndSortedUsers.length)} / {filteredAndSortedUsers.length}件
      </div>
    </div>
  );
}
