import QtQuick
import Jellyflix

/// Drives the app against a made-up server and reports PASS or FAIL for each thing, then quits. Only runs when the test rig asks.
Item {
    id: test
    property var app
    property int failures: 0
    property int passes: 0

    function check(name, ok, detail) {
        console.log((ok ? "PASS  " : "FAIL  ") + name + (detail ? " — " + detail : ""))
        if (ok) passes++; else failures++
    }
    // Waits (checking every 100 ms) for [condition], then runs [then]; fails the named check after [ms].
    function until(name, condition, then, ms) {
        var waited = 0, t = Qt.createQmlObject('import QtQuick; Timer { interval: 100; repeat: true; running: true }', test)
        t.triggered.connect(function () {
            waited += 100
            var ok = false
            try { ok = condition() } catch (e) { ok = false }
            if (ok) { t.stop(); t.destroy(); check(name, true); then() }
            else if (waited >= (ms || 15000)) { t.stop(); t.destroy(); check(name, false, "timed out"); finish() }
        })
    }
    function finish() {
        console.log("===== " + passes + "/" + (passes + failures) + " checks passed =====")
        Qt.exit(failures === 0 ? 0 : 1)
    }
    function child(name) { return Backend.testFind(app.loginPage, name) }

    Component.onCompleted: Qt.callLater(signIn)

    function signIn() {
        check("login: the sign-in page is showing when nobody is signed in", app.loginPage.visible && Api.session === null)
        child("server").text = Backend.testServer
        child("user").text = "demo"
        child("password").text = "demo"
        app.loginPage.submit()
        until("login: signing in with a username and password works", () => Api.session !== null && app.signedIn, home)
    }
    function home() {
        until("home: the home page loads", () => app.stackView.currentItem && app.stackView.currentItem.objectName === "home" && app.stackView.currentItem.ready, function () {
            var h = app.stackView.currentItem
            check("home: it has recently added movies and shows", h.movies.length > 0 && h.shows.length > 0, h.movies.length + " movies, " + h.shows.length + " shows")
            check("home: it has Continue Watching", h.resume.length > 0, h.resume.length + " titles")
            check("home: it has a banner", h.hero !== null)
            check("home: it lists the libraries and hides Music", h.views.length > 0 && !h.views.some(v => v.CollectionType === "music"), h.views.map(v => v.Name).join(", "))
            details(h.movies[0])
        })
    }
    function details(movie) {
        app.openTitle(movie)
        until("details: a title's page opens", () => app.stackView.currentItem && app.stackView.currentItem.objectName === "details" && app.stackView.currentItem.data !== null, function () {
            var d = app.stackView.currentItem
            check("details: it shows the title", d.data.Name === movie.Name, d.data.Name)
            play(d.data)
        })
    }
    function play(movie) {
        app.play(movie)
        until("player: it starts playing the file as it is, with mpv", () => app.playerPage.active && app.playerPage.plan !== null && app.videoItem.position > 1.5, function () {
            check("player: the file is asked for as it is (no conversion)", /\/Videos\/[^/]+\/stream\?static=true/.test(app.playerPage.plan.url) && app.playerPage.plan.url.indexOf("master.m3u8") < 0, app.playerPage.plan.url.replace(/ApiKey=[^&]+/, "ApiKey=…"))
            check("player: the length is known", app.videoItem.duration > 8, app.videoItem.duration + " s")
            check("player: it finds the audio track", app.playerPage.tracksOf("audio").length > 0, JSON.stringify(app.playerPage.tracksOf("audio").map(t => t.codec)))
            console.log("TRACKS " + JSON.stringify(app.videoItem.tracks.map(t => t.type + ":" + t.codec)))
            app.videoItem.paused = true
            until("player: pausing works", () => app.videoItem.paused, function () {
                var at = app.videoItem.position
                app.videoItem.seek(5)
                until("player: seeking works", () => Math.abs(app.videoItem.position - 5) < 1.5, function () {
                    app.playerPage.leave()
                    check("player: leaving closes it", !app.playerPage.active)
                    looks()
                })
            })
        }, 25000)
    }
    function looks() {
        Theme.lookId = "hulu"
        check("looks: switching the look changes the accent", Theme.accent.toString().toLowerCase() === "#1ce783", Theme.accent.toString())
        Theme.lookId = "netflix"
        signOut()
    }
    function signOut() {
        Api.save(null)
        app.signedIn = false
        check("account: signing out shows the sign-in page again", app.loginPage.visible)
        finish()
    }
}
