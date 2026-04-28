// =========================================================================
// RLS テストスクリプト（マルチテナント刷新後）
//
// docs/saas-multitenant-design.md §6.1 のシナリオを検証する。
// 開発環境の Supabase に対して実行する想定。
//
// 使い方:
//   npm run rls-test
//
// 実装メモ:
// - service role でテストデータ（teams, users, team_members, goals 等）を作成
// - 各シナリオでは「対象ユーザー」のクライアント（anon key + signInWithPassword）に切替
// - 終了時にテストデータを全削除（finally で必ず）
// =========================================================================

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON_KEY || !SERVICE_KEY) {
  console.error(
    'Missing env. Need NEXT_PUBLIC_SUPABASE_URL + (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY) + (SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY)'
  );
  process.exit(1);
}

const admin = createClient(URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// テスト終了時に消す対象を蓄積
const cleanup = {
  authUserIds: [],
  teamIds: [],
};

const TAG = `rlstest-${Date.now()}`;
function tagEmail(local) {
  return `${TAG}-${local}@example.test`;
}

// ---------------------------------------------------------------
// アサート
// ---------------------------------------------------------------
let failures = 0;
function assert(cond, msg) {
  if (cond) {
    console.log(`  OK  ${msg}`);
  } else {
    console.log(`  NG  ${msg}`);
    failures++;
  }
}

// ---------------------------------------------------------------
// ユーザー作成 + ログインクライアント取得
// ---------------------------------------------------------------
async function createUserAndClient(email, password, name) {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error) throw error;
  const uid = created.user.id;
  cleanup.authUserIds.push(uid);

  // public.users に登録（RLS下でも自分は INSERT 可）
  const { error: upErr } = await admin
    .from('users')
    .upsert({ id: uid, email, name }, { onConflict: 'id' });
  if (upErr) throw upErr;

  // ログイン済みクライアント
  const cli = createClient(URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: loginErr } = await cli.auth.signInWithPassword({
    email,
    password,
  });
  if (loginErr) throw loginErr;

  return { uid, cli };
}

async function createTeam(name, slug) {
  const { data, error } = await admin
    .from('teams')
    .insert({ name, slug, plan: 'pro', max_members: 50 })
    .select()
    .single();
  if (error) throw error;
  cleanup.teamIds.push(data.id);
  return data;
}

async function addMember(teamId, userId, role) {
  const { error } = await admin
    .from('team_members')
    .insert({ team_id: teamId, user_id: userId, role, status: 'active' });
  if (error) throw error;
}

async function addInvitedMember(teamId, userId, role) {
  // status='invited' のメンバー（current_team_ids に含まれてはいけない）
  const { error } = await admin
    .from('team_members')
    .insert({ team_id: teamId, user_id: userId, role, status: 'invited' });
  if (error) throw error;
}

// ---------------------------------------------------------------
// メイン
// ---------------------------------------------------------------
async function main() {
  console.log(`[setup] tag=${TAG}`);

  // チームA / チームB
  const teamA = await createTeam('RLS Test A', `rlstest-a-${Date.now()}`);
  const teamB = await createTeam('RLS Test B', `rlstest-b-${Date.now()}`);

  // ユーザー作成
  const password = 'TestPassw0rd!1';
  const adminA = await createUserAndClient(tagEmail('admin-a'), password, 'Admin A');
  const trainerA = await createUserAndClient(tagEmail('trainer-a'), password, 'Trainer A');
  const traineeA1 = await createUserAndClient(tagEmail('trainee-a1'), password, 'Trainee A1');
  const traineeA2 = await createUserAndClient(tagEmail('trainee-a2'), password, 'Trainee A2');
  const adminB = await createUserAndClient(tagEmail('admin-b'), password, 'Admin B');
  const superA = await createUserAndClient(tagEmail('super'), password, 'Super');
  const invitedA = await createUserAndClient(tagEmail('invited-a'), password, 'Invited A');

  // SuperAdmin フラグ付与
  await admin.from('users').update({ is_super_admin: true }).eq('id', superA.uid);

  // 所属
  await addMember(teamA.id, adminA.uid, 'admin');
  await addMember(teamA.id, trainerA.uid, 'trainer');
  await addMember(teamA.id, traineeA1.uid, 'trainee');
  await addMember(teamA.id, traineeA2.uid, 'trainee');
  await addMember(teamB.id, adminB.uid, 'admin');
  await addInvitedMember(teamA.id, invitedA.uid, 'trainee'); // 招待中

  // trainer-a が trainee-a1 のみ担当（trainee-a2 は担当しない）
  await admin.from('trainer_trainees').insert({
    trainer_id: trainerA.uid,
    trainee_id: traineeA1.uid,
    team_id: teamA.id,
  });

  // テストデータ: trainee-a1 と trainee-a2 が goal を作成
  const goalA1 = await (async () => {
    // adminA でセッションを使って RLS 経由で挿入させる方が "本番に近い" が、
    // ここでは setup 簡略化のため admin client で直接 INSERT する。
    // ただし RLS の検証は SELECT 側で行うので問題ない。
    const { data, error } = await admin
      .from('goals')
      .insert({
        user_id: traineeA1.uid,
        team_id: teamA.id,
        content: 'A1 goal',
        deadline: '2099-12-31',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  })();
  const goalA2 = await (async () => {
    const { data, error } = await admin
      .from('goals')
      .insert({
        user_id: traineeA2.uid,
        team_id: teamA.id,
        content: 'A2 goal',
        deadline: '2099-12-31',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  })();
  // チームB にも 1件
  await admin.from('goals').insert({
    user_id: adminB.uid,
    team_id: teamB.id,
    content: 'B goal',
    deadline: '2099-12-31',
  });

  // -----------------------------------------------------------
  // シナリオ
  // -----------------------------------------------------------

  // (1) trainee-a1 は自分の goal だけ見える
  console.log('\n[1] trainee-a1: 自分の goal のみ見える');
  {
    const { data, error } = await traineeA1.cli.from('goals').select('id, content');
    assert(!error, `error=${error?.message ?? 'none'}`);
    const ids = (data ?? []).map((r) => r.id);
    assert(ids.includes(goalA1.id), 'goalA1 が見える');
    assert(!ids.includes(goalA2.id), 'goalA2 は見えない');
  }

  // (2) admin-a は同チーム全 goal が見える、別チームの goal は見えない
  console.log('\n[2] admin-a: 同チーム全 goal が見える / TeamB は見えない');
  {
    const { data, error } = await adminA.cli.from('goals').select('id, team_id');
    assert(!error, `error=${error?.message ?? 'none'}`);
    const teamIds = new Set((data ?? []).map((r) => r.team_id));
    assert(teamIds.size === 1 && teamIds.has(teamA.id), 'TeamA のデータのみ');
    assert((data ?? []).length >= 2, '複数 trainee の goal が見える');
  }

  // (3) trainer-a は担当 trainee-a1 の goal は見えるが trainee-a2 は見えない
  console.log('\n[3] trainer-a: 担当 trainee-a1 のみ見える、trainee-a2 は見えない');
  {
    const { data, error } = await trainerA.cli.from('goals').select('id, user_id');
    assert(!error, `error=${error?.message ?? 'none'}`);
    const userIds = new Set((data ?? []).map((r) => r.user_id));
    assert(userIds.has(traineeA1.uid), 'trainee-a1 の goal が見える');
    assert(!userIds.has(traineeA2.uid), 'trainee-a2 の goal は見えない');
  }

  // (4) admin-b（別テナント）からは TeamA のデータが一切見えない
  console.log('\n[4] admin-b: 別テナント TeamA の goal は見えない');
  {
    const { data, error } = await adminB.cli.from('goals').select('id, team_id');
    assert(!error, `error=${error?.message ?? 'none'}`);
    const teamIds = new Set((data ?? []).map((r) => r.team_id));
    assert(!teamIds.has(teamA.id), 'TeamA は見えない');
    assert(teamIds.has(teamB.id) || teamIds.size === 1, 'TeamB は見える');
  }

  // (5) SuperAdmin は両チーム見える
  console.log('\n[5] SuperAdmin: 両チームの goal が見える');
  {
    const { data, error } = await superA.cli.from('goals').select('id, team_id');
    assert(!error, `error=${error?.message ?? 'none'}`);
    const teamIds = new Set((data ?? []).map((r) => r.team_id));
    assert(teamIds.has(teamA.id), 'TeamA が見える');
    assert(teamIds.has(teamB.id), 'TeamB が見える');
  }

  // (6) status='invited' のメンバーは current_team_ids に含まれない（= goal が見えない）
  console.log('\n[6] invited メンバー: current_team_ids に含まれず goal が見えない');
  {
    const { data, error } = await invitedA.cli.from('goals').select('id');
    assert(!error, `error=${error?.message ?? 'none'}`);
    assert((data ?? []).length === 0, 'goal が0件');
  }

  // (7) admin-b は TeamA に INSERT できない（team_id 詐称防止）
  console.log('\n[7] admin-b: TeamA への INSERT は WITH CHECK で弾かれる');
  {
    const { error } = await adminB.cli.from('goals').insert({
      user_id: adminB.uid,
      team_id: teamA.id,
      content: 'cross-tenant insert',
      deadline: '2099-12-31',
    });
    assert(!!error, `INSERT が拒否される (got: ${error?.message ?? 'no error'})`);
  }

  console.log(`\n=== Result: ${failures === 0 ? 'PASS' : `FAIL (${failures})`} ===`);
  if (failures > 0) process.exitCode = 1;
}

// ---------------------------------------------------------------
// クリーンアップ
// ---------------------------------------------------------------
async function cleanupAll() {
  console.log('\n[cleanup]');
  // teams を消すと CASCADE で team_members / goals / activities / reflections / trainer_trainees / ai_diagnoses / team_invitations が消える
  for (const id of cleanup.teamIds) {
    const { error } = await admin.from('teams').delete().eq('id', id);
    if (error) console.error('  team delete error:', error.message);
  }
  // public.users と auth.users
  for (const uid of cleanup.authUserIds) {
    await admin.from('users').delete().eq('id', uid);
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) console.error('  auth user delete error:', error.message);
  }
}

try {
  await main();
} catch (e) {
  console.error('FATAL:', e);
  process.exitCode = 1;
} finally {
  await cleanupAll();
}
