import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import Jellyflix

Flickable {
    id: page
    objectName: "settings"
    signal signOut()
    contentWidth: width
    contentHeight: col.height + 40
    clip: true
    boundsBehavior: Flickable.StopAtBounds
    property int trusted: Backend.trustedCertificates()

    ColumnLayout {
        id: col
        x: 24; y: 16; width: Math.min(640, page.width - 48); spacing: 14
        Text { text: "Settings"; color: "white"; font.pixelSize: 26; font.bold: true }

        Text { text: "Look"; color: "white"; font.pixelSize: 16; font.bold: true }
        Flow {
            Layout.fillWidth: true; spacing: 8
            Repeater { model: Theme.looks; delegate: FlatButton { text: modelData.label; primary: Theme.lookId === modelData.id; onClicked: { Theme.lookId = modelData.id; Backend.setSetting("look", modelData.id) } } }
        }

        Text { text: "Playing"; color: "white"; font.pixelSize: 16; font.bold: true; Layout.topMargin: 10 }
        Text { Layout.fillWidth: true; wrapMode: Text.Wrap; color: Theme.muted; font.pixelSize: 13
            text: "Videos are played as they are by mpv, built into this app: every video and audio format and every kind of subtitle, with the computer's own video decoder when it has one. Nothing is ever converted by the server." }

        Text { text: "Servers with their own certificate"; color: "white"; font.pixelSize: 16; font.bold: true; Layout.topMargin: 10 }
        RowLayout {
            Text { color: Theme.muted; font.pixelSize: 13; text: page.trusted === 0 ? "None trusted." : page.trusted + " trusted." }
            FlatButton { visible: page.trusted > 0; text: "Forget them"; onClicked: { Backend.forgetCertificates(); page.trusted = 0 } }
        }

        Text { text: "Account"; color: "white"; font.pixelSize: 16; font.bold: true; Layout.topMargin: 10 }
        Text { color: Theme.muted; font.pixelSize: 13; text: Api.session ? "Signed in as " + Api.session.userName + " on " + Api.session.server : "" }
        FlatButton { objectName: "signOut"; text: "Sign out"; onClicked: page.signOut() }

        Text { text: "About"; color: "white"; font.pixelSize: 16; font.bold: true; Layout.topMargin: 10 }
        Text { color: Theme.muted; font.pixelSize: 13; text: "Jellyflix " + Backend.version + ". Not affiliated with Jellyfin, Netflix, Hulu, HBO or Disney." }
    }
}
