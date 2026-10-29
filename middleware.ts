import { next } from '@vercel/functions';
import { COOKIE, credentials, isAuthenticated, sessionToken } from './auth';

// Vercel Routing Middleware: shows a login page until the visitor signs in.

const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

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
  const { user, password } = credentials();
  if (!password) return new Response('APP_PASSWORD nu este setat în Vercel.', { status: 500 });

  const url = new URL(request.url);

  if (url.pathname === '/login' && request.method === 'POST') {
    const form = await request.formData();
    if (form.get('user') !== user || form.get('password') !== password) return loginPage(true, 401);
    return new Response(null, {
      status: 303,
      headers: {
        location: '/',
        'set-cookie': `${COOKIE}=${await sessionToken(user, password)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
      },
    });
  }

  if (await isAuthenticated(request)) return next();
  return loginPage(false, 401);
}
