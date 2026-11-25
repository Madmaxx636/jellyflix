import QtQuick
import QtQuick.Controls.Basic
import Jellyflix

/// A sortable, filterable grid that loads more as you scroll (movies, shows, a library, a genre, My List, a person's titles...).
PageBase {
    id: page
    objectName: "browse"
    property string title
    property var base: ({ types: ["Movie", "Series"] })    // {parentId, types, personId}
    property var lockedFilters: []
    property string lockedGenre: ""
    property bool genreScope: false
    property var genreTypes: ["Movie", "Series"]
    property bool typeSwitch: false
    property bool hideFilter: false
    property string defaultSort: "name"
    property string empty: "Nothing here yet."
    property bool dropUnfavorited: false
    property Component header: null

    property string sort: defaultSort
    property string genre: lockedGenre
    property string filter: "all"
    property string kind: "all"
    property var items: []
    property int total: -1
    property bool loading: false
    property string error: ""
    property var genreList: []
    property int serial: 0
    readonly property var sorts: [
        { value: "name", label: "Name (A–Z)", by: "SortName", order: "Ascending" }, { value: "name-desc", label: "Name (Z–A)", by: "SortName", order: "Descending" },
        { value: "added", label: "Recently added", by: "DateCreated", order: "Descending" }, { value: "released", label: "Release date", by: "PremiereDate", order: "Descending" },
        { value: "rating", label: "Rating", by: "CommunityRating", order: "Descending" }, { value: "random", label: "Shuffle", by: "Random", order: "Ascending" }
    ]

    function query(start) {
        var s = sorts.find(x => x.value === sort) || sorts[0]
        var types = typeSwitch && kind !== "all" ? [kind === "movies" ? "Movie" : "Series"] : base.types
        var filters = lockedFilters.slice()
        if (filter === "unplayed") filters.push("IsUnplayed"); else if (filter === "played") filters.push("IsPlayed"); else if (filter === "fav") filters.push("IsFavorite")
        var q = { parentId: base.parentId, types: types, genres: genre ? [genre] : [], filters: filters, sortBy: s.by, sortOrder: s.order, start: start, limit: s.by === "Random" ? 60 : 48, lean: true }
        if (base.personId) q.personId = base.personId
        return q
    }
    function reload() { serial++; items = []; total = -1; error = ""; more() }
    function more() {
        if (loading) return
        if (total >= 0 && items.length >= total) return
        if (sort === "random" && items.length > 0) return
        loading = true
        var mine = serial, start = items.length
        Api.items(query(start), function (r) {
            if (mine !== serial) return
            loading = false
            if (r.error) { error = r.error; return }
            if (start === 0) total = r.total
            items = items.concat(r.items)
        })
    }
    Component.onCompleted: {
        reload()
        if (genreScope) Api.genres({ types: genreTypes, parentId: base.parentId }, r => genreList = r)
    }
    Connections { target: Flags; function onVersionChanged() { if (page.dropUnfavorited) page.items = page.items.filter(i => Flags.fav(i)) } }
    onContentYChanged: if (contentY + height > contentHeight - 900) more()

    Item {
        width: parent.width; height: head.height + 16
        Flow {
            id: head
            width: parent.width; spacing: 20
            Text {
                text: Theme.hbo ? page.title.toUpperCase() : page.title; color: "white"
                font.pixelSize: Theme.hbo ? 26 : 32; font.weight: Theme.hbo ? Font.Light : Font.Bold; font.letterSpacing: Theme.hbo ? 4 : 0
                height: 40; verticalAlignment: Text.AlignVCenter
            }
            Item { width: Math.max(0, head.width - 700); height: 1; visible: head.width > 900 }
            Row {
                spacing: 14
                Row { visible: page.genreScope && page.lockedGenre === ""; spacing: 8
                    Text { text: Theme.words.genres; color: Theme.muted; font.pixelSize: 13; anchors.verticalCenter: parent.verticalCenter }
                    Select { options: [{ value: "", label: "All genres" }].concat(page.genreList.map(g => ({ value: g, label: g }))); value: page.genre; onPicked: v => { page.genre = v; page.reload() } } }
                Seg { visible: page.typeSwitch; anchors.verticalCenter: parent.verticalCenter; options: [{ value: "all", label: "All" }, { value: "movies", label: "Movies" }, { value: "shows", label: "Shows" }]; value: page.kind; onPicked: v => { page.kind = v; page.reload() } }
                Row { visible: !page.hideFilter; spacing: 8
                    Text { text: "Show"; color: Theme.muted; font.pixelSize: 13; anchors.verticalCenter: parent.verticalCenter }
                    Select { options: [{ value: "all", label: "Everything" }, { value: "unplayed", label: "Unwatched" }, { value: "played", label: "Watched" }, { value: "fav", label: "In " + Theme.words.myList }]; value: page.filter; onPicked: v => { page.filter = v; page.reload() } } }
                Row { spacing: 8
                    Text { text: "Sort"; color: Theme.muted; font.pixelSize: 13; anchors.verticalCenter: parent.verticalCenter }
                    Select { options: page.sorts.map(s => ({ value: s.value, label: s.label })); value: page.sort; onPicked: v => { page.sort = v; page.reload() } } }
            }
        }
    }
    Loader { width: parent.width; sourceComponent: page.header }

    Column {
        visible: page.error !== ""
        width: Math.min(640, parent.width); spacing: 8; topPadding: 30
        Text { width: parent.width; wrapMode: Text.Wrap; color: "#ff6b6b"; font.pixelSize: 16; text: "Couldn't load this list: " + page.error }
        Btn { text: "Try again"; onClicked: page.reload() }
    }
    Flow {
        id: grid
        width: parent.width; spacing: 12; topPadding: 10
        // placeholders until the first page arrives
        Repeater { model: page.items.length === 0 && page.loading ? 16 : 0
            delegate: Shimmer { width: Theme.landscape ? Theme.cardWideW : Theme.cardW; height: Theme.landscape ? Theme.cardWideW * 9 / 16 : Theme.cardW * 1.5 } }
        Repeater {
            model: page.items
            delegate: Item {
                width: (Theme.landscape ? Theme.cardWideW : Theme.cardW); height: (Theme.landscape ? Theme.cardWideW * 9 / 16 : Theme.cardW * 1.5) + 18
                Card { item: modelData }
            }
        }
    }
    Text { visible: !page.loading && page.error === "" && page.items.length === 0 && page.total === 0; topPadding: 30; text: page.empty; color: Theme.muted; font.pixelSize: 18 }
    Text { visible: page.loading && page.items.length > 0; topPadding: 16; text: "Loading…"; color: Theme.muted; font.pixelSize: 14 }
    Text { visible: !page.loading && page.total > 0; topPadding: 16; text: page.total + (page.total === 1 ? " title" : " titles"); color: Theme.muted; font.pixelSize: 14 }
}
