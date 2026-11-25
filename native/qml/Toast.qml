pragma Singleton
import QtQuick

QtObject {
    property string message: ""
    property int serial: 0
    function show(text) { message = text; serial++ }
}
