pragma Singleton
import QtQuick
import Jellyflix

/// Looks for a newer release on GitHub (when the app starts and every few hours). It only tells you and opens the release page:
/// nothing is downloaded or installed behind your back.
QtObject {
    id: u
    property bool checking: false
    property string message: ""
    property string newest: ""          // a version newer than this one, or ""
    property string url: ""
    property bool dismissed: false
    readonly property string repo: "https://api.github.com/repos/Madmaxx636/jellyflix/releases/latest"

    function parts(v) { return String(v).replace(/^v/, "").split("-")[0].split(".").map(x => parseInt(x) || 0) }
    function isNewer(current, candidate) {
        var a = parts(current), b = parts(candidate)
        for (var i = 0; i < Math.max(a.length, b.length); i++) { var x = a[i] || 0, y = b[i] || 0; if (y !== x) return y > x }
        return false
    }
    function check(manual) {
        if (checking) return
        checking = true
        if (manual) message = ""
        Backend.fetchPublic(repo, function (r) {
            checking = false
            if (!r.ok || !r.data || !r.data.tag_name) { if (manual) message = "Couldn't check for updates (" + (r.status || r.error || "no answer") + ")."; return }
            var latest = String(r.data.tag_name).replace(/^v/, "")
            if (isNewer(Backend.version, latest)) { if (newest !== latest) dismissed = false; newest = latest; url = r.data.html_url || ""; if (manual) message = "Version " + latest + " is available." }
            else { newest = ""; if (manual) message = "You have the latest version (" + Backend.version + ")." }
        })
    }
}
