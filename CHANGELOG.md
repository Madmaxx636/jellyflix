# Changelog

## Unreleased

### Changed
- Touch controls on tiles now work like the web version did: the title stays on the tile and the Play and list buttons
  sit at its bottom right (bigger, with no dark panel over the picture). On tall posters the title is above the buttons.

### Fixed
- A tile's title is now shown while its picture is still loading. Before, it waited for the picture, so on a slow
  connection the tiles were blank until the pictures arrived.

## 1.0.7 (2026-11-26)

### Added
- Media controls. The keyboard's play/pause, next, previous and stop keys, headphone buttons and the desktop's own
  "now playing" widget now control Jellyflix while something plays, and show the title, series and picture.
  Linux: the standard MPRIS interface (works with KDE, GNOME, `playerctl`, KDE Connect). Windows: the media keys work
  while a video is playing (the Windows "now playing" overlay isn't done yet). Inside the player the media keys work too.
- Settings > About shows a "Taskbar icon" line (what the app tells your desktop) and a "Media keys" line.

### Fixed
- Titles missing on tiles when touch mode is on (a touchscreen laptop): the name and details were hidden under the play and
  list buttons, and only a faint ghost of the title showed through. Touch mode now shows the name, details and buttons.
- The taskbar icon not showing on Linux: the app now names itself `jellyflix` in lowercase everywhere, matching
  `jellyflix.desktop`, uses the installed icon when there is one, and the `.deb` also installs a copy in `/usr/share/pixmaps`.

## 1.0.6 (2026-11-25)

### Added
- A self-updater. The app checks GitHub for a newer release when it starts and every six hours. "Update now" (in the banner
  and in Settings > About) downloads the package for your system (the Windows installer, `.deb`, `.rpm` or Arch package),
  checks its SHA-256 against the release's list, installs it and starts the new version. On Linux the system's own
  package manager runs and asks for your password; on Windows the installer runs silently, closes the app and starts it
  again. A download that doesn't match its checksum is thrown away. A copy that wasn't installed from one of our packages
  (and macOS) is only pointed at the release page. The first update with this works from a version that already has it, so
  install 1.0.6 by hand once.
- Settings > Appearance > Titles on posters: each title's name along the bottom of its picture (on by default).

### Fixed
- Titles and pictures could be missing. Cards in the Hulu and Disney+ looks drew everything through a masking effect that
  draws nothing where it isn't supported; it is gone, so those cards always draw (their picture corners are square for now).
  A card whose picture can't be loaded shows its title instead. Episode rows now use the episode's own picture first, with an
  episode-number tile when it can't load.
- The new icon didn't show on Linux: the window didn't tell the desktop its name, so it couldn't be matched to its icon. It
  does now, every icon size is installed, and the icon caches are refreshed when a package is installed. The Windows build
  checks that the icon is inside the program file.
- The self-test used the test server's made-up (SVG) pictures only; it now loads a real JPEG poster, in the installed
  packages too.

## 1.0.5 (2026-11-25)

### Added
- A new icon: a cute jellyfish hugging a play button. It is the window icon, the Linux package icon and the Windows program icon.
- More ways to install: an `.rpm` (Fedora, openSUSE and relatives), an Arch package (`.pkg.tar.zst`) and a Windows installer
  (`-setup.exe`, no administrator prompt, Start menu entry, optional desktop shortcut and an uninstaller). Each Linux
  package was installed on a clean Ubuntu, Fedora and Arch image and checked for missing libraries, and the Windows
  installer was run and the installed program tested.

### Fixed
- The profile photo was a square picture in a round slot, with its corners showing. It is now cut to the look's shape.
- On Windows the program could fail to start outside the build machine: two QML modules the interface imports
  (`QtQuick.Layouts` and `QtQuick.Controls.Basic`) were not in the download, and Qt was not told where to find them. This
  affected the Windows zip of 1.0.0 to 1.0.4, which was only ever tested where the build tools are installed. Both packages
  now carry them, with a `qt.conf`.
- The `.deb` now lists the system libraries mpv's decoders need (OpenGL, ALSA, harfbuzz, fribidi, libusb, JACK, PipeWire) so a
  minimal install is complete.

## 1.0.4 (2026-11-25)

### Fixed
- The holiday banner didn't show Thanksgiving or Christmas movies and episodes. It looked each title up through the server's
  search, which stumbles on punctuation, accents and short words. It now reads the library's movies and series (500 at a
  time: names, tags, genres, ratings) and matches the classics list, holiday words and tags itself. Holiday episodes, such as
  The Twilight Zone's "The Night of the Meek", are found by asking the matching series for its episodes. Bad horror with a
  Christmas tag stays out, and a title only needs a picture to be featured. Settings > About says what the banner found.

## 1.0.3 (2026-11-25)

### Fixed
- Scrolling was slow and sticky, with no glide. A mouse wheel now glides instead of jumping in steps, a trackpad's smooth
  steps are followed as they come, and a finger flick keeps going after you let go. Movies, Shows and other grids only build
  the cards on or near the screen, and pictures are decoded at the size they are shown.
- The holiday banner could miss Thanksgiving and Christmas titles. Titles are now looked up by their longest word (the
  server's search is thrown off by apostrophes and punctuation), unrated titles rated for the family are kept, a single pick
  is enough to show, and Settings > About says what the banner found.

## 1.0.2 (2026-11-25)

### Fixed
- Slow loading. Home no longer waits for everything before showing anything: Continue Watching, Next Up, the newest titles
  and the libraries are asked for first and drawn as soon as they arrive, and favourites, the top list, genre rows,
  recommendations and the holiday picks follow in the background. Genre rows are only as many as Settings says and ask for
  the newest titles rather than a slow random sample; rows ask only for what a card shows; the holiday picks are kept for
  half a day.
- Pictures are cached on disk, so posters come back at once on the next start, and a server with a certificate it made
  itself now shows its pictures too.

## 1.0.1 (2026-11-25)

The native app now has the web-engine app's whole interface: it was a bare skeleton in 1.0.0.

### Added
- All four looks in full: each one's top bar, banners (single or rotating, Hulu's inset and rounded), rows with a ranked
  Top 10 and Disney+'s brand tiles, cards that grow and show Play and the list button.
- Every page: Home with recommendations and genre rows, Movies and Shows with genre, type, watched and sort choices that
  load more as you scroll, Libraries, Genres, a page per genre, Collections, New & Popular, My List, people, title pages
  with tabs, season menu, episodes with watched buttons, cast, trailers and facts, search with recents and a People
  filter, and sign-in with a "Who's watching?" profile picker.
- Settings in the four layouts (Netflix's labelled lines, Hulu's cards, HBO's sidebar, Disney+'s list), 41 options.
- The holiday banner with Thanksgiving and Christmas classics, interface size (Ctrl and + or −, Ctrl and 0, a trackpad
  pinch), touch controls (Auto, On, Off), going back by swiping in from the edge of a touch screen or with two fingers on a
  trackpad.
- The player has each look's own layout, pop-ups, skip-intro and next-episode cards, seek-bar previews and tap gestures,
  and plays everything with mpv.
- The app asks GitHub for a newer release when it starts and every six hours (nothing about you is sent) and shows a
  banner with a download button; Settings > About can check now or turn it off.
- The window remembers its size and place, and starting the app twice brings the open window forward.

### Not in yet
- macOS and Android packages in the release, media keys and the system's "now playing", and a "Try again" message on
  every page that can fail (Home has one).

## 1.0.0 (2026-11-24)

The app is rebuilt from scratch as a native program: no web engine, no Electron. Qt 6 draws the windows and mpv plays the video.

### Changed
- Every title is played as the file it is, by mpv, on your computer: every video and audio format (HEVC, AV1, AC3, E-AC3, DTS,
  TrueHD, 10-bit...), every container and every kind of subtitle (including picture subtitles), with the computer's own video
  decoder when it has one. The server never converts anything, so there is no waiting for it to start a conversion.
- The four looks (Netflix, Hulu, HBO, Disney+) are drawn natively. This release has a Windows zip (everything inside) and a
  Linux .deb (Qt and mpv inside, so it doesn't depend on the versions your distribution has). macOS and Android builds are not
  part of it yet; the Android app stays at 0.5.0.
- Sign-in guesses the address (a missing port, https or http, a pasted web link), and a server with a certificate it made
  itself is shown once and asked about.

### Not in yet (the 0.5 web-engine app has them; it stays on the releases page under its own versions)
- The holiday banner, interface and player-controls size, back swipes, subtitle styling, the Settings for the player, My List
  page, and updates that install themselves. Windows and macOS builds are not signed, and Linux is x64 only for now.

## 0.5.0 (2026-11-24)

### Added
- Not converting. Settings > Playback > Converting on the server is set to Never: the app asks Jellyfin to play files as they
  are or copy them into a stream, and never to re-encode. A file the app can't play shows what is inside it, with Open in mpv
  / Open in VLC (the file itself is handed over, nothing converted) and a button to convert it on the server this once.
- The app asks its video engine which codecs it can decode (HEVC, AV1, AC3 and so on) and tells Jellyfin, instead of a fixed
  list, so a computer or an engine build that can play more gets direct play for more files.
- Holiday banner picks: it now uses a list of well-known classics (movies, and holiday episodes such as The Twilight Zone's
  "The Night of the Meek") found by name in the library, then whatever else matches by tag or name, but only titles that rate
  well and aren't adult, and no horror outside Halloween. Thanksgiving is added (early November to the day itself), mixed with
  Christmas from mid November. Each slide says which holiday it is for. Settings > Home screen can switch to "Everything".
- Player: in a narrow window (half a screen) the controls stay while the mouse is over the video and go when it leaves (Settings
  > Playback can make that always or never); the controls' size can be changed (80% to 200%); how long they stay can be set;
  the volume can be forgotten between videos; subtitle size, colour and background can be chosen.

### Fixed
- The "Waiting for the server to convert the video" message came up when the server was only copying the video into a stream
  or the file was playing as it is. It now says what the server is actually doing.

## 0.4.0 (2026-11-23)

### Added
- Interface size. Settings > Appearance > Interface size scales the whole app from 75% to 200%. Ctrl or Cmd with + and −
  changes it, Ctrl or Cmd with 0 goes back to normal, and pinching a trackpad does the same.
- Seasonal banner. In the weeks around Valentine's Day (Feb 1-14), Halloween (October) and Christmas (December) the
  featured banner on Home shows that holiday's movies, found by tag, name and genre, and goes back to the usual titles
  afterwards. It follows the date by itself. Settings > Home screen can turn it off.
- Going back by swiping: from either edge of a touch screen toward the middle (a round arrow follows the finger), or sideways
  with two fingers on a trackpad.
- Touch player: a tap on the picture shows hidden controls; with the controls showing, a tap in the middle pauses or plays and
  a tap at the sides hides them. Two quick taps at a side still skip 10 seconds. (A double tap in the middle no longer pauses.)

### Changed
- Touch mode makes the player's controls bigger in every look: the buttons and their icons, the play button, the seek bar
  and its handle, the clock, the menus and the Skip button.

### Fixed
- The profile picture sometimes didn't show. A picture that fails to load is now asked for again with the server's current
  picture, and the first letter of the name is shown if it still doesn't come.
- Libraries and other lists loaded slowly. Lists no longer download each title's overview and genres, the server counts the
  whole library only for the first page, and pages that need the list of libraries share one answer for a minute.

## 0.3.2 (2026-11-23)

### Added
- Android: update checks. The app looks for a newer release on GitHub when it starts and every six hours, and Settings has a
  "Check for updates" button. A newer version shows a banner with Update and Later. Update downloads the package, checks it
  against the release's SHA-256 list (a download that doesn't match is thrown away) and hands it to Android's installer, which
  asks once to allow installs from Jellyflix. Copies older than 0.3.2 can't do this, so install 0.3.2 by hand once.

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
  get bigger. 

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
