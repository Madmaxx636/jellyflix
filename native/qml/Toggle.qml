import QtQuick
import Jellyflix

/// The on/off switch used in Settings.
Item {
    id: t
    property bool checked: false
    signal toggled(bool value)
    width: 48; height: 26
    activeFocusOnTab: true
    Rectangle { anchors.fill: parent; radius: 13; color: t.checked ? Theme.accent : "#555"; border.width: t.activeFocus ? 2 : 0; border.color: "white"
        Behavior on color { ColorAnimation { duration: 150 } } }
    Rectangle { y: 3; x: t.checked ? 25 : 3; width: 20; height: 20; radius: 10; color: "white"; Behavior on x { NumberAnimation { duration: 150 } } }
    MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: t.toggled(!t.checked) }
    Keys.onSpacePressed: t.toggled(!t.checked)
    Keys.onReturnPressed: t.toggled(!t.checked)
}
