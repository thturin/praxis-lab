# TypeScript Conversion Plan

## Settings
- **Strictness:** Relaxed (`strict: false`, allow implicit any — tighten later)
- **Backend runtime:** `tsx` (runs .ts files directly, no compile step)
- **Strategy:** Set up TS alongside JS, convert files incrementally over time

---

## Lab Creator API — `lab-creator/server/` (DONE)

### What was done
1. Installed `typescript`, `tsx`, `@types/node`, `@types/express`, `@types/multer` as devDependencies
2. Renamed `jsconfig.json` → `tsconfig.json` with updated config (`allowJs: true` so JS and TS coexist)
3. Updated `package.json` — `start` script uses `tsx app.js`
4. Updated `eslint.config.mjs` — added `.ts`/`.tsx` to file patterns
5. Updated `docker-compose.override.yml` — lab-creator-api dev command uses `nodemon --exec tsx`

### Files to convert (20 JS files)
- [ ] `app.js`
- [ ] `controllers/labController.js`
- [ ] `controllers/questionController.js`
- [ ] `controllers/gradingController.js`
- [ ] `controllers/fileController.js`
- [ ] `routes/labRoutes.js`
- [ ] `routes/questionRoutes.js`
- [ ] `routes/gradingRoutes.js`
- [ ] `routes/fileRoutes.js`
- [ ] `services/grading/gradingService.js`
- [ ] `services/prompts/gradingPrompts.js`
- [ ] `services/prompts/systemPrompts.js`
- [ ] `services/scoring/scoringService.js`
- [ ] `services/docker/dockerService.js`
- [ ] `services/docker/dockerJavaService.js`
- [x] `services/llm/llmClient.ts`
- [ ] `utils/helpers.js`
- [ ] `scripts/seedFakeSessions.js`
- [ ] `scripts/importLab.js`
- [ ] `prisma/seed.js`

---

## Portal Server — `portal/server/` (TODO)

### Setup needed
1. Install `typescript`, `tsx`, `@types/node`, `@types/express`, `@types/express-session`, `@types/passport`, `@types/bcrypt`, `@types/multer`, `@types/jsonwebtoken`, `@types/connect-redis`
2. Rename `jsconfig.json` → `tsconfig.json`
3. Update `package.json` scripts to use `tsx`
4. Update `nodemon.json` — add `.ts` to extensions, add `exec: "tsx"`
5. Update `docker-compose.override.yml` portal-api command (or rely on nodemon.json)

### Files to convert (~33 JS files)
_List to be populated when this phase begins_

---

## Portal Client — `portal/client/` (TODO)

### Setup needed
1. Install `typescript`, `@types/react`, `@types/react-dom`, `@types/jest`, `@types/node`
2. Rename `jsconfig.json` → `tsconfig.json` (CRA has built-in TS support)
3. No runtime changes needed — CRA handles TS compilation automatically

### Files to convert (~40 JS/JSX files)
_List to be populated when this phase begins_
