import QtQuick
import Jellyflix

/// A titled row of cards you scroll sideways, with arrows on hover. `ranked` puts a big number beside each (a "Top 10" row).
Column {
    id: row
    property string title
    property var items: []
    property bool ranked: false
    property string link: ""      // a route the title leads to
    property var linkParams: ({})
    property bool padded: false   // inside a page that already has side padding
    visible: items.length > 0
    spacing: 0
    width: parent ? parent.width : 800
    readonly property real side: padded ? 0 : width * 0.04

    Text {
        x: row.side; height: 36
        text: Theme.hbo ? title.toUpperCase() : title
        color: link !== "" && titleArea.containsMouse ? "white" : "white"
        font.pixelSize: Theme.hbo ? 16 : (Theme.disney ? 18 : 21); font.weight: Theme.hbo ? Font.Light : (Theme.disney ? Font.DemiBold : Font.DemiBold)
        font.letterSpacing: Theme.hbo ? 3 : 0
        verticalAlignment: Text.AlignVCenter
        MouseArea { id: titleArea; anchors.fill: parent; hoverEnabled: true; enabled: row.link !== ""; cursorShape: Qt.PointingHandCursor; onClicked: Nav.navigate(row.link, row.linkParams) }
        Icon { visible: row.link !== "" && titleArea.containsMouse; x: parent.implicitWidth + 6; anchors.verticalCenter: parent.verticalCenter; name: "right"; size: 14; color: Theme.accent }
    }
    Item {
        width: parent.width
        height: (Theme.landscape ? Theme.cardWideW * 9 / 16 : Theme.cardW * 1.5) + 60
        ListView {
            id: list
            anchors.fill: parent
            anchors.topMargin: 14
            orientation: ListView.Horizontal; spacing: 6; clip: false
            leftMargin: row.side; rightMargin: row.side
            boundsBehavior: Flickable.StopAtBounds
            model: row.items
            cacheBuffer: 600
            delegate: Card { item: modelData; ranked: row.ranked; rank: index + 1; y: 4 }
            highlightFollowsCurrentItem: false
        }
        Item { // clip only along the row's own width, but let hovered cards rise above and below
            anchors.fill: parent
        }
        Rectangle {
            id: leftArrow
            visible: wrap.containsMouse && !Nav.touch && list.contentX > 4
            anchors.left: parent.left; anchors.top: parent.top; anchors.bottom: parent.bottom; anchors.topMargin: 14; width: parent.width * 0.04; color: Qt.rgba(0.08, 0.08, 0.08, 0.55); z: 5
            Icon { anchors.centerIn: parent; name: "left"; size: 26 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: scrollAnim.go(-1) }
        }
        Rectangle {
            visible: wrap.containsMouse && !Nav.touch && list.contentX + list.width < list.contentWidth - 4
            anchors.right: parent.right; anchors.top: parent.top; anchors.bottom: parent.bottom; anchors.topMargin: 14; width: parent.width * 0.04; color: Qt.rgba(0.08, 0.08, 0.08, 0.55); z: 5
            Icon { anchors.centerIn: parent; name: "right"; size: 26 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: scrollAnim.go(1) }
        }
        HoverHandler { id: wrap; property bool containsMouse: hovered }
        NumberAnimation {
            id: scrollAnim
            target: list; property: "contentX"; duration: 280; easing.type: Easing.OutCubic
            function go(dir) { stop(); from = list.contentX; to = Math.max(0, Math.min(list.contentWidth - list.width, list.contentX + dir * list.width * 0.85)); start() }
        }
        WheelHandler { acceptedDevices: PointerDevice.TouchPad | PointerDevice.Mouse; orientation: Qt.Horizontal; onWheel: event => { var to = Math.max(0, Math.min(list.contentWidth - list.width, list.contentX - event.angleDelta.x)); if (to !== list.contentX) Nav.rowScrolledAt = Date.now(); list.contentX = to } }
    }
}
