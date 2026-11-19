# Changelog

## Unreleased
- Fixed after a screenshot pass of all four looks: episodes on tall cards now show the show's poster instead of a cropped still; the nav turns solid on scroll so content no longer shows through the logo; the Disney+ hero fades into the page background without a hard edge; HBO buttons are consistently uppercase.
- `JELLYFLIX_HIDDEN=1` runs the app offscreen with no window, for driving it over `--remote-debugging-port` in tests.
- Look switcher: Netflix, Hulu, HBO and Disney+ themes over the same Jellyfin library; Hulu and HBO use wide 16:9 tiles.
- Initial scaffold: login, home rows with hero, title details with episodes, HLS player, search.
