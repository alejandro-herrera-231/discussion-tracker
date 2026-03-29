# Discussion Tracker

A web app for recording discussions and analysing them — speaker-diarized transcripts, speaking time breakdown, AI topic analysis, and per-claim fact-checking. Built for families, partners, and friend groups to understand conversation dynamics.

---

## Prerequisites

Install these once on your machine before anything else:

- **Node.js v20+** — download from [nodejs.org](https://nodejs.org) (LTS version)
- **Git** — download from [git-scm.com](https://git-scm.com)

To check you have them:
```bash
node -v    # should print v20.x.x or higher
npm -v     # should print 10.x.x or higher
```

---

## Setup (after cloning)

### 1. Install dependencies

```bash
npm install
```

This reads `package.json` and installs everything automatically. No separate requirements file needed — this is the Node.js equivalent of `pip install -r requirements.txt`.

### 2. Create your `.env` file

Create a file called `.env` in the root of the project and paste this in:

```env
DATABASE_URL="file:./dev.db"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="any-random-string-here"

ASSEMBLYAI_API_KEY=""
ANTHROPIC_API_KEY=""
TAVILY_API_KEY=""

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

RESEND_API_KEY=""
```

Then fill in the three API keys:

| Key | Where to get it |
|---|---|
| `ASSEMBLYAI_API_KEY` | [assemblyai.com](https://www.assemblyai.com) → sign in → API Keys |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys (requires adding credits) |
| `TAVILY_API_KEY` | [tavily.com](https://tavily.com) → sign up → free tier, no card needed |

For `NEXTAUTH_SECRET`, just type any long random string — it's only used to sign session cookies locally.

### 3. Set up the database

```bash
npx prisma migrate dev
```

This creates the local SQLite database file (`dev.db`) and runs all the migrations to set up the tables. You only need to do this once (or again if the schema changes).

Then generate the Prisma client:

```bash
npx prisma generate
```

### 4. (Optional) Seed test users

```bash
npm run seed
```

Creates two accounts you can log in with immediately:
- `alex@test.com` / `password123`
- `demo@test.com` / `password123`

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Full setup in one block (copy-paste)

```bash
npm install
# create .env manually and fill in API keys, then:
npx prisma migrate dev
npx prisma generate
npm run seed
npm run dev
```

---

## API keys — cost and free tiers

| Service | Free tier | Notes |
|---|---|---|
| AssemblyAI | $50 free credits on signup | ~$0.37 per hour of audio |
| Anthropic | No free tier — requires credits | Haiku is cheap (~$0.001 per analysis) |
| Tavily | 1,000 searches/month free | No card required |

---

## Common commands

```bash
npm run dev                              # Start dev server
npm run build                            # Production build
npm run lint                             # Run ESLint

npx prisma migrate dev --name <name>     # After editing schema.prisma
npx prisma generate                      # After any schema change
npx prisma studio                        # Visual DB browser at localhost:5555
```

---

## Project structure (quick reference)

```
src/
  app/
    (auth)/          # Sign in, sign up pages
    (app)/           # Protected pages: dashboard, discussions
    api/             # Backend API routes
  components/        # All UI components
    ui/              # shadcn/ui primitives (button, badge, dialog…)
  lib/               # Shared utilities (auth config, prisma client, helpers)
prisma/
  schema.prisma      # Database schema — edit this to change the data model
  migrations/        # Auto-generated SQL history, do not edit
  seed.ts            # Test data seeding script
uploads/             # Audio files saved here when a recording is submitted
```
