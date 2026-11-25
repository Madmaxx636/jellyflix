import QtQuick
import Jellyflix

/// The profile picture, or the first letter of the name on a colour taken from it when there is none (or it won't load).
Rectangle {
    id: av
    property string name: ""
    property string url: ""
    property bool round: false
    width: 32; height: 32
    radius: round ? width / 2 : Theme.avatarRadius
    color: Qt.hsla(Theme.hue(name) / 360, 0.55, 0.42, 1)
    clip: true
    Image { id: pic; anchors.fill: parent; source: av.url; fillMode: Image.PreserveAspectCrop; asynchronous: true; visible: status === Image.Ready }
    Text { visible: pic.status !== Image.Ready; anchors.centerIn: parent; text: av.name.slice(0, 1).toUpperCase(); color: "white"; font.bold: true; font.pixelSize: av.width * 0.45 }
}
