import QtQuick
import QtQuick.Controls.Basic
import Jellyflix

Flickable {
    id: home
    objectName: "home"
    signal opened(var item)
    signal openedLibrary(var view)
    property var resume: []
    property var nextUp: []
    property var movies: []
    property var shows: []
    property var views: []
    property var hero: null
    property bool ready: false
    contentWidth: width
    contentHeight: column.height + 40
    boundsBehavior: Flickable.StopAtBounds
    clip: true
    ScrollBar.vertical: ScrollBar {}

    Component.onCompleted: {
        var left = 5
        var done = function () {
            if (--left > 0) return
            var pool = [].concat(movies, shows).filter(i => (i.BackdropImageTags && i.BackdropImageTags.length) && i.Overview)
            hero = pool.length ? pool[Math.floor(Math.random() * Math.min(pool.length, 5))] : (resume.length ? resume[0] : null)
            ready = true
        }
        Api.resume(r => { resume = r; done() })
        Api.nextUp(r => { nextUp = r; done() })
        Api.latest("Movie", r => { movies = r; done() })
        Api.latest("Series", r => { shows = r; done() })
        Api.views(r => { views = r; done() })
    }

    Column {
        id: column
        width: home.width
        spacing: 16

        Item {
            id: banner
            visible: home.hero !== null
            width: parent.width; height: visible ? Math.min(460, home.width * 0.42) : 0
            Image { anchors.fill: parent; source: home.hero ? Api.backdrop(home.hero, 1600) : ""; fillMode: Image.PreserveAspectCrop; asynchronous: true }
            Rectangle { anchors.fill: parent; gradient: Gradient { GradientStop { position: 0.0; color: "transparent" } GradientStop { position: 1.0; color: Theme.background } } }
            Rectangle { anchors.fill: parent; gradient: Gradient { orientation: Gradient.Horizontal; GradientStop { position: 0.0; color: Qt.rgba(0, 0, 0, 0.7) } GradientStop { position: 0.6; color: "transparent" } } }
            Column {
                anchors.left: parent.left; anchors.leftMargin: 32; anchors.bottom: parent.bottom; anchors.bottomMargin: 36
                width: Math.min(620, parent.width - 64); spacing: 10
                Text { width: parent.width; text: home.hero ? (home.hero.Type === "Episode" ? (home.hero.SeriesName || home.hero.Name) : home.hero.Name) : ""; color: "white"; font.pixelSize: 40; font.bold: true; wrapMode: Text.Wrap; maximumLineCount: 2; elide: Text.ElideRight }
                Text { width: parent.width; text: home.hero && home.hero.Overview ? home.hero.Overview : ""; color: "#e0e0e0"; font.pixelSize: 15; wrapMode: Text.Wrap; maximumLineCount: 3; elide: Text.ElideRight }
                Row { spacing: 10
                    FlatButton { objectName: "heroPlay"; text: "Play"; primary: true; onClicked: home.opened(home.hero) }
                    FlatButton { text: "More Info"; onClicked: home.opened(home.hero) }
                }
            }
        }

        MediaRow { title: Theme.continueTitle; items: home.resume; onOpened: item => home.opened(item) }
        MediaRow { title: "Next Up"; items: home.nextUp; onOpened: item => home.opened(item) }
        MediaRow { title: "Recently Added Movies"; items: home.movies; onOpened: item => home.opened(item) }
        MediaRow { title: "Recently Added Shows"; items: home.shows; onOpened: item => home.opened(item) }
        Column {
            visible: home.views.length > 0; spacing: 8
            Text { x: 24; text: Theme.styled("Libraries"); color: "white"; font.pixelSize: 20; font.bold: true }
            Row { x: 24; spacing: 12
                Repeater { model: home.views; delegate: FlatButton { text: modelData.Name; onClicked: home.openedLibrary(modelData) } }
            }
        }
        Text { visible: home.ready && home.resume.length + home.nextUp.length + home.movies.length + home.shows.length === 0; x: 24; text: "Nothing to show yet. Add some titles to your Jellyfin library and they'll appear here."; color: Theme.muted }
    }
}
