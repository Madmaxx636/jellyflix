import QtQuick
import QtQuick.Controls.Basic
import Jellyflix

/// A button: plain grey, primary (white or accent), round (icon only), small, or danger, like the web-engine app's .btn.
Button {
    id: b
    property bool primary: false
    property bool accentFill: false
    property bool round: false
    property bool small: false
    property bool danger: false
    property bool on: false
    property string glyph: ""
    property int iconSize: 18
    property bool upper: Theme.hbo
    hoverEnabled: true
    focusPolicy: Qt.TabFocus
    implicitHeight: round ? (Nav.touch ? 50 : 44) : (small ? (Nav.touch ? 40 : 32) : (Nav.touch ? 48 : 42))
    implicitWidth: round ? (Nav.touch ? 50 : 44) : row.implicitWidth + (small ? 24 : (Nav.touch ? 52 : 44))
    readonly property color fg: round && on ? Theme.onAccent : (primary ? (accentFill ? Theme.onAccent : Theme.primaryFg) : "white")
    background: Rectangle {
        radius: b.round ? width / 2 : Theme.btnRadius
        color: b.round ? (b.on ? Theme.accent : Qt.rgba(0.12, 0.12, 0.12, b.hovered ? 0.85 : 0.6))
              : b.danger ? "#b3261e"
              : b.primary ? (b.accentFill ? Theme.accent : Theme.primaryBg)
              : Qt.rgba(0.43, 0.43, 0.43, b.hovered ? 0.45 : 0.7)
        border.width: b.round ? 2 : (b.visualFocus ? 2 : 0)
        border.color: b.round ? (b.on ? Theme.accent : (b.hovered ? "white" : Qt.rgba(1, 1, 1, 0.55))) : "white"
        opacity: b.enabled ? (b.primary && b.hovered && !b.round ? 0.85 : 1) : 0.6
    }
    contentItem: Item {
        Row {
            id: row
            anchors.centerIn: parent
            spacing: 8
            Icon { visible: b.glyph !== ""; name: b.glyph; size: b.iconSize; color: b.fg; anchors.verticalCenter: parent.verticalCenter }
            Text {
                visible: b.text !== ""
                anchors.verticalCenter: parent.verticalCenter
                text: b.upper || (Theme.disney && b.primary) ? b.text.toUpperCase() : b.text
                color: b.fg
                font.pixelSize: b.small ? 14 : 16
                font.weight: Font.DemiBold
                font.letterSpacing: b.upper ? 1 : (Theme.disney && b.primary ? 1.5 : 0)
            }
        }
    }
}
