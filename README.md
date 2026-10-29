# Proces-verbal GDPR

Semnarea procesului-verbal de instruire GDPR pe tabletă și generarea documentului Word + PDF.
Documentele se generează direct în browser; semnăturile nu sunt trimise nicăieri.

## Local

```
npm install
npm run dev
```

Pornește la http://localhost:5173 (și pe rețeaua locală, la IP-ul calculatorului).

Local, semnăturile se păstrează doar în browser (localStorage).

## Vercel

1. Importă repo-ul în Vercel (Add New → Project).
2. Settings → Environment Variables: `APP_PASSWORD` (obligatoriu) și `APP_USER` (opțional, implicit `admin`).
3. Storage → Create → Blob → acces **Private** → conectează-l la proiect.
4. Redeploy.

- `middleware.ts` afișează pagina de login și pune cookie-ul de sesiune (`auth.ts`).
- `api/state.ts` salvează sesiunea curentă în `state.json` din Blob; la „Sesiune nouă” sesiunea veche ajunge în `arhiva/`.
