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
    color: Theme.bg

    property bool signedIn: Api.session !== null
    property string signedOutWhy: ""
    property string route: "home"
    property alias videoItem: video
    property alias playerPage: player
    property alias stackView: stack
    property alias loginPage: loginPage
    property alias uiItem: ui
    readonly property real zoom: Settings.scale

    Component.onCompleted: {
        Theme.lookId = Backend.setting("look", "netflix")
        Settings.load()
        Api.load()
        signedIn = Api.session !== null
        if (signedIn) go("home", {})
    }
    Connections { target: Api; function onSignedOut(why) { win.signedOutWhy = why; win.signedIn = false; stack.clear() } }

    // one picture for the whole app; the player page draws its controls over it
    MpvItem { id: video; anchors.fill: parent; visible: player.active }

    // everything else is drawn in a box that can be scaled (Settings > Interface size)
    Item {
        id: ui
        width: win.width / win.zoom; height: win.height / win.zoom
        scale: win.zoom; transformOrigin: Item.TopLeft
        visible: !player.active

        Rectangle { anchors.fill: parent; color: Theme.bg
            gradient: Theme.disney ? disneyGradient : null }
        Gradient { id: disneyGradient; GradientStop { position: 0; color: "#040714" } GradientStop { position: 0.4; color: "#0a0f2e" } GradientStop { position: 1; color: "#1a1d4d" } }

        Login {
            id: loginPage
            anchors.fill: parent
            visible: !win.signedIn
            notice: win.signedOutWhy
            onSignedIn: { win.signedIn = true; win.signedOutWhy = ""; Flags.clear(); win.go("home", {}) }
        }

        Item {
            anchors.fill: parent
            visible: win.signedIn
            StackView {
                id: stack
                objectName: "stack"
                anchors.fill: parent
                pushEnter: Transition { PropertyAnimation { property: "opacity"; from: 0; to: 1; duration: 140 } }
                pushExit: Transition { PropertyAnimation { property: "opacity"; from: 1; to: 0; duration: 140 } }
                popEnter: Transition { PropertyAnimation { property: "opacity"; from: 0; to: 1; duration: 140 } }
                popExit: Transition { PropertyAnimation { property: "opacity"; from: 1; to: 0; duration: 140 } }
                replaceEnter: Transition { PropertyAnimation { property: "opacity"; from: 0; to: 1; duration: 140 } }
                replaceExit: Transition { PropertyAnimation { property: "opacity"; from: 1; to: 0; duration: 140 } }
            }
            NavBar {
                id: nav
                width: parent.width
                route: win.route
                scrolled: stack.currentItem ? stack.currentItem.contentY > 24 : false
                query: win.route === "search" && stack.currentItem && stack.currentItem.q !== undefined ? stack.currentItem.q : ""
                onSearch: text => win.searchFor(text)
            }
        }

        // a short message at the bottom (a change the server refused, a reset)
        Rectangle {
            id: toast
            property string message: Toast.message
            visible: false; opacity: 0
            anchors.horizontalCenter: parent.horizontalCenter; anchors.bottom: parent.bottom; anchors.bottomMargin: 24
            width: Math.min(560, parent.width * 0.92); height: tt.implicitHeight + 28; radius: Theme.radius; color: "#262626"; border.color: Theme.line
            Rectangle { width: 4; height: parent.height; radius: 2; color: Theme.accent }
            Text { id: tt; x: 18; y: 14; width: parent.width - 36; text: Toast.message; color: "white"; font.pixelSize: 14; wrapMode: Text.Wrap }
            Connections { target: Toast; function onSerialChanged() { toast.visible = true; toast.opacity = 1; toastTimer.restart() } }
            Timer { id: toastTimer; interval: 4500; onTriggered: toast.opacity = 0 }
            Behavior on opacity { NumberAnimation { duration: 250 } }
            onOpacityChanged: if (opacity === 0) visible = false
        }
    }

    // ---- what was used last: a touch screen or a mouse (Settings > Touch controls) ----
    PointHandler { acceptedDevices: PointerDevice.TouchScreen; onActiveChanged: if (active) Settings.touched = true }
    HoverHandler { acceptedDevices: PointerDevice.Mouse | PointerDevice.TouchPad; onPointChanged: if (Settings.touched) Settings.touched = false }

    // ---- going back by swiping: in from either edge of a touch screen, or sideways with two fingers on a trackpad ----
    Item {
        id: edges
        anchors.fill: parent
        readonly property bool canBack: player.active || stack.depth > 1
        Repeater {
            model: ["left", "right"]
            delegate: Item {
                id: zone
                readonly property bool atLeft: modelData === "left"
                x: atLeft ? 0 : parent.width - 24; width: 24; height: parent.height; z: 50
                DragHandler {
                    id: drag
                    acceptedDevices: PointerDevice.TouchScreen; yAxis.enabled: false; enabled: edges.canBack
                    target: null
                    onActiveChanged: { if (!active) { var across = zone.atLeft ? activeTranslation.x : -activeTranslation.x; if (across >= 90) win.back() } }
                }
                Rectangle {   // the round arrow that follows the finger
                    readonly property real across: drag.active ? Math.max(0, zone.atLeft ? drag.activeTranslation.x : -drag.activeTranslation.x) : 0
                    visible: across > 8; width: 44; height: 44; radius: 22; color: "#eb1e1e1e"; opacity: Math.min(1, across / 90)
                    x: zone.atLeft ? Math.min(across, 90) - 44 : zone.width - Math.min(across, 90); anchors.verticalCenter: parent.verticalCenter
                    Icon { anchors.centerIn: parent; name: "left"; size: 22 }
                }
            }
        }
    }
    WheelHandler {
        id: swipeBack
        acceptedDevices: PointerDevice.TouchPad; orientation: Qt.Horizontal; acceptedModifiers: Qt.NoModifier
        property real total: 0
        property double last: 0
        property bool fired: false
        onWheel: event => {
            var now = Date.now()
            if (now - last > 250) { total = 0; fired = false }
            last = now
            if (fired || !edges.canBack || now - Nav.rowScrolledAt < 400) return
            var dx = event.angleDelta.x, dy = event.angleDelta.y
            if (Math.abs(dx) < Math.abs(dy) * 1.5) { total = 0; return }
            total += dx
            if (total >= 220) { fired = true; total = 0; win.back() }
        }
    }

    // ---- a newer release ----
    Rectangle {
        visible: Updates.newest !== "" && !Updates.dismissed && win.signedIn && !player.active
        anchors.left: parent.left; anchors.bottom: parent.bottom; anchors.margins: 24 * win.zoom
        width: upRow.implicitWidth + 28; height: 52; radius: Theme.radius; color: "#262626"; border.color: Theme.line; z: 60
        Rectangle { width: 4; height: parent.height; radius: 2; color: Theme.accent }
        Row { id: upRow; anchors.verticalCenter: parent.verticalCenter; x: 18; spacing: 12
            Text { anchors.verticalCenter: parent.verticalCenter; text: "Version " + Updates.newest + " is out."; color: "white"; font.pixelSize: 14 }
            Btn { anchors.verticalCenter: parent.verticalCenter; small: true; primary: true; text: "Download"; onClicked: Backend.openUrl(Updates.url) }
            Btn { anchors.verticalCenter: parent.verticalCenter; small: true; text: "Later"; onClicked: Updates.dismissed = true } }
    }
    Timer { interval: 3000; running: Settings.autoUpdate; onTriggered: Updates.check(false) }
    Timer { interval: 6 * 60 * 60 * 1000; repeat: true; running: Settings.autoUpdate; onTriggered: Updates.check(false) }

    PlayerPage { id: player; anchors.fill: parent; video: video; window: win }

    // the test rig drives the app (only when it is started with JELLYFLIX_TEST_SERVER)
    Loader { active: Backend.testMode; sourceComponent: AutoTest { app: win } }

    // ---- going places ----
    Component { id: homeC; Home {} }
    Component { id: detailsC; Details {} }
    Component { id: browseC; Browse {} }
    Component { id: personC; Person {} }
    Component { id: librariesC; Libraries {} }
    Component { id: genresC; Genres {} }
    Component { id: newC; NewPopular {} }
    Component { id: searchC; Search {} }
    Component { id: settingsC; SettingsPage {} }

    function typesFor(collectionType) {
        switch ((collectionType || "").toLowerCase()) {
        case "movies": return ["Movie"]
        case "tvshows": return ["Series"]
        case "boxsets": return ["BoxSet"]
        case "homevideos": return ["Video"]
        default: return ["Movie", "Series", "BoxSet", "Video"]
        }
    }
    function labelFor(r, fallback) {
        var all = Theme.look.nav.concat(Theme.look.more)
        var hit = all.find(l => l[0] === r)
        return hit ? hit[1] : fallback
    }
    function component(r, p) {
        switch (r) {
        case "home": return [homeC, {}]
        case "movies": return [browseC, { title: labelFor("movies", "Movies"), base: { types: ["Movie"] }, genreScope: true, genreTypes: ["Movie"] }]
        case "shows": return [browseC, { title: labelFor("shows", "Shows"), base: { types: ["Series"] }, genreScope: true, genreTypes: ["Series"] }]
        case "mylist": return [browseC, { title: Theme.words.myList, base: { types: ["Movie", "Series", "BoxSet"] }, lockedFilters: ["IsFavorite"], hideFilter: true, dropUnfavorited: true, defaultSort: "added",
                                          empty: "Your " + Theme.words.myList + " is empty. Use the + button on any title to save it here." }]
        case "collections": return [browseC, { title: Theme.words.collections, base: { types: ["BoxSet"] }, hideFilter: true, empty: "No collections yet." }]
        case "libraries": return [librariesC, {}]
        case "genres": return [genresC, {}]
        case "new": return [newC, {}]
        case "search": return [searchC, { q: p.q || "" }]
        case "settings": return [settingsC, {}]
        default: return [homeC, {}]
        }
    }
    function go(r, p) {
        var c = component(r, p || {})
        route = r
        stack.clear(StackView.Immediate)
        stack.push(c[0], c[1], StackView.Immediate)
    }
    function searchFor(text) {
        if (route === "search" && stack.currentItem) { stack.currentItem.q = text; return }
        go("search", { q: text })
    }
    function signOut() { Api.save(null); Flags.clear(); signedIn = false; stack.clear(StackView.Immediate) }

    Connections {
        target: Nav
        function onOpenTitle(item) { stack.push(detailsC, { itemId: Api.openTarget(item) }) }
        function onPlay(item, options) { player.start(item, options) }
        function onBack() { win.back() }
        function onNavigate(r, p) {
            if (r === "signout") { win.signOut(); return }
            if (r === "library") { stack.push(browseC, { title: p.view.Name, base: { parentId: p.view.Id, types: win.typesFor(p.view.CollectionType) }, genreScope: true, genreTypes: win.typesFor(p.view.CollectionType).filter(t => t !== "BoxSet"), typeSwitch: win.typesFor(p.view.CollectionType).length > 1 }); return }
            if (r === "genre") { stack.push(browseC, { title: p.name, base: { types: ["Movie", "Series"] }, lockedGenre: p.name, typeSwitch: true }); return }
            if (r === "person") { stack.push(personC, { personId: p.id }); return }
            win.go(r, p)
        }
    }
    function back() { if (player.active) player.leave(); else if (stack.depth > 1) stack.pop() }

    Shortcut { sequences: ["Alt+Left", "Back"]; onActivated: win.back() }
    Shortcut { sequence: "Escape"; enabled: !player.active; onActivated: win.back() }
    readonly property var zoomSteps: [0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2]
    function nearestStep(v) { return zoomSteps.reduce((b, x) => Math.abs(x - v) < Math.abs(b - v) ? x : b, 1) }
    function zoomBy(d) { var i = zoomSteps.indexOf(nearestStep(Settings.scale)); Settings.scale = zoomSteps[Math.max(0, Math.min(zoomSteps.length - 1, i + d))] }
    Shortcut { sequences: ["Ctrl+=", "Ctrl++", StandardKey.ZoomIn]; onActivated: win.zoomBy(1) }
    Shortcut { sequences: ["Ctrl+-", StandardKey.ZoomOut]; onActivated: win.zoomBy(-1) }
    Shortcut { sequence: "Ctrl+0"; onActivated: Settings.scale = 1 }
    // a pinch on a trackpad arrives as a wheel turn with Ctrl held
    WheelHandler { acceptedModifiers: Qt.ControlModifier; property real acc: 0
        onWheel: event => { acc += event.angleDelta.y; if (Math.abs(acc) >= 120) { win.zoomBy(acc > 0 ? 1 : -1); acc = 0 } } }
}
