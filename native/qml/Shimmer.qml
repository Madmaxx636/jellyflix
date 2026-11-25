import QtQuick
import Jellyflix

/// A placeholder block that shimmers while the real thing loads.
Rectangle {
    radius: Theme.radius
    color: Theme.card
    clip: true
    Rectangle {
        id: sweep
        width: parent.width * 0.5; height: parent.height
        gradient: Gradient { orientation: Gradient.Horizontal; GradientStop { position: 0; color: "transparent" } GradientStop { position: 0.5; color: Qt.rgba(1, 1, 1, 0.09) } GradientStop { position: 1; color: "transparent" } }
        NumberAnimation on x { from: -sweep.width; to: sweep.parent.width; duration: 1400; loops: Animation.Infinite }
    }
}
