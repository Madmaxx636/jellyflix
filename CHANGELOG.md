# Changelog

## 0.3.1 (2026-11-23)

### Added
- Android: servers with a certificate they made themselves. When a server's certificate is one the device doesn't know, sign-in
  shows it (name, issuer, dates and SHA-256 fingerprint) and asks whether to trust it. The choice is remembered for that
  exact certificate, covers and video use it too, and Settings has a button to forget the trusted certificates. If the
  server's certificate changes, the app asks again.

## 0.3.0 (2026-11-23)

### Added
- Android app for phones, tablets and Google TV, as one signed `.apk` on each release. Sign in, browse libraries, search,
  My List, details with seasons and episodes, and playback with its own controls (seek bar, 10 s jumps, audio and
  subtitle choice, skip intro, remote control keys). It plays files directly when the device can and otherwise uses the
  stream the server makes. The four looks are available in Settings, and on a TV the navigation moves to the top and tiles
  get bigger. Not there yet: update checks.

## 0.2.1 (2026-11-23)

### Added
- Direct play. The app tells Jellyfin what it can decode, so a file that fits (MP4, WebM or MKV with H.264, VP9 or AV1) is
  played as it is instead of being converted, and anything else is converted by the server using the stream address the
  server hands out, copying what it can. If a file turns out not to play, the app asks the server to convert it.
- A message under the spinner when the server is slow to send more video.
- Seek-bar previews: pointing at the bar shows a picture of that moment, when the library has Jellyfin's preview images.
- Servers with a certificate they made themselves: the app shows the certificate once and asks whether to trust the server.
  The choice is remembered for that certificate; Settings > About can forget it.

### Fixed
- In half a screen the player's controls were off the edge of the window: the window could not be smaller than 900 px, and
  below about 640 px the controls did not fit. The window can now be 420 px wide, and the player, the top bar and Settings
  rearrange themselves for narrow windows.
- Buffering: the app always asked the server to convert every video and built the stream address itself, with no limit on how
  much the server had to do. It now plays compatible files directly, uses the server's own stream address, waits longer for
  a converting server to start, and keeps more video ahead.

## 0.2.0 (2026-11-23)

### Added
- Touch screens. Touching the screen switches to touch controls by itself, and moving a mouse or trackpad switches back
  (Settings > Touch controls can force it on or off). Touch controls have bigger buttons, cards that show their buttons
  without hovering, swipeable rows, a swipeable banner, and in the player a tap that shows or hides the controls and a
  double tap that skips 10 seconds back or forward (or pauses, in the middle of the picture).
- Updates. The app looks for a newer release on GitHub when it starts and every six hours. The Windows installer and the
  Linux AppImage download it in the background and offer a restart; other installs (macOS, which is not signed, the
  portable exe, deb, rpm, pacman, tar.gz) offer a link to the download. Settings > About has "Check now" and a switch for
  the automatic check.

### Changed
- Hidden test runs are silent as well as invisible.

## 0.1.3 (2026-11-22)

### Fixed
- The Windows installer and the portable exe had the same file name, so only one of them was in the 0.1.2 release. They are now named `Jellyflix-Setup-…` and `Jellyflix-…-portable.exe`.

## 0.1.2 (2026-11-22)

### Added
- Builds for Windows (installer and portable), macOS (dmg and zip, Intel and Apple silicon) and Linux (AppImage, deb, rpm, pacman and tar.gz, x64 and arm64), made by a GitHub workflow when a version tag is pushed. The Windows and macOS builds are not signed.
- Third-party notices (THIRD-PARTY-NOTICES.txt) for the libraries the app bundles: React, react-router and hls.js among them. The file is included in the app.

## 0.1.1 (2026-11-19)

### Added
- MIT license (included in the app), and a note in the README that the project is not affiliated with Netflix, Hulu, HBO, Disney or Jellyfin.

## 0.1.0 (2026-11-19)

### Added
- The player now looks and works like each service's own. Netflix: a red progress line with the time left at its end,
  the title in the middle of the control bar, a speed button, and a "You're watching" panel with the description once
  you have been paused for a few seconds. Hulu: the title and episode up top, the time so far and the time left, and
  one Settings pop-up for quality and speed. HBO: a hairline progress bar, spaced capitals and square controls.
  Disney+: rewind, play and forward in the middle of the bar. In all of them the volume slider opens when you point at
  the speaker, pop-ups open above the button that opened them, and the episode list is by season (with a picture on
  every row; in Netflix's only on the one playing).
- Pages show placeholders while they load, and a plain message with a "Try again" button when something fails. Before,
  a failed page could stay blank, say "No results" or "No genres yet", or show a raw error.
- Back returns you to where you were: a grid keeps everything it had loaded and your place in it, and pages such as Home
  and a title show what they had at once, then bring themselves up to date in the background.
- When the server ends your session (the sign-in was revoked, the user removed, the server reset) you are signed out and
  told why, instead of every page showing errors.
- A short message when the server refuses a My List or watched change (the change is undone, as before), and when
  settings are reset.
- Keyboard use: a "Skip to content" link, a visible outline on whatever has focus, every card and episode is a real link,
  Esc closes a menu and returns focus to its button, arrow keys move between the tabs on a title page, and the seek bar
  can be used from the keyboard (arrows 5 s, Page Up / Page Down 1 min, Home / End).
- The window title names the page you are on. The window remembers its size, place and whether it was maximized, and
  starting the app a second time brings the open window forward instead of opening another. Right-click gives
  cut, copy and paste in text fields.
- Player: a buffering spinner; short network or decoding hiccups are retried before you are told anything; a refused
  stream (401, 403, 404) or a server error says so in plain words, with "Try again"; your position is also reported
  when the window is closed or reloaded; media keys and "now playing" show and control the title; the controls stay
  up while a keyboard user is on one of them.
- An app icon.
- Reduce motion starts out following the system's setting.

- Settings page (Account, Account, Settings or App Settings, depending on the look) with Playback, Appearance, Home
  screen, Account and About sections. Every option does something: autoplay next episode, skip intros (button,
  automatic or never), preferred audio language, subtitles (off, only for foreign audio, always) and their language,
  streaming quality, default speed, poster size, featured banner, carousel rotation, reduced motion, which Home rows
  to show and how many genre rows. The four looks lay it out differently.
- Libraries (Hubs, Brands): every video library as a tile, plus collections. Each library can be browsed by genre,
  watched state and sort order, with endless scrolling; the choices are kept in the address.
- Genres page and a page per genre (with a Movies / Shows switch), Movies and TV pages with a genre menu,
  Collections (box sets), New & Popular, and a People page for each actor or director.
- My List (My Stuff, Watchlist): a + button on every card, banner and title page, a page for it and a Home row. A
  watched button on titles and episodes. Changes show at once and are rolled back if the server refuses them.
- Title pages: trailer button, cast and crew with photos, extras, studio, audio and subtitle languages, "Start over",
  episode thumbnails with progress and a per-episode watched button, and collections that list their own titles. Hulu,
  HBO and Disney+ use tabs; Netflix stacks the sections.
- Home: recommendation rows ("Because you watched…", "Directed by…", "Starring…"), a numbered Top 10 row (Netflix),
  rotating carousels (Hulu, HBO, Disney+) and brand tiles under the banner (Disney+).
- Search: movies, shows and people, filter chips, recent searches and suggestions.
- "Who's watching?" profile picker on the sign-in screen when the server lists its users; Switch profile and Sign out
  in the profile menu.
- A top bar per look: its own links, wording, icons and search style, folding into a menu button on narrow windows.
- Cards show Play, add-to-list and more-info buttons on hover.

### Changed
- The player is rebuilt with its own controls in each look: audio and subtitle choice (text subtitles shown by the
  player, picture subtitles burned in by the server), quality and speed menus, an episode list, intro and credits
  marked on the scrub bar, a Skip Intro button or automatic skipping, a "Next episode" card with a countdown and
  autoplay, and keyboard shortcuts.
- Resume is reported to Jellyfin with the real position when you leave, so Continue Watching is accurate.
- Netflix's player has no quality picker, as on the real one (use Settings > Streaming quality); in the other looks
  quality and speed are in the player's Settings pop-up. The intro and credits marks on the progress line are a soft
  white instead of yellow.

- Faster to start and smaller: the app's code is minified (2.0 MB down to 0.9 MB) and the video library, more than half of
  it, is only loaded when something plays, so the first screen loads 340 KB.
- The banner on Home keeps showing the same titles when you come back to it during a visit, instead of picking new ones.
- Searching shows an error when the server fails instead of "No results".
- Settings written by an older or damaged build are checked option by option; anything unusable goes back to its
  starting value instead of breaking the app.
- Hardening: the window may only ask the system for full screen (no camera, microphone, location or notifications);
  it can't navigate away from the app, and web addresses open in the system browser; cross-origin headers are only
  added to answers from web servers; the page's content policy now also forbids plugins, frames, a `<base>` tag and form
  posts; a trailer link is only offered when it is an http or https address.

### Fixed
- Leaving a page now cancels its requests, so a slow answer for the page you left can't show up on the next one.
- Searching for the word "all" dropped the search from the address.
- The sign-in screen's fields had no labels for screen readers, and the top-bar menus claimed to be ARIA menus without
  supporting their keys; they are now plain buttons and links.
- Movies, the Movies library and Home's "recently added" row showed collection folders instead of movies on servers
  where the user has "Group movies into collections" on (the server swaps each movie for its collection in plain
  lists). Every item request now asks the server not to group, so those pages list the movies themselves and count
  them all. Collections are still on their own page.
- Autoplaying could skip an episode: a leftover countdown from the previous episode started a second jump. Found by
  testing.
- A My List or watched change made earlier in a session no longer overrides fresher data from the server.
- Sign-in failing with "400 Bad Request" on Jellyfin 12 and other servers with legacy authorization switched off (the
  default from 12.0). The app now identifies itself with the standard `Authorization: MediaBrowser ...` header instead
  of `X-Emby-Authorization`, and the stream URL carries `ApiKey` instead of `api_key`.
- Sign-in now finds the server for you: it follows redirects (for example http to https), tries https and the default
  8096 port when none is typed, and accepts a pasted web-UI link.
- Sign-in errors now say what went wrong in plain words and include what the server replied (wrong password, a port
  that expects HTTPS, something that isn't Jellyfin, a server that can't read the identification header, nothing
  reachable).
- Library calls use the current routes (`/UserItems/Resume`, `/Items/Latest`, `/Items/{id}`) and fall back to the older
  user-scoped ones on servers that don't have them.
- Episodes on tall cards show the show's poster instead of a cropped still; the nav turns solid on scroll so content
  no longer shows through the logo; the Disney+ banner fades into the page background without a hard edge.

### Developer
- `JELLYFLIX_HIDDEN=1` runs the app offscreen with no window, for driving it over `--remote-debugging-port` in tests.
- `npm run check` runs the type check, the linter (oxlint, with React and accessibility rules) and 91 unit tests (vitest).
  TypeScript is stricter (unused code and missing returns are errors).
- The end-to-end tests live in `tests/e2e` with a README, run against fake servers and fail the run when a check fails.
  A new `robust` area covers Back, keyboard use, error recovery and a revoked session; the fake server can be told to
  fail on purpose.
- The Jellyfin client is split into modules (`types`, `session`, `http`, `connect`, `client`); pages share
  `useLoad`, `useParamUpdater` and a few small components instead of each repeating the loading code. The player,
  the main process and the settings logic are split into parts.
- Removed the unused preload script and icons.

## Earlier
- Look switcher: Netflix, Hulu, HBO and Disney+ themes over the same Jellyfin library; Hulu and HBO use wide 16:9 tiles.
- Initial scaffold: login, home rows with a banner, title pages with episodes, HLS player, search.
