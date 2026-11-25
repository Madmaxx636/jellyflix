pragma Singleton
import QtQuick
import Jellyflix

/// Looks for a newer release on GitHub (when the app starts and every few hours) and can install it: it downloads the package for
/// this system, checks its SHA-256 against the release's list, runs the system's own installer (the Windows setup, or this
/// distribution's package manager, which asks for your password) and starts the new version.
QtObject {
    id: u
    property bool checking: false
    property string message: ""
    property string newest: ""          // a version newer than this one, or ""
    property string url: ""             // the release page
    property bool dismissed: false
    property var assets: []
    property real progress: -1          // 0..1 while downloading, -1 when not
    property bool installing: false
    property string error: ""
    property string lastCommand: ""

    readonly property var patterns: ({ windows: /-windows-x64-setup\.exe$/, deb: /-linux-amd64\.deb$/, rpm: /-linux-x86_64\.rpm$/, pacman: /-linux-x86_64\.pkg\.tar\.zst$/ })
    readonly property var pkgAsset: {
        var re = patterns[Backend.updateKind]
        return re ? (assets.find(a => re.test(a.name)) || null) : null
    }
    readonly property bool canInstall: newest !== "" && pkgAsset !== null
    readonly property bool busy: progress >= 0 || installing

    function parts(v) { return String(v).replace(/^v/, "").split("-")[0].split(".").map(x => parseInt(x) || 0) }
    function isNewer(current, candidate) {
        var a = parts(current), b = parts(candidate)
        for (var i = 0; i < Math.max(a.length, b.length); i++) { var x = a[i] || 0, y = b[i] || 0; if (y !== x) return y > x }
        return false
    }
    /// The checksum for a file name in a `sha256sum` listing ("hash  file" per line).
    function checksumFor(listing, name) {
        var lines = String(listing).split(/\r?\n/)
        for (var i = 0; i < lines.length; i++) {
            var m = /^([0-9a-fA-F]{64})\s+\*?(.+?)\s*$/.exec(lines[i])
            if (m && m[2] === name) return m[1].toLowerCase()
        }
        return ""
    }

    function check(manual) {
        if (checking) return
        checking = true
        if (manual) message = ""
        Backend.fetchPublic(Backend.updateUrl, function (r) {
            checking = false
            if (!r.ok || !r.data || !r.data.tag_name) { if (manual) message = "Couldn't check for updates (" + (r.status || r.error || "no answer") + ")."; return }
            var latest = String(r.data.tag_name).replace(/^v/, "")
            if (isNewer(Backend.version, latest)) {
                if (newest !== latest) dismissed = false
                newest = latest; url = r.data.html_url || ""; assets = r.data.assets || []
                if (manual) message = "Version " + latest + " is available."
            } else {
                newest = ""; assets = []
                if (manual) message = "You have the latest version (" + Backend.version + ")."
            }
        })
    }

    /// Download, check, install, restart.
    function install() {
        if (!canInstall || busy) return
        error = ""; progress = 0
        var pkg = pkgAsset
        var sums = assets.find(a => a.name === "SHA256SUMS.txt")
        if (!sums) { progress = -1; error = "The release has no checksum list, so the download can't be checked."; return }
        Backend.fetchText(sums.browser_download_url, function (t) {
            var expected = t.ok ? checksumFor(t.text, pkg.name) : ""
            if (!expected) { progress = -1; error = "The release's checksum list doesn't cover " + pkg.name + "."; return }
            Backend.downloadUpdate(pkg.browser_download_url, pkg.name, expected, function (f) { progress = f }, function (d) {
                progress = -1
                if (!d.ok) { error = d.error; return }
                installing = true
                var shown = Backend.installUpdate(d.path)
                lastCommand = shown
                if (shown === "") { installing = false; error = "This copy can't be updated from here. Download the new version from the release page." }
            })
        })
    }
    property var finished: Connections {
        target: Backend
        function onUpdateInstallFinished(ok, message) { u.installing = false; if (!ok) u.error = message; else if (message) u.message = message }
    }
}
