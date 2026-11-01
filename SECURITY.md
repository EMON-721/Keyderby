# Security

Public source is expected. Reading or forking it grants no write access to a deployed Worker, D1 database, another user's browser session or this repository. The public profile ID is not a credential. Hosting permissions and repository access still matter: a compromised maintainer or deployment account can publish harmful changes, so restrict those rights and review contributions.

## Implemented protections

- Cryptographically random browser sessions and optional recovery codes; only their hashes are stored. HttpOnly, SameSite cookies; Secure cookies over HTTPS.
- Session-derived ownership for profiles, results and exports. No administrator account, role, control API or privileged credential exists in the current application.
- Prepared SQL statements, React text escaping, same-origin mutation checks and rejection of cross-site requests. Forwarded host headers do not authorize a different origin.
- Incremental JSON body limits (64 KiB), content-type validation and basic per-IP/per-user rate limits.
- Server-owned timing and scoring, bounded durations, checkpointed deadlines, result idempotency and plausible-speed checks.
- Production HTML script nonces and Content Security Policy; nosniff, referrer/permission policy, HTTPS HSTS, and no-store on private APIs. Unused non-API POST routes are blocked.
- Private environment/storage/source-map paths are blocked; local data, builds and credentials are ignored by Git. No deployment secrets are needed by CI.
- Patched React 19.2.9 packages and pinned lockfile. CI checks the production dependency audit; Dependabot proposes updates for review.

## Limits

No software can promise complete protection. Browser automation and sophisticated score manipulation remain possible; results are recreational. Basic application rate limits are not a replacement for Cloudflare's network protections. Automated audit and integration checks are not a penetration test. Configure backups, monitor production errors, maintain dependencies and test restoration. No production load capacity is claimed.

Never commit `.env`, `.dev.vars`, account tokens, user database files/dumps, private exports, session values or recovery codes. Never grant forks or unreviewed pull requests production deployment credentials. GitHub CI has read-only repository permissions and does not deploy.

For a vulnerability, use GitHub's private vulnerability reporting for this repository if enabled. Otherwise contact the repository owner privately; do not post secrets or user records in a public issue. Do not test destructive actions against real users.
