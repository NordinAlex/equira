# 📁 `views/admin/` – Administratörsgränssnitt

## 🎯 Syfte
Här samlas alla vyer för administratörens desktopgränssnitt i Equira (översikt, hästhantering, tilldelning, schemaläggning, elever, stalluppgifter och quiz).

## 📦 Vad ska finnas här?
- Desktopanpassade tabeller, kortvyer och formulär.
- Drag-and-drop-gränssnitt för hästtilldelning med SvRF-valideringsvarningar.

## 📄 Befintliga filer:
- `overview.ejs` – Administratörens instrumentpanel med KPI:er, dagsschema och snabbåtgärder.
- `horses.ejs` – Hästöversikt med status, boxnummer och bärighetsdata.
- `horseCreate.ejs` – Registrering av ny häst (SvRF maxvikt, temperament, utbildningsnivå).
- `horseAssign.ejs` – Visuell hästtilldelning per lektion med realtidsvalidering.
- `lessons.ejs` – Lektionsöversikt med beläggningsgrad och tilldelningsstatus.
- `lessonCreate.ejs` – Skapa lektion med instruktör, arena och maxdeltagare.
- `students.ejs` – Elevlista med SvRF-data, status samt Redigera- och Ta bort-knappar.
- `studentCreate.ejs` – Registrering av ny elev med mått och nödkontakt.
- `studentEdit.ejs` – Redigering av elevuppgifter och radering via farlig zon.
- `stableTasks.ejs` – Dagliga stalluppgifter med kvittering, redigering och radering.
- `stableTaskCreate.ejs` – Skapa ny stalluppgift och tilldela personal.
- `stableTaskEdit.ejs` – Redigera stalluppgiftens tid, prioritet eller tilldelning.
- `quizzes.ejs` – Översikt över kunskapsprov och resultatstatistik.
- `quizCreate.ejs` – Skapa nytt kunskapsprov med frågor och förklaringar.
- `schedule.ejs` – Veckoöversikt över anläggningens ridbanor och lektioner.
