import { next } from '@vercel/functions';

// Vercel Routing Middleware: asks for a password (HTTP Basic auth) before serving any page.
// The password is the APP_PASSWORD environment variable set in the Vercel project.
export default function middleware(request: Request) {
  const password = process.env.APP_PASSWORD;
  if (!password) return new Response('APP_PASSWORD nu este setat în Vercel.', { status: 500 });

  const auth = request.headers.get('authorization') || '';
  const [scheme, encoded] = auth.split(' ');
  if (scheme === 'Basic' && encoded) {
    const decoded = atob(encoded);
    if (decoded.slice(decoded.indexOf(':') + 1) === password) return next();
  }

  return new Response('Parolă necesară.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Proces-verbal GDPR", charset="UTF-8"' },
  });
}
