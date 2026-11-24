# Jellyflix, native

The next generation of the app: no browser engine, no web page. Qt 6 (QML) for the windows and libmpv for video.

- **Plays everything.** mpv decodes any video and audio format and shows any subtitle format on this computer (hardware
  decoding when the computer has it), so the server never converts anything: every title is played as the file it is.
- **Real window.** The system's own window, full screen and keyboard handling, with the four looks drawn in QML.
- **Small.** About 2 MB of the app's own code, plus Qt and mpv.

Build (needs Qt 6.5 or newer with Quick and OpenGL, CMake, and libmpv with its development files):

```bash
cmake -S native -B native/build -DCMAKE_BUILD_TYPE=Release
cmake --build native/build -j8
native/build/jellyflix
```

Self-test, with no window and no sound (needs `node` and `ffmpeg` for the made-up server and its test clip):

```bash
native/tests/selftest.sh
```

It signs in to the made-up server, opens the home page and a title, plays the file with mpv, pauses, seeks, switches the
look and signs out.

Not there yet compared with the Electron app: search results paging, My List page, holiday banner, settings for the
player, auto-update, and the Windows and macOS packages.
