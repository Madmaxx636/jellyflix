import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import Jellyflix

ApplicationWindow {
    id: win
    width: 1280; height: 800
    minimumWidth: 420; minimumHeight: 360
    visible: true
    title: "Jellyflix"
    color: Theme.background

    property bool signedIn: Api.session !== null
    property string signedOutWhy: ""

    Component.onCompleted: {
        Theme.lookId = Backend.setting("look", "netflix")
        Api.load()
        signedIn = Api.session !== null
        if (signedIn) stack.push(homeC)
    }
    Connections {
        target: Api
        function onSignedOut(why) { win.signedOutWhy = why; win.signedIn = false; stack.clear() }
    }

    // One picture for the whole app; the player page draws its controls over it.
    MpvItem { id: video; anchors.fill: parent; visible: player.active }
    property alias videoItem: video
    property alias playerPage: player
    property alias stackView: stack
    property alias loginPage: loginPage
    Loader { active: Backend.testMode; sourceComponent: AutoTest { app: win } }

    function openTitle(item) { stack.push(detailsC, { itemId: Api.openTarget(item), objectName: "details" }) }
    function openLibrary(view) { stack.push(libraryC, { view: view }) }
    function goHome() { stack.clear(); stack.push(homeC) }
    function go(c, props) { stack.clear(); stack.push(homeC); if (c !== homeC) stack.push(c, props || {}) }
    function back() { if (player.active) player.leave(); else if (stack.depth > 1) stack.pop() }
    function play(item) { player.start(item) }

    Component { id: homeC; Home { onOpened: item => win.openTitle(item); onOpenedLibrary: view => win.openLibrary(view) } }
    Component { id: detailsC; Details { onOpened: item => win.openTitle(item); onPlay: item => win.play(item) } }
    Component { id: libraryC; LibraryPage { onOpened: item => win.openTitle(item) } }
    Component { id: searchC; SearchPage { onOpened: item => win.openTitle(item) } }
    Component { id: settingsC; SettingsPage { onSignOut: { Api.save(null); win.signedIn = false; stack.clear() } } }

    Login {
        id: loginPage
        anchors.fill: parent
        visible: !win.signedIn
        onSignedIn: { win.signedIn = true; stack.clear(); stack.push(homeC) }
        Text { visible: win.signedOutWhy !== ""; anchors.horizontalCenter: parent.horizontalCenter; anchors.top: parent.top; anchors.topMargin: 24; text: win.signedOutWhy; color: "#ff6b6b" }
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0
        visible: win.signedIn && !player.active
        NavBar {
            Layout.fillWidth: true
            onNavigate: page => {
                if (page === "home") win.goHome()
                else if (page === "movies") win.go(libraryC, { kind: "movies" })
                else if (page === "shows") win.go(libraryC, { kind: "shows" })
                else if (page === "search") win.go(searchC)
                else if (page === "settings") win.go(settingsC)
            }
        }
        StackView {
            id: stack
            objectName: "stack"
            Layout.fillWidth: true; Layout.fillHeight: true
            pushEnter: Transition { PropertyAnimation { property: "opacity"; from: 0; to: 1; duration: 120 } }
            pushExit: Transition { PropertyAnimation { property: "opacity"; from: 1; to: 0; duration: 120 } }
            popEnter: Transition { PropertyAnimation { property: "opacity"; from: 0; to: 1; duration: 120 } }
            popExit: Transition { PropertyAnimation { property: "opacity"; from: 1; to: 0; duration: 120 } }
        }
    }

    PlayerPage { id: player; anchors.fill: parent; video: video; window: win }

    Shortcut { sequences: ["Alt+Left", "Back"]; onActivated: win.back() }
    Shortcut { sequence: "Escape"; enabled: !player.active; onActivated: win.back() }
}
