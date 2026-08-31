# Бюджет — трекер для переменного дохода

Продакшн-версия прототипа `budget-app-prototype.html`: Next.js (App Router) +
TypeScript + Tailwind CSS, Postgres, email/password-аутентификация, PWA.
Вся бизнес-логика (формула «нужно заработать», авто-распределение конвертов,
распознавание категорий, режим выживания и т.д.) перенесена из прототипа
1:1 — см. `lib/calc.ts`, `lib/categorize.ts`, `lib/date.ts`, `lib/repo.ts`.

## Стек

- **Frontend:** Next.js App Router, TypeScript, Tailwind CSS 4, мобильный layout.
- **БД:** обычный Postgres — работает с [Supabase](https://supabase.com) или
  [Neon](https://neon.tech) без изменений в коде, достаточно указать
  `DATABASE_URL`. Схема — `db/schema.sql`.
- **Auth:** email/пароль через [Auth.js (next-auth v5)](https://authjs.dev) с
  паролями на bcrypt, хранится в той же Postgres-базе (таблица `users`).
  Это тот же класс решения, что Supabase Auth/Clerk («обычная почта/пароль,
  ничего экзотического»), но без внешней зависимости — что упрощает
  self-hosted и локальный запуск.
- **Хостинг:** Vercel.
- **PWA:** `app/manifest.ts` + `public/sw.js` (можно «добавить на экран»).

## Локальный запуск

1. Подними Postgres (локально или Supabase/Neon) и примени схему:
   ```bash
   psql "$DATABASE_URL" -f db/schema.sql
   ```
2. Скопируй `.env.example` в `.env.local` и заполни `DATABASE_URL` и
   `AUTH_SECRET` (сгенерировать: `openssl rand -base64 32`).
3. ```bash
   npm install
   npm run dev
   ```
4. Открой [http://localhost:3000](http://localhost:3000), зарегистрируйся —
   новый пользователь видит честно пустой дашборд и мастер онбординга.

## Деплой на Vercel

1. Создай проект на Vercel из этого репозитория.
2. В Supabase/Neon создай базу, примени `db/schema.sql`.
3. В настройках проекта Vercel задай переменные окружения:
   `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL` (URL продакшн-домена).
4. Деплой.

## Структура

- `lib/categories.ts`, `lib/date.ts`, `lib/format.ts`, `lib/categorize.ts`,
  `lib/calc.ts` — чистые функции с бизнес-логикой (без побочных эффектов),
  портированные из `<script>` прототипа.
- `lib/repo.ts` — единственное место, где логика достаёт/пишет данные в
  Postgres (замена `window.storage` из прототипа на настоящие таблицы).
- `app/api/*` — тонкие route handlers: валидация запроса → вызов `lib/repo.ts`.
- `components/*` — экраны «Главное» и «Конверты», мастер онбординга, модалки.

## Важно про формулу цели

`weeksRemainingToGoal` считает недели до дедлайна цели от начала **текущей
рабочей недели** (`currentWeek.startDate`), а не от сегодняшней даты — это
намеренно исправленный баг, из-за которого цифра «нужно заработать» иначе
росла бы каждый день между зарплатами. См. `lib/date.ts`.
