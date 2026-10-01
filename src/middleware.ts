import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

export function middleware(request: NextRequest) {
  // Verificar se ADMIN_SECRET está configurado
  if (!ADMIN_SECRET) {
    // Em desenvolvimento sem secret, permitir acesso
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.next();
    }
    return new NextResponse('Servidor mal configurado: ADMIN_SECRET ausente', { status: 500 });
  }

  const pathname = request.nextUrl.pathname;

  // Proteger rotas de cron com CRON_SECRET
  if (pathname.startsWith('/api/cron')) {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse('Não autorizado', { status: 401 });
    }
    return NextResponse.next();
  }

  // Cookie de sessão do admin
  const sessionCookie = request.cookies.get('admin_session')?.value;
  if (sessionCookie === ADMIN_SECRET) {
    return NextResponse.next();
  }

  // Header de autenticação (para API calls)
  const authHeader = request.headers.get('x-admin-secret');
  if (authHeader === ADMIN_SECRET) {
    return NextResponse.next();
  }

  // Rota de login — permitir
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Redirecionar para login
  if (pathname.startsWith('/api/')) {
    return new NextResponse('Não autorizado', { status: 401 });
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
