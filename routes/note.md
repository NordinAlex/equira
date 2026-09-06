# 📁 `routes/` – Routing & URL-styrning

## 🎯 Syfte
Här definieras applikationens alla URL-ändpunkter (endpoints), HTTP-metoder (`GET`, `POST`, etc.) samt vilka mellanprogram och kontrollerfunktioner som ska anropas.

## 📦 Vad ska finnas här?
- Express-routrar uppdelade efter domän och roll.
- Skyddande middleware-kedjor (t.ex. `requireAuth, requireRole(...)`).

## 📄 Filer:
- `index.js` – Rotrutter och omdirigering till inloggning eller standardvy.
- `authRoutes.js` – Inloggning, utloggning och snabbväxling av testanvändare (`/login`, `/logout`, `/login/quick/:role`).
- `adminRoutes.js` – Administratörsrutter för översikt, hästar, tilldelning, elever, stalluppgifter, lektioner och quiz.
- `staffRoutes.js` – Personalens mobila rutter för dagsschema, uppgifter, häststatus och profil.
- `studentRoutes.js` – Elevens mobila rutter för översikt, lektioner, tilldelade hästar, quiz och provresultat.
- `apiRoutes.js` – REST API-ändpunkter för AJAX-anrop (t.ex. validering av hästtilldelning).
- `users.js` – Hjälprutt för användarrelaterade tester.
