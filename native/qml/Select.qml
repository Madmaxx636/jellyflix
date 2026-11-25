import QtQuick
import QtQuick.Controls.Basic
import Jellyflix

/// A drop-down: shows the chosen option, opens a list. `options` is [{value, label}].
Item {
    id: sel
    property var options: []
    property var value
    property string label: ""
    signal picked(var value)
    implicitWidth: Math.max(140, text.implicitWidth + 44)
    implicitHeight: 36
    width: implicitWidth; height: implicitHeight
    readonly property string current: { var o = options.find(x => x.value === value); return o ? o.label : "" }
    activeFocusOnTab: true

    Rectangle {
        anchors.fill: parent; radius: Theme.btnRadius; color: Theme.surface; border.width: sel.activeFocus || pop.opened ? 2 : 1
        border.color: sel.activeFocus || pop.opened ? Theme.accent : Theme.line
    }
    Text { id: text; anchors.verticalCenter: parent.verticalCenter; x: 12; width: parent.width - 36; text: sel.current; color: "white"; font.pixelSize: 14; elide: Text.ElideRight }
    Icon { anchors.verticalCenter: parent.verticalCenter; anchors.right: parent.right; anchors.rightMargin: 10; name: "chevron"; size: 14; color: Theme.muted }
    MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: pop.opened ? pop.close() : pop.open() }
    Keys.onReturnPressed: pop.open()
    Keys.onSpacePressed: pop.open()
    Keys.onDownPressed: pop.open()

    Popup {
        id: pop
        y: sel.height + 4
        width: Math.max(sel.width, list.contentItem.childrenRect.width + 24)
        height: Math.min(360, list.contentHeight + 12)
        padding: 6
        background: Rectangle { color: "#f2080808"; radius: Theme.radius; border.color: Theme.line }
        contentItem: ListView {
            id: list
            clip: true; model: sel.options; currentIndex: sel.options.findIndex(x => x.value === sel.value)
            delegate: Rectangle {
                width: ListView.view.width; height: 34; color: hover.containsMouse ? Qt.rgba(1, 1, 1, 0.1) : "transparent"
                Text { anchors.verticalCenter: parent.verticalCenter; x: 10; text: modelData.label; color: modelData.value === sel.value ? Theme.accent : "#ddd"; font.pixelSize: 14; font.bold: modelData.value === sel.value }
                MouseArea { id: hover; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: { sel.picked(modelData.value); pop.close() } }
            }
        }
    }
}
