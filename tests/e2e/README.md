# End-to-end tests

These drive the **built** app through every look against fake Jellyfin servers and check both what it shows and what it
sends. The app runs offscreen (`JELLYFLIX_HIDDEN=1`), so no window appears on your desktop.

```bash
npm run test:e2e          # every area in every look (about 25 minutes; see below to split it)
npm run test:e2e:signin   # the sign-in screen against servers that behave in different ways (under a minute)
```

Both build the app first. The video checks need `ffmpeg` (it makes a 12-second test clip once, into `.cache/`); without it
they are skipped and the rest still runs. Screenshots, logs and anything else a run produces go to `.out/`.

## Narrowing a run

```bash
AREAS=nav,browse LOOKS=netflix node tests/e2e/features.mjs
```

| Variable | Meaning |
|---|---|
| `AREAS` | `nav,browse,details,home,search,settings,collapse,profiles,player,robust,compat` (default: all) |
| `LOOKS` | `netflix,hulu,hbo,disney` (default: all) |
| `TAG` | name for the log file and screenshots |
| `BASE`, `CDP` | first mock-server port (default 8096) and DevTools port (default 9333); change both to run two at once |
| `WATCH` | give up after this many seconds (default 560) |

A run exits non-zero if any check failed.

## What's here

- `lib/mock-jellyfin.mjs` is the fake server: made-up titles, generated art, one real HLS clip, favourites and watched flags
  kept in memory. It has several personalities (`MOCK_MODE`): `normal`, `modern` (behaves like Jellyfin 12: legacy auth off,
  old routes gone), `oldroutes`, `legacy`, `collapse` (a user with "Group movies into collections" on), `nginx400`,
  `notjellyfin` and `redirect`. It sends no CORS headers, so the app's own handling is what gets tested. A test can make it
  fail on purpose (`fail('/Genres', 500)`, or `fail('', 401)` for a revoked token) and put it right again (`heal`).
- `lib/rig.mjs` starts the servers and the app and drives the app over the Chrome DevTools protocol.
- `lib/app.mjs` knows about Jellyflix itself: signing in without typing, switching the look, what each look calls things.
- `features.mjs` and `signin.mjs` are the checks.
