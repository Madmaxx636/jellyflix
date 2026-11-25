import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import Jellyflix

/// The top bar. Which links it has, where search lives and what it is called all depend on the look.
Rectangle {
    id: bar
    property string route: "home"
    property bool scrolled: false
    signal search(string text)
    property string query: ""
    property bool searchOpen: false
    readonly property bool narrow: width < 1180
    readonly property bool tiny: width < 760
    height: Theme.navH
    color: (scrolled || Theme.hulu || Theme.disney) ? Theme.navSolid : "transparent"
    Behavior on color { ColorAnimation { duration: 250 } }

    // the bar fades from black to nothing until content scrolls under it
    Rectangle {
        anchors.fill: parent; visible: !bar.scrolled && !Theme.hulu && !Theme.disney
        gradient: Gradient { GradientStop { position: 0; color: Qt.rgba(0, 0, 0, 0.85) } GradientStop { position: 1; color: "transparent" } }
    }

    function linkLabel(l) { return Theme.hbo || Theme.disney ? l[1].toUpperCase() : l[1] }

    Text {
        id: logo
        x: parent.width * 0.04 > 12 ? (bar.tiny ? 12 : parent.width * 0.04) : 12
        anchors.verticalCenter: parent.verticalCenter
        text: Theme.look.logo
        color: Theme.disney ? "white" : Theme.accent
        font.pixelSize: bar.tiny ? 20 : (Theme.hbo ? 22 : Theme.disney ? 28 : Theme.hulu ? 30 : 26)
        font.weight: Theme.hbo ? Font.Light : (Theme.disney ? Font.DemiBold : Font.Black)
        font.letterSpacing: Theme.hbo ? 6 : (Theme.hulu ? -1 : (Theme.disney ? 0 : 2))
        font.italic: Theme.disney
        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: Nav.navigate("home", {}) }
    }

    Row {
        id: links
        visible: !bar.narrow
        anchors.verticalCenter: parent.verticalCenter
        x: logo.x + logo.width + (Theme.disney ? 34 : 28)
        spacing: Theme.disney ? 26 : (Theme.hulu ? 22 : (Theme.hbo ? 26 : 18))
        Repeater {
            model: Theme.look.nav
            delegate: Item {
                readonly property bool active: bar.route === modelData[0]
                width: linkRow.implicitWidth; height: bar.height
                Row {
                    id: linkRow
                    anchors.verticalCenter: parent.verticalCenter; spacing: 6
                    Icon { visible: Theme.look.navIcons && modelData.length > 2; name: modelData.length > 2 ? modelData[2] : "home"; size: 18; color: parent.parent.active ? "white" : "#e5e5e5"; anchors.verticalCenter: parent.verticalCenter }
                    Text {
                        id: lab
                        text: bar.linkLabel(modelData)
                        color: parent.parent.active ? "white" : (linkArea.containsMouse ? "#b3b3b3" : "#e5e5e5")
                        font.pixelSize: Theme.hbo ? 12 : (Theme.disney ? 13 : (Theme.hulu ? 15 : 14))
                        font.weight: Theme.hulu ? Font.Bold : (parent.parent.active ? (Theme.netflix ? Font.DemiBold : Font.Bold) : (Theme.disney ? Font.DemiBold : Font.Normal))
                        font.letterSpacing: Theme.hbo ? 2 : (Theme.disney ? 1.4 : 0)
                    }
                }
                // Hulu: green underline; HBO: accent underline; Disney+: white underline that grows on hover
                Rectangle {
                    anchors.left: parent.left; anchors.right: parent.right
                    anchors.bottom: parent.bottom; anchors.bottomMargin: Theme.hulu ? 0 : (bar.height - 40) / 2 - 4
                    height: Theme.hulu ? 3 : 2
                    color: Theme.hulu || Theme.hbo ? Theme.accent : "#f9f9f9"
                    visible: Theme.hulu || Theme.hbo ? parent.active : (parent.active || linkArea.containsMouse)
                }
                MouseArea { id: linkArea; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: Nav.navigate(modelData[0], {}) }
            }
        }
        Item {
            width: moreRow.implicitWidth; height: bar.height
            Row {
                id: moreRow; anchors.verticalCenter: parent.verticalCenter; spacing: 6
                Text { text: Theme.hbo || Theme.disney ? Theme.look.moreLabel.toUpperCase() : Theme.look.moreLabel; color: moreArea.containsMouse ? "#b3b3b3" : "#e5e5e5"; font.pixelSize: Theme.hbo ? 12 : 14; font.letterSpacing: Theme.hbo ? 2 : (Theme.disney ? 1.4 : 0) }
                Icon { name: "chevron"; size: 14; color: "#e5e5e5"; anchors.verticalCenter: parent.verticalCenter }
            }
            MouseArea { id: moreArea; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: morePop.open() }
            Popup {
                id: morePop; y: parent.height - 12; padding: 8; width: 200
                background: Rectangle { color: "#f5080808"; border.color: Theme.line; radius: Theme.radius }
                contentItem: Column {
                    Repeater {
                        model: Theme.look.more
                        delegate: Rectangle {
                            width: 184; height: 38; color: ma.containsMouse ? Qt.rgba(1, 1, 1, 0.1) : "transparent"
                            Text { x: 12; anchors.verticalCenter: parent.verticalCenter; text: modelData[1]; color: bar.route === modelData[0] ? Theme.accent : "#ddd"; font.pixelSize: 14; font.bold: bar.route === modelData[0] }
                            MouseArea { id: ma; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: { morePop.close(); Nav.navigate(modelData[0], {}) } }
                        }
                    }
                }
            }
        }
    }

    Row {
        id: right
        anchors.right: parent.right; anchors.rightMargin: bar.tiny ? 12 : parent.width * 0.04
        anchors.verticalCenter: parent.verticalCenter
        spacing: bar.tiny ? 6 : 14

        // search: an icon that opens a box (Netflix), a bar that is always there (Hulu), or a link to the search page (HBO, Disney+)
        Row {
            visible: Theme.look.search === "icon-expand"
            spacing: 6; anchors.verticalCenter: parent.verticalCenter
            Rectangle {
                visible: bar.searchOpen || bar.query !== ""
                width: 240; height: 34; color: Qt.rgba(0, 0, 0, 0.7); border.color: "#888"; radius: Theme.radius
                TextField {
                    id: boxA; anchors.fill: parent; anchors.leftMargin: 6; background: null; color: "white"; placeholderText: Theme.words.searchHint; placeholderTextColor: "#999"; font.pixelSize: 14; selectByMouse: true
                    text: bar.query; onTextEdited: bar.search(text); Keys.onEscapePressed: bar.searchOpen = false
                    onActiveFocusChanged: if (!activeFocus && text === "") bar.searchOpen = false
                }
            }
            Item { width: 30; height: 30; Icon { anchors.centerIn: parent; name: "search"; size: 20 }
                MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: { bar.searchOpen = !bar.searchOpen; if (bar.searchOpen) boxA.forceActiveFocus() } } }
        }
        Rectangle {
            visible: Theme.look.search === "bar" && !bar.tiny
            width: 240; height: 36; radius: 18; color: Qt.rgba(1, 1, 1, 0.1); anchors.verticalCenter: parent.verticalCenter
            Icon { x: 14; anchors.verticalCenter: parent.verticalCenter; name: "search"; size: 16; color: Theme.muted }
            TextField { x: 38; width: parent.width - 52; height: parent.height; background: null; color: "white"; placeholderText: Theme.words.searchHint; placeholderTextColor: Theme.muted; font.pixelSize: 14; selectByMouse: true; text: bar.query; onTextEdited: bar.search(text) }
        }
        Item {
            visible: Theme.look.search === "page" && !Theme.disney; width: 30; height: 30; anchors.verticalCenter: parent.verticalCenter
            Icon { anchors.centerIn: parent; name: "search"; size: 20 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: Nav.navigate("search", {}) }
        }

        // the look
        Rectangle {
            id: lookBtn
            anchors.verticalCenter: parent.verticalCenter
            width: lookRow.implicitWidth + (bar.tiny ? 18 : 24); height: 30; radius: Theme.hbo ? 2 : 15
            color: Theme.hulu || Theme.disney ? "transparent" : Qt.rgba(0, 0, 0, 0.45); border.color: lookArea.containsMouse ? Qt.rgba(1, 1, 1, 0.4) : Theme.line
            Row { id: lookRow; anchors.centerIn: parent; spacing: 6
                Text { text: Theme.hbo ? Theme.look.label.toUpperCase() : Theme.look.label; color: lookArea.containsMouse ? "white" : "#ddd"; font.pixelSize: Theme.hbo ? 11 : 13; font.weight: Font.DemiBold; font.letterSpacing: Theme.hbo ? 1 : 0 }
                Icon { name: "chevron"; size: 14; color: "#ddd"; anchors.verticalCenter: parent.verticalCenter } }
            MouseArea { id: lookArea; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: lookPop.open() }
            Popup {
                id: lookPop; y: parent.height + 8; x: parent.width - width; padding: 8; width: 200
                background: Rectangle { color: "#f5080808"; border.color: Theme.line; radius: Theme.radius }
                contentItem: Column {
                    Repeater {
                        model: Theme.all
                        delegate: Rectangle {
                            width: 184; height: 38; color: ma2.containsMouse ? Qt.rgba(1, 1, 1, 0.1) : "transparent"
                            Text { x: 12; anchors.verticalCenter: parent.verticalCenter; text: modelData.label; color: modelData.id === Theme.lookId ? Theme.accent : "#ddd"; font.pixelSize: 14; font.bold: modelData.id === Theme.lookId }
                            MouseArea { id: ma2; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: { Theme.lookId = modelData.id; Backend.setSetting("look", modelData.id); lookPop.close() } }
                        }
                    }
                }
            }
        }

        // the profile
        Item {
            width: 32; height: 32; anchors.verticalCenter: parent.verticalCenter
            Avatar { id: me; anchors.fill: parent; name: Api.session ? Api.session.userName : ""; round: Theme.avatarRadius > 10
                url: Api.session && Api.session.avatarTag ? Api.session.server + "/Users/" + Api.session.userId + "/Images/Primary?maxWidth=96&tag=" + encodeURIComponent(Api.session.avatarTag) : ""
                borderWidth: Theme.disney ? 2 : 0; borderColor: Qt.rgba(1, 1, 1, 0.6) }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: profilePop.open() }
            Popup {
                id: profilePop; y: parent.height + 10; x: parent.width - width; padding: 8; width: 230
                background: Rectangle { color: "#f5080808"; border.color: Theme.line; radius: Theme.radius }
                contentItem: Column {
                    Text { x: 8; height: 32; verticalAlignment: Text.AlignVCenter; text: Api.session ? Api.session.userName : ""; color: "white"; font.bold: true; font.pixelSize: 14 }
                    Rectangle { width: parent.width; height: 1; color: Theme.line }
                    Repeater {
                        model: [["settings", Theme.words.settings, "sliders"], ["mylist", Theme.words.myList, "plus"], ["switch", Theme.words.switchProfile, "user"], ["signout", "Sign out", ""]]
                        delegate: Rectangle {
                            width: parent.width; height: 38; color: ma3.containsMouse ? Qt.rgba(1, 1, 1, 0.1) : "transparent"
                            Row { x: 8; anchors.verticalCenter: parent.verticalCenter; spacing: 10
                                Icon { visible: modelData[2] !== ""; name: modelData[2] === "" ? "x" : modelData[2]; size: 16; color: "#ddd"; anchors.verticalCenter: parent.verticalCenter }
                                Text { text: modelData[1]; color: "#ddd"; font.pixelSize: 14 } }
                            MouseArea { id: ma3; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor
                                onClicked: { profilePop.close(); if (modelData[0] === "switch" || modelData[0] === "signout") Nav.navigate("signout", {}); else Nav.navigate(modelData[0], {}) } }
                        }
                    }
                }
            }
        }

        // narrow windows fold the links into a menu button
        Item {
            visible: bar.narrow; width: 30; height: 30; anchors.verticalCenter: parent.verticalCenter
            Icon { anchors.centerIn: parent; name: "menu"; size: 22 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: burger.open() }
            Popup {
                id: burger; y: parent.height + 14; x: parent.width - width; padding: 8; width: 240
                background: Rectangle { color: Theme.navSolid; border.color: Theme.line; radius: Theme.radius }
                contentItem: Column {
                    Repeater {
                        model: Theme.look.nav.concat(Theme.look.more).concat([["settings", Theme.words.settings]]).concat(Theme.look.search === "page" ? [] : [["search", "Search"]])
                        delegate: Rectangle {
                            width: 224; height: 38; color: ma4.containsMouse ? Qt.rgba(1, 1, 1, 0.1) : "transparent"
                            Text { x: 12; anchors.verticalCenter: parent.verticalCenter; text: modelData[1]; color: bar.route === modelData[0] ? Theme.accent : "#ddd"; font.pixelSize: 14; font.bold: bar.route === modelData[0] }
                            MouseArea { id: ma4; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: { burger.close(); Nav.navigate(modelData[0], {}) } }
                        }
                    }
                }
            }
        }
    }
}
