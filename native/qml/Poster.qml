import QtQuick
import Jellyflix

/// A poster or wide tile for one title.
FocusScope {
    id: tile
    property var item
    property bool wide: Theme.landscape
    signal activated(var item)
    width: wide ? 220 : 140
    height: wide ? 124 + 28 : 210 + 28

    Rectangle {
        id: frame
        width: parent.width; height: tile.wide ? 124 : 210
        radius: Theme.corner; color: Theme.surface; clip: true
        border.width: tile.activeFocus || mouse.containsMouse ? 3 : 0
        border.color: tile.activeFocus ? "white" : Theme.accent
        Image {
            anchors.fill: parent
            source: item ? (tile.wide ? Api.thumb(item, 500) : Api.poster(item, 320)) : ""
            fillMode: Image.PreserveAspectCrop; asynchronous: true; cache: true
        }
        Text {
            visible: item && !(item.ImageTags && (item.ImageTags.Primary || item.ImageTags.Thumb)) && !(item.BackdropImageTags && item.BackdropImageTags.length)
            anchors.fill: parent; anchors.margins: 8; text: item ? item.Name : ""; color: Theme.muted; wrapMode: Text.Wrap; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter
        }
        Rectangle {
            visible: item && item.UserData && item.UserData.PlayedPercentage > 1 && item.UserData.PlayedPercentage < 99
            anchors.bottom: parent.bottom; anchors.left: parent.left; height: 4
            width: item && item.UserData ? parent.width * item.UserData.PlayedPercentage / 100 : 0
            color: Theme.accent
        }
    }
    Text {
        anchors.top: frame.bottom; anchors.topMargin: 6; width: parent.width
        text: item ? (item.Type === "Episode" ? (item.SeriesName || item.Name) : item.Name) : ""
        color: "white"; font.pixelSize: 12; elide: Text.ElideRight
    }
    MouseArea { id: mouse; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: { tile.forceActiveFocus(); tile.activated(item) } }
    Keys.onReturnPressed: tile.activated(item)
    Keys.onEnterPressed: tile.activated(item)
    Keys.onSpacePressed: tile.activated(item)
    activeFocusOnTab: true
}
