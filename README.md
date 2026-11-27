# Jellyflix

A desktop client for [Jellyfin](https://jellyfin.org) that can look and work like Netflix, Hulu, HBO or Disney+.
From version 1.0 it is a native program (Qt 6 for the windows, mpv for the video; the code is in `native/`), so every video,
audio and subtitle format plays as the file it is and the server never converts anything. Releases 0.x were built with
Electron, React and TypeScript (the code is still in `src/`). Runs on Linux and Windows (the macOS build exists and passes its
tests, but is not released yet).

**Install:** the release page has a Linux `.deb` (`sudo apt install ./Jellyflix-…-linux-amd64.deb`) and a Windows `.zip`
(unzip it anywhere and run `jellyflix.exe`; it is not signed, so SmartScreen warns once). Everything below describes the
features; the sections on Electron, packaging and the web-engine tests describe the 0.x app.

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
  and the system's "now playing" show and control the title. On Windows, and on Linux desktops with a screen saver service
  (KDE Plasma, GNOME and most others), the screen stays on while a video plays (the display, screen saver and lock screen
  wait) and is let go when you pause or leave.

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
- Touch screens: touching the screen switches to touch controls by itself (bigger buttons, cards that show their buttons
  without hovering, swipeable rows and banner) and moving a mouse switches back. In the player a tap shows or hides the
  controls and a double tap skips 10 seconds back or forward (or pauses, in the middle). Settings > Touch controls can
  force it on or off.
- Updates: see below.

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
- The seek bar shows a preview picture when you point at it, if the library has made them (Jellyfin 10.9 and later,
  "Trickplay" in the library settings).
- The window can be as small as 420 px wide, so it fits half a screen; the player and the pages rearrange themselves.
- Skipping intros and credits needs the markers Jellyfin keeps as media segments (10.10 and later).
- Playback: the app asks its own video engine which codecs it can decode and tells Jellyfin, so a file that fits is played as
  it is (seeking is instant), and what fits depends on the computer (HEVC and AV1 usually work where the hardware or system
  supports them). By default the app never has the server convert (re-encode) anything: a file it can't play is offered to
  another player on the computer (mpv or VLC, if installed) as the file itself, or can be converted once, from the message.
  Settings > Playback turns converting back on for files that need it, in which case the server makes an HLS stream, copying
  whatever it can. Choosing another audio track, a picture subtitle or a quality asks for a new stream and carries on from
  the same spot. (Only checked against test servers so far, not a real library: whether a real server will copy a stream
  into HLS when told not to convert is worth watching.)
- Formats the built-in engine can't decode, such as AC3, E-AC3, DTS and TrueHD audio in most builds: either open the file in
  mpv or VLC, or swap the engine's decoder library for a fuller one. The app looks at what the engine can play every time it
  starts, so a fuller library is picked up with no change to the app: replace `ffmpeg.dll` (Windows), `libffmpeg.so` (Linux)
  or `libffmpeg.dylib` (macOS, inside the app's Frameworks folder) with a build of Electron's decoder that includes the extra
  codecs. This project doesn't ship one: such builds carry patent and licence conditions of their own, and have to match the
  Electron version (see the version in Settings > About).
- Text subtitles are shown by the player; picture subtitles (PGS, VobSub) are burned in by the server.
- A server with a certificate it made itself: the first time, the app shows the certificate and asks whether to trust
  that server. The choice is remembered for that exact certificate (a changed one is asked about again), and Settings > About
  can forget it.
- Only video libraries are browsable (music, books and live TV are hidden).

## Android and Google TV

Every release also has an `.apk` for Android phones, tablets and Google TV (Android 7 or newer). It is one app: on a TV it
shows up in the launcher row and works with the remote. Download it from the release, open it on the device, and allow the
install when Android asks (it is not on Google Play). The app is signed with the project's key, so a newer `.apk` installs
over an older one. The source is in `android/`.

## Updates

The app asks GitHub for the newest release when it starts and every six hours, and tells you when there is one. The
Windows installer and the Linux AppImage download it in the background and offer "Restart now"; the other installs (macOS,
the portable exe, deb, rpm, pacman, tar.gz) show a "Download" button that opens the release page. macOS builds are not signed,
which is why they can't replace themselves. Settings > About has "Check now" and a switch to turn the automatic check off.
Nothing is sent to GitHub besides the request for the release.

## Security

- The page runs in a sandbox with no Node access. Its only way to the main process is a small preload script that lets it
  ask about updates. The only permission it can get is full screen.
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
