import QtQuick
import QtQuick.Controls.Basic
import Jellyflix
import "Util.js" as Util

/// The audio and subtitles, speed, settings and episode pop-ups. Only the one that is open is drawn.
Item {
    id: menus
    property var player
    readonly property string open: player.menu
    readonly property real cs: Settings.controlsScale
    property int season: 1
    readonly property var seasons: { var s = [], seen = {}; player.episodes.forEach(e => { var n = e.ParentIndexNumber || 0; if (!seen[n]) { seen[n] = true; s.push(n) } }); return s }
    onOpenChanged: if (open === "episodes" && player.item) season = player.item.ParentIndexNumber || (seasons[0] || 1)

    Rectangle {
        id: panel
        visible: menus.open !== ""
        readonly property bool wideList: menus.open === "episodes"
        width: Math.min(menus.width - 32, menus.open === "episodes" ? 580 : (menus.open === "tracks" || menus.open === "settings" ? 440 : 220))
        height: Math.min(menus.height * 0.6, content.implicitHeight + (wideList ? 0 : 32))
        x: Math.max(16, Math.min(menus.width - width - 16, player.menuAnchor - width / 2))
        y: menus.height - height - (150 * menus.cs) + 16
        radius: Theme.netflix ? 3 : (Theme.disney ? 10 : Theme.radius)
        color: Theme.netflix ? "#fa262626" : (Theme.disney ? "#f70e1330" : (Theme.hbo ? "#f00c0b10" : "#f50a0a0a"))
        border.color: Theme.netflix ? "transparent" : Qt.rgba(1, 1, 1, 0.18)
        MouseArea { anchors.fill: parent }
        Flickable {
            anchors.fill: parent; anchors.margins: panel.wideList ? 0 : 16; clip: true; contentHeight: content.implicitHeight; boundsBehavior: Flickable.StopAtBounds
            Column {
                id: content
                width: parent.width
                // audio and subtitles
                Row {
                    visible: menus.open === "tracks"; spacing: 24; width: parent.width
                    Column { width: (parent.width - 24) / 2
                        Text { text: "Audio"; color: Theme.muted; font.pixelSize: 13; font.bold: true; font.letterSpacing: 1; bottomPadding: 6; leftPadding: 8; font.capitalization: Font.AllUppercase }
                        Repeater { model: player.tracksOf("audio"); delegate: MenuItem { text: player.trackLabel(modelData); on: modelData.selected; onClicked: player.video.setAudioTrack(modelData.id) } } }
                    Column { width: (parent.width - 24) / 2
                        Text { text: "Subtitles"; color: Theme.muted; font.pixelSize: 13; font.bold: true; font.letterSpacing: 1; bottomPadding: 6; leftPadding: 8; font.capitalization: Font.AllUppercase }
                        MenuItem { text: "Off"; on: !player.tracksOf("sub").some(t => t.selected); onClicked: player.video.setSubtitleTrack(0) }
                        Repeater { model: player.tracksOf("sub"); delegate: MenuItem { text: player.trackLabel(modelData); on: modelData.selected; onClicked: player.video.setSubtitleTrack(modelData.id) } } }
                }
                // speed
                Column {
                    visible: menus.open === "speed" || menus.open === "settings"; width: parent.width
                    Text { text: Theme.words.speed; color: Theme.muted; font.pixelSize: 13; font.bold: true; font.letterSpacing: 1; bottomPadding: 6; leftPadding: 8; font.capitalization: Font.AllUppercase }
                    Repeater { model: [0.5, 0.75, 1, 1.25, 1.5, 2]; delegate: MenuItem { text: modelData === 1 ? "Normal" : modelData + "×"; on: Math.abs(Settings.speed - modelData) < 0.01; onClicked: { Settings.speed = modelData; player.video.setSpeed(modelData) } } }
                    Text { visible: menus.open === "settings"; topPadding: 12; leftPadding: 8; text: "Decoding"; color: Theme.muted; font.pixelSize: 13; font.bold: true; font.letterSpacing: 1; font.capitalization: Font.AllUppercase }
                    Text { visible: menus.open === "settings"; leftPadding: 8; topPadding: 4; text: player.video.hwdec && player.video.hwdec !== "no" ? "Hardware (" + player.video.hwdec + ")" : "Processor"; color: "#ddd"; font.pixelSize: 14 }
                }
                // episodes
                Column {
                    visible: menus.open === "episodes"; width: parent.width
                    Item { width: parent.width; height: 56
                        Text { x: 16; anchors.verticalCenter: parent.verticalCenter; text: player.item && player.item.SeriesName ? player.item.SeriesName : Theme.words.episodes; color: "white"; font.pixelSize: 17; font.bold: true }
                        Select { anchors.right: parent.right; anchors.rightMargin: 16; anchors.verticalCenter: parent.verticalCenter; value: menus.season; onPicked: v => menus.season = v
                            options: menus.seasons.map(s => ({ value: s, label: s === 0 ? "Specials" : "Season " + s })) }
                        Rectangle { anchors.bottom: parent.bottom; width: parent.width; height: 1; color: Qt.rgba(1, 1, 1, 0.12) } }
                    Repeater {
                        model: player.episodes.filter(e => (e.ParentIndexNumber || 0) === menus.season)
                        delegate: Rectangle {
                            readonly property bool now: player.item && modelData.Id === player.item.Id
                            readonly property bool pic: Theme.player.episodePictures === "all" || now
                            width: content.width; height: pic ? 86 : 52; color: now ? Qt.rgba(1, 1, 1, 0.1) : (eh.hovered ? Qt.rgba(1, 1, 1, 0.06) : "transparent")
                            HoverHandler { id: eh }
                            Row { anchors.fill: parent; anchors.margins: 12; spacing: 14
                                Text { width: 30; anchors.verticalCenter: parent.verticalCenter; horizontalAlignment: Text.AlignHCenter; text: modelData.IndexNumber || ""; color: Theme.muted; font.pixelSize: 19 }
                                Rectangle { visible: parent.parent.pic; width: 120; height: 68; radius: 3; color: Theme.card; clip: true; anchors.verticalCenter: parent.verticalCenter
                                    Image { anchors.fill: parent; source: Api.still(modelData, 320); fillMode: Image.PreserveAspectCrop; asynchronous: true } }
                                Column { anchors.verticalCenter: parent.verticalCenter; width: parent.width - 30 - 120 - 90; spacing: 3
                                    Text { width: parent.width; text: modelData.Name; color: "white"; font.pixelSize: 15; font.weight: Font.DemiBold; elide: Text.ElideRight }
                                    Text { visible: now && Theme.player.episodePictures === "current" && modelData.Overview; width: parent.width; text: modelData.Overview || ""; color: Theme.muted; font.pixelSize: 12; wrapMode: Text.Wrap; maximumLineCount: 3; elide: Text.ElideRight } }
                                Text { width: 60; anchors.verticalCenter: parent.verticalCenter; horizontalAlignment: Text.AlignRight; text: modelData.RunTimeTicks ? Math.round(modelData.RunTimeTicks / 600000000) + " min" : ""; color: Theme.muted; font.pixelSize: 12 }
                            }
                            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: { var e = modelData; player.leave(); Nav.play(e, {}) } }
                        }
                    }
                }
            }
        }
    }

    component MenuItem: Rectangle {
        id: mi
        property string text
        property bool on: false
        signal clicked()
        width: parent ? parent.width : 200; height: Theme.netflix ? 38 : 34
        color: mh.hovered && !Theme.netflix ? Qt.rgba(1, 1, 1, 0.1) : "transparent"; radius: Theme.netflix ? 0 : 4
        HoverHandler { id: mh }
        Text { x: Theme.netflix ? 26 : 12; anchors.verticalCenter: parent.verticalCenter; width: parent.width - 40; text: mi.text; elide: Text.ElideRight
            color: mi.on ? (Theme.netflix ? "white" : Theme.accent) : (mh.hovered ? "white" : (Theme.netflix ? "#b3b3b3" : "#ddd")); font.pixelSize: Theme.netflix ? 17 : 14; font.bold: mi.on }
        Text { visible: Theme.netflix && mi.on; x: 4; anchors.verticalCenter: parent.verticalCenter; text: "✓"; color: "white"; font.pixelSize: 16 }
        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: mi.clicked() }
    }
}
