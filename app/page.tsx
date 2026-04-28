import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  listMyTeams,
  getLastTeamSlug,
  getIsSuperAdmin,
} from '@/lib/context/current-team';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [teams, isSuperAdmin] = await Promise.all([
    listMyTeams(),
    getIsSuperAdmin(),
  ]);

  if (teams.length === 0) {
    if (isSuperAdmin) redirect('/super-admin');
    redirect('/no-team');
  }

  if (teams.length === 1) {
    redirect(`/t/${teams[0].slug}/dashboard`);
  }

  // 複数所属 → 直近開いていたチームへ。なければ /teams で選ばせる
  const last = await getLastTeamSlug();
  if (last && teams.some((t) => t.slug === last)) {
    redirect(`/t/${last}/dashboard`);
  }
  redirect('/teams');
}
