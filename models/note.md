# 📁 `models/` – Datamodeller & Vymodeller

## 🎯 Syfte
Här definieras datastrukturer för applikationen, både hur information sparas i databasen (ORM Entities) och hur den formateras för gränssnittet (ViewModels).

## 📦 Vad ska finnas här?
- **`entities/`**: TypeORM-definitioner (`EntitySchema`) för alla databastabeller och deras relationer.
- **`viewModels/`**: Presentationsklasser som sammanställer och formaterar rå databasdata innan rendering (t.ex. datumformat, initialer, badge-färger och statuskalkyler).
