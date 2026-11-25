pragma Singleton
import QtQuick

/// The four looks, as in the web-engine app: colours, shapes, which links the top bar has, and the words each service uses.
QtObject {
    id: theme

    property string lookId: "netflix"
    readonly property var all: [
        {
            id: "netflix", label: "Netflix", landscape: false, logo: "JELLYFLIX",
            accent: "#e50914", onAccent: "#ffffff", bg: "#141414", card: "#2b2b2b", surface: "#1f1f1f", scrim: "#141414", muted: "#b3b3b3",
            radius: 4, btnRadius: 4, avatarRadius: 6, primaryBg: "#ffffff", primaryFg: "#000000", navSolid: "#141414", navH: 68,
            nav: [["home", "Home"], ["shows", "TV Shows"], ["movies", "Movies"], ["new", "New & Popular"], ["mylist", "My List"]],
            moreLabel: "Browse", more: [["libraries", "Libraries"], ["genres", "Genres"], ["collections", "Collections"]],
            navIcons: false, search: "icon-expand", hero: "single", brandTiles: false, top10: true, detailTabs: false, settings: "lines",
            player: { title: "bar", clocks: "remaining", left: ["play", "back10", "fwd10", "volume"], middle: [], right: ["next", "episodes", "tracks", "speed", "fullscreen"], pausePanel: true, episodePictures: "current", fill: "#e50914", icon: 36, pad: 0.04 },
            words: {
                myList: "My List", libraries: "Libraries", genres: "Genres", collections: "Collections", settings: "Account", switchProfile: "Switch Profiles",
                searchHint: "Titles, people, genres", play: "Play", resume: "Resume", playFromStart: "Play from start", nextUp: "Next Up", topRated: "Top 10 Rated",
                cast: "Cast", moreLikeThis: "More Like This", episodes: "Episodes", extras: "Trailers & More", details: "About", newPage: "New & Popular",
                back: "Back to Browse", audioSubtitles: "Audio & Subtitles", speed: "Playback Speed", playerSettings: "Settings", next: "Next Episode",
                nowWatching: "You're watching"
            }
        },
        {
            id: "hulu", label: "Hulu", landscape: true, logo: "jellyflix",
            accent: "#1ce783", onAccent: "#0b0c0f", bg: "#0b0c0f", card: "#1a1d24", surface: "#14171d", scrim: "#0b0c0f", muted: "#b3b3b3",
            radius: 8, btnRadius: 6, avatarRadius: 16, primaryBg: "#ffffff", primaryFg: "#000000", navSolid: "#0b0c0f", navH: 64,
            nav: [["home", "Home"], ["shows", "TV"], ["movies", "Movies"], ["mylist", "My Stuff"], ["libraries", "Hubs"]],
            moreLabel: "Browse", more: [["genres", "Genres"], ["collections", "Collections"], ["new", "Just Added"]],
            navIcons: false, search: "bar", hero: "carousel", brandTiles: false, top10: false, detailTabs: true, settings: "cards",
            player: { title: "top", clocks: "both", left: ["play", "back10", "fwd10", "volume"], middle: [], right: ["next", "episodes", "tracks", "settings", "fullscreen"], pausePanel: false, episodePictures: "all", fill: "#1ce783", icon: 30, pad: 28 },
            words: {
                myList: "My Stuff", libraries: "Hubs", genres: "Genres", collections: "Collections", settings: "Account", switchProfile: "Switch Profile",
                searchHint: "Search", play: "Start Watching", resume: "Resume", playFromStart: "Start Over", nextUp: "Up Next", topRated: "Top Rated",
                cast: "Cast", moreLikeThis: "Suggested", episodes: "Episodes", extras: "Extras", details: "Details", newPage: "Just Added",
                back: "Back", audioSubtitles: "Subtitles & Audio", speed: "Playback Speed", playerSettings: "Settings", next: "Next Episode",
                nowWatching: "You're watching"
            }
        },
        {
            id: "hbo", label: "HBO", landscape: true, logo: "JELLY MAX",
            accent: "#8b5cf6", onAccent: "#ffffff", bg: "#000000", card: "#131218", surface: "#0c0b10", scrim: "#000000", muted: "#9a98a6",
            radius: 2, btnRadius: 2, avatarRadius: 16, primaryBg: "#ffffff", primaryFg: "#000000", navSolid: "#000000", navH: 72,
            nav: [["home", "Home"], ["shows", "Series"], ["movies", "Movies"], ["libraries", "Hubs"], ["mylist", "My List"]],
            moreLabel: "More", more: [["genres", "Genres"], ["collections", "Collections"], ["new", "Just Added"]],
            navIcons: false, search: "page", hero: "carousel", brandTiles: false, top10: false, detailTabs: true, settings: "sidebar",
            player: { title: "top", clocks: "both", left: ["play", "back10", "fwd10", "volume"], middle: [], right: ["tracks", "episodes", "next", "settings", "fullscreen"], pausePanel: false, episodePictures: "all", fill: "#ffffff", icon: 26, pad: 30 },
            words: {
                myList: "My List", libraries: "Hubs", genres: "Genres", collections: "Collections", settings: "Settings", switchProfile: "Switch Profile",
                searchHint: "Search", play: "Watch Now", resume: "Resume", playFromStart: "Watch From Start", nextUp: "Up Next", topRated: "Popular",
                cast: "Cast & Crew", moreLikeThis: "More Like This", episodes: "Episodes", extras: "Extras", details: "Details", newPage: "Just Added",
                back: "Back", audioSubtitles: "Audio & Subtitles", speed: "Playback Speed", playerSettings: "Settings", next: "Next Episode",
                nowWatching: "You're watching"
            }
        },
        {
            id: "disney", label: "Disney+", landscape: false, logo: "Jellyflix+",
            accent: "#2bbcff", onAccent: "#040714", bg: "#0a0f2e", card: "#1a2150", surface: "#141a45", scrim: "#040714", muted: "#a9b0d6",
            radius: 10, btnRadius: 6, avatarRadius: 16, primaryBg: "#f9f9f9", primaryFg: "#040714", navSolid: "#040714", navH: 70,
            nav: [["home", "Home", "home"], ["search", "Search", "search"], ["mylist", "Watchlist", "plus"], ["movies", "Movies", "film"], ["shows", "Series", "tv"], ["libraries", "Brands", "grid"]],
            moreLabel: "More", more: [["genres", "Genres"], ["collections", "Collections"], ["new", "New"]],
            navIcons: true, search: "page", hero: "carousel", brandTiles: true, top10: false, detailTabs: true, settings: "list",
            player: { title: "top", clocks: "remaining", left: ["volume"], middle: ["back10", "play", "fwd10"], right: ["next", "episodes", "tracks", "settings", "fullscreen"], pausePanel: false, episodePictures: "all", fill: "#ffffff", icon: 30, pad: 30 },
            words: {
                myList: "Watchlist", libraries: "Brands", genres: "Genres", collections: "Collections", settings: "App Settings", switchProfile: "Switch Profile",
                searchHint: "Search by title, character, or genre", play: "Play", resume: "Resume", playFromStart: "Start Over", nextUp: "Up Next", topRated: "Top Rated",
                cast: "Cast", moreLikeThis: "Suggested", episodes: "Episodes", extras: "Extras", details: "Details", newPage: "New",
                back: "Back", audioSubtitles: "Audio & Subtitles", speed: "Playback Speed", playerSettings: "Settings", next: "Next Episode",
                nowWatching: "You're watching"
            }
        }
    ]
    readonly property var look: all.find(l => l.id === lookId) ?? all[0]
    readonly property var words: look.words
    readonly property var player: look.player

    readonly property color accent: look.accent
    readonly property color onAccent: look.onAccent
    readonly property color bg: look.bg
    readonly property color card: look.card
    readonly property color surface: look.surface
    readonly property color scrim: look.scrim
    readonly property color muted: look.muted
    readonly property color line: Qt.rgba(1, 1, 1, 0.14)
    readonly property int radius: look.radius
    readonly property int btnRadius: look.btnRadius
    readonly property int avatarRadius: look.avatarRadius
    readonly property color primaryBg: look.primaryBg
    readonly property color primaryFg: look.primaryFg
    readonly property color navSolid: look.navSolid
    readonly property int navH: look.navH
    readonly property bool landscape: look.landscape
    readonly property bool hbo: lookId === "hbo"
    readonly property bool hulu: lookId === "hulu"
    readonly property bool disney: lookId === "disney"
    readonly property bool netflix: lookId === "netflix"

    property string cards: "medium" // small, medium, large
    readonly property real cardW: ({ small: 140, medium: 170, large: 210 })[cards]
    readonly property real cardWideW: ({ small: 250, medium: 300, large: 360 })[cards]

    function upper(s) { return (hbo || disney) ? String(s).toUpperCase() : s }
    function continueTitle(user) { return netflix ? "Continue Watching for " + user : hulu ? "Keep Watching" : "Continue Watching" }
    function recentlyAdded(kind) { return kind === "movies" ? (netflix ? "Recently Added Movies" : hulu || hbo ? "Just Added Movies" : "New Movies") : (netflix ? "Recently Added Shows" : hulu ? "Just Added TV" : hbo ? "Just Added Series" : "New Series") }
    function becauseYouWatched(t) { return netflix ? "Because you watched " + t : disney ? "More Like " + t : "Because You Watched " + t }
    function episodeLine(s, e, name) { return netflix ? "S" + s + ":E" + e + " " + name : disney ? "S" + s + " · E" + e + ": " + name : "S" + s + " E" + e + " · " + name }
    function nextCard(n) { return netflix ? (n === null ? "Next episode" : "Next episode in " + n) : (n === null ? "Up next" : "Up next in " + n) }
    function hue(name) { var h = 7; for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0; return h % 360 }
}
