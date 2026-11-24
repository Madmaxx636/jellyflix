import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import Jellyflix

/// Shown when a server's certificate is one the computer doesn't know (typical for a home server that made its own).
Popup {
    id: dialog
    property var cert: ({})
    signal trusted()
    modal: true
    anchors.centerIn: Overlay.overlay
    width: Math.min(520, Overlay.overlay.width - 40)
    padding: 20
    background: Rectangle { color: Theme.surface; radius: 8; border.color: "#555" }
    contentItem: ColumnLayout {
        spacing: 10
        Text { text: "Trust this server?"; color: "white"; font.pixelSize: 20; font.bold: true }
        Text {
            Layout.fillWidth: true; wrapMode: Text.Wrap; color: Theme.muted; font.pixelSize: 13
            text: "The server's certificate isn't one this computer knows. That is normal for a home server with a certificate it made itself. Only trust it if the fingerprint below is the one you expect."
        }
        Text { Layout.fillWidth: true; wrapMode: Text.Wrap; color: "white"; font.pixelSize: 13; text: "Certificate: " + (cert.subject || "") + "\nIssued by: " + (cert.issuer || "") + "\nValid: " + (cert.validFrom || "").slice(0, 10) + " to " + (cert.validTo || "").slice(0, 10) }
        Text { Layout.fillWidth: true; wrapMode: Text.WrapAnywhere; color: "white"; font.pixelSize: 12; font.family: "monospace"; text: "SHA-256: " + (cert.fingerprint || "") }
        RowLayout {
            Layout.alignment: Qt.AlignRight
            FlatButton { text: "Cancel"; onClicked: dialog.close() }
            FlatButton { text: "Trust and continue"; primary: true; onClicked: { Backend.trustCertificate(cert.fingerprint); dialog.close(); dialog.trusted() } }
        }
    }
}
