import QtQuick
import Jellyflix

PageBase {
    id: page
    objectName: "genres"
    property var names: []
    property bool loaded: false
    Component.onCompleted: Api.genres(null, r => { names = r; loaded = true })
    Text { text: Theme.hbo ? Theme.words.genres.toUpperCase() : Theme.words.genres; color: "white"; font.pixelSize: Theme.hbo ? 26 : 32; font.weight: Theme.hbo ? Font.Light : Font.Bold; font.letterSpacing: Theme.hbo ? 4 : 0; bottomPadding: 18 }
    Flow {
        width: parent.width; spacing: 16
        readonly property int cols: Math.max(1, Math.floor((width + 16) / 226))
        readonly property real tw: (width - (cols - 1) * 16) / cols
        Repeater {
            model: page.names
            delegate: Tile {
                width: parent.tw; height: width * 9 / 16; name: modelData
                finder: function (cb) { Api.items({ types: ["Movie", "Series"], genres: [modelData], sortBy: "Random", limit: 1 }, function (r) { var it = r.items[0]; cb(it ? (Api.backdrop(it, 480) || Api.thumb(it, 480)) : "") }) }
                onClicked: Nav.navigate("genre", { name: modelData })
            }
        }
    }
    Text { visible: page.loaded && page.names.length === 0; text: "No genres yet."; color: Theme.muted; font.pixelSize: 18 }
}
