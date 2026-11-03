# Cloudflare Workers + D1 deployment

## Initial deployment

1. Use Node 24 and pnpm 11.25.0. Clone this repository and run `pnpm install --frozen-lockfile`.
2. Run `pnpm build`. Keep the entire `dist/server` and `dist/client` output together.
3. Run `pnpm exec wrangler login` in your own terminal. Keep account credentials outside the repository.
4. Run `pnpm exec wrangler d1 create keyderby` and copy the returned database UUID.
5. Set `KEYDERBY_D1_DATABASE_ID` to that UUID, then run `pnpm cloudflare:config`. This prepares `dist/server/wrangler.cloudflare.json` with your D1 binding and migration path. The UUID itself is not a credential.
6. Run `pnpm cloudflare:migrate`. This applies pending schema migrations to your own D1 database.
7. Run `pnpm cloudflare:deploy`. Use the actual workers.dev URL returned by Wrangler, or attach your domain in Cloudflare.
8. Open the site. The first bootstrap request inserts the bundled 4,000 passages automatically (existing 3,000 remain unchanged). Create a name-only profile, run a short timed test and verify that results persist after refresh.
9. To check multiplayer, use separate browser profiles/devices. Both choose Race → Enter race. They should share a pool, see a countdown and receive the same passage. There are no simulated opponents.

The `.openai/hosting.json` identifier belongs to the separate preview workflow; it is not a Cloudflare API key. Your own Cloudflare deployment uses the generated Wrangler config. There are no runtime service credentials required beyond Cloudflare's managed D1 binding.

## Git-connected deployment in the Cloudflare Dashboard

The GitHub-connected Worker build runs the same production scripts. The confirmed `keyderby` database UUID is included as a **public, non-secret fallback identifier** inside `scripts/cloudflare-config.mjs`, so a missing `KEYDERBY_D1_DATABASE_ID` build variable no longer causes a build failure. An explicitly configured build variable still takes precedence, allowing a different database/account. **A plain `pnpm build` is not enough**: the build command must also run `pnpm cloudflare:config`.

1. **Create or reuse D1:** In the Cloudflare Dashboard, open **Storage & databases → D1**, create `keyderby` if needed, and copy its database ID (UUID) from its details/configuration. This database ID is not a secret; do not confuse it with an API token.
2. **Optional build variable override:** You can leave the existing `KEYDERBY_D1_DATABASE_ID` variable untouched if it already contains the correct production UUID. The owner-confirmed UUID is also the default. For a different Cloudflare account, open **Workers & Pages → keyderby → Settings → Builds → Variables and secrets** and add:
   - Name: `KEYDERBY_D1_DATABASE_ID`
   - Value: the existing `keyderby` database UUID, without quotation marks, spaces, or an extra newline.
   - Do **not** place this solely in **Settings → Variables & Secrets**, which is the *runtime* environment, not the build environment.
3. **Check build settings:** production branch `main`; root directory repository root; Build command `pnpm build && pnpm cloudflare:config`; Deploy command `pnpm cloudflare:deploy`. The generated config file is `dist/server/wrangler.cloudflare.json` and provides the Worker name `keyderby` and D1 binding `DB`.
4. **Apply database migrations before real use.** If doing so on your PC, run the initial deployment guide commands through `pnpm cloudflare:migrate`, authenticated with `pnpm exec wrangler login`. If running migrations on each Cloudflare deployment instead, use Deploy command `pnpm cloudflare:migrate && pnpm cloudflare:deploy`. That CI option requires the **Workers Builds API token** to have **D1 Edit** permission (in addition to permissions to deploy the Worker); the automatically created build token may not include D1. Select/configure a suitably scoped build token in Cloudflare rather than pasting an API token into the repository.
5. **Deploy the latest `main` commit**, rather than reopening an old failed build log. Confirm the Build step prints `Prepared Cloudflare Worker with D1 binding DB (keyderby)`. Make sure migrations are applied, the Worker is deployed successfully, and a new page visit initializes the 4,000 passages. Check profiles, saved progress and public/friends races across separate browser sessions. The previous failing log with the message `Set KEYDERBY_D1_DATABASE_ID` was produced by the old configuration and cannot be repaired retroactively.

Do not create a new production database on each retry, and never use a made-up UUID to silence validation errors. The default ID was confirmed from the owner's Cloudflare D1 screenshot and grants no database access by itself; the Cloudflare build token still requires the correct permissions. The `DB` D1 binding is written into the generated Wrangler config; it is not a normal string variable. Workers Builds settings are distinct from Pages settings. If Cloudflare's preview builds are enabled, configure an isolated preview database/config first or disable previews until a separate preview deployment is supported; do not run preview migrations on production data.

## Updates

After reviewing source changes, install from the lockfile, run the documented checks and build again. Re-run `pnpm cloudflare:config` with the same database UUID, then migrate and deploy. Do not create a new production database for each release. Do not edit or replay already-applied migrations. Back up existing data before schema changes and test restoring it.

This repository intentionally does not contain a deployment token or an automatic deployment workflow. Restrict repository write access and Cloudflare deployment rights. If you later configure Cloudflare Git builds, deploy only reviewed changes from the intended protected branch; do not expose account tokens to pull requests from forks.

## Hosting requirements

Static-only Cloudflare Pages or a static Netlify upload cannot provide this application's multiplayer and private persistence. Use Workers with the `DB` D1 binding. Netlify support would require implementing another server/database adapter first. HTTPS is required for production session cookies. Keep Cloudflare WAF/rate limits enabled according to your traffic needs.

## Verification and limits

Run `pnpm exec wrangler deploy --dry-run --config dist/server/wrangler.cloudflare.json` to inspect deployment size before publishing. The bundled corpus is public practice content. Never upload local `.wrangler` storage, database dumps, environment files, session/recovery records or private exports as assets. The Worker also blocks common private-file paths, but exclusion from the build is the primary protection.

Current tests cover application flows in Miniflare/D1. They do not prove a specific production concurrency capacity. The live review preview and your Cloudflare account are separate deployments with separate databases.

## Verify the 4,000 passages and updated user IDs on your production D1

After the new `main` commit successfully deploys, use **Cloudflare → D1 → keyderby → Console** to run these **read-only** checks against the same production D1 database that your Worker binds to:

```sql
SELECT COUNT(*) AS published_passages FROM passages WHERE status = 'published';
SELECT COUNT(*) AS newly_added_passages FROM passages WHERE id LIKE 'EXPAND-%';
SELECT difficulty, COUNT(*) AS passage_count FROM passages WHERE status = 'published' GROUP BY difficulty ORDER BY difficulty;
SELECT public_id FROM users WHERE public_id IS NOT NULL ORDER BY created LIMIT 5;
```

Expected after a successful first page request (which runs `ensureCorpus()`): **4,000 published**, **1,000 added**; 1,877 easy, 1,123 medium, 1,000 hard. User-facing IDs should start **KD-22301** and increase sequentially. The new `0007_driver_ids_from_22301` migration changes only public labels; it does **not** reset sessions, recovery credentials, attempts or existing user data. Do not drop/re-create the database.

A green GitHub test verifies the code and an isolated D1 database, but is not proof that the real Cloudflare Worker is using the latest commit or that production database initialization completed. Check the live Cloudflare deployment, then run these counts.
