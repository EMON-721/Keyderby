# Keyderby implementation status

Implemented: minimal graphite/teal/white UI; automatic guest identity and name-only persistent profiles; no application administrator or login screen; 4,000 unique numbered/named passages (1,000 additions retain all old IDs); Easy/Medium/Difficult display labels; finite timers in every typing mode; WPM/accuracy/progress/results; automatic 2–5 player public matching with countdown; separate friends rooms with invite codes and selected timers; initial corpus setup without operator action; Cloudflare Workers/D1 deployment configuration.

Security work includes patched React packages, removal of unused starter dependencies and server-action POST surface, same-origin validation, bounded JSON bodies, hashed session/recovery secrets, ownership checks, prepared SQL, CSP script nonces and blocked private storage paths. Public source contains practice text and code, not user data or deployment credentials.

Validation: see `test-results.json` for compiled Worker integration checks and `content-validation.json` for all 4,000 passage checks. The scoring unit suite has six cases. Production dependency audit is run separately against the final lockfile. CI repeats type checks, scoring, corpus checks, build, integration and production audit.

Limits: full passage-by-passage editorial acceptance, production load testing and a comprehensive accessibility/device audit remain pending. Corpus has 60 Keyderby-written originals and 3,940 classical excerpts; international copyright clearance is not asserted. Multiplayer uses HTTP polling. Automated typing cannot be fully prevented. Preview hosting and a future deployment in the owner's Cloudflare account use separate databases.
