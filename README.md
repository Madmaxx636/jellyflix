# Jellyflix

A desktop client for [Jellyfin](https://jellyfin.org) that can look and work like Netflix, Hulu, HBO or Disney+.
Built with Electron, React and TypeScript. Runs on Linux, Windows and macOS.

The four looks are approximations of how those services are laid out and worded. They use no logos or artwork from
any of them. Every look has the same features; the look changes the layout, the wording and the styling.

Jellyflix is an independent project. It is not affiliated with, endorsed by or sponsored by Netflix, Hulu, HBO, Max,
Disney, Disney+ or the Jellyfin project. Those names belong to their owners and are used here only to say which service
each look is modelled on.

## What it does

**Browse**
- Home: a banner, Continue Watching, Next Up, your list, recommendations ("Because you watched…", "Directed by…",
  "Starring…"), top rated, recently added, and genre rows.
- Libraries: every video library as a tile, plus collections. Each library can be filtered by genre and watched state,
  sorted (name, recently added, release date, rating, shuffle) and scrolls endlessly. Your choices are kept in the
  address, so Back and reload behave.
- Movies, TV, Genres, a page per genre (with a Movies / Shows switch), Collections, New & Popular, and People
  (everything in your library with one actor or director).
- Search across movies, shows and people, with filter chips, recent searches and suggestions.

**Your list and watched state**
- A + button on every card, banner and title page saves it to your list (Jellyfin's favourites). It has its own page and
  a row on Home. A watched button marks titles and single episodes. Changes show at once and roll back if the server
  refuses them.

**Title pages**
- Description, genres (links), cast and crew with photos, studio, available audio and subtitle languages, trailer
  button, extras, "More like this", and for shows a season menu with episode thumbnails and progress.

**Player**
- Each look has its own: where the title, the clocks and the controls sit, what the pop-ups look like and what they are
  called (see the table below). All of them offer the same things:
- Audio track and subtitle choice, quality (Auto, 1080p, 720p, 480p), speed, an episode list, a scrub bar with intro and
  credits marked, Skip Intro (a button, or automatic), a "Next episode" card with a countdown and autoplay, and resume
  from where you stopped. Progress is reported back to Jellyfin so Continue Watching stays right.
- Keys: Space or K play/pause, ←/→ or J/L ±10 s, ↑/↓ volume, M mute, F full screen, C subtitles on/off, N next episode,
  Esc closes a menu, leaves full screen, then goes back. On the seek bar itself ←/→ move 5 s, Page Up / Page Down a
  minute, Home / End jump to the ends.
- A short network or decoding hiccup is retried before you're told; a refused or failing stream says so. Media keys
  and the system's "now playing" show and control the title.

**Settings**
- Playback: autoplay next episode, skip intros, preferred audio language, subtitles (off, only when the audio isn't your
  language, always) and their language, streaming quality, default speed.
- Appearance: the look, poster size, featured banner, carousel rotation, reduced motion.
- Home screen: which rows to show and how many genre rows.
- Account: who you are and which server; switch profile, sign out, reset settings.

**Profiles**
- If the server lists its users, the sign-in screen shows them as a "Who's watching?" picker.

**Everyday behaviour**
- Back returns to where you were, with a grid's loaded titles and scroll position intact. Pages show placeholders while
  loading and a "Try again" message when something fails. If the server ends your session you are signed out with the
  reason shown.
- Everything can be reached from the keyboard (a "Skip to content" link, visible focus, Esc closes menus).
- The window remembers its size and place, and starting the app twice brings the open window forward.

## The four looks

| | Netflix | Hulu | HBO | Disney+ |
|---|---|---|---|---|
| Cards | tall posters | wide tiles | wide tiles | tall posters |
| Banner | one title | carousel | carousel | carousel and brand tiles |
| Top bar | Home · TV Shows · Movies · New & Popular · My List · Browse | Home · TV · Movies · My Stuff · Hubs · Browse | Home · Series · Movies · Hubs · My List · More | Home · Search · Watchlist · Movies · Series · Brands · More |
| Search | icon that opens a box | box in the bar | its own page | its own page |
| Your list is called | My List | My Stuff | My List | Watchlist |
| Libraries are called | Libraries | Hubs | Hubs | Brands |
| Settings are called | Account | Account | Settings | App Settings |
| Settings layout | ruled sections | cards | side menu | list of rows |
| Title page | stacked sections | tabs | tabs | tabs |
| Player | red line with the time left, title in the middle of the bar, a "You're watching" panel on pause, a speed button | green line with the time so far and left, title and episode up top, one Settings pop-up (quality, speed) | hairline, spaced capitals, square controls, Settings | white line, rewind / play / forward in the middle of the bar, Settings |
| Extra | numbered "Top 10" row | | | |

The top bar folds into a menu button when the window is narrow.

## Works with

Current Jellyfin, including 12.x, where the old `X-Emby-*` headers and `api_key` are switched off by default. Signing in
is confirmed on a real server; the rest has been checked against test servers that behave like 12.x and like an older,
routes-only server, not yet against real libraries.
The app signs in with the standard `Authorization: MediaBrowser …` header and passes the stream token as `ApiKey`.
Newer routes (`/UserViews`, `/UserItems/Resume`, `/Items/Latest`, `/Items/{id}`, `/UserFavoriteItems`,
`/UserPlayedItems`) are tried first and the older `/Users/{id}/…` ones are used when a server doesn't know them.

- Netflix's player has no quality picker, as on the real one; set the quality in Settings. The other looks have it in
  the player's Settings pop-up.
- Skipping intros and credits needs the markers Jellyfin keeps as media segments (10.10 and later).
- Playback always goes through Jellyfin's HLS stream (H.264/AAC). Choosing another audio track or quality asks the server to
  re-encode and carries on from the same spot. Direct play is not implemented.
- Text subtitles are shown by the player; picture subtitles (PGS, VobSub) are burned in by the server.
- HTTPS with a self-signed certificate is not supported yet.
- Only video libraries are browsable (music, books and live TV are hidden).

## Security

- The page runs in a sandbox with no Node access and no preload script. The only permission it can get is full screen.
- It can't navigate away from the app; web addresses (such as trailers) open in the system browser, and only http and
  https ones are offered.
- Pictures, video and API calls go to whichever server you sign in to, so the content policy can't pin them to one
  address; it does forbid plugins, frames, a `<base>` tag and form posts, and allows scripts only from the app.
- Your sign-in token is kept in the app's local storage, in its profile folder, unencrypted. Signing out removes it.
  The video address carries the token as `ApiKey`, because a video element can't send headers.

## Development
```bash
npm install
npm run dev          # the app, with live reload
npm run check        # type check, lint and unit tests
npm run build        # what `npm run test:e2e` runs against
```

Where things are:

```
src/main              the Electron side: the window, permissions and navigation limits, remembered window place
src/shared            the little that both sides use
src/renderer/src
  api/                the Jellyfin client (types, session, http, connect, client); import it from api/jellyfin
  hooks/              loading with cancel and retry, Back memory, scroll restoration, address parameters
  components/         cards, rows, the top bar, the banner, and the player's parts (components/player)
  pages/              one file per screen
  styles/             one stylesheet each for the base, the top bar, the pages and the player
  theme.tsx           everything that differs between the four looks
  settingsModel.ts    what the settings are and the logic around them
tests/unit            vitest
tests/e2e             end-to-end checks against fake servers (see its README)
build/icon.png        the app icon; `node scripts/make-icon.mjs` draws it again
```

## Packaging
```bash
npm run dist   # AppImage/deb on Linux, nsis on Windows, dmg on macOS (build on each OS)
```

## Testing
```bash
npm test               # unit tests
npm run test:e2e       # drives the built app through every look (about 25 minutes; see tests/e2e/README.md)
npm run test:e2e:signin
```
`JELLYFLIX_HIDDEN=1` runs the app offscreen with no window, so it can be driven over `--remote-debugging-port` against a
test server without anything appearing on the desktop. The end-to-end tests use it.

## License

MIT. See [LICENSE](LICENSE). The libraries the app bundles keep their own licenses: see [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt).
