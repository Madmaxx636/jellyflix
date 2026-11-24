import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import Jellyflix
import "Util.js" as Util

/// The controls drawn over the picture while something plays.
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
    property bool menuOpen: false
    readonly property bool narrow: width < 900
    readonly property bool keepShown: video.paused || menuOpen || controlsHover.hovered && narrow || failure !== ""
    visible: active
    focus: active

    function start(it) {
        item = it; plan = null; failure = ""; active = true; shown = true; hideTimer.restart(); forceActiveFocus()
        Api.item(it.Id, function (full) {
            if (full) item = full
            Api.playback(it.Id, function (p) {
                if (p.error) { failure = p.error; return }
                plan = p
                var resume = item.UserData && item.UserData.PlaybackPositionTicks ? item.UserData.PlaybackPositionTicks / 1e7 : 0
                video.load(p.url, resume > 5 ? resume : 0)
                Api.report("Playing", it.Id, p, resume, false)
            })
        })
    }
    function leave() {
        if (plan) Api.report("Stopped", item.Id, plan, video.position, video.paused)
        video.stop(); plan = null; active = false; menuOpen = false
        if (window.visibility === Window.FullScreen) window.visibility = Window.Windowed
    }
    function wake() { shown = true; hideTimer.restart() }
    function bump(by) { video.seek(by, true); wake() }
    function toggleFullscreen() { window.visibility = window.visibility === Window.FullScreen ? Window.Windowed : Window.FullScreen }

    Connections { target: player.video; function onEnded() { player.leave() } }
    Timer { id: hideTimer; interval: 3000; onTriggered: if (!player.keepShown) player.shown = false }
    Timer { interval: 10000; repeat: true; running: player.active && player.plan !== null; onTriggered: Api.report("Progress", player.item.Id, player.plan, player.video.position, player.video.paused) }

    HoverHandler { id: controlsHover; onPointChanged: player.wake() }
    MouseArea {
        anchors.fill: parent; hoverEnabled: true; acceptedButtons: Qt.LeftButton
        cursorShape: player.shown ? Qt.ArrowCursor : Qt.BlankCursor
        onPositionChanged: player.wake()
        onClicked: { if (player.menuOpen) player.menuOpen = false; else if (player.shown && !player.video.paused) player.video.paused = true; else { player.video.paused = false; player.wake() } }
        onDoubleClicked: player.toggleFullscreen()
    }

    Keys.onPressed: event => {
        player.wake()
        switch (event.key) {
        case Qt.Key_Space: case Qt.Key_K: video.paused = !video.paused; break
        case Qt.Key_Right: case Qt.Key_L: bump(10); break
        case Qt.Key_Left: case Qt.Key_J: bump(-10); break
        case Qt.Key_Up: video.volume = Math.min(130, video.volume + 5); break
        case Qt.Key_Down: video.volume = Math.max(0, video.volume - 5); break
        case Qt.Key_M: video.muted = !video.muted; break
        case Qt.Key_F: toggleFullscreen(); break
        case Qt.Key_C: { var subs = tracksOf("sub"); video.setSubtitleTrack(subs.some(t => t.selected) ? 0 : (subs.length ? subs[0].id : 0)); break }
        case Qt.Key_Escape: if (menuOpen) menuOpen = false; else if (window.visibility === Window.FullScreen) window.visibility = Window.Windowed; else leave(); break
        default: return
        }
        event.accepted = true
    }
    function tracksOf(type) { return (video.tracks || []).filter(t => t.type === type) }
    function trackLabel(t) {
        var name = t.title || (t.lang ? t.lang.toUpperCase() : "") || ("Track " + t.id)
        var extra = t.type === "audio" ? [t.codec ? String(t.codec).toUpperCase() : "", t["demux-channel-count"] ? t["demux-channel-count"] + "ch" : ""].filter(x => x).join(" ") : ""
        return extra ? name + " (" + extra + ")" : name
    }

    // top
    Rectangle {
        id: top
        anchors.left: parent.left; anchors.right: parent.right; anchors.top: parent.top
        height: 90; opacity: player.shown || player.keepShown ? 1 : 0; visible: opacity > 0
        Behavior on opacity { NumberAnimation { duration: 200 } }
        gradient: Gradient { GradientStop { position: 0; color: Qt.rgba(0, 0, 0, 0.8) } GradientStop { position: 1; color: "transparent" } }
        RowLayout {
            anchors.fill: parent; anchors.margins: 18; spacing: 14
            FlatButton { objectName: "playerBack"; text: "‹ Back"; onClicked: player.leave() }
            ColumnLayout {
                spacing: 0
                Text { Layout.fillWidth: true; text: player.item ? Theme.styled(player.item.Type === "Episode" ? (player.item.SeriesName || player.item.Name) : player.item.Name) : ""; color: "white"; font.pixelSize: 20; font.bold: true; elide: Text.ElideRight }
                Text { visible: player.item && player.item.Type === "Episode"; Layout.fillWidth: true; text: player.item ? "S" + (player.item.ParentIndexNumber || 0) + " E" + (player.item.IndexNumber || 0) + "  " + player.item.Name : ""; color: "#cccccc"; font.pixelSize: 13; elide: Text.ElideRight }
            }
        }
    }

    // middle
    BusyIndicator { anchors.centerIn: parent; running: player.active && player.failure === "" && (player.plan === null || player.video.buffering); visible: running }
    ColumnLayout {
        visible: player.failure !== "" || player.video.error !== ""
        anchors.centerIn: parent; width: Math.min(560, parent.width - 48); spacing: 12
        Text { objectName: "playerError"; Layout.fillWidth: true; horizontalAlignment: Text.AlignHCenter; wrapMode: Text.Wrap; color: "#ff6b6b"; font.pixelSize: 16; text: player.failure || player.video.error }
        FlatButton { Layout.alignment: Qt.AlignHCenter; text: "Back"; onClicked: player.leave() }
    }

    // bottom
    Rectangle {
        id: bottom
        anchors.left: parent.left; anchors.right: parent.right; anchors.bottom: parent.bottom
        height: 150; opacity: player.shown || player.keepShown ? 1 : 0; visible: opacity > 0
        Behavior on opacity { NumberAnimation { duration: 200 } }
        gradient: Gradient { GradientStop { position: 0; color: "transparent" } GradientStop { position: 1; color: Qt.rgba(0, 0, 0, 0.88) } }
        MouseArea { anchors.fill: parent; acceptedButtons: Qt.NoButton; hoverEnabled: true }

        ColumnLayout {
            anchors.fill: parent; anchors.leftMargin: 24; anchors.rightMargin: 24; anchors.bottomMargin: 14; anchors.topMargin: 40; spacing: 4
            RowLayout {
                spacing: 12
                Text { text: Util.clock(player.video.position); color: "white"; font.pixelSize: 14; Layout.minimumWidth: 48; horizontalAlignment: Text.AlignRight }
                Slider {
                    id: seek
                    objectName: "seek"
                    Layout.fillWidth: true
                    from: 0; to: Math.max(1, player.video.duration)
                    value: pressed ? value : player.video.position
                    onMoved: { player.video.seek(value); player.wake() }
                    background: Rectangle {
                        x: seek.leftPadding; y: seek.topPadding + seek.availableHeight / 2 - height / 2; width: seek.availableWidth; height: seek.hovered || seek.pressed ? 8 : 5; radius: 2; color: "#55ffffff"
                        Rectangle { width: seek.availableWidth * Math.min(1, player.video.bufferedTo / seek.to); height: parent.height; radius: 2; color: "#66ffffff" }
                        Rectangle { width: seek.visualPosition * parent.width; height: parent.height; radius: 2; color: Theme.accent }
                    }
                    handle: Rectangle { x: seek.leftPadding + seek.visualPosition * (seek.availableWidth - width); y: seek.topPadding + seek.availableHeight / 2 - height / 2; width: 16; height: 16; radius: 8; color: Theme.accent; visible: seek.hovered || seek.pressed || seek.visualFocus }
                }
                Text { text: Util.clock(player.video.duration); color: "white"; font.pixelSize: 14; Layout.minimumWidth: 48 }
            }
            RowLayout {
                spacing: 10
                FlatButton { objectName: "playPause"; primary: true; text: player.video.paused ? "▶  Play" : "❚❚  Pause"; onClicked: { player.video.paused = !player.video.paused; player.wake() } }
                FlatButton { text: "−10"; onClicked: player.bump(-10) }
                FlatButton { text: "+10"; onClicked: player.bump(10) }
                Text { text: player.video.muted ? "Muted" : "Vol"; color: "white"; font.pixelSize: 13; visible: !player.narrow }
                Slider { visible: !player.narrow; implicitWidth: 100; from: 0; to: 130; value: player.video.muted ? 0 : player.video.volume; onMoved: { player.video.muted = false; player.video.volume = value } }
                Item { Layout.fillWidth: true }
                Text { visible: player.video.hwdec !== "" && player.video.hwdec !== "no" && !player.narrow; text: "Hardware decoding: " + player.video.hwdec; color: "#aaaaaa"; font.pixelSize: 12 }
                FlatButton { objectName: "tracks"; text: "Audio & subtitles"; onClicked: { player.menuOpen = !player.menuOpen; player.wake() } }
                FlatButton { text: player.window && player.window.visibility === Window.FullScreen ? "Exit full screen" : "Full screen"; onClicked: player.toggleFullscreen() }
            }
        }
    }

    // audio and subtitles
    Rectangle {
        id: menu
        visible: player.menuOpen
        anchors.right: parent.right; anchors.rightMargin: 24; anchors.bottom: parent.bottom; anchors.bottomMargin: 156
        width: Math.min(520, parent.width - 48); height: Math.min(parent.height - 220, menuColumns.implicitHeight + 32)
        radius: Theme.corner; color: "#f00a0a0a"; border.color: "#44ffffff"
        MouseArea { anchors.fill: parent }
        Flickable {
            anchors.fill: parent; anchors.margins: 16; contentHeight: menuColumns.implicitHeight; clip: true
            ColumnLayout {
                id: menuColumns; width: parent.width; spacing: 4
                Text { text: Theme.styled("Audio"); color: Theme.accent; font.pixelSize: 13; font.bold: true }
                Repeater {
                    model: player.tracksOf("audio")
                    delegate: Text { Layout.fillWidth: true; padding: 6; text: (modelData.selected ? "✓  " : "     ") + player.trackLabel(modelData); color: modelData.selected ? Theme.accent : "white"; font.pixelSize: 14; elide: Text.ElideRight
                        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: player.video.setAudioTrack(modelData.id) } }
                }
                Text { text: Theme.styled("Subtitles"); color: Theme.accent; font.pixelSize: 13; font.bold: true; Layout.topMargin: 10 }
                Text { Layout.fillWidth: true; padding: 6; text: (player.tracksOf("sub").some(t => t.selected) ? "     " : "✓  ") + "Off"; color: "white"; font.pixelSize: 14
                    MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: player.video.setSubtitleTrack(0) } }
                Repeater {
                    model: player.tracksOf("sub")
                    delegate: Text { Layout.fillWidth: true; padding: 6; text: (modelData.selected ? "✓  " : "     ") + player.trackLabel(modelData); color: modelData.selected ? Theme.accent : "white"; font.pixelSize: 14; elide: Text.ElideRight
                        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: player.video.setSubtitleTrack(modelData.id) } }
                }
            }
        }
    }
}
