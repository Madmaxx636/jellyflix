import QtQuick
import QtQuick.Effects
import Jellyflix
import "Util.js" as Util

/// A poster or wide tile. The whole card opens the title; hovering shows Play, the list button and a hint to open it.
FocusScope {
    id: card
    property var item
    property bool wide: Theme.landscape
    property bool ranked: false
    property int rank: 0
    readonly property real cw: wide ? Theme.cardWideW : Theme.cardW
    readonly property real ch: wide ? cw * 9 / 16 : cw * 1.5
    readonly property bool lit: mouse.containsMouse || activeFocus
    readonly property bool playable: item && ["Movie", "Episode", "Video", "MusicVideo"].indexOf(item.Type) >= 0
    width: ranked ? cw + rankSize * 0.55 : cw
    height: ch
    z: lit ? 3 : 0
    activeFocusOnTab: true
    readonly property real rankSize: cw * 0.95
    readonly property string label: item ? (item.Type === "Episode" ? item.SeriesName + " · S" + item.ParentIndexNumber + "E" + item.IndexNumber : item.Name) : ""
    readonly property string meta: item ? [item.ProductionYear, item.OfficialRating, item.RunTimeTicks ? Math.round(item.RunTimeTicks / 600000000) + " min" : ""].filter(x => x).join(" · ") : ""

    Text {
        visible: card.ranked
        text: card.rank
        x: 6; anchors.bottom: parent.bottom; anchors.bottomMargin: -card.rankSize * 0.1
        font.pixelSize: card.rankSize; font.weight: Font.Black; color: Theme.bg
        style: Text.Outline; styleColor: "#666"
    }

    Rectangle {
        id: face
        x: card.ranked ? card.width - card.cw : 0
        width: card.cw; height: card.ch
        radius: Theme.radius; color: Theme.card; clip: false
        border.width: Theme.disney ? 3 : (card.activeFocus ? 3 : 0)
        border.color: card.activeFocus ? "white" : (card.lit ? Qt.rgba(0.98, 0.98, 0.98, 0.8) : Qt.rgba(0.98, 0.98, 0.98, 0.1))
        scale: card.lit && !Settings.reduceMotion && !Nav.touch ? (Theme.netflix ? 1.08 : Theme.hulu ? 1.02 : Theme.hbo ? 1.04 : 1.05) : 1
        y: card.lit && Theme.hulu && !Settings.reduceMotion ? -4 : 0
        Behavior on scale { NumberAnimation { duration: 200 } }
        Behavior on y { NumberAnimation { duration: 200 } }

        Item {
            anchors.fill: parent
            anchors.margins: Theme.disney ? 0 : 0
            clip: true
            Rectangle { anchors.fill: parent; radius: Theme.radius; color: Theme.card }
            Image {
                anchors.fill: parent
                source: card.item ? (card.wide ? Api.thumb(card.item, Math.round(card.cw * 2)) : Api.poster(card.item, Math.round(card.cw * 2))) : ""
                fillMode: Image.PreserveAspectCrop; asynchronous: true; cache: true; smooth: true
                sourceSize.width: Math.round(card.cw * 2)
                visible: status === Image.Ready
            }
            Text {
                visible: card.item && !(card.item.ImageTags && (card.item.ImageTags.Primary || card.item.ImageTags.Thumb)) && !(card.item.BackdropImageTags && card.item.BackdropImageTags.length)
                anchors.fill: parent; anchors.margins: 10; text: card.item ? card.item.Name : ""; color: Theme.muted; wrapMode: Text.Wrap; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter
            }
            // wide tiles show their name on the picture
            Rectangle {
                visible: card.wide && !card.lit && !Nav.touch
                anchors.left: parent.left; anchors.right: parent.right; anchors.bottom: parent.bottom; height: 44
                gradient: Gradient { GradientStop { position: 0; color: "transparent" } GradientStop { position: 1; color: Qt.rgba(0, 0, 0, 0.85) } }
                Text { anchors.left: parent.left; anchors.right: parent.right; anchors.bottom: parent.bottom; anchors.margins: 10; anchors.bottomMargin: 8; text: card.label; color: "white"; font.pixelSize: 14; font.weight: Font.DemiBold; elide: Text.ElideRight }
            }
            // hover: name, facts, buttons
            Rectangle {
                opacity: card.lit || Nav.touch ? 1 : 0
                anchors.left: parent.left; anchors.right: parent.right; anchors.bottom: parent.bottom; height: info.implicitHeight + 46
                gradient: Gradient { GradientStop { position: 0; color: "transparent" } GradientStop { position: 0.55; color: Qt.rgba(0, 0, 0, 0.94) } GradientStop { position: 1; color: Qt.rgba(0, 0, 0, 0.94) } }
                Behavior on opacity { NumberAnimation { duration: 150 } }
                Column {
                    id: info
                    anchors.left: parent.left; anchors.right: parent.right; anchors.bottom: parent.bottom; anchors.margins: 10; spacing: 5
                    Text { visible: !Nav.touch; width: parent.width; text: card.label; color: "white"; font.pixelSize: 14; font.bold: true; wrapMode: Text.Wrap; maximumLineCount: 2; elide: Text.ElideRight }
                    Text { visible: card.meta !== "" && !Nav.touch; width: parent.width; text: card.meta; color: Theme.muted; font.pixelSize: 12; elide: Text.ElideRight }
                    Row {
                        spacing: 6
                        Rectangle {
                            visible: card.playable; width: 30; height: 30; radius: 15; color: "white"
                            Icon { anchors.centerIn: parent; name: "play"; size: 16; color: "black" }
                            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: Nav.play(card.item, {}) }
                        }
                        Rectangle {
                            id: listBtn
                            readonly property bool fav: { Flags.version; return card.item ? Flags.fav(card.item) : false }
                            width: 30; height: 30; radius: 15; color: fav ? Theme.accent : Qt.rgba(0.08, 0.08, 0.08, 0.75); border.width: 2; border.color: fav ? Theme.accent : Qt.rgba(1, 1, 1, 0.6)
                            Icon { anchors.centerIn: parent; name: listBtn.fav ? "check" : "plus"; size: 16; color: listBtn.fav ? Theme.onAccent : "white" }
                            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: Flags.toggleFavorite(card.item) }
                        }
                    }
                }
            }
            Rectangle {
                visible: card.item && card.item.UserData && card.item.UserData.PlayedPercentage > 0 && card.item.UserData.PlayedPercentage < 100
                anchors.left: parent.left; anchors.right: parent.right; anchors.bottom: parent.bottom; height: 4; color: Qt.rgba(0, 0, 0, 0.6)
                Rectangle { height: parent.height; width: card.item && card.item.UserData ? parent.width * card.item.UserData.PlayedPercentage / 100 : 0; color: Theme.accent }
            }
            layer.enabled: Theme.radius >= 8
            layer.effect: MultiEffect { maskEnabled: true; maskSource: mask; maskThresholdMin: 0.5; maskSpreadAtMin: 1 }
        }
        Item { id: mask; anchors.fill: parent; layer.enabled: true; visible: false; Rectangle { anchors.fill: parent; radius: Theme.radius } }
    }
    MouseArea { id: mouse; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; z: -1; onClicked: { card.forceActiveFocus(); Nav.openTitle(card.item) } }
    Keys.onReturnPressed: Nav.openTitle(card.item)
    Keys.onEnterPressed: Nav.openTitle(card.item)
    Keys.onSpacePressed: Nav.openTitle(card.item)
}
