import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils/helpers';

export default async function UsersPage() {
  const supabase = await createClient();
  
  const { data: users } = await supabase
    .from('users')
    .select('id, name, email, created_at, roles(name)')
    .order('created_at', { ascending: false });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text-primary mb-6">
        ユーザー管理
      </h1>

      {users && users.length > 0 ? (
        <div className="space-y-4">
          {users.map((user) => (
            <Card key={user.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium text-text-primary mb-1">
                    {user.name}
                  </h3>
                  <p className="text-sm text-text-secondary mb-2">
                    {user.email}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-text-secondary">
                    <span>
                      ロール: {(user.roles as any)?.name || '不明'}
                    </span>
                    <span>
                      登録日: {formatDateTime(user.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-text-secondary text-center py-8">
            ユーザーが存在しません
          </p>
        </Card>
      )}
    </div>
  );
}

