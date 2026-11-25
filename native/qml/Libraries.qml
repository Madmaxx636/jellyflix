import QtQuick
import Jellyflix

PageBase {
    id: page
    objectName: "libraries"
    property var views: []
    property var boxsets: []
    property bool loaded: false
    Component.onCompleted: {
        Api.views(r => { views = r; loaded = true })
        Api.items({ types: ["BoxSet"], sortBy: "SortName", limit: 24, lean: true }, r => boxsets = r.items)
    }
    Text { text: Theme.hbo ? Theme.words.libraries.toUpperCase() : Theme.words.libraries; color: "white"; font.pixelSize: Theme.hbo ? 26 : 32; font.weight: Theme.hbo ? Font.Light : Font.Bold; font.letterSpacing: Theme.hbo ? 4 : 0; bottomPadding: 18 }
    Flow {
        width: parent.width; spacing: 16; bottomPadding: 30
        readonly property int cols: Math.max(1, Math.floor((width + 16) / 276))
        readonly property real tw: (width - (cols - 1) * 16) / cols
        Repeater {
            model: page.views
            delegate: Tile {
                width: parent.tw; height: width * 9 / 16; name: modelData.Name
                art: modelData.ImageTags && modelData.ImageTags.Primary ? Api.image(modelData.Id, modelData.ImageTags.Primary, 640) : ""
                finder: function (cb) { Api.items({ parentId: modelData.Id, types: ["Movie", "Series", "BoxSet"], sortBy: "Random", limit: 1 }, function (r) { var it = r.items[0]; cb(it ? (Api.backdrop(it, 640) || Api.thumb(it, 640)) : "") }) }
                onClicked: Nav.navigate("library", { view: modelData })
            }
        }
    }
    Text { visible: page.loaded && page.views.length === 0; text: "No video libraries were found for this account."; color: Theme.muted; font.pixelSize: 18 }
    MediaRow { title: Theme.words.collections; items: page.boxsets; padded: true; link: "collections" }
}
