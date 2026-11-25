import QtQuick
import QtQuick.Controls.Basic
import Jellyflix
import "Util.js" as Util

PageBase {
    id: page
    objectName: "details"
    framed: false
    property string itemId
    property var data: null
    property var episodes: []
    property var similar: []
    property var extras: []
    property int season: 1
    property string picked: ""
    property string error: ""
    readonly property bool series: data !== null && data.Type === "Series"
    readonly property bool box: data !== null && data.Type === "BoxSet"
    readonly property var nextEpisode: { Flags.version; return episodes.find(e => !Flags.played(e)) || episodes[0] || null }
    readonly property var playTarget: data === null || box ? null : (series ? nextEpisode : data)
    readonly property real resumeSec: playTarget && playTarget.UserData && playTarget.UserData.PlaybackPositionTicks ? playTarget.UserData.PlaybackPositionTicks / 1e7 : 0
    readonly property bool resuming: resumeSec > 5
    readonly property var seasons: { var s = [], seen = {}; episodes.forEach(e => { var n = e.ParentIndexNumber || 0; if (!seen[n]) { seen[n] = true; s.push(n) } }); return s }
    readonly property var tabs: {
        var t = []
        if (series) t.push({ value: "episodes", label: Theme.words.episodes })
        if (similar.length) t.push({ value: "suggested", label: Theme.words.moreLikeThis })
        if (extras.length) t.push({ value: "extras", label: Theme.words.extras })
        t.push({ value: "details", label: Theme.words.details })
        return t
    }
    readonly property string active: tabs.some(t => t.value === picked) ? picked : (tabs.length ? tabs[0].value : "details")
    function show(t) { return !Theme.look.detailTabs || active === t }
    readonly property var people: data && data.People ? data.People : []
    readonly property var cast: people.filter(p => p.Type === "Actor" || p.Type === "GuestStar")
    readonly property var crew: people.filter(p => ["Director", "Writer", "Producer"].indexOf(p.Type) >= 0)
    function langs(type) {
        var streams = data && data.MediaSources && data.MediaSources.length ? (data.MediaSources[0].MediaStreams || []) : [], out = []
        streams.filter(s => s.Type === type).forEach(s => { var l = s.Language ? String(s.Language).toUpperCase() : ""; if (l && out.indexOf(l) < 0) out.push(l) })
        return out
    }

    Component.onCompleted: {
        Api.item(itemId, function (it, r) {
            if (!it) { error = "Couldn't load this title (" + (r.status || r.error) + ")."; return }
            data = it
            if (it.Type === "Series") Api.episodes(it.Id, e => { episodes = e; var ep = e.find(x => !Flags.played(x)) || e[0]; if (ep) season = ep.ParentIndexNumber || 1 })
            Api.similar(it.Id, s => similar = s)
            Api.extras(it.Id, x => extras = x)
        })
    }

    Text { visible: page.error !== ""; x: 40; y: Theme.navH + 40; text: page.error; color: "#ff6b6b"; font.pixelSize: 17 }

    Column {
        width: page.width
        visible: page.data !== null

        Hero {
            id: hero
            details: true; detailItem: page.data; vh: page.height; width: parent.width
            detailActions: [
                Btn { visible: page.playTarget !== null; primary: true; glyph: "play"; objectName: "play"
                    text: page.resuming ? (page.resumeSec >= 60 ? Theme.words.resume + " (" + Math.round(page.resumeSec / 60) + " min in)" : Theme.words.resume) : Theme.words.play
                    onClicked: Nav.play(page.playTarget, {}) },
                Btn { visible: page.playTarget !== null && page.resuming; text: Theme.words.playFromStart; onClicked: Nav.play(page.playTarget, { start: 0 }) },
                Btn { round: true; visible: page.data !== null
                    readonly property bool fav: { Flags.version; return page.data ? Flags.fav(page.data) : false }
                    on: fav; glyph: fav ? "check" : "plus"; onClicked: Flags.toggleFavorite(page.data) },
                Btn { round: true; visible: page.data !== null && !page.box
                    readonly property bool seen: { Flags.version; return page.data ? Flags.played(page.data) : false }
                    on: seen; glyph: "eye"; onClicked: Flags.togglePlayed(page.data) },
                Btn { text: "← Back"; onClicked: Nav.back() }
            ]
        }

        Column {
            id: body
            width: parent.width
            topPadding: Theme.hulu ? 20 : -page.height * 0.04
            spacing: 14

            // a collection lists what is in it
            Loader {
                active: page.box; width: parent.width
                sourceComponent: Component { Item { width: body.width; height: 40; Text { x: page.width * 0.04; text: "In this collection"; color: "white"; font.pixelSize: 20; font.bold: true } } }
            }

            // tabs
            Row {
                visible: Theme.look.detailTabs && !page.box
                x: page.width * 0.04; spacing: 6
                Repeater {
                    model: page.tabs
                    delegate: Item {
                        width: tl.implicitWidth + 36; height: 48
                        Text { id: tl; anchors.centerIn: parent; text: Theme.hbo || Theme.disney ? modelData.label.toUpperCase() : modelData.label; font.pixelSize: Theme.hbo ? 12 : (Theme.disney ? 13 : 15); font.bold: true
                            font.letterSpacing: Theme.hbo ? 2 : (Theme.disney ? 1.5 : 0); color: page.active === modelData.value ? "white" : Theme.muted }
                        Rectangle { anchors.left: parent.left; anchors.right: parent.right; anchors.bottom: parent.bottom; height: 3; color: Theme.accent; visible: page.active === modelData.value }
                        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: page.picked = modelData.value }
                    }
                }
            }

            // episodes
            Column {
                visible: page.series && page.show("episodes")
                x: page.width * 0.04; width: page.width * 0.92; spacing: 4
                Row {
                    spacing: 20; height: 44
                    Text { visible: !Theme.look.detailTabs; text: Theme.words.episodes; color: "white"; font.pixelSize: 21; font.bold: true; anchors.verticalCenter: parent.verticalCenter }
                    Select { anchors.verticalCenter: parent.verticalCenter; value: page.season; onPicked: v => page.season = v
                        options: page.seasons.map(s => ({ value: s, label: s === 0 ? "Specials" : "Season " + s })) }
                }
                Repeater {
                    model: page.episodes.filter(e => (e.ParentIndexNumber || 0) === page.season)
                    delegate: Rectangle {
                        width: parent.width; height: 100; radius: Theme.radius; color: epHover.hovered ? Qt.rgba(1, 1, 1, 0.06) : "transparent"
                        Rectangle { anchors.bottom: parent.bottom; width: parent.width; height: 1; color: Theme.line }
                        HoverHandler { id: epHover }
                        Row {
                            anchors.fill: parent; anchors.margins: 12; spacing: 18
                            Text { width: 34; anchors.verticalCenter: parent.verticalCenter; horizontalAlignment: Text.AlignHCenter; text: modelData.IndexNumber || ""; color: Theme.muted; font.pixelSize: 24 }
                            Item {
                                width: 168; height: 94; anchors.verticalCenter: parent.verticalCenter
                                Rectangle { anchors.fill: parent; radius: Theme.radius; color: Theme.card; clip: true
                                    Image { id: stillArt; anchors.fill: parent; source: Api.still(modelData, 400); fillMode: Image.PreserveAspectCrop; asynchronous: true; sourceSize.width: 400 }
                                    Text { visible: stillArt.status !== Image.Ready; anchors.centerIn: parent; text: "E" + (modelData.IndexNumber || ""); color: Theme.muted; font.pixelSize: 22 }
                                    Rectangle { anchors.fill: parent; color: Qt.rgba(0, 0, 0, 0.45); opacity: epHover.hovered ? 1 : 0; Icon { anchors.centerIn: parent; name: "play"; size: 22 } }
                                    Rectangle { visible: modelData.UserData && modelData.UserData.PlayedPercentage > 0 && modelData.UserData.PlayedPercentage < 100; anchors.bottom: parent.bottom; height: 4; width: parent.width; color: Qt.rgba(0, 0, 0, 0.6)
                                        Rectangle { height: parent.height; width: modelData.UserData ? parent.width * modelData.UserData.PlayedPercentage / 100 : 0; color: Theme.accent } }
                                }
                            }
                            Column {
                                width: parent.width - 34 - 168 - 90 - 54 - 54; anchors.verticalCenter: parent.verticalCenter; spacing: 4
                                Text { width: parent.width; text: modelData.Name; color: "white"; font.pixelSize: 16; font.weight: Font.DemiBold; elide: Text.ElideRight }
                                Text { width: parent.width; text: modelData.Overview || ""; color: Theme.muted; font.pixelSize: 14; wrapMode: Text.Wrap; maximumLineCount: 2; elide: Text.ElideRight }
                            }
                            Text { width: 90; anchors.verticalCenter: parent.verticalCenter; text: modelData.RunTimeTicks ? Math.round(modelData.RunTimeTicks / 600000000) + " min" : ""; color: Theme.muted; font.pixelSize: 14 }
                            Btn { anchors.verticalCenter: parent.verticalCenter; round: true
                                readonly property bool seen: { Flags.version; return Flags.played(modelData) }
                                on: seen; glyph: seen ? "check" : "eye"; width: 34; height: 34; z: 2; onClicked: Flags.togglePlayed(modelData) }
                        }
                        MouseArea { anchors.fill: parent; z: 1; propagateComposedEvents: true; cursorShape: Qt.PointingHandCursor; onClicked: mouse => { if (mouse.x < parent.width - 90) Nav.play(modelData, {}); else mouse.accepted = false } }
                    }
                }
            }

            MediaRow { visible: page.show("suggested") && !page.box; title: Theme.words.moreLikeThis; items: page.similar }

            // trailers and extras
            Column {
                visible: page.extras.length > 0 && page.show("extras") && !page.box
                x: page.width * 0.04; width: page.width * 0.92; spacing: 10
                Text { visible: !Theme.look.detailTabs; text: Theme.words.extras; color: "white"; font.pixelSize: 21; font.bold: true }
                Flow {
                    width: parent.width; spacing: 14
                    Repeater {
                        model: page.extras
                        delegate: Item {
                            width: 260; height: 146 + 30
                            Rectangle { width: 260; height: 146; radius: Theme.radius; color: Theme.card; clip: true
                                Image { anchors.fill: parent; source: modelData.ImageTags && modelData.ImageTags.Primary ? Api.image(modelData.Id, modelData.ImageTags.Primary, 320) : ""; fillMode: Image.PreserveAspectCrop; asynchronous: true }
                                Icon { anchors.centerIn: parent; name: "play"; size: 24 } }
                            Text { y: 152; width: 260; text: modelData.Name; color: "white"; font.weight: Font.DemiBold; font.pixelSize: 14; elide: Text.ElideRight }
                            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: Nav.play(modelData, {}) }
                        }
                    }
                }
            }

            // about: cast and facts
            Column {
                visible: page.show("details") && !page.box
                x: page.width * 0.04; width: page.width * 0.92; spacing: 12
                Text { visible: !Theme.look.detailTabs; text: Theme.words.details; color: "white"; font.pixelSize: 21; font.bold: true }
                Text { visible: page.cast.length > 0; text: Theme.words.cast.toUpperCase(); color: Theme.muted; font.pixelSize: 14; font.letterSpacing: 1; topPadding: 6 }
                ListView {
                    visible: page.cast.length > 0
                    width: parent.width; height: 168; orientation: ListView.Horizontal; spacing: 16; clip: true; model: page.cast.slice(0, 16)
                    delegate: Item {
                        width: 120; height: 160
                        Avatar { x: 12; width: 96; height: 96; round: true; name: modelData.Name; url: modelData.PrimaryImageTag ? Api.image(modelData.Id, modelData.PrimaryImageTag, 240) : "" }
                        Text { y: 102; width: 120; text: modelData.Name; color: "white"; font.pixelSize: 13; font.bold: true; horizontalAlignment: Text.AlignHCenter; elide: Text.ElideRight }
                        Text { y: 120; width: 120; text: modelData.Role || ""; color: Theme.muted; font.pixelSize: 12; horizontalAlignment: Text.AlignHCenter; elide: Text.ElideRight }
                        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: Nav.navigate("person", { id: modelData.Id }) }
                    }
                }
                Grid {
                    columns: 2; columnSpacing: 24; rowSpacing: 10; width: Math.min(900, parent.width)
                    Repeater {
                        model: [
                            ["Crew", page.crew.map(p => p.Name + " (" + p.Type + ")").join(", ")],
                            ["Genres", page.data && page.data.Genres ? page.data.Genres.join(", ") : ""],
                            ["Studio", page.data && page.data.Studios ? page.data.Studios.map(s => s.Name).join(", ") : ""],
                            ["Audio", page.langs("Audio").join(", ")],
                            ["Subtitles", page.langs("Subtitle").join(", ")],
                            ["Released", page.data && page.data.ProductionYear ? String(page.data.ProductionYear) : ""],
                            ["Rated", page.data && page.data.OfficialRating ? page.data.OfficialRating : ""]
                        ].filter(f => f[1] !== "")
                        delegate: Row {
                            spacing: 24
                            Text { width: 140; text: modelData[0]; color: Theme.muted; font.pixelSize: 15 }
                            Text { width: 700; text: modelData[1]; color: "white"; font.pixelSize: 15; wrapMode: Text.Wrap }
                        }
                    }
                }
            }
            Item { width: 1; height: 70 }
        }
    }
}
