# 📁 `config/` – Konfiguration & Databasanslutning

## 🎯 Syfte
Här samlas centrala inställningar och externa anslutningar för hela applikationen.

## 📦 Vad ska finnas här?
- Databaskonfiguration (TypeORM DataSource, SQLite/PostgreSQL-inställningar).
- Miljövariabler (`dotenv`), sessionsinställningar och systemkonstanter.

## 📄 Filer:
- `database.js` – Initierar TypeORM DataSource med `better-sqlite3`, registrerar alla EntitySchemas och säkerställer synkronisering av schemat.
