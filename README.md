# Splitsy

A Splitwise-style shared-expense tracker with one big difference: **modular, reusable split rules**. Save a split once — e.g. a 60/40 rent split between two people — set it as a group's default, and every new expense applies it automatically. No more re-entering the same ratio every month.

Built as a mobile-responsive web app (one deployable full-stack Next.js app), so it works from any phone or laptop browser.

## Features

- **Accounts & sessions** — email/password auth with httpOnly-cookie JWT sessions.
- **Groups** — a group can be just you and one other person, or many people. Add members by the email they signed up with.
- **Modular split rules** (the headline feature):
  - Types: **equal**, **percentage** (e.g. 60/40), **shares/ratio** (e.g. 2:1), and **exact amounts**.
  - Save a rule with a name, reuse it on any expense.
  - Mark one rule as the **group default** — it auto-applies to every new expense.
- **Expenses** — pick who paid, enter the amount, and the split is computed live before you save (cent-accurate, always sums to the total). Supports one-off custom splits too.
- **Balances & settle-up** — net balances per person plus a minimal "who pays whom" suggestion. Record a payment to settle up; payment history is kept.

## Tech stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Prisma 6** ORM with **Postgres** (Neon recommended; see Deploying below)
- **Tailwind CSS v4** for the responsive UI
- Auth: `bcryptjs` (password hashing) + `jose` (JWT), `zod` for input validation

## Getting started (self-host)

You'll need Node 18+ and a Postgres database. A free [Neon](https://neon.tech) project works great.

```bash
git clone <your-fork-url> splitsy && cd splitsy
npm install
cp .env.example .env          # then fill in the values (see Configuration below)
npm run db:push               # creates the tables in your database
```

**Create your first account.** Sign-ups are disabled by default so a stranger who
finds your deployed URL can't register. To bootstrap:

1. Set `ALLOW_SIGNUPS="true"` in `.env`.
2. `npm run dev`, open http://localhost:3000/signup, and create your account(s).
3. Set `ALLOW_SIGNUPS="false"` again (and redeploy) to lock it back down.

That's it — log in, create a group, add someone by their signup email, and start splitting.

## Configuration

All configuration is via environment variables (see `.env.example`):

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string (Neon's default string is fine). |
| `AUTH_SECRET` | yes | Signs session cookies. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ALLOW_SIGNUPS` | no | `"true"` opens public sign-ups. Defaults to off. |
| `IMPORT_EMAIL_A` / `IMPORT_EMAIL_B` / `IMPORT_PASSWORD` / `IMPORT_GROUP_NAME` | no | Used only by the Splitwise importer (below). |

**Currency** is formatted as CAD in `src/lib/format.ts` — change the locale/currency there for USD, EUR, etc.

## Project layout

```
src/
  lib/
    prisma.ts      # Prisma client singleton
    auth.ts        # password hashing, JWT sessions, getCurrentUser()
    split.ts       # the split engine — computeSplit() + validateConfig()
    balances.ts    # net balances + minimal settle-up suggestions
    access.ts      # group-membership guard
    config.ts      # feature flags (signupsEnabled)
    format.ts      # currency/date formatting
    types.ts       # shared DTOs for the group page payload
  app/
    api/           # route handlers (auth, groups, expenses, configs, settle)
    login, signup  # auth pages
    dashboard/     # group list
    groups/[id]/   # group detail: expenses, balances, split rules, members
prisma/
  schema.prisma    # data model
```

## Importing from Splitwise (optional)

`prisma/import-splitwise.ts` migrates a Splitwise **2-person** CSV export into Splitsy.
Export your data from Splitwise, drop the CSV at `data/splitwise-export.csv`, set the
`IMPORT_*` vars in `.env`, then:

```bash
npm run db:seed                                    # uses data/splitwise-export.csv
# or: npx tsx prisma/import-splitwise.ts path/to/file.csv
```

The two people's names come from the CSV's last two column headers (so the script holds
no personal data). Splitwise's per-person columns are *net* values (paid − owed share)
that sum to zero per row; the importer reconstructs each expense as a single payer plus
exact shares that reproduce those nets to the cent, so balances match the export exactly.
`Payment` rows become settlements. It prints a reconciliation check and is re-runnable
(**it wipes the database and re-imports**, so only run it on a fresh/disposable DB).

## Deploying to Vercel + Neon

Recommended host: **Neon** (free tier, auto-resumes on demand) + **Vercel** (free Hobby tier).

### 1. Create the Neon database
Sign up at neon.tech → **New Project** → **Connect**, and copy the connection string into `DATABASE_URL`.

### 2. Set up the schema (run once, locally)
Put your Neon `DATABASE_URL` in `.env`, then `npm run db:push`. (Optionally `npm run db:seed` to import Splitwise data.)

### 3. Deploy on Vercel
1. Push to GitHub, then vercel.com → **Add New → Project** → import the repo.
2. Under **Environment Variables**, add `DATABASE_URL` and `AUTH_SECRET` (use a **fresh**
   secret for production, not your local one), plus `ALLOW_SIGNUPS=false`.
3. **Deploy.** The build runs `prisma generate && next build` automatically.

After deploying, bootstrap your accounts the same way as local (flip `ALLOW_SIGNUPS` to
`true`, register, flip it back), or seed the database from a CSV.

## Security notes

- `.env`, `*.db`, and `data/` are gitignored — real credentials, the local database, and
  any imported CSV **never** get committed. Only `.env.example` (placeholders) is tracked.
- The repo is safe to make public: it contains no secrets and no personal data. Keep it
  that way — never hardcode a real email, password, or connection string in source.
- Put secrets in your host's environment-variable settings, not in the repo.

## How the split engine works

`computeSplit(total, config, participants)` in `src/lib/split.ts` converts a total and a rule into per-person amounts using **largest-remainder rounding**, so the cents always add back up to the exact total. Percentages must sum to 100; shares are relative weights; exact amounts are used as-is (and gently corrected for any rounding drift). The same pure function powers both the live preview in the UI and the server-side authoritative calculation.

## License

MIT — see [LICENSE](LICENSE).
