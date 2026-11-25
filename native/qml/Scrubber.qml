import QtQuick
import Jellyflix
import "Util.js" as Util

/// The seek bar: click or drag to jump; points out intro and credits; shows a picture of the moment under the pointer when the
/// library has Jellyfin's preview images.
Item {
    id: scrub
    property var player
    readonly property real duration: Math.max(1, player.duration)
    readonly property real trackH: Theme.hulu ? 5 : (Theme.hbo ? 2 : 4)
    readonly property bool lit: area.containsMouse || area.pressed
    property real hoverX: 0
    readonly property var trick: {
        var it = player.item
        if (!it || !it.Trickplay || !player.plan) return null
        var sets = it.Trickplay[player.plan.source.Id]
        if (!sets) return null
        var best = null
        for (var w in sets) if (best === null || Math.abs(Number(w) - 320) < Math.abs(Number(best) - 320)) best = w
        return best === null ? null : { width: Number(best), info: sets[best] }
    }
    function at(x) { return Math.max(0, Math.min(1, x / width)) * duration }

    Rectangle { id: track; anchors.verticalCenter: parent.verticalCenter; width: parent.width; height: scrub.lit ? scrub.trackH * 2 : scrub.trackH; radius: 2; color: Qt.rgba(1, 1, 1, 0.28)
        Behavior on height { NumberAnimation { duration: 120 } }
        Rectangle { width: Math.min(1, scrub.player.video.bufferedTo / scrub.duration) * parent.width; height: parent.height; radius: 2; color: Qt.rgba(1, 1, 1, 0.42) }
        Repeater { model: scrub.player.segments.filter(s => s.type === "Intro" || s.type === "Outro")
            delegate: Rectangle { x: modelData.start / scrub.duration * track.width; width: (modelData.end - modelData.start) / scrub.duration * track.width; height: parent.height; color: Qt.rgba(1, 1, 1, 0.55) } }
        Rectangle { width: Math.min(1, scrub.player.video.position / scrub.duration) * parent.width; height: parent.height; radius: 2; color: Theme.player.fill }
        Rectangle { x: Math.min(1, scrub.player.video.position / scrub.duration) * parent.width - 7; anchors.verticalCenter: parent.verticalCenter; width: 14; height: 14; radius: 7; color: Theme.player.fill; visible: scrub.lit }
    }
    MouseArea {
        id: area
        anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor
        onPressed: mouse => { scrub.player.video.seek(scrub.at(mouse.x)); scrub.player.wake() }
        onPositionChanged: mouse => { scrub.hoverX = mouse.x; if (pressed) scrub.player.video.seek(scrub.at(mouse.x)) }
    }
    // the time (and picture) above the pointer
    Item {
        visible: area.containsMouse
        x: Math.max(0, Math.min(scrub.width - width, scrub.hoverX - width / 2)); y: -height - 6
        width: Math.max(timeTip.width, scrub.trick ? scrub.trick.width + 4 : 0); height: tipCol.height
        Column {
            id: tipCol; anchors.horizontalCenter: parent.horizontalCenter; spacing: 4
            Rectangle {
                visible: scrub.trick !== null && area.containsMouse; width: scrub.trick ? scrub.trick.width + 4 : 0; height: scrub.trick ? scrub.trick.info.Height + 4 : 0
                color: "#111"; border.color: "white"; border.width: 2; radius: 4; clip: true
                Image {
                    x: 2; y: 2
                    readonly property var info: scrub.trick ? scrub.trick.info : null
                    readonly property real seconds: scrub.at(scrub.hoverX)
                    readonly property int index: info ? Math.max(0, Math.min(info.ThumbnailCount - 1, Math.floor(seconds * 1000 / info.Interval))) : 0
                    readonly property int perTile: info ? info.TileWidth * info.TileHeight : 1
                    width: info ? info.Width : 0; height: info ? info.Height : 0
                    source: info && scrub.player.plan ? Api.trickplayUrl(scrub.player.item.Id, scrub.player.plan.source.Id, scrub.trick.width, Math.floor(index / perTile)) : ""
                    sourceClipRect: info ? Qt.rect((index % perTile % info.TileWidth) * info.Width, Math.floor(index % perTile / info.TileWidth) * info.Height, info.Width, info.Height) : Qt.rect(0, 0, 0, 0)
                    asynchronous: true
                }
            }
            Rectangle { id: timeTip; anchors.horizontalCenter: parent.horizontalCenter; width: tl.implicitWidth + 16; height: 22; radius: 4; color: Qt.rgba(0, 0, 0, 0.88)
                Text { id: tl; anchors.centerIn: parent; text: Util.clock(scrub.at(scrub.hoverX)); color: "white"; font.pixelSize: 12 } }
        }
    }
}
