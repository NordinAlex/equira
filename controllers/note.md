# 📁 `controllers/` – Kontrollerlager (MVC)

## 🎯 Syfte
Kontrollerna agerar länk mellan inkommande HTTP-anrop (från `routes/`), affärslogiken (i `services/`) och gränssnittet (i `views/`).

## 📦 Vad ska finnas här?
- Request- och response-hantering (`req`, `res`).
- Validering av inkommande parametrar (`body`, `params`, `query`).
- Anrop till relevanta tjänster (`services`).
- Datatransformering via `viewModels` inför rendering av vyer (`res.render(...)`) eller omdirigering (`res.redirect(...)`).
- HTTP-statuskoder och felhantering.

## 📄 Filer:
- `adminController.js` – Hanterar administratörens vyer (hästar, lektioner, tilldelning, elever, stalluppgifter, quiz, schema).
- `authController.js` – Hanterar inloggning, utloggning och snabbväxling mellan roller.
- `staffController.js` – Hanterar personalens mobilportal (uppgiftskvittering, häststatus, profil).
- `studentController.js` – Hanterar elevernas mobilportal (mina hästar, lektioner, kunskapsquiz och resultat).
