# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

This is a Docker Compose orchestrator that glues two independently-cloned applications:

```
edu-platform/
├── portal/           # Student/admin frontend + main API + BullMQ workers
│   ├── client/       # Create React App (JSX, no TS yet)
│   └── server/       # Express 5 + Prisma + plain JS (TS migration TODO)
├── lab-creator/      # Lab authoring UI + grading API
│   ├── client/       # React (JSX, no TS yet)
│   └── server/       # Express 5 + Prisma + mixed JS/TS (migration in progress)
├── analytics/        # Streamlit dashboard (Python)
└── docker-compose.yml
```

## Running the Stack

```bash
# Full dev stack (preferred — hot reload via nodemon/polling)
docker compose up --build

# Or run services individually
cd portal/server   && npm run dev       # nodemon app.js       → port 15000
cd portal/client   && npm start         # CRA dev server       → port 13000
cd lab-creator/server && npm run dev    # nodemon app.js       → port 14000
```

Port mappings (host → container): portal-client 13000→3000, portal-api 15000→5000, lab-creator-api 14000→4000, portal-db 15432→5432, lab-creator-db 15433→5432, redis 16379→6379, analytics 18501→8501.

The `docker-compose.override.yml` is for dev: it enables nodemon restarts and hot-reload env vars. In the lab-creator-api it runs `npx nodemon --exec tsx --ext js,ts,json app.js`.

## lab-creator/server Commands

```bash
npm run dev        # nodemon (used inside Docker)
npm start          # tsx app.js (production entrypoint)
npm run typecheck  # tsc --noEmit (type-check only, no output)
```

**Runtime:** `tsx` strips types and runs TS files directly — no compilation output. `allowJs: true` in tsconfig lets JS and TS coexist during migration.

## TypeScript Conversion (Active — lab-creator/server)

Migration is incremental. Current status from `docs/typescript-conversion.md`:

**Converted to `.ts`:** `gradeController.ts`, `gradeRoutes.ts`, `textGradingService.ts`, `javaGradingService.ts`, `gradingPrompts.ts`, `scoringService.ts`, `llmClient.ts`

**Still `.js`:** `app.js`, `labController.js`, `labRoutes.js`, `questionController.js`, docker services, utils, scripts, prisma seed

**Critical patterns** (see `memory/typescript-patterns.md`):
- Files without `import`/`export` are treated as scripts (global scope) — always `export const` each function instead of `module.exports`
- Use `export = router` (not `export default`) for Express router files to avoid CommonJS interop issues
- `portal/server` is still plain JS — TS migration not started there

## Key Data Models

### Lab (lab-creator Postgres)
`blocks: Json` — array of block objects stored as a JSON column. Each block is either `blockType: "material"` (HTML content) or `blockType: "question"` with `type: "short" | "textarea" | "code"`. Question IDs are timestamp-based strings (`Date.now().toString()`).

### Session (lab-creator Postgres)
`responses: Json` — `{ questionId: answerString }`, `gradedResults: Json` — `{ questionId: { score, feedback, testResults? } }`, `finalScore: Json` — `{ percent, totalScore, maxScore }`. Unique constraint on `[labId, userId]`.

## Architecture: Service Communication

```
portal-client → portal-api (port 5000)
portal-api    → lab-creator-api (LAB_CREATOR_API_URL env var)
portal-client → lab-creator-api (REACT_APP_API_LAB_HOST env var)
lab-creator-api → Docker daemon (via /var/run/docker.sock mount) for Java grading
```

## Grading Pipeline

**Text questions:** `POST /grade/deepseek` → DeepSeek AI → `{ score, feedback }`

**Java code questions:** `POST /grade/java`:
1. Strip HTML from ReactQuill output via `parseCodeFromHtml()` (normalizes class name to `Solution`)
2. Write files to `/tmp/exec-{timestamp}/` (Maven project structure)
3. Spin up `java-grading-sandbox:latest` Docker container with network disabled, volume-mounted at host path
4. Run `mvn clean test` → parse JUnit output
5. Send results to DeepSeek for feedback

**Volume mount gotcha:** The lab-creator-api container writes to `/app/tmp/exec-N/`. The java sandbox must mount the **host** path (set via `HOST_APP_PATH` env var), not the container path.

## HTML Handling

ReactQuill always produces HTML. **Strip it before AI calls or Docker execution:**
- `parseTextFromHtml(html)` — plain text extraction
- `parseCodeFromHtml(html)` — code extraction + renames class/constructor to `Solution`

Location: `lab-creator/server/services/` (check current file name — may be in a subdirectory after refactoring).

## Subquestion Scoring Rules

- If a question has `subQuestions`, the parent is NOT scored — only subquestions contribute to grade
- Each subquestion has its own `isScored` flag
- Final score calculated from all `isScored: true` questions/subquestions only

## Database

Both services use Postgres + Prisma. Run migrations:
```bash
cd lab-creator/server && npx prisma migrate dev    # local
cd lab-creator/server && npx prisma migrate deploy # production/Railway
npx prisma generate   # regenerate client after schema changes
```

Prisma Studio: `npx prisma studio` (exposed on port 5556 for lab-creator, 5555 for portal in Docker).

## Auto-save Pattern (portal/client)

`LabPreview.jsx` debounces saves every 1 second. React `setState` is async — always capture values into local variables before using them after a state update (don't read `session.finalScore` immediately after `setSession(...)`).

## Java Sandbox Docker Image

```bash
docker build -t java-grading-sandbox:latest ./lab-creator/server/docker/java-sandbox
```

The Dockerfile runs a dummy test during build to pre-download Maven/Surefire/JUnit dependencies for offline execution. Rebuild whenever `pom.xml` dependencies change.

## Plans & To-Do

All planned work lives in `docs/plans/`. When starting a new plan, create a dedicated file there (e.g. `docs/plans/remove-aiprompt.md`). The running to-do list of pending items is at `docs/plans/todo.md` — add new items there whenever a feature or refactor is deferred.

## Problems & Solutions Log

When a significant problem is encountered and resolved, add it to `docs/ideas/problems-and-solutions.md`. Include:
- What the problem was
- What was tried (including failed attempts)
- The solution
- The relevant file(s)

## Environment Variables

Root `.env` is interpolated by Docker Compose. Key variables:
- `HOST_APP_PATH` — absolute host path to `lab-creator/server/` (needed for Java sandbox volume mounts)
- `LAB_CREATOR_API_URL` — used by portal-api to call lab-creator-api internally
- `DEEPSEEK_API_KEY`, `OPENAI_API_KEY` — AI grading
- `PORTAL_DATABASE_URL`, `LABCREATOR_DATABASE_URL` — Prisma connection strings
- `REDIS_PASSWORD`, `SESSION_SECRET` — portal session infrastructure
