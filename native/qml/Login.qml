import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import Jellyflix

Item {
    id: page
    signal signedIn()
    property bool busy: false
    property string error: ""

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

    CertDialog { id: certs; onTrusted: page.submit() }

    ColumnLayout {
        anchors.centerIn: parent
        width: Math.min(420, parent.width - 48)
        spacing: 10
        Text { text: "JELLYFLIX"; color: Theme.accent; font.pixelSize: 40; font.bold: true; font.letterSpacing: 3; Layout.alignment: Qt.AlignHCenter; Layout.bottomMargin: 18 }
        TextField { id: server; objectName: "server"; Layout.fillWidth: true; placeholderText: "Server address"; text: Backend.setting("lastServer", ""); selectByMouse: true; color: "white"; placeholderTextColor: "#888"
            background: Rectangle { color: "#2a2a2a"; radius: 4; border.color: server.activeFocus ? Theme.accent : "#444" }
            onAccepted: user.forceActiveFocus() }
        TextField { id: user; objectName: "user"; Layout.fillWidth: true; placeholderText: "Username"; selectByMouse: true; color: "white"; placeholderTextColor: "#888"
            background: Rectangle { color: "#2a2a2a"; radius: 4; border.color: user.activeFocus ? Theme.accent : "#444" }
            onAccepted: password.forceActiveFocus() }
        TextField { id: password; objectName: "password"; Layout.fillWidth: true; placeholderText: "Password"; echoMode: TextInput.Password; selectByMouse: true; color: "white"; placeholderTextColor: "#888"
            background: Rectangle { color: "#2a2a2a"; radius: 4; border.color: password.activeFocus ? Theme.accent : "#444" }
            onAccepted: page.submit() }
        Text { visible: page.error !== ""; Layout.fillWidth: true; wrapMode: Text.Wrap; text: page.error; color: "#ff6b6b"; font.pixelSize: 13 }
        FlatButton { objectName: "signIn"; Layout.fillWidth: true; Layout.topMargin: 8; primary: true; enabled: !page.busy; text: page.busy ? "Signing in…" : "Sign in"; onClicked: page.submit() }
    }
}
