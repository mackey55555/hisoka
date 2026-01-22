import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// .env.localファイルを読み込む
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const url =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  requireEnv('NEXT_PUBLIC_SUPABASE_URL');
// 新しいSecret key形式（sb_secret_...）またはレガシーのservice_role keyに対応
const secretKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  requireEnv('SUPABASE_SECRET_KEY');

// Secret keyを使用することで、自動的にadmin権限が有効になります
const supabase = createClient(url, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function getRoleId(roleName) {
  const { data, error } = await supabase
    .from('roles')
    .select('id')
    .eq('name', roleName)
    .single();
  if (error) throw error;
  return data.id;
}

async function ensureUser({ email, password, name, role }) {
  // 1) Create auth user (or fetch existing by email)
  const { data: created, error: createErr } = await supabase.auth.admin.createUser(
    {
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    }
  );

  let userId;
  if (createErr) {
    // If already exists, fetch by email
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) throw listErr;
    const existing = list.users.find((u) => u.email === email);
    if (!existing) throw createErr;
    userId = existing.id;
  } else {
    userId = created.user.id;
  }

  // 2) Upsert into public.users
  const roleId = await getRoleId(role);
  const { error: upsertErr } = await supabase.from('users').upsert(
    {
      id: userId,
      email,
      name,
      role_id: roleId,
    },
    { onConflict: 'id' }
  );
  if (upsertErr) throw upsertErr;

  return userId;
}

async function ensureAssignment({ trainerId, traineeId }) {
  const { error } = await supabase.from('trainer_trainees').upsert(
    {
      trainer_id: trainerId,
      trainee_id: traineeId,
    },
    { onConflict: 'trainee_id' }
  );
  if (error) throw error;
}

async function main() {
  // ここを書き換えて使ってください（安全のためデフォルトはダミー）
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const adminPass = process.env.SEED_ADMIN_PASSWORD || 'AdminPassw0rd!';
  const trainerEmail = process.env.SEED_TRAINER_EMAIL || 'trainer@example.com';
  const trainerPass = process.env.SEED_TRAINER_PASSWORD || 'TrainerPassw0rd!';
  const traineeEmail = process.env.SEED_TRAINEE_EMAIL || 'trainee@example.com';
  const traineePass = process.env.SEED_TRAINEE_PASSWORD || 'TraineePassw0rd!';

  const adminId = await ensureUser({
    email: adminEmail,
    password: adminPass,
    name: '管理者',
    role: 'admin',
  });
  const trainerId = await ensureUser({
    email: trainerEmail,
    password: trainerPass,
    name: 'トレーナー',
    role: 'trainer',
  });
  const traineeId = await ensureUser({
    email: traineeEmail,
    password: traineePass,
    name: 'トレーニー',
    role: 'trainee',
  });

  await ensureAssignment({ trainerId, traineeId });

  console.log('Seed done:');
  console.log({ adminEmail, trainerEmail, traineeEmail });
  console.log('Assignment:', { trainerId, traineeId });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


