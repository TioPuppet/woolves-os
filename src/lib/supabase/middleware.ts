import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options: CookieOptions };

const AUTH_ROUTES = ['/login', '/signup'];
const ONBOARDING_ROUTE = '/onboarding';

/**
 * Refreshes the Supabase session on every request and enforces routing (R5:
 * first screen after login is always the Today Dashboard):
 *   - no session            → /login
 *   - session, auth route   → / (or /onboarding if pending)
 *   - session, not onboarded → /onboarding
 *   - session, onboarded, on /onboarding → /
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = AUTH_ROUTES.includes(path);

  // Not signed in → only auth routes are allowed.
  if (!user) {
    if (isAuthRoute) return response;
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Signed in: check onboarding status once.
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_done')
    .eq('id', user.id)
    .maybeSingle();

  const onboarded = profile?.onboarding_done === true;

  if (!onboarded && path !== ONBOARDING_ROUTE) {
    return NextResponse.redirect(new URL(ONBOARDING_ROUTE, request.url));
  }
  if (onboarded && (isAuthRoute || path === ONBOARDING_ROUTE)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}
