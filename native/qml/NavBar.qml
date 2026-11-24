import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import Jellyflix

Rectangle {
    id: bar
    signal navigate(string page)
    height: 56
    color: Theme.background

    RowLayout {
        anchors.fill: parent; anchors.leftMargin: 24; anchors.rightMargin: 24; spacing: 20
        Text { text: "JELLYFLIX"; color: Theme.accent; font.pixelSize: 22; font.bold: true; font.letterSpacing: 2 }
        Repeater {
            model: [{ id: "home", label: "Home" }, { id: "movies", label: "Movies" }, { id: "shows", label: "Shows" }]
            delegate: Text {
                text: Theme.styled(modelData.label); color: area.containsMouse || activeFocus ? "white" : "#d0d0d0"; font.pixelSize: 15
                activeFocusOnTab: true
                Keys.onReturnPressed: bar.navigate(modelData.id)
                MouseArea { id: area; anchors.fill: parent; anchors.margins: -6; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: bar.navigate(modelData.id) }
            }
        }
        Item { Layout.fillWidth: true }
        Text { text: Theme.styled("Search"); color: "#d0d0d0"; font.pixelSize: 15; activeFocusOnTab: true; Keys.onReturnPressed: bar.navigate("search")
            MouseArea { anchors.fill: parent; anchors.margins: -6; cursorShape: Qt.PointingHandCursor; onClicked: bar.navigate("search") } }
        Rectangle {
            width: 34; height: 34; radius: Theme.look.pill ? 17 : 4; color: Qt.hsla((Api.session ? Api.session.userName.length * 37 % 360 : 0) / 360, 0.55, 0.42, 1)
            Text { anchors.centerIn: parent; color: "white"; font.bold: true; text: Api.session ? Api.session.userName.slice(0, 1).toUpperCase() : "" }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: bar.navigate("settings") }
            activeFocusOnTab: true
            Keys.onReturnPressed: bar.navigate("settings")
        }
    }
}
