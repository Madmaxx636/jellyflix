import QtQuick
import QtQuick.Controls.Basic
import Jellyflix

/// A button in the current look: filled with the accent when primary, a grey plate otherwise. Shows a ring when focused.
Button {
    id: control
    property bool primary: false
    implicitHeight: 40
    implicitWidth: Math.max(implicitHeight, label.implicitWidth + 36)
    hoverEnabled: true
    background: Rectangle {
        radius: Theme.buttonRadius(control.height)
        color: control.primary ? (control.down ? Qt.darker(Theme.accent, 1.2) : Theme.accent) : (control.down ? "#505050" : control.hovered ? "#707070" : "#5a5a5a")
        border.width: control.visualFocus ? 3 : 0
        border.color: "white"
        opacity: control.enabled ? 1 : 0.5
    }
    contentItem: Text {
        id: label
        text: Theme.styled(control.text)
        color: "white"
        font.pixelSize: 15
        font.bold: true
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
        elide: Text.ElideRight
    }
}
