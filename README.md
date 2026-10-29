# Proces-verbal GDPR

Semnarea procesului-verbal de instruire GDPR pe tabletă și generarea documentului Word + PDF.
Documentele se generează direct în browser; semnăturile nu sunt trimise nicăieri.

## Local

```
npm install
npm run dev
```

Pornește la http://localhost:5173 (și pe rețeaua locală, la IP-ul calculatorului).

## Vercel

1. `vercel login`
2. `vercel env add APP_PASSWORD production` (parola cerută la intrare)
3. `vercel deploy --prod`

Parola este verificată de `middleware.ts` (la login, utilizatorul poate fi orice).
