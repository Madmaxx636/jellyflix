pragma Singleton
import QtQuick

/// How pages ask the app to go somewhere. Main.qml listens.
QtObject {
    signal openTitle(var item)
    signal play(var item, var options)
    signal navigate(string route, var params)
    signal back()
}
