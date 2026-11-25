import QtQuick
import Jellyflix

Browse {
    id: page
    property string personId
    property var person: null
    objectName: "person"
    title: person ? person.Name : ""
    base: ({ types: ["Movie", "Series"], personId: personId })
    hideFilter: true
    empty: "Nothing in your library with this person."
    Component.onCompleted: Api.item(personId, function (p) { person = p })
    header: Component {
        Row {
            visible: page.person !== null; spacing: 22; bottomPadding: 22
            Avatar { visible: page.person !== null; width: 140; height: 140; round: true; name: page.person ? page.person.Name : ""; url: page.person && page.person.ImageTags && page.person.ImageTags.Primary ? Api.image(page.person.Id, page.person.ImageTags.Primary, 320) : "" }
            Text { width: Math.min(760, page.width * 0.7); wrapMode: Text.Wrap; maximumLineCount: 5; elide: Text.ElideRight; color: "#ddd"; font.pixelSize: 16; lineHeight: 1.3; text: page.person && page.person.Overview ? page.person.Overview : "" }
        }
    }
}
