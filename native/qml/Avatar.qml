import QtQuick
import QtQuick.Effects
import Jellyflix

/// The profile picture cut to the shape of the look (round or softly square), or the first letter of the name on a colour taken
/// from it when there is no picture (or it won't load).
Item {
    id: av
    property string name: ""
    property string url: ""
    property bool round: false
    property int borderWidth: 0
    property color borderColor: "white"
    width: 32; height: 32
    readonly property real corner: round ? width / 2 : Theme.avatarRadius

    Rectangle { anchors.fill: parent; radius: av.corner; color: Qt.hsla(Theme.hue(av.name) / 360, 0.55, 0.42, 1) }
    Text { visible: pic.status !== Image.Ready; anchors.centerIn: parent; text: av.name.slice(0, 1).toUpperCase(); color: "white"; font.bold: true; font.pixelSize: av.width * 0.45 }

    Image {
        id: pic
        anchors.fill: parent; visible: false
        source: av.url; fillMode: Image.PreserveAspectCrop; asynchronous: true
        sourceSize.width: av.width * 2; sourceSize.height: av.height * 2
        layer.enabled: true
    }
    // the picture, with its corners cut away (a plain clip would leave the square showing)
    MultiEffect {
        anchors.fill: parent; source: pic; visible: pic.status === Image.Ready
        maskEnabled: true; maskSource: cut; maskThresholdMin: 0.5; maskSpreadAtMin: 1
    }
    Item { id: cut; anchors.fill: parent; visible: false; layer.enabled: true
        Rectangle { anchors.fill: parent; radius: av.corner; color: "black" } }
    Rectangle { anchors.fill: parent; radius: av.corner; color: "transparent"; border.width: av.borderWidth; border.color: av.borderColor; visible: av.borderWidth > 0 }
}
