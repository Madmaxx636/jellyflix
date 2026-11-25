import QtQuick
import Jellyflix
import "Seasonal.js" as Seasonal

/// Drives the app against a made-up server and reports PASS or FAIL for each thing, then quits. Only runs when the test rig asks.
Item {
    id: test
    property var app
    property int failures: 0
    property int passes: 0
    property bool updatesDone: false

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
    // ---- pictures of the pages (JELLYFLIX_SHOTS=<folder>) ----
    function later(ms, fn) { var t = Qt.createQmlObject('import QtQuick; Timer { interval: ' + ms + '; running: true }', test); t.triggered.connect(function () { t.destroy(); fn() }) }
    function shoot(name, next) {
        app.uiItem.grabToImage(function (r) { r.saveToFile(Backend.shotsDir + "/" + name + ".png"); console.log("SHOT " + name); next() })
    }
    function shots() {
        var looks = ["netflix", "hulu", "hbo", "disney"], li = 0
        var pages = [["home", {}], ["movies", {}], ["settings", {}], ["search", {}], ["libraries", {}], ["new", {}]]
        var nextLook = function () {
            if (li >= looks.length) { finish(); return }
            Theme.lookId = looks[li++]
            var pi = 0
            var nextPage = function () {
                if (pi >= pages.length) {
                    // the title page of the first movie
                    var h = Api; Api.items({ types: ["Movie"], limit: 1, sortBy: "SortName" }, function (r) {
                        Nav.openTitle(r.items[0])
                        later(2200, function () { shoot("details-" + Theme.lookId, function () {
                            // and a show, for its episode list
                            Api.items({ types: ["Series"], limit: 1, sortBy: "SortName" }, function (sr) {
                                Nav.openTitle(sr.items[0])
                                later(2600, function () { shoot("series-" + Theme.lookId, nextLook) })
                            })
                        }) })
                    })
                    return
                }
                var p = pages[pi++]
                Nav.navigate(p[0], p[1])
                later(p[0] === "home" ? 3500 : 2200, function () { shoot(p[0] + "-" + Theme.lookId, nextPage) })
            }
            nextPage()
        }
        nextLook()
    }
    function page(name) { return app.stackView.currentItem && app.stackView.currentItem.objectName === name ? app.stackView.currentItem : null }
    function home() {
        var t0 = Date.now()
        until("home: the first rows are on screen", () => page("home") && page("home").anyRows, function () {
            console.log("TIMING first rows after " + (Date.now() - t0) + " ms")
            until("home: the home page loads", () => page("home") && page("home").ready, function () {
            console.log("TIMING first screen complete after " + (Date.now() - t0) + " ms")
            var h = page("home")
            var pic = Qt.createQmlObject('import QtQuick; Image { asynchronous: true; cache: false }', test)
            pic.source = Api.poster(h.movies[0], 300)
            until("pictures: a real JPEG poster loads (the JPEG support is in the package)", () => pic.status === Image.Ready || pic.status === Image.Error, function () {
                check("pictures: it decodes to a picture", pic.status === Image.Ready && pic.implicitWidth > 0, "status " + pic.status + ", " + pic.implicitWidth + "x" + pic.implicitHeight)
            }, 15000)
            check("home: it has recently added movies and shows", h.movies.length > 0 && h.shows.length > 0, h.movies.length + " movies, " + h.shows.length + " shows")
            check("home: it has Continue Watching", h.resume.length > 0, h.resume.length + " titles")
            check("home: it has a banner", h.heroItems.length > 0, h.heroItems.length + " slides")
            check("home: it lists the libraries and hides Music", h.views.length > 0 && !h.views.some(v => v.CollectionType === "music"), h.views.map(v => v.Name).join(", "))
            if (Backend.shotsDir !== "") { shots(); return }
            until("home: the genre rows follow, after the first screen", () => h.genreRows.length > 0, function () {
                if (Seasonal.seasonsFor(new Date()).length > 0) until("home: the holiday banner says what it found", () => Nav.holidayReport !== "" && h.heroItems.length > 0 && Object.keys(h.heroLabels).length > 0, function () {
                    console.log("REPORT " + Nav.holidayReport)
                    var names = h.holiday.items.map(i => i.Name)
                    check("holiday: it finds the library's classics (movies) and leaves out bad horror with a Christmas tag", names.indexOf("Home Alone") >= 0 && names.indexOf("It's a Wonderful Life") >= 0 && names.indexOf("Santa's Slay") < 0 && names.indexOf("Frosty Fright Night") < 0, names.join(", "))
                    check("holiday: it finds the Twilight Zone Christmas episode", h.holiday.items.some(i => i.Type === "Episode" && i.Name === "The Night of the Meek"), h.holiday.items.filter(i => i.Type === "Episode").map(i => i.Name).join(", "))
                    check("holiday: the banner shows them, labelled", h.heroItems.length > 0 && h.heroItems.every(i => h.heroLabels[i.Id] !== undefined), h.heroItems.map(i => i.Name).join(", "))
                }, 30000)
                Nav.openTitle(h.movies[0])
                details(h.movies[0])
            })
            })
        })
    }
    function details(movie) {
        until("details: a title's page opens", () => page("details") && page("details").data !== null, function () {
            var d = page("details")
            check("details: it shows the title", d.data.Name === movie.Name, d.data.Name)
            check("details: it has tabs in a look that has them, and a play button", d.playTarget !== null, Theme.lookId)
            play(d.data)
        })
    }
    function play(movie) {
        Nav.play(movie, {})
        until("player: it starts playing the file as it is, with mpv", () => app.playerPage.active && app.playerPage.plan !== null && app.videoItem.position > 1.5, function () {
            check("player: the file is asked for as it is (no conversion)", /\/Videos\/[^/]+\/stream\?static=true/.test(app.playerPage.plan.url) && app.playerPage.plan.url.indexOf("master.m3u8") < 0, app.playerPage.plan.url.replace(/ApiKey=[^&]+/, "ApiKey=…"))
            check("player: the length is known", app.videoItem.duration > 8, app.videoItem.duration + " s")
            check("player: it finds the audio track", app.playerPage.tracksOf("audio").length > 0, JSON.stringify(app.videoItem.tracks.map(t => t.type + ":" + t.codec)))
            check("player: the intro and credits markers are read", app.playerPage.segments.length > 0, app.playerPage.segments.length + " markers")
            app.videoItem.paused = true
            until("player: pausing works", () => app.videoItem.paused, function () {
                app.videoItem.seek(5)
                until("player: seeking works", () => Math.abs(app.videoItem.position - 5) < 1.5, function () {
                    app.playerPage.leave()
                    check("player: leaving closes it", !app.playerPage.active)
                    browse()
                })
            })
        }, 25000)
    }
    function browse() {
        Nav.navigate("movies", {})
        until("browse: Movies lists titles", () => page("browse") && page("browse").items.length > 0, function () {
            var b = page("browse")
            check("browse: it has a count and the first page", b.total > 0 && b.items.length > 0, b.items.length + " of " + b.total)
            Nav.navigate("genres", {})
            until("genres: the genres load", () => page("genres") && page("genres").names.length > 0, function () {
                Nav.navigate("libraries", {})
                until("libraries: the libraries load", () => page("libraries") && page("libraries").views.length > 0, function () {
                    Nav.navigate("new", {})
                    until("new: New & Popular has rows", () => page("new") && page("new").added.length > 0, search)
                })
            })
        })
    }
    function search() {
        Nav.navigate("search", {})
        until("search: the page opens", () => page("search") !== null, function () {
            page("search").q = "Silent"
            until("search: typing finds titles", () => page("search").movies.length + page("search").shows.length > 0, looks)
        })
    }
    function looks() {
        var ids = ["hulu", "hbo", "disney", "netflix"], accents = { hulu: "#1ce783", hbo: "#8b5cf6", disney: "#2bbcff", netflix: "#e50914" }, ok = true
        ids.forEach(function (id) { Theme.lookId = id; if (Theme.accent.toString().toLowerCase() !== accents[id]) ok = false })
        check("looks: every look has its own colours", ok)
        check("updates: a checksum is found in a listing by file name", Updates.checksumFor("aaa " + "b".repeat(61) + "\n" + "c".repeat(64) + "  Jellyflix-1.0.0-linux-amd64.deb\n", "Jellyflix-1.0.0-linux-amd64.deb") === "c".repeat(64) && Updates.checksumFor("x", "y") === "")
        Updates.check(true)
        until("updates: it finds the newer release", () => Updates.newest === "9.9.9" && Updates.assets.length === 5, function () {
            if (Backend.updateKind === "") { check("updates: a copy that was not installed from one of our packages is only pointed at the release page", !Updates.canInstall && Updates.url !== ""); test.updatesDone = true; return }
            check("updates: it picks the package for this system", Updates.canInstall && Updates.pkgAsset !== null, Backend.updateKind + " -> " + (Updates.pkgAsset ? Updates.pkgAsset.name : "none"))
            Updates.install()
            until("updates: it downloads, checks and installs it (a dry run: nothing is really installed)", () => !Updates.installing && Updates.progress < 0 && Updates.message.indexOf("would run") === 0, function () {
                check("updates: the install command is the system's own package tool", /pkexec (env|pacman|dnf|zypper)|\.exe/.test(Updates.lastCommand), Updates.lastCommand)
                // a download that doesn't match its checksum is thrown away
                Backend.downloadUpdate("http://127.0.0.1" + ":" + Backend.testServer.split(":").pop() + "/updates/file?name=x", "x.bin", "0".repeat(64), function () {}, function (d) {
                    check("updates: a download that does not match its checksum is refused", !d.ok && /checksum/.test(d.error), d.error)
                    test.updatesDone = true
                })
            }, 20000)
        }, 20000)
        check("updates: a later version is newer, an earlier or equal one is not", Updates.isNewer("1.0.0", "1.0.1") && Updates.isNewer("0.9.9", "v0.10.0") && !Updates.isNewer("1.0.1", "1.0.1") && !Updates.isNewer("1.0.1", "1.0.0"))
        Settings.touchMode = "off"; Settings.touched = true
        var offOk = !Nav.touch
        Settings.touchMode = "auto"; Settings.touched = false
        var mouseOk = !Nav.touch
        Settings.touched = true
        var touchOk = Nav.touch
        Settings.touchMode = "on"
        check("touch: Auto follows what was used last, On and Off are fixed", offOk && mouseOk && touchOk && Nav.touch)
        Settings.touchMode = "auto"; Settings.touched = false
        Nav.navigate("settings", {})
        until("settings: the page opens with its sections", () => page("settings") !== null, function () {
            check("settings: the options are there", page("settings").sections.length === 5 && page("settings").sections.reduce((n, s) => n + s.rows.length, 0) > 30, page("settings").sections.reduce((n, s) => n + s.rows.length, 0) + " options")
            Settings.rowSeasonal = true
            Nav.navigate("home", {})
            signOut()
        })
    }
    function signOut() {
        until("updates: the whole update path ran", () => updatesDone, function () { signOutNow() }, 40000)
    }
    function signOutNow() {
        Nav.navigate("signout", {})
        until("account: signing out shows the sign-in page again", () => !app.signedIn && app.loginPage.visible, finish)
    }
}
