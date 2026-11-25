pragma Singleton
import QtQuick

/// How pages ask the app to go somewhere. Main.qml listens.
QtObject {
    /// Touch controls: always, never, or (automatically) while a touch screen was the last thing used.
    readonly property bool touch: Settings.touchMode === "on" || (Settings.touchMode === "auto" && Settings.touched)
    property string holidayReport: ""   // what the holiday banner found (shown in Settings > About)
    property double rowScrolledAt: 0   // a row has just been scrolled sideways, so a trackpad swipe isn't a back swipe
    signal openTitle(var item)
    signal play(var item, var options)
    signal navigate(string route, var params)
    signal back()
}
