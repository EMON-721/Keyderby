# Keyderby

A minimal typing website with graphite, white and teal styling. Open it and type; a name-only profile gets an automatic ID. There is no application login, email/password requirement, platform administrator, privileged role or management interface.

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
