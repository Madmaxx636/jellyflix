# Changelog

## Unreleased
- Fixed sign-in failing with "400 Bad Request" on Jellyfin 12 and other servers with legacy authorization switched off (the default from 12.0). The app now identifies itself with the standard `Authorization: MediaBrowser ...` header instead of `X-Emby-Authorization`, and the stream URL carries `ApiKey` instead of `api_key`.
- Sign-in now finds the server for you: it follows redirects (for example http to https), tries https and the default 8096 port when none is typed, and accepts a pasted web-UI link.
- Sign-in errors now say what went wrong in plain words and include what the server replied (wrong password, a port that expects HTTPS, something that isn't Jellyfin, a server that can't read the identification header, nothing reachable).
- Library calls use the current routes (`/UserItems/Resume`, `/Items/Latest`, `/Items/{id}`) and fall back to the older user-scoped ones on servers that don't have them.
- Fixed after a screenshot pass of all four looks: episodes on tall cards now show the show's poster instead of a cropped still; the nav turns solid on scroll so content no longer shows through the logo; the Disney+ hero fades into the page background without a hard edge; HBO buttons are consistently uppercase.
- `JELLYFLIX_HIDDEN=1` runs the app offscreen with no window, for driving it over `--remote-debugging-port` in tests.
- Look switcher: Netflix, Hulu, HBO and Disney+ themes over the same Jellyfin library; Hulu and HBO use wide 16:9 tiles.
- Initial scaffold: login, home rows with hero, title details with episodes, HLS player, search.
