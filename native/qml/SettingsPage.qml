import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import Jellyflix

/// Settings / Account / App Settings: four layouts, one per look. Every control here changes something the app really does.
PageBase {
    id: page
    objectName: "settings"
    property bool confirmReset: false
    property var serverInfo: null
    property int trusted: Backend.trustedCertificates()
    readonly property string layout: Theme.look.settings
    readonly property var languages: [["eng", "English"], ["spa", "Spanish"], ["fra", "French"], ["deu", "German"], ["ita", "Italian"], ["por", "Portuguese"], ["jpn", "Japanese"], ["kor", "Korean"], ["zho", "Chinese"], ["rus", "Russian"], ["hin", "Hindi"], ["ara", "Arabic"], ["nld", "Dutch"], ["swe", "Swedish"], ["pol", "Polish"], ["tur", "Turkish"]]
    readonly property var langOptions: languages.map(l => ({ value: l[0], label: l[1] }))
    readonly property var sizes: [0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2]
    readonly property var controlSizes: [0.8, 1, 1.25, 1.5, 1.75, 2]
    function nearest(list, v) { return list.reduce((b, x) => Math.abs(x - v) < Math.abs(b - v) ? x : b, list[0]) }
    function pct(list) { return list.map(v => ({ value: v, label: Math.round(v * 100) + "%" })) }

    Component.onCompleted: Api.publicInfo(i => serverInfo = i)
    Timer { id: confirmTimer; interval: 5000; onTriggered: page.confirmReset = false }

    // each row: {id, label, hint, kind: toggle|select|value|button, prop, options, text, action}
    readonly property var sections: [
        { id: "playback", label: "Playback", rows: [
            { id: "autoplayNext", label: "Autoplay next episode", hint: "Start the next episode when one ends, after a short countdown.", kind: "toggle", prop: "autoplayNext" },
            { id: "skipIntro", label: "Skip intros", hint: "Uses the intro and credits markers Jellyfin has for a title.", kind: "select", prop: "skipIntro",
              options: [{ value: "button", label: "Show a Skip button" }, { value: "auto", label: "Skip automatically" }, { value: "off", label: "Never" }] },
            { id: "audioLang", label: "Preferred audio language", hint: "Used whenever a title has that language.", kind: "select", prop: "audioLang", options: [{ value: "", label: "Whatever the file starts with" }].concat(langOptions) },
            { id: "subtitleMode", label: "Subtitles", kind: "select", prop: "subtitleMode",
              options: [{ value: "off", label: "Off" }, { value: "foreign", label: "Only when the audio isn't my language" }, { value: "always", label: "Always on" }] },
            { id: "subtitleLang", label: "Subtitle language", kind: "select", prop: "subtitleLang", options: langOptions },
            { id: "speed", label: "Default playback speed", kind: "select", prop: "speed", options: [0.75, 1, 1.25, 1.5, 2].map(v => ({ value: v, label: v + "×" })) },
            { id: "hwdec", label: "Hardware decoding", hint: "Lets the graphics card decode video when it can. Everything plays either way; this only changes how hard the processor works.", kind: "select", prop: "hwdec",
              options: [{ value: "auto-safe", label: "Automatic (recommended)" }, { value: "auto", label: "Automatic, every decoder" }, { value: "no", label: "Off (processor only)" }] },
            { id: "hoverControls", label: "Show controls when the mouse is over the video", hint: "In a narrow window (half the screen) the controls stay while the mouse is over the video and go when it leaves.", kind: "select", prop: "hoverControls",
              options: [{ value: "narrow", label: "In narrow windows" }, { value: "always", label: "Always" }, { value: "off", label: "Never" }] },
            { id: "controlsHide", label: "Hide the controls after", hint: "While playing, with the mouse still.", kind: "select", prop: "controlsHide",
              options: [{ value: 2, label: "2 seconds" }, { value: 3, label: "3 seconds" }, { value: 5, label: "5 seconds" }, { value: 10, label: "10 seconds" }, { value: 0, label: "Never" }] },
            { id: "controlsScale", label: "Player controls size", hint: "Makes the buttons and bar on the video bigger or smaller, on top of the interface size.", kind: "select", prop: "controlsScale", snap: "controlSizes", options: pct(controlSizes) },
            { id: "rememberVolume", label: "Remember the volume", hint: "Start each video at the volume you left the last one at.", kind: "toggle", prop: "rememberVolume" },
            { id: "subSize", label: "Subtitle size", kind: "select", prop: "subSize", options: [{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }, { value: "huge", label: "Huge" }] },
            { id: "subColor", label: "Subtitle colour", kind: "select", prop: "subColor", options: [{ value: "white", label: "White" }, { value: "yellow", label: "Yellow" }, { value: "cyan", label: "Cyan" }, { value: "green", label: "Green" }] },
            { id: "subBackground", label: "Subtitle background", kind: "select", prop: "subBackground", options: [{ value: "shadow", label: "Outline" }, { value: "dark", label: "Dark box" }, { value: "solid", label: "Black box" }, { value: "none", label: "None" }] }
        ] },
        { id: "appearance", label: "Appearance", rows: [
            { id: "look", label: "Look", hint: "Switch the whole app between the four styles.", kind: "select", prop: "@look", options: Theme.all.map(l => ({ value: l.id, label: l.label })) },
            { id: "cardSize", label: "Poster size", kind: "select", prop: "cardSize", options: [{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }] },
            { id: "scale", label: "Interface size", hint: "Makes everything bigger or smaller. Ctrl and + or −, or pinching a trackpad, does the same; Ctrl and 0 goes back to normal.", kind: "select", prop: "scale", snap: "sizes", options: pct(sizes) },
            { id: "showHero", label: "Featured banner", hint: "The big banner at the top of Home.", kind: "toggle", prop: "showHero" },
            { id: "rotateHero", label: "Rotate featured titles", hint: "Only in looks that have a carousel.", kind: "toggle", prop: "rotateHero" },
            { id: "reduceMotion", label: "Reduce motion", hint: "No hover zoom or automatic rotation.", kind: "toggle", prop: "reduceMotion" }
        ] },
        { id: "home", label: "Home screen", rows: [
            { id: "rowContinue", label: "Continue watching", kind: "toggle", prop: "rowContinue" },
            { id: "rowNextUp", label: Theme.words.nextUp, kind: "toggle", prop: "rowNextUp" },
            { id: "rowMyList", label: Theme.words.myList, kind: "toggle", prop: "rowMyList" },
            { id: "rowSeasonal", label: "Seasonal banner", hint: "In the weeks around Valentine's Day, Halloween, Thanksgiving and Christmas, the featured banner shows that holiday's movies.", kind: "toggle", prop: "rowSeasonal" },
            { id: "seasonalStyle", label: "Holiday picks", hint: "Classics: well-liked, family-friendly favourites (a short list of known classics plus anything in your library that rates well). Everything: any title that matches the holiday.", kind: "select", prop: "seasonalStyle", options: [{ value: "classics", label: "Classics" }, { value: "all", label: "Everything" }] },
            { id: "rowRecommended", label: "Recommendations", hint: "Rows like “" + Theme.becauseYouWatched("a title") + "”.", kind: "toggle", prop: "rowRecommended" },
            { id: "rowRecent", label: "Recently added", kind: "toggle", prop: "rowRecent" },
            { id: "rowTopRated", label: Theme.words.topRated, kind: "toggle", prop: "rowTopRated" },
            { id: "genreRows", label: "Genre rows", hint: "How many genres to show as rows.", kind: "select", prop: "genreRows", options: [0, 3, 6, 9, 12].map(v => ({ value: v, label: v === 0 ? "None" : String(v) })) }
        ] },
        { id: "account", label: "Account", rows: [
            { id: "user", label: "Signed in as", kind: "value", text: Api.session ? Api.session.userName : "" },
            { id: "server", label: "Server", kind: "value", text: Api.session ? Api.session.server : "" },
            { id: "switch", label: Theme.words.switchProfile, hint: "Go back to the sign-in screen.", kind: "button", text: Theme.words.switchProfile, action: "signout" },
            { id: "signout", label: "Sign out", kind: "button", text: "Sign out", action: "signout" },
            { id: "reset", label: "Reset these settings", hint: "Puts every option on this page back to how it started.", kind: "button", text: confirmReset ? "Click again to confirm" : "Reset", action: "reset", danger: confirmReset }
        ] },
        { id: "about", label: "About", rows: [
            { id: "app", label: "Jellyflix", kind: "value", text: "Version " + Backend.version },
            { id: "decoder", label: "Player", kind: "value", text: "mpv, built in: plays every video, audio and subtitle format" },
            { id: "trusted", label: "Servers you chose to trust", hint: "Servers whose certificate this computer doesn't trust, which you allowed.", kind: "button", text: trusted > 0 ? "Forget " + trusted : "None", action: "forget", disabled: trusted === 0 },
            { id: "serverInfo", label: "Server software", kind: "value", text: serverInfo ? (serverInfo.ServerName || "Jellyfin") + " · " + (serverInfo.ProductName || "Jellyfin Server") + " " + (serverInfo.Version || "") : "Checking…" }
        ] }
    ]

    function valueOf(row) {
        if (row.prop === "@look") return Theme.lookId
        var v = Settings[row.prop]
        return row.snap ? nearest(page[row.snap], v) : v
    }
    function apply(row, v) {
        if (row.prop === "@look") { Theme.lookId = v; Backend.setSetting("look", v); return }
        Settings[row.prop] = v
    }
    function act(name) {
        if (name === "signout") Nav.navigate("signout", {})
        else if (name === "forget") { Backend.forgetCertificates(); trusted = 0 }
        else if (name === "reset") {
            if (confirmReset) { Settings.reset(); confirmReset = false; Toast.show("Settings are back to how they started.") }
            else { confirmReset = true; confirmTimer.restart() }
        }
    }

    Text { text: Theme.hbo ? Theme.words.settings.toUpperCase() : Theme.words.settings; color: "white"; font.pixelSize: Theme.hbo ? 26 : 32; font.weight: Theme.hbo ? Font.Light : Font.Bold; font.letterSpacing: Theme.hbo ? 4 : 0
        bottomPadding: 18; width: parent.width; horizontalAlignment: page.layout === "list" ? Text.AlignHCenter : Text.AlignLeft }

    Row {
        id: frame
        width: parent.width; spacing: 28
        // HBO: a menu on the left that jumps between sections
        Column {
            visible: page.layout === "sidebar" && page.width > 900; width: 220; spacing: 2
            Repeater {
                model: page.sections
                delegate: Item {
                    width: 220; height: 40
                    Rectangle { width: 2; height: parent.height; color: ma.containsMouse ? Theme.accent : "transparent" }
                    Text { x: 14; anchors.verticalCenter: parent.verticalCenter; text: modelData.label.toUpperCase(); color: ma.containsMouse ? "white" : Theme.muted; font.pixelSize: 12; font.letterSpacing: 2 }
                    MouseArea { id: ma; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: page.scrollTo(sectionList.mapToItem(page.contentItem, 0, secs.itemAt(index).y).y - Theme.navH - 16) }
                }
            }
        }
        Column {
            id: sectionList
            width: page.layout === "sidebar" && page.width > 900 ? parent.width - 248 : parent.width
            spacing: 36
            Repeater {
                id: secs
                model: page.sections
                delegate: Item {
                    id: sec
                    readonly property var section: modelData
                    readonly property real maxW: page.layout === "cards" ? 880 : (page.layout === "sidebar" ? 860 : (page.layout === "list" ? 760 : 1000))
                    width: sectionList.width; height: block.height
                    Column {
                        id: block
                        x: page.layout === "list" ? Math.max(0, (parent.width - 760) / 2) : 0
                        width: page.layout === "list" ? Math.min(760, parent.width) : (page.layout === "lines" ? parent.width : Math.min(maxW, parent.width))
                        spacing: 0
                        Rectangle { visible: page.layout === "lines"; width: parent.width; height: 1; color: Theme.line }
                        Rectangle {
                            id: panel
                            width: parent.width; height: inner.height + (page.layout === "cards" ? 28 : 0)
                            radius: 14; color: page.layout === "cards" ? Theme.surface : "transparent"
                            Row {
                                id: inner
                                x: page.layout === "cards" ? 26 : 0; y: page.layout === "cards" ? 20 : (page.layout === "lines" ? 22 : 0)
                                width: parent.width - (page.layout === "cards" ? 52 : 0); spacing: 24
                                Text {
                                    visible: page.layout === "lines"; width: 236; topPadding: 8
                                    text: section.label.toUpperCase(); color: Theme.muted; font.pixelSize: 16; font.letterSpacing: 1
                                }
                                Column {
                                    width: page.layout === "lines" ? parent.width - 260 : parent.width; spacing: 0
                                    Text {
                                        visible: page.layout !== "lines"; bottomPadding: 12
                                        text: page.layout === "sidebar" || page.layout === "list" ? section.label.toUpperCase() : section.label; color: "white"
                                        font.pixelSize: page.layout === "sidebar" ? 16 : (page.layout === "list" ? 16 : 20); font.bold: page.layout !== "sidebar"
                                        font.weight: page.layout === "sidebar" ? Font.Light : Font.Bold; font.letterSpacing: page.layout === "sidebar" ? 3 : (page.layout === "list" ? 1.5 : 0)
                                    }
                                    Repeater {
                                        model: section.rows
                                        delegate: Rectangle {
                                            id: row
                                            readonly property var def: modelData
                                            width: parent.width; height: Math.max(58, rowCol.implicitHeight + 28)
                                            radius: page.layout === "list" ? 10 : 0
                                            color: page.layout === "list" ? Theme.surface : "transparent"
                                            border.width: page.layout === "list" ? 1 : 0; border.color: rh.hovered ? Qt.rgba(0.98, 0.98, 0.98, 0.45) : "transparent"
                                            HoverHandler { id: rh }
                                            Rectangle { visible: page.layout !== "list" && !(page.layout === "cards" && index === section.rows.length - 1); anchors.bottom: parent.bottom; width: parent.width; height: 1; color: Theme.line }
                                            Column { id: rowCol; anchors.left: parent.left; anchors.leftMargin: page.layout === "list" ? 20 : 0; anchors.verticalCenter: parent.verticalCenter; width: parent.width - control.width - 60; spacing: 3
                                                Text { width: parent.width; text: def.label; color: "white"; font.pixelSize: 16; font.weight: Font.DemiBold; wrapMode: Text.Wrap }
                                                Text { visible: !!def.hint; width: parent.width; text: def.hint || ""; color: Theme.muted; font.pixelSize: 13; wrapMode: Text.Wrap } }
                                            Item {
                                                id: control
                                                anchors.right: parent.right; anchors.rightMargin: page.layout === "list" ? 20 : 0; anchors.verticalCenter: parent.verticalCenter
                                                width: def.kind === "toggle" ? 48 : (def.kind === "select" ? sel.width : (def.kind === "button" ? bt.width : Math.min(440, vt.implicitWidth))); height: 36
                                                Toggle { visible: def.kind === "toggle"; checked: def.kind === "toggle" ? Settings[def.prop] : false; anchors.verticalCenter: parent.verticalCenter; onToggled: v => page.apply(def, v) }
                                                Select { id: sel; visible: def.kind === "select"; options: def.options || []; value: def.kind === "select" ? page.valueOf(def) : null; onPicked: v => page.apply(def, v) }
                                                Btn { id: bt; visible: def.kind === "button"; text: def.text || ""; danger: !!def.danger; enabled: !def.disabled; small: true; onClicked: page.act(def.action) }
                                                Text { id: vt; visible: def.kind === "value"; width: Math.min(440, implicitWidth); text: def.text || ""; color: Theme.muted; font.pixelSize: 15; elide: Text.ElideMiddle; anchors.verticalCenter: parent.verticalCenter; horizontalAlignment: Text.AlignRight }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
