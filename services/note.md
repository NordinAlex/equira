# 📁 `services/` – Affärslogik & Domäntjänster

## 🎯 Syfte
Här ligger hjärtat i Equiras affärslogik. Tjänsterna kapslar in alla regler, databasfrågor och valideringar, oberoende av webbramverket (Express).

## 📦 Vad ska finnas här?
- Domänregler och valideringar (t.ex. SvRF-hästvälfärd, maxvikt, vilotider, dubbelbokningsspärrar).
- CRUD-operationer mot databasen via TypeORM-repositories.
- Rättningslogik och poängberäkning för kunskapsprov.

## 📄 Filer:
- `horseAllocationService.js` – Avancerad tilldelningsmotor för hästar: validerar ryttarvikt mot hästens maxvikt (SvRF), förhindrar dubbelbokningar i samma eller överlappande lektioner, kontrollerar hästens hälsa/status och rekommenderade vilotider.
- `userService.js` – Hanterar användare, autentisering (lösenordshashning), elever, personal och CRUD-operationer för elevprofiler.
- `lessonService.js` – Hanterar lektioner, schemaläggning, deltagarbokningar och arenaallokering.
- `stableTaskService.js` – Skötsel- och driftuppgifter i stallet, kvittering, prioriteringar och filtrering av hästar i behov av tillsyn.
- `quizService.js` – Hämtning av quiz, svarshantering, automatisk poängberäkning och pedagogisk feedback med förklaringar.
