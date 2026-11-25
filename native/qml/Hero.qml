import QtQuick
import Jellyflix
import "Util.js" as Util

/// The featured banner: one title, or a rotating carousel of up to five, depending on the look.
Item {
    id: hero
    property var items: []
    property var labels: ({})
    property real vh: 800          // the window's height; the banner is a share of it
    property bool details: false   // the title page's own banner
    property var detailItem: null
    property alias detailActions: extra.data
    readonly property var slides: Theme.look.hero === "carousel" ? items.slice(0, 5) : items.slice(0, 1)
    property int index: 0
    readonly property var item: details ? detailItem : (slides.length ? slides[Math.min(index, slides.length - 1)] : null)
    readonly property real share: details ? 0.62 : (Theme.hbo ? 0.92 : Theme.hulu ? 0.62 : Theme.disney ? 0.66 : 0.8)
    height: Math.max(460, vh * share)
    visible: item !== null
    clip: Theme.hulu && !details

    Timer {
        interval: 8000; repeat: true
        running: !details && Theme.look.hero === "carousel" && Settings.rotateHero && !Settings.reduceMotion && hero.slides.length > 1 && !hoverArea.hovered
        onTriggered: hero.index = (hero.index + 1) % hero.slides.length
    }

    Rectangle { anchors.fill: parent; color: "#222"; radius: Theme.hulu && !details ? 12 : 0 }
    Image {
        id: art
        anchors.fill: parent
        source: hero.item ? (Api.backdrop(hero.item, 1920) || Api.thumb(hero.item, 1280)) : ""
        fillMode: Image.PreserveAspectCrop; asynchronous: true
        opacity: status === Image.Ready ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: 700 } }
    }
    // fades: to the left for the text, down into the page
    Rectangle {
        anchors.fill: parent
        gradient: Gradient {
            orientation: Gradient.Horizontal
            GradientStop { position: 0; color: Qt.rgba(Theme.scrim.r, Theme.scrim.g, Theme.scrim.b, Theme.hulu ? 0.7 : (Theme.hbo ? 0.75 : 0.9)) }
            GradientStop { position: Theme.hulu || Theme.hbo ? 0.55 : 0.6; color: "transparent" }
        }
    }
    Rectangle {
        anchors.fill: parent
        gradient: Gradient {
            GradientStop { position: 0; color: "transparent" }
            GradientStop { position: Theme.hbo ? 0.45 : (Theme.hulu ? 0.45 : 0.65); color: "transparent" }
            GradientStop { position: 1; color: Theme.disney ? "transparent" : Qt.rgba(Theme.bg.r, Theme.bg.g, Theme.bg.b, Theme.hulu ? 0.95 : 1) }
        }
    }

    Column {
        id: body
        x: Theme.hulu && !details ? 40 : parent.width * 0.04
        anchors.bottom: parent.bottom
        anchors.bottomMargin: Theme.hulu ? 44 : (Theme.hbo ? parent.width * 0.12 : parent.width * 0.09)
        width: Math.min(details ? 800 : (Theme.hulu ? 720 : 660), parent.width - x - 20)
        spacing: 10
        opacity: 1
        Text {
            visible: !hero.details && hero.item && hero.labels[hero.item.Id] !== undefined
            text: hero.item && hero.labels[hero.item.Id] ? hero.labels[hero.item.Id].toUpperCase() : ""
            color: Theme.accent; font.pixelSize: 13; font.bold: true; font.letterSpacing: 2
        }
        Text {
            width: parent.width
            text: hero.item ? (hero.item.Type === "Episode" ? (hero.item.SeriesName || hero.item.Name) : hero.item.Name) : ""
            color: "white"; wrapMode: Text.Wrap; maximumLineCount: 2; elide: Text.ElideRight
            font.pixelSize: Theme.hbo ? 46 : (Theme.hulu ? 42 : 54)
            font.weight: Theme.hbo ? Font.Light : Font.Bold
            font.letterSpacing: Theme.hbo ? 4 : 0
            font.capitalization: Theme.hbo ? Font.AllUppercase : Font.MixedCase
            style: Text.Raised; styleColor: Qt.rgba(0, 0, 0, 0.6)
        }
        Row {
            spacing: 8
            Text {
                color: Theme.hbo ? Theme.muted : (Theme.hulu || Theme.disney ? Theme.accent : "#46d369"); font.pixelSize: 16; font.weight: Theme.hbo ? Font.Normal : Font.DemiBold
                text: hero.item ? [hero.item.Type === "Episode" ? "S" + (hero.item.ParentIndexNumber || "") + " E" + (hero.item.IndexNumber || "") + " · " + hero.item.Name : "", hero.item.ProductionYear, hero.item.Type === "Movie" && hero.item.RunTimeTicks ? Math.round(hero.item.RunTimeTicks / 600000000) + " min" : "", hero.item.CommunityRating ? "★ " + hero.item.CommunityRating.toFixed(1) : ""].filter(x => x).join("  ") : ""
            }
            Rectangle {
                visible: hero.item && !!hero.item.OfficialRating; width: rating.implicitWidth + 12; height: 20; color: "transparent"; border.color: "#999"
                Text { id: rating; anchors.centerIn: parent; text: hero.item ? (hero.item.OfficialRating || "") : ""; color: Theme.muted; font.pixelSize: 13 }
            }
        }
        Text {
            visible: hero.details && hero.item && hero.item.Taglines && hero.item.Taglines.length
            width: parent.width; text: hero.item && hero.item.Taglines && hero.item.Taglines.length ? hero.item.Taglines[0] : ""; color: Theme.muted; font.italic: true; font.pixelSize: 15; wrapMode: Text.Wrap
        }
        Text {
            width: parent.width; text: hero.item ? (hero.item.Overview || "") : ""; color: "white"; font.pixelSize: 17; lineHeight: 1.2
            wrapMode: Text.Wrap; maximumLineCount: 4; elide: Text.ElideRight
        }
        Text {
            visible: hero.details && hero.item && hero.item.Genres && hero.item.Genres.length
            width: parent.width; text: hero.item && hero.item.Genres ? hero.item.Genres.join(" · ") : ""; color: Theme.muted; font.pixelSize: 14
        }
        Row {
            id: extra
            spacing: 12
            topPadding: 8
            // the home banner's own buttons
            Btn {
                visible: !hero.details && hero.item && ["Movie", "Episode", "Video"].indexOf(hero.item.Type) >= 0
                primary: true; glyph: "play"; text: Theme.words.play; onClicked: Nav.play(hero.item, {})
            }
            Btn { visible: !hero.details; glyph: "info"; text: "More Info"; onClicked: Nav.openTitle(hero.item) }
            Btn {
                visible: !hero.details
                round: true
                readonly property bool fav: { Flags.version; return hero.item ? Flags.fav(hero.item) : false }
                on: fav; glyph: fav ? "check" : "plus"; onClicked: Flags.toggleFavorite(hero.item)
            }
        }
    }

    // carousel dots and arrows
    Row {
        visible: !hero.details && hero.slides.length > 1
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: parent.bottom
        anchors.bottomMargin: Theme.hbo ? parent.height * 0.09 + 18 : (Theme.disney ? 66 : (Theme.hulu ? 16 : 22))
        spacing: 8
        Repeater {
            model: hero.slides.length
            delegate: Rectangle {
                width: index === hero.index ? 26 : 9; height: 9; radius: 5; color: index === hero.index ? (Theme.hbo ? Theme.accent : "white") : Qt.rgba(1, 1, 1, 0.4)
                Behavior on width { NumberAnimation { duration: 250 } }
                MouseArea { anchors.fill: parent; anchors.margins: -4; cursorShape: Qt.PointingHandCursor; onClicked: hero.index = index }
            }
        }
    }
    Rectangle {
        visible: !hero.details && hero.slides.length > 1 && hoverArea.hovered && !Nav.touch
        anchors.left: parent.left; anchors.verticalCenter: parent.verticalCenter; width: 44; height: 64; color: Qt.rgba(0, 0, 0, 0.35)
        Icon { anchors.centerIn: parent; name: "left"; size: 28 }
        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: hero.index = (hero.index + hero.slides.length - 1) % hero.slides.length }
    }
    Rectangle {
        visible: !hero.details && hero.slides.length > 1 && hoverArea.hovered && !Nav.touch
        anchors.right: parent.right; anchors.verticalCenter: parent.verticalCenter; width: 44; height: 64; color: Qt.rgba(0, 0, 0, 0.35)
        Icon { anchors.centerIn: parent; name: "right"; size: 28 }
        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: hero.index = (hero.index + 1) % hero.slides.length }
    }
    HoverHandler { id: hoverArea }
    // a swipe sideways moves to the next or previous featured title
    DragHandler { acceptedDevices: PointerDevice.TouchScreen; yAxis.enabled: false; enabled: !hero.details && hero.slides.length > 1
        onActiveChanged: if (!active && Math.abs(translation.x) > 50) hero.index = (hero.index + (translation.x < 0 ? 1 : hero.slides.length - 1)) % hero.slides.length }
}
