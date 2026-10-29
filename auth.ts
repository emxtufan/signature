// Shared login check for middleware.ts and the api/ functions.
// Credentials come from the Vercel environment variables APP_USER (default "admin") and APP_PASSWORD.
// The session cookie holds an HMAC derived from the password, so changing the password logs everyone out.

export const COOKIE = 'pv_auth';

export const credentials = () => ({ user: process.env.APP_USER || 'admin', password: process.env.APP_PASSWORD });

export async function sessionToken(user: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`pv-session:${user}`));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function isAuthenticated(request: Request): Promise<boolean> {
  const { user, password } = credentials();
  if (!password) return false;
  const match = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return match?.[1] === (await sessionToken(user, password));
}
