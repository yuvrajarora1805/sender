import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export function middleware(request: NextRequest) {
  const adminAuth = request.cookies.get('admin_auth')?.value;
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

  // Ignore API routes
  if (isApiRoute) {
    return NextResponse.next();
  }

  // Not logged in and not on login page -> Redirect to login
  if (!adminAuth && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Logged in but on login page -> Redirect to dashboard
  if (adminAuth && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}
 
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
