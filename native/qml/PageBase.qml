import QtQuick
import QtQuick.Controls.Basic
import Jellyflix

/// The frame every page sits in: it scrolls, leaves room for the top bar and keeps the usual side padding.
Flickable {
    id: page
    property bool framed: true            // a page with side padding; the home page lays itself out
    property string pageTitle: ""
    default property alias content: col.data
    readonly property real side: framed ? Math.max(14, width * 0.04) : 0
    property real vh: height
    contentWidth: width
    contentHeight: col.height + (framed ? 70 : 0)
    boundsBehavior: Flickable.StopAtBounds
    clip: true
    flickableDirection: Flickable.VerticalFlick
    // a drag with a finger glides on after you let go, and a flick can go far
    flickDeceleration: 2200
    maximumFlickVelocity: 6500
    pixelAligned: true

    // A mouse wheel turns in notches; this turns each notch into a short glide instead of a jump. A trackpad already sends smooth
    // pixel steps, which are followed as they come.
    NumberAnimation { id: glide; target: page; property: "contentY"; duration: 240; easing.type: Easing.OutCubic }
    WheelHandler {
        acceptedDevices: PointerDevice.Mouse | PointerDevice.TouchPad
        orientation: Qt.Vertical
        blocking: true
        onWheel: event => {
            var max = Math.max(0, page.contentHeight - page.height)
            if (event.pixelDelta.y !== 0) {
                glide.stop()
                page.contentY = Math.max(0, Math.min(max, page.contentY - event.pixelDelta.y))
                return
            }
            var from = glide.running ? glide.to : page.contentY
            var to = Math.max(0, Math.min(max, from - event.angleDelta.y * 0.95))
            glide.stop(); glide.from = page.contentY; glide.to = to; glide.start()
        }
    }
    ScrollBar.vertical: ScrollBar { width: 10 }
    function scrollTo(y) { contentY = Math.max(0, Math.min(contentHeight - height, y)) }

    Column {
        id: col
        x: page.side
        y: page.framed ? Theme.navH + 28 : 0
        width: page.width - 2 * page.side
        spacing: 0
    }
    Text {
        visible: false
        text: page.pageTitle
    }
}
