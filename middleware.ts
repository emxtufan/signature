import { next } from '@vercel/functions';

// Vercel Routing Middleware: shows a login page until the visitor signs in.
// Credentials come from the Vercel environment variables APP_USER (default "admin") and APP_PASSWORD.
// The session cookie holds an HMAC derived from the password, so changing the password logs everyone out.

const COOKIE = 'pv_auth';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function sessionToken(user: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`pv-session:${user}`));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

function getCookie(request: Request, name: string): string | null {
  const match = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

const loginPage = (error: boolean, status: number) =>
  new Response(
    `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Autentificare</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #fafafa; font-family: system-ui, sans-serif; color: #171717; }
  form { width: 100%; max-width: 320px; margin: 16px; padding: 24px; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; display: flex; flex-direction: column; gap: 12px; }
  h1 { margin: 0 0 4px; font-size: 18px; font-weight: 600; }
  label { display: flex; flex-direction: column; gap: 4px; font-size: 14px; }
  input { padding: 8px 10px; font-size: 16px; border: 1px solid #d4d4d4; border-radius: 6px; }
  button { margin-top: 4px; padding: 10px; font-size: 15px; border: 0; border-radius: 6px; background: #171717; color: #fff; cursor: pointer; }
  .error { margin: 0; font-size: 14px; color: #b91c1c; }
</style>
</head>
<body>
<form method="post" action="/login">
  <h1>Proces-verbal GDPR</h1>
  ${error ? '<p class="error">Utilizator sau parolă greșită.</p>' : ''}
  <label>Utilizator <input name="user" autocomplete="username" required autofocus></label>
  <label>Parolă <input name="password" type="password" autocomplete="current-password" required></label>
  <button type="submit">Intră</button>
</form>
</body>
</html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } }
  );

export default async function middleware(request: Request) {
  const password = process.env.APP_PASSWORD;
  const user = process.env.APP_USER || 'admin';
  if (!password) return new Response('APP_PASSWORD nu este setat în Vercel.', { status: 500 });

  const token = await sessionToken(user, password);
  const url = new URL(request.url);

  if (url.pathname === '/login' && request.method === 'POST') {
    const form = await request.formData();
    if (form.get('user') !== user || form.get('password') !== password) return loginPage(true, 401);
    return new Response(null, {
      status: 303,
      headers: {
        location: '/',
        'set-cookie': `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
      },
    });
  }

  if (getCookie(request, COOKIE) === token) return next();
  return loginPage(false, 401);
}
