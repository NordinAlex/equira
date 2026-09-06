# 📁 `models/entities/` – Databas-entiteter (TypeORM EntitySchema)

## 🎯 Syfte
Här definieras tabellscheman, kolumntyper, primär- och främmande nycklar samt relationer (1:1, 1:M, M:1) för TypeORM med JavaScript.

## 📦 Vad ska finnas här?
- `EntitySchema`-definitioner för applikationens alla domänobjekt.
- Relationsregler och kaskadbeteenden (t.ex. `SET NULL`, `CASCADE`).

## 📄 Filer:
- `User.js` – Grundläggande användarkonto (inloggning, roll: ADMIN/STAFF/STUDENT, kontaktuppgifter).
- `StudentProfile.js` – Elevprofil (SvRF-vikt och längd, ridnivå, målsman/nödkontakt, medlemsstatus).
- `StaffProfile.js` – Personalprofil (anställningstitel, behörigheter, ansvarsområde).
- `Horse.js` – Hästprofil (SvRF-maxvikt, kategori, vilotider, utbildningsnivå, hälsa, box-/hagnummer).
- `Lesson.js` – Ridlektioner (arena, instruktör, lektionstyp, tid, datum, maxdeltagare).
- `LessonBooking.js` – Elevbokning på en lektion inklusive tilldelad häst och tilldelningsvarningar.
- `Arena.js` – Ridbanor och ridhus (t.ex. Stora ridhuset, Utebanan).
- `RidingGroup.js` – Elevgrupper (t.ex. Tisdagsgruppen Nivå 2).
- `StableTask.js` – Stall- och driftuppgifter (utfodring, mockning, medicinering, tillsyn).
- `Quiz.js` – Kunskapsquiz & prov i hästkunskap och säkerhet.
- `QuizQuestion.js` – Frågor kopplade till ett quiz.
- `QuizOption.js` – Svarsalternativ till frågor med markering för rätt svar.
- `QuizAttempt.js` – Elevens provsvar, poäng och resultat.
