# Engineering Baseline — Evidence Ledger

**Reference base:** `db8683c83ec883334a4125a3768d12a51a6d077e`  
**Purpose:** keep source-level facts separate from executed CI evidence.

## Present in repository

- Exact direct dependency versions are pinned in `package.json`.
- `package-lock.json` is committed at `db8683c83ec883334a4125a3768d12a51a6d077e`; its lockfile version is 3.
- The application shell uses Vite, TypeScript, Three.js and PixiJS.
- Domain helpers cover ledger-derived balance/totals, batch release gates and inventory reservation checks.
- Unit tests exist for the domain helpers.
- CI is configured to run `npm ci`, strict typecheck, unit tests, production build, master-pack validation and whitespace checks.

## Verification evidence

| Gate | Status | Evidence |
|---|---|---|
| Package/lockfile JSON parses | PASS | Checked through GitHub file retrieval and JSON parsing |
| Direct dependency pins match lockfile root | PASS | All 7 direct dependency entries match exact package.json versions |
| TypeScript strict typecheck | NOT VERIFIED | Awaiting GitHub Actions result |
| Unit tests | NOT VERIFIED | Awaiting GitHub Actions result |
| Vite production build | NOT VERIFIED | Awaiting GitHub Actions result |
| Master-pack validator in target checkout | NOT VERIFIED | Awaiting GitHub Actions result |
| Browser smoke/visual QA | NOT RUN | Requires a built browser artifact and browser runner |

## Rules

A gate becomes PASS only when the exact command runs successfully against the commit under review. Presence of a workflow or test file is not evidence that the gate passed. Record workflow run URL, tested commit SHA, command and outcome here after the run is observable.
