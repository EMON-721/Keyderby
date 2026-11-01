# Keyderby

A minimal typing website with graphite, white and teal styling. Open it and type; a name-only profile gets an automatic ID. There is no application login, email/password requirement, platform administrator, privileged role or management interface.

Created by **Md. Emon Hossain**.

## How to use Keyderby

1. Open the website and choose **Practice** or **Timed test**. Select Easy, Medium or Difficult, a passage, and a 15–300 second timer. Press **Start practice** and begin typing. The timer starts on your first keystroke.
2. Watch your live WPM, accuracy, remaining time and car progress. When time ends, your result is saved automatically. **Progress** shows your previous results.
3. Open **3,000 passages** to browse or search the full library. Every passage has a title, difficulty and number such as E0001. Choose **Practice this passage** to type it.
4. For a public match, open **Race** and press **Enter race**. You join a pool of 2–5 real players automatically; after another person joins, a shared countdown starts. Everyone types the same passage for 60 seconds.
5. To race friends, choose **Race → With friends**. One player creates a private room and shares its code or invite link. Friends join, mark themselves ready, and the room creator starts the timed race.
6. Click **Add your name** to save a display name. Keyderby creates your ID automatically and remembers your progress in this browser. No sign-in is required. An optional recovery code under Profile can help restore your profile on another browser.

## What works

- 3,000 unique passages: 1,000 Easy, 1,000 Medium and 1,000 Difficult. Each has a stable code, title, source and difficulty.
- Every typing session has a 15, 30, 60, 120 or 300 second limit. No unlimited mode or timer pause.
- Live corrected WPM, accuracy, character feedback, car progress and private saved results.
- **Race → Enter race** automatically joins a public pool of 2–5 real players. A second player starts a 12 second joining window; a full grid shortens the countdown. Public races last 60 seconds and need no room creator or host action.
- **Race → Friends** creates or joins an invite-only room, with a selected timer and shared start. Its host is an ordinary participant with control of that one room.
- Private custom text, focused word practice, daily tests, personal progress and optional profile recovery.

## Run locally

Use Node 24 and the pnpm version in `package.json`. Python 3 is needed only to regenerate the corpus. No application API keys are required.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm exec wrangler d1 migrations apply DB --local --config dist/server/wrangler.json --persist-to .wrangler/state
pnpm start
```

The first page visit automatically initializes the 3,000 bundled passages in an empty database. There is no seed endpoint or manual content setup. `pnpm dev` runs the development UI. Retained migrations are append-only historical records; the current schema has no privileged account fields or management tables. Never replay migrations directly on an existing database; use Wrangler's migration journal.

## Deploy to your Cloudflare account

This application needs a **Cloudflare Worker and D1**, not only static hosting. A login-free frontend still needs a backend for shared races and private results. See [the deployment guide](docs/CLOUDFLARE.md) for exact commands. Cloudflare account authorization happens in your local terminal or hosting setup, never inside the website or public repository.

```bash
pnpm build
pnpm exec wrangler login
pnpm exec wrangler d1 create keyderby
# Use the database ID returned above; it is an identifier, not a secret.
export KEYDERBY_D1_DATABASE_ID=YOUR_DATABASE_ID
pnpm cloudflare:config
pnpm cloudflare:migrate
pnpm cloudflare:deploy
```

## Deploy through Cloudflare Dashboard (Git-connected Worker)

For a Worker connected to the GitHub `main` branch, use **Workers & Pages → keyderby → Settings → Build**. This is different from the command-line deployment above.

1. In **Storage & databases → D1**, create a database named `keyderby` if it does not already exist. Copy its **database ID (UUID)**, not an account ID, API token or database name. Reuse the existing production D1 database on future deployments.
2. Under the Worker's **Settings → Build → Build variables and secrets**, create a **build-time variable** named `KEYDERBY_D1_DATABASE_ID` with the exact UUID. Do **not** put it only in the runtime **Settings → Variables & Secrets** section: `scripts/cloudflare-config.mjs` needs it during the build.
3. Set root directory to the repository root, production branch to `main`, **Build command** to `pnpm build && pnpm cloudflare:config`, and **Deploy command** to `pnpm cloudflare:deploy`. Do not use the default `wrangler deploy` without the generated config.
4. **Before first use, apply the database schema** with `pnpm cloudflare:migrate` from a locally authenticated Wrangler session after `pnpm build` and `pnpm cloudflare:config` (using the same UUID). Alternatively set **Deploy command** to `pnpm cloudflare:migrate && pnpm cloudflare:deploy` **only if** the Cloudflare build token has **D1 Edit** permission in addition to Worker deploy access. Workers Builds' automatically generated tokens may lack D1 Edit.
5. Save Build settings and **Retry deployment**. Check both the deployment success and a real practice/profile flow at the resulting workers.dev URL.

The generated config supplies the `DB` binding. Adding an unrelated D1 database as a runtime text variable will not fix it. For database IDs, commands and first-run verification see [the deployment guide](docs/CLOUDFLARE.md). Do not commit credentials or local database contents to GitHub.

No automatic production deployment is configured in GitHub. Contributions and forks cannot change an already deployed Worker. Only authorized repository and Cloudflare account actions can publish a new version. Keep write/deployment access restricted and review changes before deploying. Netlify would require a separate server/database adapter; the current production target is Cloudflare Workers/D1.

## Profiles and privacy

The server silently creates a random 256-bit browser session, stores only its hash and sets an HttpOnly, SameSite cookie (Secure over HTTPS). A display name preserves the same profile and automatic public ID; an ID is never an authentication credential. Personal requests derive ownership from the server session. Recovery codes are optional, random and stored hashed. Without the browser session or a saved recovery code, an older profile may not be recoverable.

Users can change their own name/preferences, export their own data and delete their profile. Results and rankings respect privacy settings. Private custom text is removed from completed analytics. See [security notes](SECURITY.md) for the threat model and limits.

## Passage provenance

The actual corpus contains 60 original passages and 2,940 classical excerpts. Full source editions, notices, URLs and hashes remain in `public/sources`; the website links to them. These works are catalogued as public domain in the USA; this does not assert worldwide copyright clearance.

```bash
node scripts/generate-content.mjs
python3 scripts/curate-corpus.py
node scripts/number-passages.mjs
pnpm content:validate
```

Validation checks unique text/IDs, titles, numbering, word counts, difficulty bounds and provenance. Full individual editorial review is still pending. Difficulty uses text-length and readability heuristics. See [content notes](docs/CONTENT.md). Content is a versioned source asset; runtime initialization inserts missing IDs automatically. Changing existing published text requires a deliberate data-version migration.

## Verification

```bash
pnpm exec tsc --noEmit
pnpm test
pnpm content:validate
pnpm build
pnpm test:integration
pnpm audit --prod
```

The integration suite runs the compiled Worker with disposable Miniflare/D1 storage. It verifies automatic content initialization, name-only profiles, ownership, recovery, finite timers, deadline enforcement, scoring, private rooms, public matching, capacity/countdowns, opt-out, CSRF/body validation and blocked private paths. No real users are used in these tests. GitHub CI runs these checks without deployment credentials.

## Practical limits

Race progress uses one-second polling, not WebSockets. Scoring is computed on the server from submitted text and server time; this discourages trivial score injection but cannot eliminate automated typing or sophisticated cheating in an open browser. Results are not suitable as proof of identity or high-stakes certification. Production concurrency/load testing and a full accessibility/device audit have not been completed. Configure infrastructure backups and test restoration before relying on stored production data.

## Source layout

- `app/page.tsx`, `app/globals.css`: minimal UI and typing engine.
- `app/api/[...path]/route.ts`: self-service API, ownership and timed results.
- `lib/racing.ts`, `lib/corpus.ts`: automatic matching and content initialization.
- `lib/http-security.ts`, `worker/index.ts`: request limits, same-origin checks and response security.
- `db/schema.ts`, `drizzle/`: current schema and immutable migrations.
- `content/`, `public/sources/`: real passage corpus, source editions and licenses.
- `tests/`, `docs/`: reproducible checks and deployment instructions.
