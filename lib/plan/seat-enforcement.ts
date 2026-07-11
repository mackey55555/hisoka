/**
 * シート上限のエンフォースメント（プラン降格/アップグレード時のメンバー整理）。
 *
 * 方針（docs/seat-limit-downgrade-spec.md）:
 *  - 降格で上限超過 → 超過分を即ロック（status='disabled' + auto_locked_at 印）。削除はしない。
 *  - 残す人はシステムが決定的に自動選定（admin優先 → joined_at昇順 → id）。
 *  - アップグレード → auto_locked_at 付きを同じ優先順で新上限まで自動復帰。
 *
 * ロック自体は既存の status='disabled' で成立（resolveTeamFromSlug が非activeを弾く）。
 * auto_locked_at は「降格で自動ロックした行」を後から特定するための印（手動 disabled と区別）。
 *
 * すべて service-role(admin) クライアント前提。webhook から呼ぶ。
 */
import { getAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof getAdminClient>;

interface MemberRow {
  id: string;
  role: string;
  joined_at: string;
}

/** 残す/復帰させる優先順。admin優先 → 参加が早い順 → id で決定的にタイブレーク。 */
function byRetentionPriority(a: MemberRow, b: MemberRow): number {
  const ra = a.role === 'admin' ? 0 : 1;
  const rb = b.role === 'admin' ? 0 : 1;
  if (ra !== rb) return ra - rb;
  const ja = new Date(a.joined_at).getTime();
  const jb = new Date(b.joined_at).getTime();
  if (ja !== jb) return ja - jb;
  return a.id < b.id ? -1 : 1;
}

/**
 * 上限超過なら、優先順で下位の active メンバーをロックする。
 * @returns ロックした人数
 */
export async function enforceSeatLimit(
  admin: AdminClient,
  teamId: string,
  maxMembers: number
): Promise<number> {
  const { data } = await (admin.from('team_members' as any) as any)
    .select('id, role, joined_at')
    .eq('team_id', teamId)
    .eq('status', 'active');
  const members = (data as MemberRow[] | null) ?? [];
  if (members.length <= maxMembers) return 0;

  const sorted = [...members].sort(byRetentionPriority);
  const toLock = sorted.slice(maxMembers).map((m) => m.id); // 上限を超えた下位
  if (toLock.length === 0) return 0;

  const { error } = await (admin.from('team_members' as any) as any)
    .update({ status: 'disabled', auto_locked_at: new Date().toISOString() })
    .in('id', toLock);
  if (error) {
    console.error('[seat-enforcement] ロック失敗:', error);
    return 0;
  }
  return toLock.length;
}

/**
 * アップグレードで空いた枠に、auto_locked_at 付きメンバーを優先順で復帰させる。
 * 手動 disabled（auto_locked_at=NULL）は対象外。
 * @returns 復帰させた人数
 */
export async function restoreAutoLockedSeats(
  admin: AdminClient,
  teamId: string,
  maxMembers: number
): Promise<number> {
  const { data: activeData } = await (admin.from('team_members' as any) as any)
    .select('id')
    .eq('team_id', teamId)
    .eq('status', 'active');
  const activeCount = (activeData as unknown[] | null)?.length ?? 0;
  const slots = maxMembers - activeCount;
  if (slots <= 0) return 0;

  const { data } = await (admin.from('team_members' as any) as any)
    .select('id, role, joined_at')
    .eq('team_id', teamId)
    .eq('status', 'disabled')
    .not('auto_locked_at', 'is', null);
  const locked = (data as MemberRow[] | null) ?? [];
  if (locked.length === 0) return 0;

  const toRestore = [...locked].sort(byRetentionPriority).slice(0, slots).map((m) => m.id);
  const { error } = await (admin.from('team_members' as any) as any)
    .update({ status: 'active', auto_locked_at: null })
    .in('id', toRestore);
  if (error) {
    console.error('[seat-enforcement] 復帰失敗:', error);
    return 0;
  }
  return toRestore.length;
}
