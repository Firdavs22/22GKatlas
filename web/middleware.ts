import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/invite', '/forgot', '/reset', '/privacy'];

const ROLE_PREFIXES: Record<string, string[]> = {
  admin: ['/admin'],
  superadmin: ['/admin'],
  teacher: ['/teacher'],
  parent: ['/parent'],
  psychologist: ['/psychologist'],
  pediatrician: ['/pediatrician'],
};

const ROLE_HOME: Record<string, string> = {
  admin: '/admin',
  superadmin: '/admin',
  teacher: '/teacher',
  parent: '/parent',
  psychologist: '/psychologist',
  pediatrician: '/pediatrician',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Get token from cookie (set after login)
  const token = request.cookies.get('token')?.value;
  const role = request.cookies.get('role')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Root redirect
  if (pathname === '/') {
    return NextResponse.redirect(new URL(ROLE_HOME[role || ''] || '/login', request.url));
  }

  // Role-based access
  if (role) {
    const allowedPrefixes = ROLE_PREFIXES[role] || [];
    const commonPrefixes = ['/profile', '/notifications', '/settings'];
    const allAllowed = [...allowedPrefixes, ...commonPrefixes];
    const isAllowed = allAllowed.some((prefix) => pathname.startsWith(prefix));
    if (!isAllowed) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
