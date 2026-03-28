# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Production build
npm run lint       # Run ESLint

npx prisma migrate dev --name <name>   # Create and apply a migration
npx prisma generate                    # Regenerate Prisma client after schema changes
npx prisma studio                      # Open Prisma Studio GUI
```

## Environment

Copy `.env` and fill in real values before running:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite path, e.g. `file:./dev.db` |
| `NEXTAUTH_SECRET` | Random string for session signing |
| `NEXTAUTH_URL` | Base URL, `http://localhost:3000` in dev |
| `ASSEMBLYAI_API_KEY` | AssemblyAI API key for transcription |

## Architecture

This is a **Next.js 16 App Router** app using the `src/app/` directory convention.

### Data model (`prisma/schema.prisma`)

SQLite database with four models forming a clear hierarchy:

```
User → Recording → Speaker
                 → Utterance (belongs to both Recording and Speaker)
```

- `Recording.status` is a plain string (`PENDING`, `PROCESSING`, `DONE`, `ERROR` — not yet enforced as an enum).
- `Recording.audioPath` stores the path/URL to the uploaded audio file.
- `Utterance` stores speaker-diarized transcript segments with millisecond timestamps (`startMs`, `endMs`).
- Prisma client is generated into `src/generated/prisma` (not `node_modules`).

### Auth

NextAuth v4 is the auth library. Session/user management flows through it. Passwords are hashed with `bcryptjs`.

### Transcription flow (planned)

1. User uploads audio → stored at `audioPath`, `Recording.status = PENDING`
2. API route submits audio to AssemblyAI with speaker diarization enabled
3. AssemblyAI processes and returns speaker-labeled utterances
4. Results are saved as `Speaker` + `Utterance` rows, status set to `DONE`

### Key conventions

- App Router — use `src/app/` for pages and `src/app/api/` for API routes
- Tailwind v4 (PostCSS plugin, not the v3 config file)
- No test framework is configured yet
