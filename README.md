# Libra — Autonomous AI Agent Platform

Production-ready autonomous agent built with **Next.js 14** (App Router), **TypeScript** (strict), **TailwindCSS**, and **shadcn/ui**. No LangChain, Vercel AI SDK, or agent frameworks; orchestration and tools are implemented from scratch.

## Features

- **Natural-language tasks** → Agent plans steps, selects tools, runs them, and iterates until done or max steps.
- **Tools**: Web Search (Serper), Web Scrape, Google Drive Search, Vector Search (pgvector).
- **Google Drive**: OAuth 2.0, token refresh, one-time and incremental ingestion, embeddings stored in Postgres.
- **Structured output**: `success`, `steps`, `finalAnswer` (summary, detailed_answer, sources), `tokenUsage`.

## Setup

### 1. Environment

```bash
cp .env.example .env
```

Fill in:

- `OPENAI_API_KEY` — required for agent and embeddings.
- `DATABASE_URL` — Postgres with [pgvector](https://github.com/pgvector/pgvector) (e.g. `postgresql://user:pass@localhost:5432/libra`).
- `SERPER_API_KEY` — for web search ([serper.dev](https://serper.dev)).
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — for Drive OAuth. In Google Cloud Console, add redirect URI: `http://localhost:3000/api/drive/oauth/callback` (or your `NEXTAUTH_URL` + `/api/drive/oauth/callback`).
- `NEXTAUTH_URL` — e.g. `http://localhost:3000`.

### 2. Database

Postgres with [pgvector](https://github.com/pgvector/pgvector) enabled. Migrations are managed by **Prisma**.

**Local Docker (Postgres + pgvector):**

```bash
docker compose up -d
```

Then in `.env` set:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/libra
```

**Run migrations:**

```bash
npx prisma migrate deploy
```

For a fresh DB and to create a new migration:

```bash
npx prisma migrate dev --name init
```

Generate the Prisma client after pull (or it runs automatically with `migrate dev`):

```bash
npx prisma generate
```

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

- `src/app/api/agent` — POST: run agent (body: `task`, optional `maxSteps`, `userId`).
- `src/app/api/drive/oauth` — GET: get Google OAuth URL.
- `src/app/api/drive/oauth/callback` — GET: OAuth callback, exchange code and redirect.
- `src/app/api/drive/ingest` — POST: one-time/full Drive ingestion.
- `src/app/api/drive/sync` — POST: incremental sync (body: `pageToken`, optional `userId`).
- `src/lib/agent` — Agent loop, state, types.
- `src/lib/tools` — Tool interface, registry, webSearch, webScrape, googleDriveSearch, vectorSearch.
- `src/lib/drive` — OAuth, ingest, incremental sync.
- `src/lib/vector` — Embeddings (OpenAI), similarity search (pgvector).
- `prisma/schema.prisma` — Prisma schema (DriveToken, DriveDocument, DriveChunk with pgvector).

## Safety and limits

- Max steps default 10 (configurable up to 20).
- Tool timeouts (e.g. 15s).
- Tool schema validation, safe URL allowlist for scrape, invalid LLM JSON rejected.

## License

MIT.
