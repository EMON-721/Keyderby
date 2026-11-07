# Keyderby

## Project identity

Keyderby is a typing-practice and racing application. Its timed practice, public races, friend rooms, passage rotation and global rankings are described in the sections above..


A minimal typing website with graphite, white and teal styling. Open it and type; a name-only profile gets a readable, automatically assigned driver ID such as `KD-22301`. There is no application login or email/password requirement.

Created by **Md. Emon Hossain**.

## Public Race connection recovery

A temporary browser/network interruption must not remove a player from an active public waiting room. The server now retains memberships until an explicit leave or normal room closure; it counts only recently connected players for auto-start, avoiding races with disconnected opponents. Room refresh restores the player's presence, and repeated **Enter race** reconnects to the existing room without consuming another passage. If a player has already lost their public room membership from an older deployment, the page offers **Reconnect to Public Race** instead of asking for a private invite code. Tests cover 45 seconds offline, recovery and no accidental new assignment.

## Automatic level rotation (no difficulty controls)

In **Practice**, only the Duration input is visible; the previous Difficulty dropdown, automatic-assignment counter, and passage-count label are removed. The **backend selects difficulty automatically in the repeating sequence Easy → Hard → Medium → Mixed**; Mixed draws any unseen passage. Each profile continues to receive each of its 3,200 Practice passages once before a fresh cycle. If a specific difficulty runs out, another unseen passage is used instead of repeating. Existing profile history remains intact.

**Public Race** (600 separate passages) and **Friends Race** (200 separate passages) each use their own room-level Easy → Hard → Medium → Mixed rotation. Every newly created race room receives the next unused passage from its own pool. All players in that room share that same text; user-visible race difficulty controls and labels are hidden. Public Race has a fixed 60-second timer, while Friends Race hosts can still choose the time and number of players. Nothing removes the duration selection or private-room controls.

## Automatic non-repeating Practice rotation

Each browser profile gets its own server-side Practice sequence. The next unseen passage is assigned automatically: no user-facing dropdown, search or manual repeat. All **3,200 Practice passages** are assigned once per profile/cycle before the next cycle begins; the first new-cycle passage differs from the last previous-cycle passage. The server automatically alternates Easy/Hard/Medium/Mixed difficulty slots; when a level is exhausted, remaining unseen Practice texts are assigned instead of repeating early. The user chooses duration, but cannot choose a passage. A unique idempotency key prevents retries assigning two texts.

The append-only D1 migration `0009_per_user_practice_rotation` counts previously completed Practice/Timed Test passages in cycle one. A passage counts as *seen* when assigned, including if the browser closes before the user types it; this ensures no repeated preview after refresh. Profile IDs, saved attempts, recovery codes and 800 Race passages are preserved. Public/Friends Race must give all room members a shared passage, so this independent rotation applies to **Practice only**.

## Passage allocation — 4,000 unique records, no overlap

Every published passage belongs to exactly one category, assigned by a non-destructive, append-only database migration:

- **Practice: 3,200** passages. Easy 1,502, Medium 898, Difficult 800. Mixed shows these 3,200, not the Race content.
- **Public Race: 600** passages. Shared by players in public matchmaking rooms.
- **Friends Race: 200** passages. Selected automatically by the room-level Easy → Hard → Medium → Mixed rotation, not by a host-selected difficulty.

Search and selection now share one field. The old “X shown · Y available” line and Timed Test tab have been removed from the UI. Timed duration controls and historical test results remain. Worldwide rankings display **Top 30** users, not Top 20. Server-side checks prevent Race-only passages being submitted as Practice; unit/integration tests verify each activity's pool and all 4,000 unique IDs.

## How to use Keyderby

1. Open the website and choose **Practice**. Select Easy, Medium or Difficult, a passage, and a 15–300 second timer. Press **Start practice** and begin typing. The timer starts on your first keystroke.
2. Watch your live WPM, accuracy, remaining time and car progress. When time ends, your result is saved automatically. **Progress** shows your previous results.
3. Open **Practice** to receive an automatic passage. Choose only a Duration; the server rotates Easy, Hard, Medium, Mixed automatically without displaying a difficulty picker or passage count. All 3,200 Practice passages appear once per profile cycle. Race keeps 600 Public and 200 Friends passages in independent automatic room sequences.
4. For a public match, open **Race** and press **Enter race**. You join a pool of 2–5 real players automatically; after another person joins, a shared countdown starts. Everyone types the same passage for 60 seconds.
5. To race friends, choose **Race → With friends**. One player creates a private room and shares its code or invite link. Friends join, mark themselves ready, and the room creator starts the timed race.
6. Click **Add your name** to save a display name. Keyderby automatically assigns a readable, permanent driver ID such as `KD-22301` and remembers your progress in this browser. No sign-in is required. An optional recovery code under Profile can help restore your profile on another browser.

## What works

- **4,000 unique passages**, with the previous 3,000 retained and **1,000 additional source-traceable texts**: 1,877 Easy, 1,123 Medium and 1,000 Difficult. Each has a stable code, title, provenance and difficulty.
- Every typing session has a 15, 30, 60, 120 or 300 second limit. No unlimited mode or timer pause.
- Live corrected WPM, accuracy, character feedback, car progress and private saved results.
- **Race → Enter race** automatically joins a public pool of 2–5 real players. A second player starts a 12 second joining window; a full grid shortens the countdown. Public races last 60 seconds and need no room creator or host action.
- **Race → Friends** creates or joins an invite-only room, with a selected timer and shared start. Its host is an ordinary participant with control of that one room.
- Private custom text, timed Practice sessions, personal progress, worldwide opt-in Top 30 rankings and optional profile recovery.

## Run locally

Use Node 24 and the pnpm version in `package.json`. Python 3 is needed only to regenerate the corpus. No application API keys are required.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm exec wrangler d1 migrations apply DB --local --config dist/server/wrangler.json --persist-to .wrangler/state
pnpm start
```

The first page visit automatically inserts missing passages from the 4,000-record bundle in D1. After the latest D1 migration, 3,200 are in the Practice catalog (with paginated metadata), 600 in Public Race and 200 in Friends Race. Automated integration tests enumerate all 3,200 Practice choices and verify 800 separate racing choices. There is no seed endpoint or manual content setup. `pnpm dev` runs the development UI. Retained migrations are append-only historical records; the current schema has no privileged account fields or management tables. Never replay migrations directly on an existing database; use Wrangler's migration journal.

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

## Website layout and profile controls

The public footer contains only a centered copyright/creator line. The Typing guide, Privacy and Text sources *footer links* have been removed without deleting the underlying source attribution files. The top navigation shows only **Practice, Race, Rankings**. **My progress**, settings and appearance/dark mode are inside the profile dropdown for every user, including guests; saved progress data remains available. The Practice page no longer shows the 3,000-passages shortcut or inline book/source/license accordion beneath the passage. Passage content and source/license records remain available in the repository and published `/sources/` files.

## Global rankings and online users

- The former **Words** navigation and its vocabulary/repeat-word module have been removed. Only Practice, Race and Rankings remain in the top navigation. Progress, settings and dark mode are inside the profile menu.
- **Rankings** presents up to **30 real, qualifying users**, never fabricated entries. Filter by practice or race; time period; difficulty; and duration. The global board accepts players worldwide.
- Only named users who explicitly turn on public ranking visibility in **Settings → Global rankings & privacy** appear. This consent also permits their recent online status, aggregate practice time/session count and optional, self-reported country plus flag to appear. Hidden or guest profiles are never listed. Online means a visible browser has contacted the server in the past two minutes, not a guaranteed persistent connection.
- Rankings show the best corrected WPM and average accuracy for the selected mode/difficulty/duration/period, plus each opted-in user's all-time number of completed standard practice/test/race sessions and total minutes. Qualifying attempts need 150+ typed characters, at least 15 seconds, 90%+ accuracy, and a completed timer, with existing speed and integrity checks. Old practice results recorded before the eligibility rule changed may not qualify retroactively.
- The service records an activity timestamp for presence. Countries and flags come from an optional ISO country/territory selector; the service never infers location from IP addresses. D1 migrations add the activity column and readable ID allocation with append-only backfilling. Apply with `pnpm cloudflare:migrate` before deploying this version. Existing internal random IDs and recovery credentials remain unchanged.

## Profiles and privacy

Each user gets a sequential public label (not a login credential), backed by a separate, random internal identifier. The server silently creates a random 256-bit browser session, stores only its hash and sets an HttpOnly, SameSite cookie (Secure over HTTPS). A display name preserves the same profile and automatic public ID; an ID is never an authentication credential. Personal requests derive ownership from the server session. Recovery codes are optional, random and stored hashed. Without the browser session or a saved recovery code, an older profile may not be recoverable.

Users can change their own name/preferences, export their own data and delete their profile. Results and rankings respect privacy settings. Private custom text is removed from completed analytics. See [security notes](SECURITY.md) for the threat model and limits.

## Passage provenance

The actual corpus contains 60 original Keyderby-written passages and 3,940 distinct excerpts from retained classical source editions. Exactly 1,000 of these excerpts are new additions, stored in two additional JSON files. Full source editions, notices, URLs and hashes remain in `public/sources`; individual passage notices and accessible source files preserve provenance. These works are catalogued as public domain in the USA; this does not assert worldwide copyright clearance.

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
pnpm security:scan
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

## Website & repository links

- **Source repository:** https://github.com/emonhossain24/Keyderby
- **Published website URL (owner-provided):** https://keyderby.emon721.workers.dev/

