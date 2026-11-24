import QtQuick
import QtQuick.Controls.Basic
import Jellyflix
import "Util.js" as Util

Flickable {
    id: page
    objectName: "details"
    property string itemId
    property var data: null
    property var episodes: []
    property var similar: []
    property int season: -1
    property bool favorite: false
    property string error: ""
    signal opened(var item)
    signal play(var item)
    contentWidth: width
    contentHeight: body.height + 40
    boundsBehavior: Flickable.StopAtBounds
    clip: true
    ScrollBar.vertical: ScrollBar {}

    readonly property bool series: data !== null && data.Type === "Series"
    readonly property var seasons: {
        var seen = {}, out = []
        episodes.forEach(e => { var n = e.ParentIndexNumber === undefined ? 0 : e.ParentIndexNumber; if (!seen[n]) { seen[n] = true; out.push(n) } })
        return out.sort((a, b) => a - b)
    }

    Component.onCompleted: {
        Api.item(itemId, function (it, r) {
            if (!it) { error = "Couldn't load this title (" + (r.status || r.error) + ")."; return }
            data = it
            favorite = !!(it.UserData && it.UserData.IsFavorite)
            if (it.Type === "Series") Api.episodes(it.Id, e => { episodes = e; if (seasons.length) season = seasons[0] })
            Api.similar(it.Id, s => similar = s)
        })
    }

    Column {
        id: body
        width: page.width
        spacing: 14

        Text { visible: page.error !== ""; x: 24; y: 24; text: page.error; color: "#ff6b6b" }

        Item {
            visible: page.data !== null
            width: parent.width; height: visible ? Math.min(460, page.width * 0.4) : 0
            Image { anchors.fill: parent; source: page.data ? (Api.backdrop(page.data, 1600) || Api.thumb(page.data, 1200)) : ""; fillMode: Image.PreserveAspectCrop; asynchronous: true }
            Rectangle { anchors.fill: parent; gradient: Gradient { GradientStop { position: 0.2; color: "transparent" } GradientStop { position: 1.0; color: Theme.background } } }
            Column {
                anchors.left: parent.left; anchors.leftMargin: 32; anchors.bottom: parent.bottom; anchors.bottomMargin: 20; width: Math.min(760, parent.width - 64); spacing: 8
                Text { width: parent.width; text: page.data ? Theme.styled(page.data.Name) : ""; color: "white"; font.pixelSize: 38; font.bold: true; wrapMode: Text.Wrap }
                Text {
                    color: Theme.muted; font.pixelSize: 14
                    text: page.data ? [page.data.ProductionYear, page.data.OfficialRating, Util.minutes(page.data.RunTimeTicks), (page.data.Genres || []).slice(0, 3).join(" · ")].filter(x => x).join("   ") : ""
                }
            }
        }

        Row {
            visible: page.data !== null && !page.series
            x: 32; spacing: 10
            FlatButton {
                objectName: "play"; primary: true
                text: page.data && page.data.UserData && page.data.UserData.PlaybackPositionTicks > 0 ? "Resume" : "Play"
                onClicked: page.play(page.data)
            }
            FlatButton { text: page.favorite ? "✓ My List" : "+ My List"; onClicked: { page.favorite = !page.favorite; Api.setFavorite(page.data.Id, page.favorite, ok => { if (!ok) page.favorite = !page.favorite }) } }
        }
        Row {
            visible: page.series; x: 32
            FlatButton { text: page.favorite ? "✓ My List" : "+ My List"; onClicked: { page.favorite = !page.favorite; Api.setFavorite(page.data.Id, page.favorite, ok => { if (!ok) page.favorite = !page.favorite }) } }
        }

        Text { visible: page.data !== null && !!page.data.Overview; x: 32; width: Math.min(820, parent.width - 64); text: page.data ? (page.data.Overview || "") : ""; color: "#e0e0e0"; font.pixelSize: 15; wrapMode: Text.Wrap }
        Text {
            visible: page.data !== null && !!page.data.People && page.data.People.length > 0
            x: 32; width: Math.min(820, parent.width - 64); color: Theme.muted; font.pixelSize: 13; wrapMode: Text.Wrap
            text: page.data && page.data.People ? "Cast: " + page.data.People.filter(p => p.Type === "Actor").slice(0, 8).map(p => p.Name).join(", ") : ""
        }

        Row {
            visible: page.series && page.seasons.length > 1
            x: 32; spacing: 8
            Repeater { model: page.seasons; delegate: FlatButton { text: modelData === 0 ? "Specials" : "Season " + modelData; primary: modelData === page.season; onClicked: page.season = modelData } }
        }
        Column {
            visible: page.series
            x: 32; width: parent.width - 64; spacing: 6
            Repeater {
                model: page.episodes.filter(e => (e.ParentIndexNumber === undefined ? 0 : e.ParentIndexNumber) === page.season)
                delegate: Rectangle {
                    width: parent.width; height: 92; radius: Theme.corner; color: epMouse.containsMouse || activeFocus ? Theme.surface : "transparent"
                    activeFocusOnTab: true; Keys.onReturnPressed: page.play(modelData)
                    border.width: activeFocus ? 2 : 0; border.color: "white"
                    Row {
                        anchors.fill: parent; anchors.margins: 6; spacing: 12
                        Image { width: 148; height: 80; source: Api.thumb(modelData, 400); fillMode: Image.PreserveAspectCrop; asynchronous: true }
                        Column {
                            width: parent.width - 170; anchors.verticalCenter: parent.verticalCenter; spacing: 4
                            Text { text: (modelData.IndexNumber || "") + ". " + modelData.Name; color: "white"; font.pixelSize: 15; font.bold: true; elide: Text.ElideRight; width: parent.width }
                            Text { text: modelData.Overview || ""; color: Theme.muted; font.pixelSize: 12; wrapMode: Text.Wrap; maximumLineCount: 2; elide: Text.ElideRight; width: parent.width }
                        }
                    }
                    MouseArea { id: epMouse; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: page.play(modelData) }
                }
            }
        }

        MediaRow { title: "More like this"; items: page.similar; onOpened: item => page.opened(item) }
    }
}
