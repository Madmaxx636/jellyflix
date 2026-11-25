import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import Jellyflix
import "Util.js" as Util

/// What is drawn over the picture while something plays. The look decides which controls there are, where they sit, where the
/// title and the clocks go, and how the pop-ups look (see `player` in Theme.qml).
FocusScope {
    id: player
    objectName: "player"
    property var video
    property var window
    property bool active: false
    property var item: null
    property var plan: null
    property string failure: ""
    property bool shown: true
    property bool hovering: false
    property string menu: ""            // tracks, speed, settings, episodes
    property real menuAnchor: 0
    property var episodes: []
    property var segments: []
    property var skipped: ({})
    property bool nextDismissed: false
    property bool ended: false
    property bool pausedAWhile: false
    property int countdown: -1
    property real startAt: 0
    readonly property var layout: Theme.player
    readonly property bool narrow: width < 900
    readonly property bool hoverShows: Settings.hoverControls === "always" || (Settings.hoverControls === "narrow" && narrow)
    readonly property bool keepShown: video.paused || menu !== "" || (hoverShows && hovering) || failure !== "" || video.error !== ""
    readonly property bool uiVisible: shown || keepShown
    readonly property real pad: layout.pad < 1 ? width * layout.pad : layout.pad
    readonly property real cs: Settings.controlsScale * (Nav.touch ? 1.3 : 1)
    readonly property real duration: video.duration > 0 ? video.duration : (plan ? (plan.source.RunTimeTicks || 0) / 1e7 : 0)
    readonly property var nextEp: { var at = item ? episodes.findIndex(e => e.Id === item.Id) : -1; return at >= 0 ? episodes[at + 1] || null : null }
    readonly property var skippable: segments.find(s => ["Intro", "Recap", "Preview", "Commercial"].indexOf(s.type) >= 0 && video.position >= s.start - 0.05 && video.position < s.end - 0.3) || null
    readonly property var outro: segments.find(s => s.type === "Outro") || null
    readonly property bool showNext: nextEp !== null && !nextDismissed && ((outro !== null && video.position >= outro.start) || ended || (outro === null && duration > 0 && duration - video.position < 20))
    visible: active
    focus: active

    // ---- starting and stopping ----
    function start(it, options) {
        options = options || {}
        item = it; plan = null; failure = ""; episodes = []; segments = []; skipped = ({}); nextDismissed = false; ended = false; pausedAWhile = false; countdown = -1; menu = ""
        active = true; shown = true; wake(); forceActiveFocus()
        Api.item(it.Id, function (full) {
            if (full) item = full
            if (item.Type === "Episode" && item.SeriesId) Api.episodes(item.SeriesId, e => episodes = e)
            Api.segments(it.Id, s => segments = s)
            Api.playback(it.Id, function (p) {
                if (p.error) { failure = p.error; return }
                plan = p
                var resume = item.UserData && item.UserData.PlaybackPositionTicks ? item.UserData.PlaybackPositionTicks / 1e7 : 0
                startAt = options.start !== undefined ? options.start : (resume > 5 ? resume : 0)
                applyVideoOptions()
                if (!Settings.rememberVolume) video.volume = 100
                video.load(p.url, startAt)
                video.setSpeed(Settings.speed)
                Api.report("Playing", it.Id, p, startAt, false)
            })
        })
    }
    function leave() {
        if (plan) Api.report("Stopped", item.Id, plan, video.position, video.paused)
        video.stop(); plan = null; active = false; menu = ""
        if (window.visibility === Window.FullScreen) window.visibility = Window.Windowed
        if (Settings.rememberVolume) Backend.setSetting("volume", video.volume)
    }
    function wake() { shown = true; hideTimer.restart() }
    function bump(by) { video.seek(by, true); wake() }
    function toggle() { video.paused = !video.paused; wake() }
    function toggleFullscreen() { window.visibility = window.visibility === Window.FullScreen ? Window.Windowed : Window.FullScreen }
    function playNext() { if (nextEp) { var n = nextEp; leave(); Nav.play(n, {}) } }
    function tracksOf(type) { return (video.tracks || []).filter(t => t.type === type) }
    function trackLabel(t) {
        var name = t.title || (t.lang ? t.lang.toUpperCase() : "") || ("Track " + t.id)
        var extra = t.type === "audio" ? [t.codec ? String(t.codec).toUpperCase() : "", t["demux-channel-count"] ? t["demux-channel-count"] + "ch" : ""].filter(x => x).join(" ") : (t.codec ? String(t.codec).toUpperCase() : "")
        return extra && name.indexOf(extra) < 0 ? name + " · " + extra : name
    }
    function applyVideoOptions() {
        video.setOption("hwdec", Settings.hwdec)
        var size = { small: 36, medium: 46, large: 60, huge: 76 }[Settings.subSize]
        var color = { white: "#FFFFFF", yellow: "#FFE44D", cyan: "#5CE6FF", green: "#7DFF8A" }[Settings.subColor]
        video.setOption("sub-font-size", String(size))
        video.setOption("sub-color", color)
        var bg = Settings.subBackground
        video.setOption("sub-border-style", bg === "solid" ? "opaque-box" : (bg === "dark" ? "background-box" : "outline-and-shadow"))
        video.setOption("sub-back-color", bg === "solid" ? "#FF000000" : "#B3000000")
        video.setOption("sub-border-size", bg === "none" ? "0" : "3")
        video.setOption("sub-shadow-offset", bg === "shadow" ? "1" : "0")
        video.setOption("alang", Settings.audioLang ? Settings.audioLang : "")
        video.setOption("slang", Settings.subtitleLang)
    }
    // pick the first audio and subtitle tracks the way the settings say, once the file's tracks are known
    property bool defaultsApplied: false
    Connections {
        target: player.video
        function onTracksChanged() {
            if (player.defaultsApplied || !player.plan) return
            var audio = player.tracksOf("audio")
            if (!audio.length) return
            player.defaultsApplied = true
            var subs = player.tracksOf("sub")
            var chosen = audio.find(t => t.selected)
            var same = chosen && chosen.lang && Settings.subtitleLang && String(chosen.lang).indexOf(Settings.subtitleLang.slice(0, 2)) === 0
            var want = Settings.subtitleMode === "always" || (Settings.subtitleMode === "foreign" && !same)
            if (!want) { player.video.setSubtitleTrack(0); return }
            var match = subs.find(t => t.lang && String(t.lang).indexOf(Settings.subtitleLang.slice(0, 2)) === 0 && !t.forced) || subs.find(t => t.lang && String(t.lang).indexOf(Settings.subtitleLang.slice(0, 2)) === 0)
            player.video.setSubtitleTrack(match ? match.id : 0)
        }
        function onEnded() { player.ended = true; if (!player.nextEp) {} }
    }
    onPlanChanged: defaultsApplied = false
    onSkippableChanged: if (skippable && Settings.skipIntro === "auto" && !skipped[skippable.start]) { skipped[skippable.start] = true; video.seek(skippable.end) }
    onShowNextChanged: { if (showNext && Settings.autoplayNext) { countdown = 5; nextTimer.restart() } else { nextTimer.stop(); countdown = -1 } }
    Timer { id: nextTimer; interval: 1000; repeat: true; onTriggered: { player.countdown--; if (player.countdown <= 0) { stop(); player.playNext() } } }
    Timer { id: hideTimer; interval: Math.max(1, Settings.controlsHide) * 1000; running: Settings.controlsHide > 0; onTriggered: if (!player.keepShown) player.shown = false }
    Timer { id: leaveTimer; interval: 700; onTriggered: if (!player.hovering && !player.keepShown) player.shown = false }
    Timer { id: pauseTimer; interval: 3000; running: player.video.paused && player.active; onTriggered: player.pausedAWhile = true }
    Connections { target: player.video; function onPausedChanged() { player.pausedAWhile = false } }
    Timer { interval: 10000; repeat: true; running: player.active && player.plan !== null; onTriggered: Api.report("Progress", player.item.Id, player.plan, player.video.position, player.video.paused) }

    // ---- input ----
    HoverHandler { id: hover; onHoveredChanged: { player.hovering = hovered; if (hovered) player.wake(); else leaveTimer.restart() } onPointChanged: player.wake() }
    MouseArea {
        anchors.fill: parent; acceptedButtons: Qt.LeftButton; hoverEnabled: true
        cursorShape: player.uiVisible ? Qt.ArrowCursor : Qt.BlankCursor
        onClicked: mouse => player.tapped(mouse.x)
        onDoubleClicked: if (!Nav.touch) player.toggleFullscreen()
    }
    // Touch: a tap shows hidden controls. With the controls showing, a tap in the middle pauses or plays and a tap at the sides hides
    // them; two quick taps at a side skip back (left third) or forward (right third).
    property double lastTap: 0
    property string flashSide: ""
    function tapped(x) {
        if (!Nav.touch) { if (menu !== "") menu = ""; else toggle(); return }
        var side = x < width / 3 ? "left" : (x > width * 2 / 3 ? "right" : "center")
        if (menu !== "") { menu = ""; lastTap = 0; return }
        var now = Date.now()
        if (side !== "center" && now - lastTap < 300) {
            sideHide.stop(); lastTap = 0
            bump(side === "left" ? -10 : 10); flashSide = side; flashTimer.restart()
            return
        }
        if (!shown) { wake(); lastTap = side === "center" ? 0 : now; return }
        if (side === "center") { lastTap = 0; toggle(); return }
        lastTap = now; sideHide.restart()
    }
    Timer { id: sideHide; interval: 300; onTriggered: if (!player.keepShown) player.shown = false }
    Timer { id: flashTimer; interval: 700; onTriggered: player.flashSide = "" }
    Rectangle {
        visible: player.flashSide !== ""
        x: player.flashSide === "left" ? parent.width * 0.08 : parent.width * 0.92 - width; anchors.verticalCenter: parent.verticalCenter
        width: Math.min(parent.width, parent.height) * 0.18; height: width; radius: width / 2; color: Qt.rgba(0, 0, 0, 0.55)
        Text { anchors.centerIn: parent; text: (player.flashSide === "left" ? "−" : "+") + "10 s"; color: "white"; font.pixelSize: 22; font.bold: true }
    }
    Keys.onPressed: event => {
        player.wake()
        switch (event.key) {
        case Qt.Key_Space: case Qt.Key_K: if (!event.isAutoRepeat) player.toggle(); break
        case Qt.Key_Right: case Qt.Key_L: bump(10); break
        case Qt.Key_Left: case Qt.Key_J: bump(-10); break
        case Qt.Key_Up: video.volume = Math.min(130, video.volume + 5); break
        case Qt.Key_Down: video.volume = Math.max(0, video.volume - 5); break
        case Qt.Key_M: video.muted = !video.muted; break
        case Qt.Key_F: toggleFullscreen(); break
        case Qt.Key_C: { var subs = tracksOf("sub"); video.setSubtitleTrack(subs.some(t => t.selected) ? 0 : (subs.length ? subs[0].id : 0)); break }
        case Qt.Key_N: playNext(); break
        case Qt.Key_Escape: if (menu !== "") menu = ""; else if (window.visibility === Window.FullScreen) window.visibility = Window.Windowed; else leave(); break
        default: return
        }
        event.accepted = true
    }

    // ---- the pause panel (Netflix) ----
    Rectangle {
        visible: player.layout.pausePanel && player.pausedAWhile && player.video.paused && !player.ended && player.menu === ""
        anchors.fill: parent; color: Qt.rgba(0, 0, 0, 0.62)
        Column {
            anchors.verticalCenter: parent.verticalCenter; x: parent.width * 0.12; width: Math.min(640, parent.width * 0.7); spacing: 10
            Text { text: Theme.words.nowWatching; color: "#b3b3b3"; font.pixelSize: 18 }
            Text { width: parent.width; text: player.item ? (player.item.Type === "Episode" ? (player.item.SeriesName || player.item.Name) : player.item.Name) : ""; color: "white"; font.pixelSize: Math.min(58, player.width * 0.044); font.bold: true; wrapMode: Text.Wrap }
            Text { visible: player.item && player.item.Type === "Episode"; text: player.item ? Theme.episodeLine(player.item.ParentIndexNumber, player.item.IndexNumber, player.item.Name) : ""; color: "white"; font.pixelSize: 24 }
            Text { width: parent.width; text: player.item && player.item.Overview ? player.item.Overview : ""; color: "#d2d2d2"; font.pixelSize: 18; wrapMode: Text.Wrap; maximumLineCount: 5; elide: Text.ElideRight; lineHeight: 1.25 }
        }
    }

    // ---- the top bar ----
    Item {
        id: topWrap
        width: parent.width / player.cs; scale: player.cs; transformOrigin: Item.TopLeft
        height: 110
        opacity: player.uiVisible ? 1 : 0; visible: opacity > 0
        Behavior on opacity { NumberAnimation { duration: 300 } }
        Rectangle { anchors.fill: parent; gradient: Gradient { GradientStop { position: 0; color: Qt.rgba(Theme.disney ? 0.016 : 0, Theme.disney ? 0.027 : 0, Theme.disney ? 0.08 : 0, Theme.netflix ? 0.55 : 0.85) } GradientStop { position: 1; color: "transparent" } } }
        Row {
            x: player.pad / player.cs; y: 22; spacing: 14
            PlayerButton { iconName: "left"; size: Theme.netflix ? 40 : player.layout.icon; label: Theme.words.back; onActivated: player.leave() }
            Column {
                visible: player.layout.title === "top"; anchors.verticalCenter: parent.verticalCenter; spacing: 2
                Text { text: player.item ? Theme.upper(player.item.Type === "Episode" ? (player.item.SeriesName || player.item.Name) : player.item.Name) : ""; color: "white"; font.pixelSize: Theme.hbo ? 18 : (Theme.disney ? 22 : 19); font.weight: Theme.hbo ? Font.Light : Font.Bold; font.letterSpacing: Theme.hbo ? 4 : 0 }
                Text { visible: player.item && player.item.Type === "Episode"; text: player.item ? Theme.episodeLine(player.item.ParentIndexNumber, player.item.IndexNumber, player.item.Name) : ""; color: Qt.rgba(1, 1, 1, 0.75); font.pixelSize: Theme.hbo ? 13 : 15 }
            }
        }
    }

    // ---- state ----
    BusyIndicator { anchors.centerIn: parent; running: player.active && player.failure === "" && player.video.error === "" && (player.plan === null || player.video.buffering); visible: running }
    ColumnLayout {
        visible: player.failure !== "" || player.video.error !== ""
        anchors.centerIn: parent; width: Math.min(620, parent.width - 48); spacing: 14
        Text { objectName: "playerError"; Layout.fillWidth: true; horizontalAlignment: Text.AlignHCenter; wrapMode: Text.Wrap; color: "#ff6b6b"; font.pixelSize: 17; text: player.failure || player.video.error }
        Btn { Layout.alignment: Qt.AlignHCenter; text: "Back"; onClicked: player.leave() }
    }
    Row {
        visible: player.ended && !player.nextEp && player.failure === ""
        anchors.centerIn: parent; spacing: 14
        Btn { primary: true; glyph: "play"; text: "Replay"; onClicked: { player.ended = false; player.video.seek(0); player.video.paused = false } }
        Btn { text: "Back"; onClicked: player.leave() }
    }

    // skip
    Rectangle {
        visible: player.skippable !== null && Settings.skipIntro === "button"
        anchors.right: parent.right; anchors.rightMargin: player.pad; anchors.bottom: parent.bottom; anchors.bottomMargin: (player.uiVisible ? 150 * player.cs : 40)
        width: skipLabel.implicitWidth + 52; height: 48; radius: Theme.btnRadius
        color: Theme.disney ? "#f9f9f9" : (skipHover.hovered ? "white" : Qt.rgba(0.08, 0.08, 0.08, 0.82)); border.width: Theme.disney ? 0 : 2; border.color: Qt.rgba(1, 1, 1, 0.7)
        Text { id: skipLabel; anchors.centerIn: parent; text: player.skippable ? ({ Intro: "Skip Intro", Recap: "Skip Recap", Preview: "Skip Preview", Commercial: "Skip" }[player.skippable.type]) : ""
            color: Theme.disney || skipHover.hovered ? "black" : "white"; font.pixelSize: 17; font.bold: true; font.capitalization: Theme.hbo || Theme.disney ? Font.AllUppercase : Font.MixedCase; font.letterSpacing: Theme.hbo ? 2 : (Theme.disney ? 1.5 : 0) }
        HoverHandler { id: skipHover }
        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: player.video.seek(player.skippable.end) }
    }

    // next episode
    Rectangle {
        visible: player.showNext
        anchors.right: parent.right; anchors.rightMargin: player.pad; anchors.bottom: parent.bottom; anchors.bottomMargin: (player.uiVisible ? 150 * player.cs : 40)
        width: Math.min(380, parent.width - 2 * player.pad); height: 80; radius: Theme.radius; color: Qt.rgba(0.06, 0.06, 0.06, 0.94); border.color: Qt.rgba(1, 1, 1, 0.2)
        Row {
            anchors.fill: parent; anchors.margins: 10; spacing: 12
            Rectangle { width: 120; height: 68; radius: 4; color: Theme.card; clip: true
                Image { anchors.fill: parent; source: player.nextEp ? Api.thumb(player.nextEp, 320) : ""; fillMode: Image.PreserveAspectCrop; asynchronous: true } }
            Column { anchors.verticalCenter: parent.verticalCenter; width: parent.width - 132 - 20; spacing: 2
                Text { text: Theme.nextCard(player.countdown >= 0 ? player.countdown : null); color: Theme.muted; font.pixelSize: 13 }
                Text { width: parent.width; text: player.nextEp ? "S" + player.nextEp.ParentIndexNumber + ":E" + player.nextEp.IndexNumber + " " + player.nextEp.Name : ""; color: "white"; font.pixelSize: 14; font.bold: true; elide: Text.ElideRight } }
        }
        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: player.playNext() }
        Item { width: 28; height: 28; anchors.top: parent.top; anchors.right: parent.right; Icon { anchors.centerIn: parent; name: "x"; size: 16 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: player.nextDismissed = true } }
    }

    // ---- the bottom bar ----
    Item {
        id: bottomWrap
        anchors.bottom: parent.bottom
        width: parent.width / player.cs; scale: player.cs; transformOrigin: Item.BottomLeft
        height: 150
        opacity: player.uiVisible ? 1 : 0; visible: opacity > 0
        Behavior on opacity { NumberAnimation { duration: 300 } }
        Rectangle { anchors.fill: parent; gradient: Gradient { GradientStop { position: 0; color: "transparent" } GradientStop { position: 1; color: Qt.rgba(Theme.disney ? 0.016 : 0, Theme.disney ? 0.027 : 0, Theme.disney ? 0.08 : 0, Theme.hbo ? 0.95 : 0.88) } } }
        MouseArea { anchors.fill: parent; acceptedButtons: Qt.NoButton }

        Column {
            anchors.left: parent.left; anchors.right: parent.right; anchors.bottom: parent.bottom
            anchors.leftMargin: player.pad / player.cs; anchors.rightMargin: player.pad / player.cs; anchors.bottomMargin: 16; spacing: 4

            Row {
                width: parent.width; spacing: 14; height: 28
                Text { visible: player.layout.clocks === "both"; width: 56; height: parent.height; verticalAlignment: Text.AlignVCenter; horizontalAlignment: Text.AlignRight; text: Util.clock(player.video.position); color: "white"; font.pixelSize: Theme.netflix ? 18 : (Theme.hbo ? 13 : 15) }
                Scrubber { id: scrub; width: parent.width - (player.layout.clocks === "both" ? 56 : 0) - 70 - 28; height: parent.height; player: player }
                Text { width: 56; height: parent.height; verticalAlignment: Text.AlignVCenter; text: Util.clock(Math.max(0, player.duration - player.video.position)); color: "white"; font.pixelSize: Theme.netflix ? 18 : (Theme.hbo ? 13 : 15) }
            }

            Item {
                width: parent.width; height: 56
                Row { id: leftRow; anchors.verticalCenter: parent.verticalCenter; spacing: 4
                    Repeater { model: player.layout.left; delegate: ControlLoader { controlId: modelData } } }
                Row { id: midRow; anchors.centerIn: parent; spacing: 10; visible: player.layout.middle.length > 0
                    Repeater { model: player.layout.middle; delegate: ControlLoader { controlId: modelData } } }
                Text { visible: player.layout.title === "bar"; anchors.verticalCenter: parent.verticalCenter; anchors.left: leftRow.right; anchors.right: rightRow.left; anchors.leftMargin: 18; anchors.rightMargin: 18
                    horizontalAlignment: Text.AlignHCenter; elide: Text.ElideRight; color: "white"; font.pixelSize: 22
                    text: player.item ? (player.item.Type === "Episode" ? (player.item.SeriesName || player.item.Name) + "   " + Theme.episodeLine(player.item.ParentIndexNumber, player.item.IndexNumber, player.item.Name) : player.item.Name) : "" }
                Row { id: rightRow; anchors.right: parent.right; anchors.verticalCenter: parent.verticalCenter; spacing: 4
                    Repeater { model: player.layout.right; delegate: ControlLoader { controlId: modelData } } }
            }
        }
    }

    // ---- pop-ups ----
    PlayerMenus { id: menus; player: player; anchors.fill: parent }

    // ---- small pieces ----
    component PlayerButton: Item {
        id: pb
        property string iconName
        property int size: player.layout.icon
        property string label: ""
        property bool pressed: false
        signal activated()
        width: size + 16; height: size + 16
        Rectangle { anchors.fill: parent; radius: Theme.hbo ? 2 : width / 2; color: pbHover.hovered && !Theme.netflix ? Qt.rgba(1, 1, 1, 0.14) : "transparent" }
        Icon { anchors.centerIn: parent; name: pb.iconName; size: pb.size; scale: pbHover.hovered && Theme.netflix ? 1.15 : 1; Behavior on scale { NumberAnimation { duration: 150 } } }
        HoverHandler { id: pbHover }
        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: pb.activated() }
        ToolTip.visible: pbHover.hovered && label !== ""; ToolTip.text: label; ToolTip.delay: 600
    }
    component ControlLoader: Loader {
        id: cl
        property string controlId
        active: controlId !== "next" || player.nextEp !== null
        visible: active
        sourceComponent: ({
            play: playC, back10: back10C, fwd10: fwd10C, volume: volumeC, next: nextC, episodes: episodesC, tracks: tracksC,
            speed: speedC, settings: settingsC, fullscreen: fullC
        })[controlId]
    }
    Component { id: playC; PlayerButton { iconName: player.video.paused ? "play" : "pause"; size: Theme.disney ? 50 : player.layout.icon; label: player.video.paused ? "Play" : "Pause"; onActivated: player.toggle() } }
    Component { id: back10C; PlayerButton { iconName: "back10"; size: Theme.disney ? 40 : player.layout.icon; label: "Back 10 seconds"; onActivated: player.bump(-10) } }
    Component { id: fwd10C; PlayerButton { iconName: "fwd10"; size: Theme.disney ? 40 : player.layout.icon; label: "Forward 10 seconds"; onActivated: player.bump(10) } }
    Component { id: nextC; PlayerButton { iconName: "next"; label: Theme.words.next; onActivated: player.playNext() } }
    Component { id: episodesC; PlayerButton { id: b; iconName: "episodes"; label: Theme.words.episodes; onActivated: { player.menuAnchor = b.mapToItem(player, b.width / 2, 0).x; player.menu = player.menu === "episodes" ? "" : "episodes" } } }
    Component { id: tracksC; PlayerButton { id: b; iconName: "speech"; label: Theme.words.audioSubtitles; onActivated: { player.menuAnchor = b.mapToItem(player, b.width / 2, 0).x; player.menu = player.menu === "tracks" ? "" : "tracks" } } }
    Component { id: speedC; PlayerButton { id: b; iconName: "speed"; label: Theme.words.speed; onActivated: { player.menuAnchor = b.mapToItem(player, b.width / 2, 0).x; player.menu = player.menu === "speed" ? "" : "speed" } } }
    Component { id: settingsC; PlayerButton { id: b; iconName: "settings"; label: Theme.words.playerSettings; onActivated: { player.menuAnchor = b.mapToItem(player, b.width / 2, 0).x; player.menu = player.menu === "settings" ? "" : "settings" } } }
    Component { id: fullC; PlayerButton { iconName: player.window && player.window.visibility === Window.FullScreen ? "exit-fullscreen" : "fullscreen"; label: "Full screen"; onActivated: player.toggleFullscreen() } }
    Component {
        id: volumeC
        Row {
            id: vol
            PlayerButton { iconName: player.video.muted || player.video.volume === 0 ? "mute" : "volume"; label: player.video.muted ? "Unmute" : "Mute"; onActivated: player.video.muted = !player.video.muted }
            Slider {
                id: vs; anchors.verticalCenter: parent.verticalCenter
                width: volHover.hovered || vs.pressed || volGrow.hovered ? 90 : 0; opacity: width > 0 ? 1 : 0; height: 24; from: 0; to: 130
                value: player.video.muted ? 0 : player.video.volume; onMoved: { player.video.muted = false; player.video.volume = value }
                Behavior on width { NumberAnimation { duration: 200 } }
                background: Rectangle { x: vs.leftPadding; y: vs.topPadding + vs.availableHeight / 2 - 2; width: vs.availableWidth; height: 4; radius: 2; color: "#55ffffff"
                    Rectangle { width: vs.visualPosition * parent.width; height: parent.height; radius: 2; color: Theme.netflix ? "white" : Theme.accent } }
                handle: Rectangle { x: vs.leftPadding + vs.visualPosition * (vs.availableWidth - width); y: vs.topPadding + vs.availableHeight / 2 - height / 2; width: 12; height: 12; radius: 6; color: "white" }
            }
            HoverHandler { id: volHover }
            Item { id: volGrow; property bool hovered: volHover.hovered; width: 0; height: 0; HoverHandler { id: vh2 } }
        }
    }
}
