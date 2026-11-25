import QtQuick
import Jellyflix
import "Seasonal.js" as Seasonal
import "Util.js" as Util

PageBase {
    id: home
    objectName: "home"
    framed: false
    property var resume: []
    property var nextUp: []
    property var movies: []
    property var shows: []
    property var favs: []
    property var topRated: []
    property var recs: []
    property var views: []
    property var genreNames: []
    property var genreRows: []
    property var holiday: ({ items: [], labels: ({}) })
    property bool ready: false
    property string error: ""
    property var heroItems: []
    property var heroLabels: ({})
    readonly property bool hasHero: Settings.showHero && heroItems.length > 0

    function pickHero() {
        var worth = function (it) { return ((it.BackdropImageTags && it.BackdropImageTags.length) || (it.ParentBackdropImageTags && it.ParentBackdropImageTags.length)) && it.Overview }
        var pool = []
        if (Settings.rowSeasonal) pool = holiday.items.filter(worth)
        if (pool.length < 2 && movies.length + shows.length === 0) return
        if (pool.length >= 2) { heroLabels = holiday.labels } else {
            heroLabels = ({})
            var seen = {}
            pool = []
            movies.concat(shows, topRated, recs.reduce((a, r) => a.concat(r.Items || []), [])).forEach(function (it) { if (!seen[it.Id] && worth(it)) { seen[it.Id] = true; pool.push(it) } })
        }
        for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = pool[i]; pool[i] = pool[j]; pool[j] = t }
        heroItems = pool.slice(0, 5)
    }

    // Rows appear as their answers arrive. The first screenful (Continue Watching, Next Up, the newest titles and the libraries) is
    // asked for first; the slower, less important things (recommendations, genre rows, the holiday picks) come after, a few at a time.
    property int pending: 4
    readonly property bool anyRows: resume.length + nextUp.length + movies.length + shows.length + favs.length + topRated.length > 0
    Component.onCompleted: {
        var core = function () { if (--pending === 0) { pickHero(); ready = true; loadLater() } }
        Api.probe(err => { if (err) home.error = err })
        Api.resume(r => { resume = r; core() })
        Api.nextUp(r => { nextUp = r; core() })
        Api.latest("Movie", r => { movies = r; pickHero(); core() })
        Api.latest("Series", r => { shows = r; pickHero(); core() })
        Api.views(r => { views = r })
    }
    function loadLater() {
        Api.items({ types: ["Movie", "Series", "BoxSet"], filters: ["IsFavorite"], sortBy: "DateCreated", sortOrder: "Descending", limit: 20, lean: true }, r => favs = r.items)
        Api.items({ types: ["Movie", "Series"], sortBy: "CommunityRating", sortOrder: "Descending", limit: 10, lean: true }, r => topRated = r.items)
        Api.genres(null, function (names) {
            genreNames = names
            var wanted = names.slice(0, Settings.genreRows), rows = new Array(wanted.length), next = 0, active = 0
            var pump = function () {
                while (active < 3 && next < wanted.length) {
                    (function (i) { active++; Api.byGenre(wanted[i], function (items) { rows[i] = { title: wanted[i], items: items }; genreRows = rows.filter(x => x); active--; pump() }) })(next++)
                }
            }
            pump()
        })
        Api.recommendations(r => recs = r)
        var seasons = Seasonal.seasonsFor(new Date())
        if (seasons.length) Seasonal.holidayPicks(Api, seasons, Settings.seasonalStyle, function (r) { holiday = r; if (!heroTouched) pickHero() }, { get: k => Backend.setting(k, ""), set: (k, v) => Backend.setSetting(k, v) })
    }
    property bool heroTouched: false

    function rowDefs() {
        var rows = []
        if (Settings.rowContinue) rows.push({ title: Theme.continueTitle(Api.session ? Api.session.userName : ""), items: resume })
        if (Settings.rowNextUp) rows.push({ title: Theme.words.nextUp, items: nextUp })
        if (Settings.rowMyList) rows.push({ title: Theme.words.myList, items: favs, link: "mylist" })
        if (Settings.rowRecommended) recs.forEach(function (r) {
            var name = r.BaselineItemName || "", type = String(r.RecommendationType || "")
            rows.push({ title: /director/i.test(type) ? "Directed by " + name : /actor/i.test(type) ? "Starring " + name : Theme.becauseYouWatched(name), items: r.Items || [] })
        })
        if (Settings.rowTopRated) rows.push({ title: Theme.words.topRated, items: topRated, ranked: Theme.look.top10, link: "new" })
        if (Settings.rowRecent) { rows.push({ title: Theme.recentlyAdded("movies"), items: movies, link: "movies" }); rows.push({ title: Theme.recentlyAdded("shows"), items: shows, link: "shows" }) }
        genreRows.slice(0, Settings.genreRows).forEach(g => rows.push({ title: g.title, items: g.items, link: "genre", linkParams: { name: g.title } }))
        return rows
    }

    Column {
        width: home.width
        spacing: 0

        // Hulu's banner is inset and rounded, and starts just under the bar
        Item { visible: Theme.hulu && home.hasHero; width: 1; height: Theme.navH + 10 }
        Hero {
            width: Theme.hulu ? parent.width * 0.92 : parent.width; vh: home.height
            visible: home.hasHero
            height: visible ? Math.max(460, vh * share) : 0
            items: home.heroItems; labels: home.heroLabels
            x: Theme.hulu ? parent.width * 0.04 : 0
        }

        // Disney+: libraries as brand tiles under the banner
        Grid {
            visible: Theme.look.brandTiles && home.ready
            x: parent.width * 0.04; width: parent.width * 0.92
            columns: Math.max(2, Math.floor(width / 164)); spacing: 14
            topPadding: home.hasHero ? -34 : Theme.navH + 20
            readonly property real tw: (width - (columns - 1) * 14) / columns
            Repeater {
                model: home.views.slice(0, 5)
                delegate: Tile {
                    width: parent.tw; height: width * 0.625; name: modelData.Name
                    art: modelData.ImageTags && modelData.ImageTags.Primary ? Api.image(modelData.Id, modelData.ImageTags.Primary, 640) : ""
                    finder: function (cb) { Api.items({ parentId: modelData.Id, types: ["Movie", "Series"], sortBy: "Random", limit: 1 }, function (r) { var it = r.items[0]; cb(it ? (Api.backdrop(it, 640) || Api.thumb(it, 640)) : "") }) }
                    onClicked: Nav.navigate("library", { view: modelData })
                }
            }
            Tile { visible: !home.views.some(v => (v.CollectionType || "").toLowerCase() === "boxsets"); width: visible ? parent.tw : 0; height: width * 0.625; name: Theme.words.collections; misc: true; onClicked: Nav.navigate("collections", {}) }
            Tile { width: parent.tw; height: width * 0.625; name: Theme.words.genres; misc: true; alt: true; onClicked: Nav.navigate("genres", {}) }
        }

        Column {
            id: rows
            width: parent.width
            spacing: 14
            topPadding: home.hasHero ? (Theme.hulu ? 16 : (Theme.look.brandTiles ? 22 : -home.height * 0.09)) : (Theme.look.brandTiles ? 14 : Theme.navH + 24)
            // placeholders while the first answers come in
            Repeater {
                model: !home.anyRows && home.error === "" ? 3 : 0
                delegate: Column {
                    x: home.width * 0.04; spacing: 10
                    Shimmer { width: 180; height: 22 }
                    Row { spacing: 6; Repeater { model: 8; delegate: Shimmer { width: Theme.landscape ? Theme.cardWideW : Theme.cardW; height: Theme.landscape ? Theme.cardWideW * 9 / 16 : Theme.cardW * 1.5 } } }
                }
            }
            Repeater {
                model: home.rowDefs()
                delegate: MediaRow { title: modelData.title; items: modelData.items; ranked: !!modelData.ranked; link: modelData.link || ""; linkParams: modelData.linkParams || ({}) }
            }
            Text {
                visible: home.ready && !home.anyRows
                x: home.width * 0.04; width: home.width * 0.9; wrapMode: Text.Wrap; color: Theme.muted; font.pixelSize: 18
                text: "Nothing to show yet. Add some titles to your Jellyfin library and they'll appear here."
            }
            Column {
                visible: home.error !== ""; x: home.width * 0.04; width: Math.min(640, home.width * 0.9); spacing: 10; topPadding: 20
                Text { width: parent.width; wrapMode: Text.Wrap; color: "#ff6b6b"; font.pixelSize: 17; text: "Couldn't load your library: " + home.error }
                Btn { text: "Try again"; onClicked: Nav.navigate("home", {}) }
            }
            Item { width: 1; height: 60 }
        }
    }
}
