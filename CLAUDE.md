# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Production build
npm run lint       # Run ESLint
npm run seed       # Seed two test users (alex@test.com / demo@test.com, password: password123)

npx prisma migrate dev --name <name>   # Create and apply a migration
npx prisma generate                    # Regenerate Prisma client after schema changes
npx prisma studio                      # Open Prisma Studio GUI
```

## Environment variables (`.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite path, e.g. `file:./dev.db` |
| `NEXTAUTH_SECRET` | Random string for session signing |
| `NEXTAUTH_URL` | Base URL, `http://localhost:3000` in dev |
| `ASSEMBLYAI_API_KEY` | AssemblyAI transcription + diarization |
| `ANTHROPIC_API_KEY` | Claude Haiku for AI analysis |
| `TAVILY_API_KEY` | Tavily web search for fact-checking |

## Architecture

**Next.js 16 App Router** app, `src/app/` directory convention.

### Route groups
- `src/app/(auth)/` — sign-in, sign-up pages (no nav)
- `src/app/(app)/` — protected app pages (dashboard, discussions)
- `src/app/api/` — API routes

### Data model (`prisma/schema.prisma`)

```
User → Recording → Speaker
                 → Utterance  (belongs to both Recording and Speaker)
                 → Analysis → Topic (self-referential: parentId for sub-topics)
                                   → TopicStance (per speaker per topic)
                                   → FactCheck   (cached fact-check results JSON)
```

- `Recording.status`: plain string — `PENDING`, `PROCESSING`, `DONE`, `ERROR`
- `Utterance`: millisecond timestamps (`startMs`, `endMs`), speaker-diarized text
- `Topic.parentId`: nullable self-reference — null = main topic, set = sub-topic
- `FactCheck.results`: JSON string `{ stanceVerdicts: [{ speakerId, speakerLabel, claim, verdict, assessment, sources }] }`
- Prisma client generated into `src/generated/prisma` (not `node_modules`)
- Prisma v5 (v7 dropped `url` from datasource — too much friction for this project)

### Key conventions

- **Next.js 16**: `params` is a Promise — always `const { id } = await params` in dynamic routes and pages
- **Auth**: NextAuth v4, credentials provider, JWT sessions, `bcryptjs` for password hashing. No middleware (deprecated in Next.js 16) — use `getServerSession(authOptions)` + `redirect()` per page/route
- **Tailwind v4**: PostCSS plugin only — no `tailwind.config.js`
- **shadcn/ui**: Nova/Radix preset. Components in `src/components/ui/`
- **Prisma client**: import from `@/generated/prisma` (mapped in tsconfig paths)
- **Audio uploads**: saved to `/uploads/` at project root
- **After speaker/utterance edits**: call `recalculateSpeakingTimes(recordingId)` from `src/lib/recalculate-speaking-times.ts`
- No test framework configured

### Transcription flow

1. User records audio in browser (MediaRecorder API) → POST `/api/recordings` saves file to `/uploads/`, submits to AssemblyAI (`transcripts.submit({ audio: url, speech_models: ["universal-2"], speaker_labels: true })`)
2. Status poller hits GET `/api/recordings/[id]/status` every 3s → polls AssemblyAI, saves `Speaker` + `Utterance` rows when done, sets status `DONE`
3. User can manually edit utterance speaker (PATCH `/api/utterances/[id]`) or split an utterance at a word boundary (POST `/api/utterances/[id]/split`)

### Analysis flow

1. User clicks "Analyse" → POST `/api/recordings/[id]/analyse`
2. Claude Haiku (`claude-haiku-4-5-20251001`) receives full transcript, returns hierarchical topics JSON: main topics with optional `subTopics[]`, each with stances per speaker
3. Two-pass DB save: create main topics first, then sub-topics with `parentId`
4. Results shown in `AnalysisSection` — List view (nested cards) or Bubble view (D3 force simulation)

### Fact-check flow

1. User clicks "Fact check this topic" on any topic or sub-topic card
2. POST `/api/topics/[topicId]/factcheck`:
   - **Pass 1 — Claude**: extracts a specific searchable claim from each speaker's stance
   - **Tavily**: runs one web search per claim (`searchDepth: "advanced"`, 4 results)
   - **Pass 2 — Claude**: synthesizes a verdict per speaker (supported/contradicted/nuanced/unverifiable) with source citations
3. Results saved to `FactCheck` table (upsert), returned and displayed collapsed in `FactCheckPanel`
4. Panel is always collapsed on load — header shows verdict pills per speaker; click arrow to expand

### Key component map

| Component | Purpose |
|---|---|
| `recorder.tsx` | MediaRecorder UI — idle/recording/ready/submitting, speaker count selector |
| `discussion-view.tsx` | Client wrapper owning modal state, Transcript/Timeline toggle |
| `transcript-section.tsx` | Flat transcript list with edit callbacks |
| `timeline-view.tsx` | D3 horizontal timeline, merges utterances within 3500ms gap |
| `utterance-edit-modal.tsx` | Reassign speaker or split utterance at word boundary |
| `editable-speaker-card.tsx` | Inline speaker rename, PATCH `/api/speakers/[id]` |
| `analysis-section.tsx` | Summary + List/Bubbles toggle, renders nested topic cards + FactCheckPanel |
| `bubble-graph.tsx` | D3 force simulation — main bubbles + smaller sub-bubbles with dashed connector lines |
| `fact-check-panel.tsx` | Collapsible fact-check results per topic, verdict badges + source links |
| `analyse-button.tsx` | Triggers analysis, shows "Re-analyse" if analysis exists |
| `status-poller.tsx` | Client poller — hits status route every 3s, calls `router.refresh()` when done |
