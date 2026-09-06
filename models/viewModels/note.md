# 📁 `models/viewModels/` – Vymodeller & Presentationslogik

## 🎯 Syfte
Vymodellerna (ViewModels) preparerar och transformerar råa databassvar till färdigformaterade objekt anpassade direkt för EJS-mallarna. Detta håller vyerna rena från komplex JavaScript-logik.

## 📦 Vad ska finnas här?
- Formatering av tider, datum och initialer.
- Beräkning av KPI:er (t.ex. beläggningsgrad, antal lediga hästar, slutförda uppgifter).
- Tilldelning av Tailwind CSS-klasser baserat på status (t.ex. gröna/gula/röda statusbrickor).

## 📄 Filer:
- `AdminViewModel.js` – Förbereder data för adminpanelen (hästtilldelning, översikt, elever, hästlistor, lektioner, stalluppgifter).
- `StaffViewModel.js` – Förbereder personalens dagliga uppgiftsvy och hästlista med skötselstatus.
- `StudentViewModel.js` – Förbereder elevens schema, "mina hästar", tilldelade lektioner, quizfrågor och pedagogiska provresultat.
