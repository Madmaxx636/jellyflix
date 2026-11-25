pragma Singleton
import QtQuick

/// My List and watched marks change the moment you click, everywhere on screen, before the server has answered (and are
/// put back if it refuses).
QtObject {
    id: flags
    property int version: 0
    property var overrides: ({})

    function fav(item) { var o = overrides[item.Id]; return o && o.fav !== undefined ? o.fav : !!(item.UserData && item.UserData.IsFavorite) }
    function played(item) { var o = overrides[item.Id]; return o && o.played !== undefined ? o.played : !!(item.UserData && item.UserData.Played) }
    function set(item, patch) {
        var o = overrides[item.Id] || {}
        for (var k in patch) o[k] = patch[k]
        overrides[item.Id] = o
        version++
    }
    function toggleFavorite(item) {
        var prev = fav(item), next = !prev
        set(item, { fav: next })
        Api.setFavorite(item.Id, next, function (ok) { if (!ok) { set(item, { fav: prev }); Toast.show("Couldn't " + (next ? "add" : "remove") + " “" + item.Name + "”: the server didn't accept the change.") } })
    }
    function togglePlayed(item) {
        var prev = played(item), next = !prev
        set(item, { played: next })
        Api.setPlayed(item.Id, next, function (ok) { if (!ok) { set(item, { played: prev }); Toast.show("Couldn't mark “" + item.Name + "” as " + (next ? "watched" : "unwatched") + ": the server didn't accept the change.") } })
    }
    function clear() { overrides = ({}); version++ }
}
