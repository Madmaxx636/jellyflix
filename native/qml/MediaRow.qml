import QtQuick
import Jellyflix

/// A titled row of tiles you scroll sideways.
Column {
    id: row
    property string title
    property var items: []
    signal opened(var item)
    visible: items.length > 0
    spacing: 8
    width: parent ? parent.width : 800

    Text { x: 24; text: Theme.styled(row.title); color: "white"; font.pixelSize: Theme.look.caps ? 14 : 20; font.bold: !Theme.look.caps; font.letterSpacing: Theme.look.caps ? 3 : 0 }
    ListView {
        width: parent.width; height: (Theme.landscape ? 152 : 238) + 6
        orientation: ListView.Horizontal; spacing: 12; leftMargin: 24; rightMargin: 24; clip: true
        boundsBehavior: Flickable.StopAtBounds
        model: row.items
        delegate: Poster { item: modelData; onActivated: row.opened(item) }
    }
}
