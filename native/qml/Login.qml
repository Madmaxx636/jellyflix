import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import Jellyflix

/// The sign-in screen: "Who's watching?" profiles for the remembered server, and the form.
Flickable {
    id: page
    objectName: "login"
    signal signedIn()
    property string notice: ""
    property bool busy: false
    property string error: ""
    property var profiles: []
    property string profileServer: ""
    property alias serverField: server
    contentHeight: Math.max(height, content.height + 60)
    contentWidth: width
    boundsBehavior: Flickable.StopAtBounds
    clip: true

    function submit() {
        if (busy || !server.text.trim() || !user.text.trim()) return
        busy = true; error = ""
        Backend.setSetting("lastServer", server.text)
        Api.login(server.text, user.text, password.text, function (r) {
            busy = false
            if (r.cert) { certs.cert = r.cert; certs.open(); return }
            if (r.error) { error = r.error; return }
            Api.save(r.session)
            page.signedIn()
        })
    }
    function lookUp() {
        profiles = []
        if (!server.text.trim()) return
        Api.findServer(server.text, function (f) {
            if (!f.info) return
            Api.publicUsers(f.server, function (users) { profileServer = f.server; profiles = users })
        })
    }
    Component.onCompleted: { if (server.text) lookUp() }

    CertDialog { id: certs; onTrusted: page.submit() }

    Rectangle {
        anchors.fill: parent; z: -1
        gradient: Gradient {
            GradientStop { position: 0; color: Theme.disney ? "#040714" : (Theme.hulu ? "#0b2a1c" : (Theme.hbo ? "#1e1038" : "#2a0a0c")) }
            GradientStop { position: 0.6; color: Theme.disney ? "#1a1d4d" : Theme.bg }
        }
    }

    Column {
        id: content
        width: Math.min(560, page.width - 40); anchors.horizontalCenter: parent.horizontalCenter
        y: Math.max(30, (page.height - height) / 2)
        spacing: 22

        Text { anchors.horizontalCenter: parent.horizontalCenter; text: Theme.look.logo; color: Theme.disney ? "white" : Theme.accent
            font.pixelSize: 40; font.weight: Theme.hbo ? Font.Light : Font.Black; font.letterSpacing: Theme.hbo ? 6 : 2; font.italic: Theme.disney }
        Rectangle {
            visible: page.notice !== ""; anchors.horizontalCenter: parent.horizontalCenter
            width: Math.min(420, parent.width); height: noticeText.implicitHeight + 20; color: Qt.rgba(1, 1, 1, 0.08); border.color: Theme.line; radius: Theme.radius
            Text { id: noticeText; anchors.centerIn: parent; width: parent.width - 20; wrapMode: Text.Wrap; horizontalAlignment: Text.AlignHCenter; text: page.notice; color: "white" }
        }

        Column {
            visible: page.profiles.length > 0; width: parent.width; spacing: 14
            Text { anchors.horizontalCenter: parent.horizontalCenter; text: "Who's watching?"; color: "white"; font.pixelSize: 24; font.weight: Font.Medium }
            Flow {
                anchors.horizontalCenter: parent.horizontalCenter; spacing: 18; width: Math.min(parent.width, page.profiles.length * 114)
                Repeater {
                    model: page.profiles
                    delegate: Item {
                        width: 96; height: 128
                        Avatar { x: 6; width: 84; height: 84; name: modelData.Name; round: Theme.avatarRadius > 10
                            url: modelData.PrimaryImageTag ? page.profileServer + "/Users/" + modelData.Id + "/Images/Primary?maxWidth=160&tag=" + encodeURIComponent(modelData.PrimaryImageTag) : ""
                            borderWidth: user.text === modelData.Name || pa.containsMouse ? 3 : 0; borderColor: "white" }
                        Text { y: 92; width: 96; text: modelData.Name; color: user.text === modelData.Name || pa.containsMouse ? "white" : Theme.muted; font.pixelSize: 14; horizontalAlignment: Text.AlignHCenter; elide: Text.ElideRight }
                        MouseArea { id: pa; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: { user.text = modelData.Name; password.forceActiveFocus() } }
                    }
                }
            }
        }

        Rectangle {
            anchors.horizontalCenter: parent.horizontalCenter
            width: Math.min(360 + 72, parent.width); height: form.implicitHeight + 72; color: Qt.rgba(0, 0, 0, 0.75); radius: 6
            ColumnLayout {
                id: form
                anchors.fill: parent; anchors.margins: 36; spacing: 14
                Text { text: "Sign In"; color: "white"; font.pixelSize: 24; font.bold: true }
                TextField { id: server; objectName: "server"; Layout.fillWidth: true; placeholderText: "Server (e.g. 192.168.1.10:8096)"; text: Backend.setting("lastServer", ""); selectByMouse: true; color: "white"; placeholderTextColor: "#888"; font.pixelSize: 15; padding: 14
                    background: Rectangle { color: "#333"; radius: 4; border.width: server.activeFocus ? 2 : 0; border.color: "white" }
                    onAccepted: { page.lookUp(); user.forceActiveFocus() }
                    onEditingFinished: page.lookUp() }
                TextField { id: user; objectName: "user"; Layout.fillWidth: true; placeholderText: "Username"; selectByMouse: true; color: "white"; placeholderTextColor: "#888"; font.pixelSize: 15; padding: 14
                    background: Rectangle { color: "#333"; radius: 4; border.width: user.activeFocus ? 2 : 0; border.color: "white" }
                    onAccepted: password.forceActiveFocus() }
                TextField { id: password; objectName: "password"; Layout.fillWidth: true; placeholderText: "Password"; echoMode: TextInput.Password; selectByMouse: true; color: "white"; placeholderTextColor: "#888"; font.pixelSize: 15; padding: 14
                    background: Rectangle { color: "#333"; radius: 4; border.width: password.activeFocus ? 2 : 0; border.color: "white" }
                    onAccepted: page.submit() }
                Text { visible: page.error !== ""; Layout.fillWidth: true; wrapMode: Text.Wrap; text: page.error; color: "#ff6b6b"; font.pixelSize: 14 }
                Btn { objectName: "signIn"; Layout.fillWidth: true; primary: true; accentFill: true; enabled: !page.busy; text: page.busy ? "Signing in…" : "Sign In"; onClicked: page.submit() }
            }
        }
    }
}
