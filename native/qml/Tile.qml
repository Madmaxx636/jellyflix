import QtQuick
import Jellyflix
import "Util.js" as Util

/// A library or genre as a tile: its own picture, or a backdrop borrowed from a title inside it, over a colour taken from its name.
Item {
    id: tile
    property string name
    property string art: ""             // its own picture, if it has one
    property var finder: null           // function(cb): finds a picture when there is none
    property bool misc: false
    property bool alt: false
    signal clicked()
    property string found: ""
    readonly property string source: art !== "" ? art : found
    readonly property real hue: Theme.hue(name) / 360
    implicitWidth: 260; implicitHeight: width * (Theme.disney && false ? 10 / 16 : 9 / 16)
    readonly property bool centred: !Theme.netflix

    Component.onCompleted: if (art === "" && finder) finder(function (u) { tile.found = u })

    Rectangle {
        id: face
        anchors.fill: parent
        radius: Theme.disney ? 12 : (Theme.hulu ? 12 : Theme.radius)
        clip: true
        border.width: Theme.disney ? 3 : (Theme.hbo ? 1 : 0)
        border.color: hover.hovered ? (Theme.hbo ? Theme.accent : Qt.rgba(0.98, 0.98, 0.98, 0.85)) : (Theme.disney ? Qt.rgba(0.98, 0.98, 0.98, 0.12) : Theme.line)
        scale: hover.hovered && !Settings.reduceMotion && !Theme.hbo ? (Theme.disney ? 1.05 : 1.03) : 1
        Behavior on scale { NumberAnimation { duration: 200 } }
        gradient: Gradient {
            orientation: Gradient.Horizontal
            GradientStop { position: 0; color: tile.misc ? (tile.alt ? "#2a1a50" : "#1a2150") : Qt.hsla(tile.hue, 0.55, 0.32, 1) }
            GradientStop { position: 1; color: tile.misc ? "#0a0f2e" : Qt.hsla((tile.hue + 40 / 360) % 1, 0.6, 0.14, 1) }
        }
        Image { anchors.fill: parent; source: tile.source; fillMode: Image.PreserveAspectCrop; asynchronous: true; opacity: 0.85; visible: status === Image.Ready }
        Rectangle { anchors.fill: parent; gradient: Gradient { GradientStop { position: 0.4; color: "transparent" } GradientStop { position: 1; color: Qt.rgba(0, 0, 0, 0.72) } } }
        Text {
            anchors.fill: parent; anchors.margins: 14
            text: Theme.hbo ? tile.name.toUpperCase() : tile.name
            color: "white"; wrapMode: Text.Wrap
            horizontalAlignment: tile.centred ? Text.AlignHCenter : Text.AlignLeft
            verticalAlignment: tile.centred ? Text.AlignVCenter : Text.AlignBottom
            font.pixelSize: Theme.hbo ? 16 : (Theme.disney ? 20 : 18); font.bold: !Theme.hbo
            font.weight: Theme.hbo ? Font.Light : Font.Bold; font.letterSpacing: Theme.hbo ? 4 : 0
        }
    }
    HoverHandler { id: hover }
    MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: tile.clicked() }
}
