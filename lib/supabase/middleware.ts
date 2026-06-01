import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { Database } from './database.types';

const PUBLIC_PATHS = [
  '/login',
  '/auth/callback',
  '/auth/set-password',
  '/auth/signout',
];

const LAST_TEAM_COOKIE = 'hisoka_last_team';
const LAST_TEAM_MAX_AGE = 60 * 60 * 24 * 365;

// 認可情報（チーム一覧 + SuperAdmin フラグ）をミドルウェア用にキャッシュする
// 短時間 cookie。同じユーザー内で 5 分間は team_members / users の DB を引かない。
// RLS でデータアクセスは別途守られているので、forgery しても実害は出ない設計。
const SESSION_CACHE_COOKIE = 'hisoka_mw_cache';
const SESSION_CACHE_TTL_SEC = 5 * 60;

interface SessionCache {
  uid: string;
  slugs: string[];
  sa: boolean;
  exp: number;
}

function readSessionCache(
  request: NextRequest,
  currentUserId: string
): { slugs: string[]; isSuperAdmin: boolean } | null {
  const raw = request.cookies.get(SESSION_CACHE_COOKIE)?.value;
  if (!raw) return null;
  try {
    const decoded = JSON.parse(atob(raw)) as SessionCache;
    if (decoded.uid !== currentUserId) return null;
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return { slugs: decoded.slugs || [], isSuperAdmin: Boolean(decoded.sa) };
  } catch {
    return null;
  }
}

function writeSessionCache(
  response: NextResponse,
  userId: string,
  slugs: string[],
  isSuperAdmin: boolean
) {
  const payload: SessionCache = {
    uid: userId,
    slugs,
    sa: isSuperAdmin,
    exp: Math.floor(Date.now() / 1000) + SESSION_CACHE_TTL_SEC,
  };
  response.cookies.set(SESSION_CACHE_COOKIE, btoa(JSON.stringify(payload)), {
    maxAge: SESSION_CACHE_TTL_SEC,
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
  });
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: any) {
          cookiesToSet.forEach(({ name, value }: any) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }: any) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // /signup は提供しない
  if (path === '/signup' || path.startsWith('/signup/')) {
    return rewriteNotFound(request);
  }

  // 公開パスはセッション更新だけして通す
  if (isPublicPath(path)) {
    return supabaseResponse;
  }

  // /invitations/[token] は未ログインでもページ側で誘導するので素通り
  if (path.startsWith('/invitations/')) {
    return supabaseResponse;
  }

  // API・静的アセット系はそのまま通す（matcher で除外しているが念のため）
  if (path.startsWith('/api/') || path.startsWith('/_next/')) {
    return supabaseResponse;
  }

  // ルート（ランディングページ）は未ログインでも表示する
  if (path === '/' && !user) {
    return supabaseResponse;
  }

  // 未認証 → /login（next 付き）
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    if (path !== '/' && path !== '/login') {
      loginUrl.searchParams.set('next', path + request.nextUrl.search);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 認証済み: cookie キャッシュを試す
  let slugs: string[];
  let isSuperAdmin: boolean;
  const cached = readSessionCache(request, user.id);
  if (cached) {
    slugs = cached.slugs;
    isSuperAdmin = cached.isSuperAdmin;
  } else {
    // キャッシュなし: DB から取得
    const { data: memberRows } = await supabase
      .from('team_members' as any)
      .select('team_id, teams:team_id ( slug )')
      .eq('user_id', user.id)
      .eq('status', 'active');

    slugs = (memberRows as any[] | null)
      ?.map((r) => r.teams?.slug)
      .filter((s): s is string => Boolean(s)) ?? [];

    const { data: meRow } = await supabase
      .from('users')
      .select('is_super_admin' as any)
      .eq('id', user.id)
      .maybeSingle();
    isSuperAdmin = Boolean((meRow as any)?.is_super_admin);

    writeSessionCache(supabaseResponse, user.id, slugs, isSuperAdmin);
  }

  // /super-admin/* は SuperAdmin のみ
  if (path === '/super-admin' || path.startsWith('/super-admin/')) {
    if (!isSuperAdmin) return rewriteNotFound(request);
    return supabaseResponse;
  }

  // チーム未所属 + SuperAdminでない → /no-team
  if (slugs.length === 0 && !isSuperAdmin) {
    if (path !== '/no-team') {
      const url = request.nextUrl.clone();
      url.pathname = '/no-team';
      url.search = '';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // /t/<slug>/* アクセス時: 所属していればそのチームを last cookie に記憶
  if (path.startsWith('/t/')) {
    const segs = path.split('/');
    const accessedSlug = segs[2];
    if (accessedSlug && slugs.includes(accessedSlug)) {
      supabaseResponse.cookies.set(LAST_TEAM_COOKIE, accessedSlug, {
        maxAge: LAST_TEAM_MAX_AGE,
        path: '/',
        sameSite: 'lax',
        httpOnly: true,
      });
    }
  }

  return supabaseResponse;
}

function isPublicPath(path: string) {
  return PUBLIC_PATHS.some(
    (p) => path === p || path.startsWith(p + '/')
  );
}

function rewriteNotFound(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = '/_not-found';
  return NextResponse.rewrite(url);
}
