pragma Singleton
import QtQuick

/// The four looks: the same app, dressed like the service it imitates.
QtObject {
    id: theme

    readonly property var looks: [
        { id: "netflix", label: "Netflix", accent: "#E50914", background: "#141414", surface: "#232323", landscape: false, corner: 4, caps: false, pill: false, continueTitle: "Continue Watching" },
        { id: "hulu", label: "Hulu", accent: "#1CE783", background: "#0B0C0F", surface: "#1B1D22", landscape: true, corner: 10, caps: false, pill: true, continueTitle: "Keep Watching" },
        { id: "hbo", label: "HBO", accent: "#8B5CF6", background: "#000000", surface: "#16161A", landscape: true, corner: 2, caps: true, pill: false, continueTitle: "Continue Watching" },
        { id: "disney", label: "Disney+", accent: "#2BBCFF", background: "#0A0F2E", surface: "#16204F", landscape: false, corner: 14, caps: false, pill: true, continueTitle: "Continue Watching" }
    ]

    property string lookId: "netflix"
    readonly property var look: looks.find(l => l.id === lookId) ?? looks[0]
    readonly property color accent: look.accent
    readonly property color background: look.background
    readonly property color surface: look.surface
    readonly property bool landscape: look.landscape
    readonly property int corner: look.corner
    readonly property color text: "#FFFFFF"
    readonly property color muted: "#B3B3B3"
    readonly property string continueTitle: look.continueTitle

    function styled(s) { return look.caps ? String(s).toUpperCase() : s }
    function buttonRadius(h) { return look.pill ? h / 2 : Math.min(corner, 8) }
}
