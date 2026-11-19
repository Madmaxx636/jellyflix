# Changelog

## Unreleased

### Added
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

### Fixed
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

## Earlier
- Look switcher: Netflix, Hulu, HBO and Disney+ themes over the same Jellyfin library; Hulu and HBO use wide 16:9 tiles.
- Initial scaffold: login, home rows with a banner, title pages with episodes, HLS player, search.
