import QtQuick
import QtQuick.Controls.Basic
import Jellyflix

Item {
    id: page
    objectName: "search"
    property var results: []
    signal opened(var item)

    Timer { id: wait; interval: 300; onTriggered: { var term = field.text.trim(); if (!term) { page.results = []; return } Api.search(term, r => { if (field.text.trim() === term) page.results = r }) } }

    TextField {
        id: field
        objectName: "searchField"
        x: 24; y: 16; width: Math.min(560, parent.width - 48)
        placeholderText: "Search movies and shows"; color: "white"; placeholderTextColor: "#888"; selectByMouse: true
        background: Rectangle { color: "#2a2a2a"; radius: 4; border.color: field.activeFocus ? Theme.accent : "#444" }
        onTextChanged: wait.restart()
        Component.onCompleted: forceActiveFocus()
    }
    GridView {
        anchors.top: field.bottom; anchors.topMargin: 16; anchors.bottom: parent.bottom; anchors.left: parent.left; anchors.right: parent.right; anchors.leftMargin: 12
        clip: true; boundsBehavior: Flickable.StopAtBounds
        cellWidth: Theme.landscape ? 236 : 156; cellHeight: Theme.landscape ? 168 : 254
        model: page.results
        delegate: Poster { item: modelData; onActivated: page.opened(item) }
    }
    Text { visible: field.text.trim() !== "" && page.results.length === 0; anchors.centerIn: parent; text: "No results."; color: Theme.muted }
}
