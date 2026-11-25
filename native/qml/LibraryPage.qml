import QtQuick
import QtQuick.Controls.Basic
import Jellyflix

/// A library, or all movies or all shows, as a grid that loads more as you scroll.
Item {
    id: page
    objectName: "library"
    property var view: null
    property string kind: ""
    property var items: []
    property int total: -1
    property bool loading: false
    property string sort: "SortName"
    signal opened(var item)
    readonly property string heading: view ? view.Name : (kind === "movies" ? "Movies" : "Shows")

    function types() {
        if (kind === "movies") return ["Movie"]
        if (kind === "shows") return ["Series"]
        var t = view ? (view.CollectionType || "").toLowerCase() : ""
        return t === "movies" ? ["Movie"] : t === "tvshows" ? ["Series"] : ["Movie", "Series"]
    }
    function more() {
        if (loading || (total >= 0 && items.length >= total)) return
        loading = true
        var start = items.length
        Api.items({ parentId: view ? view.Id : undefined, types: types(), sortBy: sort, sortOrder: sort === "SortName" ? "Ascending" : "Descending", start: start, limit: 48, lean: true }, function (r) {
            loading = false
            if (start === 0) total = r.total
            items = items.concat(r.items)
        })
    }
    function reload() { items = []; total = -1; more() }
    Component.onCompleted: more()

    Row {
        id: head
        x: 24; y: 12; spacing: 16; height: 40
        Text { text: Theme.styled(page.heading); color: "white"; font.pixelSize: 26; font.bold: true; anchors.verticalCenter: parent.verticalCenter }
        Repeater {
            model: [{ id: "SortName", label: "A–Z" }, { id: "DateCreated", label: "Recently added" }, { id: "CommunityRating", label: "Rating" }, { id: "PremiereDate", label: "Release date" }]
            delegate: FlatButton { implicitHeight: 32; text: modelData.label; primary: page.sort === modelData.id; anchors.verticalCenter: parent.verticalCenter; onClicked: { page.sort = modelData.id; page.reload() } }
        }
    }
    GridView {
        id: grid
        anchors.top: head.bottom; anchors.topMargin: 8; anchors.bottom: parent.bottom; anchors.left: parent.left; anchors.right: parent.right; anchors.leftMargin: 12
        clip: true; boundsBehavior: Flickable.StopAtBounds
        cellWidth: Theme.landscape ? 236 : 156; cellHeight: Theme.landscape ? 168 : 254
        model: page.items
        delegate: Poster { item: modelData; onActivated: page.opened(item) }
        onAtYEndChanged: if (atYEnd) page.more()
        ScrollBar.vertical: ScrollBar {}
    }
    Text { visible: !page.loading && page.items.length === 0 && page.total === 0; anchors.centerIn: parent; text: "Nothing here yet."; color: Theme.muted }
    Text { visible: page.total > 0; anchors.right: parent.right; anchors.rightMargin: 24; anchors.top: parent.top; anchors.topMargin: 22; text: page.total + " titles"; color: Theme.muted; font.pixelSize: 13 }
}
