import QtQuick
import QtQuick.Controls.Basic
import Jellyflix

PageBase {
    id: page
    objectName: "search"
    property string q: ""
    property string kind: "all"
    property var movies: []
    property var shows: []
    property var people: []
    property var suggestions: []
    property var recent: []
    property bool searching: false
    property bool settled: false
    property int serial: 0
    readonly property string term: q.trim()
    readonly property bool showingSuggestions: term === ""

    Component.onCompleted: {
        try { recent = JSON.parse(Backend.setting("recentSearches", "[]")) } catch (e) { recent = [] }
        Api.items({ types: ["Movie", "Series"], sortBy: "CommunityRating", sortOrder: "Descending", limit: 20 }, r => suggestions = r.items)
        if (!Theme.netflix && !Theme.hulu) field.forceActiveFocus()
    }
    onQChanged: wait.restart()
    Timer { id: wait; interval: 250; onTriggered: page.run() }
    function run() {
        var mine = ++serial, term = page.term
        if (term === "") { movies = []; shows = []; people = []; settled = false; return }
        searching = true; settled = false
        var want = function (k) { return kind === "all" || kind === k }
        var left = 0, out = { movies: [], shows: [], people: [] }
        var done = function () {
            if (--left > 0) return
            if (mine !== serial) return
            movies = out.movies; shows = out.shows; people = out.people; searching = false; settled = true
            if (movies.length + shows.length + people.length > 0) {
                recent = [term].concat(recent.filter(x => x.toLowerCase() !== term.toLowerCase())).slice(0, 8)
                Backend.setSetting("recentSearches", JSON.stringify(recent))
            }
        }
        if (want("movies")) { left++; Api.items({ types: ["Movie"], search: term, limit: 60, lean: true }, r => { out.movies = r.items; done() }) }
        if (want("shows")) { left++; Api.items({ types: ["Series"], search: term, limit: 60, lean: true }, r => { out.shows = r.items; done() }) }
        if (want("people")) { left++; Api.searchPeople(term, r => { out.people = r; done() }) }
        if (left === 0) searching = false
    }
    onKindChanged: run()

    // Netflix and Hulu search from the top bar, so they don't draw their own box
    Rectangle {
        visible: !Theme.netflix && !Theme.hulu
        width: Math.min(760, parent.width); height: 56; radius: Theme.btnRadius; color: Theme.surface; border.color: field.activeFocus ? "white" : Theme.line
        Icon { x: 16; anchors.verticalCenter: parent.verticalCenter; name: "search"; size: 22 }
        TextField { id: field; x: 52; width: parent.width - 68; height: parent.height; background: null; color: "white"; font.pixelSize: 21; selectByMouse: true
            placeholderText: Theme.words.searchHint; placeholderTextColor: Theme.muted; text: page.q; onTextEdited: page.q = text }
    }
    Item { width: 1; height: 14 }
    Seg {
        options: [{ value: "all", label: "All" }, { value: "movies", label: "Movies" }, { value: "shows", label: "Shows" }, { value: "people", label: "People" }]
        value: page.kind; onPicked: v => page.kind = v
    }
    Item { width: 1; height: 18 }

    Column {
        visible: page.showingSuggestions; width: parent.width; spacing: 14
        Column {
            visible: page.recent.length > 0; spacing: 10
            Text { text: "Recent searches"; color: Theme.muted; font.pixelSize: 16 }
            Flow { width: page.width * 0.9; spacing: 8
                Repeater { model: page.recent; delegate: Rectangle {
                    width: rl.implicitWidth + 28; height: 32; radius: 16; color: Theme.surface; border.color: rh.containsMouse ? "white" : Theme.line
                    Text { id: rl; anchors.centerIn: parent; text: modelData; color: rh.containsMouse ? "white" : "#ddd"; font.pixelSize: 14 }
                    MouseArea { id: rh; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: { page.q = modelData; field.text = modelData } } } } }
        }
        MediaRow { title: Theme.words.topRated; items: page.suggestions; padded: true }
    }

    Column {
        visible: !page.showingSuggestions; width: parent.width; spacing: 10
        Text { visible: page.searching; text: "Searching…"; color: Theme.muted; font.pixelSize: 14 }
        Text { visible: page.settled && page.movies.length + page.shows.length + page.people.length === 0; text: "No results for “" + page.q + "”."; color: Theme.muted; font.pixelSize: 18; topPadding: 20 }
        Text { visible: page.movies.length > 0; text: "Movies"; color: "white"; font.pixelSize: 22; font.bold: true; topPadding: 14 }
        Flow { visible: page.movies.length > 0; width: parent.width; spacing: 12
            Repeater { model: page.movies; delegate: Item { width: Theme.landscape ? Theme.cardWideW : Theme.cardW; height: (Theme.landscape ? Theme.cardWideW * 9 / 16 : Theme.cardW * 1.5) + 18; Card { item: modelData } } } }
        Text { visible: page.shows.length > 0; text: "Shows"; color: "white"; font.pixelSize: 22; font.bold: true; topPadding: 14 }
        Flow { visible: page.shows.length > 0; width: parent.width; spacing: 12
            Repeater { model: page.shows; delegate: Item { width: Theme.landscape ? Theme.cardWideW : Theme.cardW; height: (Theme.landscape ? Theme.cardWideW * 9 / 16 : Theme.cardW * 1.5) + 18; Card { item: modelData } } } }
        Text { visible: page.people.length > 0; text: "People"; color: "white"; font.pixelSize: 22; font.bold: true; topPadding: 14 }
        Flow { visible: page.people.length > 0; width: parent.width; spacing: 18
            Repeater { model: page.people; delegate: Item { width: 110; height: 140
                Avatar { x: 7; width: 96; height: 96; round: true; name: modelData.Name; url: modelData.ImageTags && modelData.ImageTags.Primary ? Api.image(modelData.Id, modelData.ImageTags.Primary, 200) : "" }
                Text { y: 104; width: 110; text: modelData.Name; color: "#ddd"; font.pixelSize: 13; horizontalAlignment: Text.AlignHCenter; wrapMode: Text.Wrap; maximumLineCount: 2; elide: Text.ElideRight }
                MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: Nav.navigate("person", { id: modelData.Id }) } } } }
    }
}
