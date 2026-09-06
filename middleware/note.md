# 📁 `middleware/` – Mellanprogramvara & Behörighetskontroller

## 🎯 Syfte
Mellanprogramvara körs mellan det att en HTTP-begäran tas emot och innan den når kontrollern. Här skyddas sidor, sessionsdata granskas och behörigheter kontrolleras.

## 📦 Vad ska finnas här?
- Autentisering & Sessionskontroller (`requireAuth`).
- Rollbaserad behörighetsstyrning (`requireRole('ADMIN')`, `requireRole('STAFF')`, `requireRole('STUDENT')`).
- Loggning, felhanterare, säkerhetshuvuden och CSRF/CORS-skydd.

## 📄 Filer:
- `authMiddleware.js` – Verifierar om användaren är inloggad (`requireAuth`) samt begränsar åtkomst baserat på roll (`requireRole`).
