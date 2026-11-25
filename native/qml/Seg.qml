import QtQuick
import Jellyflix

/// A row of choices in a pill, one of them chosen (the type switch and search filters).
Rectangle {
    id: seg
    property var options: []   // [{value, label}]
    property var value
    signal picked(var value)
    implicitHeight: 34; implicitWidth: row.implicitWidth
    radius: height / 2; color: "transparent"; border.color: Theme.line; clip: true
    Row {
        id: row
        Repeater {
            model: seg.options
            delegate: Rectangle {
                width: label.implicitWidth + 28; height: seg.height
                color: modelData.value === seg.value ? Theme.accent : (hover.containsMouse ? Qt.rgba(1, 1, 1, 0.08) : "transparent")
                Text { id: label; anchors.centerIn: parent; text: modelData.label; font.pixelSize: 13; font.weight: Font.DemiBold; color: modelData.value === seg.value ? Theme.onAccent : (hover.containsMouse ? "white" : Theme.muted) }
                MouseArea { id: hover; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: seg.picked(modelData.value) }
            }
        }
    }
}
