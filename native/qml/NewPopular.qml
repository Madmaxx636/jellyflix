import QtQuick
import Jellyflix

PageBase {
    id: page
    objectName: "new"
    property var added: []
    property var released: []
    property var topRated: []
    property var unseen: []
    Component.onCompleted: {
        var q = function (extra, set) { var o = { types: ["Movie", "Series"], limit: 20 }; for (var k in extra) o[k] = extra[k]; Api.items(o, r => set(r.items)) }
        q({ sortBy: "DateCreated", sortOrder: "Descending" }, r => added = r)
        q({ sortBy: "PremiereDate", sortOrder: "Descending" }, r => released = r)
        q({ sortBy: "CommunityRating", sortOrder: "Descending" }, r => topRated = r)
        q({ filters: ["IsUnplayed"], sortBy: "Random" }, r => unseen = r)
    }
    Text { text: Theme.hbo ? Theme.words.newPage.toUpperCase() : Theme.words.newPage; color: "white"; font.pixelSize: Theme.hbo ? 26 : 32; font.weight: Theme.hbo ? Font.Light : Font.Bold; font.letterSpacing: Theme.hbo ? 4 : 0; bottomPadding: 18 }
    MediaRow { title: "Recently Added"; items: page.added; padded: true; link: "movies" }
    MediaRow { title: "New Releases"; items: page.released; padded: true; link: "movies" }
    MediaRow { title: Theme.words.topRated; items: page.topRated; padded: true; ranked: Theme.look.top10; link: "movies" }
    MediaRow { title: "Something You Haven't Seen"; items: page.unseen; padded: true; link: "movies" }
}
