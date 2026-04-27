# Furniture Front

Frontend aplikacji do projektowania mebli kuchennych zbudowany w Angular 20.

## Development server

```bash
cd furniture-front/furniture-front
npx ng serve
```

Aplikacja bedzie dostepna pod `http://localhost:4200/`.

## Build

```bash
cd furniture-front/furniture-front
npx ng build --configuration=development
```

## Testy

```bash
cd furniture-front/furniture-front
npx ng test --watch=false --browsers=ChromeHeadless
```

Aktualny stan po ostatnich poprawkach: `204 SUCCESS` (2026-04-27).

## Uwagi

- Glowna logika feature'a kitchen znajduje sie w `src/app/kitchen/`.
- Layout i floor plan korzystaja z backendowego kontraktu projektu oraz ze wspoldzielonej geometrii frontendu.
- Szczegoly architektury i zasad pracy sa opisane w glownym [README](D:/IT/JAVA/Aplikacje/furniture-application/README.md) i [CLAUDE.md](D:/IT/JAVA/Aplikacje/furniture-application/CLAUDE.md).
