pragma Singleton
import QtQuick
import Jellyflix
import "Util.js" as Util

/// Everything the app asks a Jellyfin server. Each call takes a callback that gets {ok, status, data, error, cert}.
QtObject {
    id: api

    property var session: null // {server, token, userId, userName}
    readonly property string fields: "Overview,Genres,ProductionYear,OfficialRating,CommunityRating,RunTimeTicks"
    readonly property string leanFields: "ProductionYear,OfficialRating,RunTimeTicks"

    signal signedOut(string why)

    function load() {
        var s = Backend.setting("session", "")
        if (s) { try { session = JSON.parse(s) } catch (e) { session = null } }
    }
    function save(s) {
        session = s
        if (s) Backend.setSetting("session", JSON.stringify(s)); else Backend.removeSetting("session")
    }

    // ----- plumbing -----
    function raw(method, url, body, token, cb) {
        Backend.request(method, url, body ? JSON.stringify(body) : "", token || "", function (r) {
            if (r.status === 401 && token && session) { save(null); signedOut("The server ended your session. Please sign in again.") }
            cb(r)
        })
    }
    function call(method, path, body, cb) { raw(method, session.server + path, body, session.token, cb) }
    function get(path, cb) { call("GET", path, null, cb) }

    /// Some routes moved between versions: try the current one, then the older spelling when a server doesn't know it.
    property var worked: ({})
    function firstThatExists(name, paths, cb) {
        var order = []
        var w = worked[session.server + "|" + name]
        if (w !== undefined) order.push(w)
        for (var i = 0; i < paths.length; i++) if (order.indexOf(i) < 0) order.push(i)
        var tryAt = function (n) {
            get(paths[order[n]], function (r) {
                if (r.ok) { worked[session.server + "|" + name] = order[n]; cb(r); return }
                if ((r.status === 404 || r.status === 405) && n + 1 < order.length) { tryAt(n + 1); return }
                cb(r)
            })
        }
        tryAt(0)
    }

    function itemsQuery(q) {
        var p = ["userId=" + session.userId, "Fields=" + (q.fields ? q.fields : (q.lean ? leanFields : fields)),
                 "EnableTotalRecordCount=" + (q.start ? "false" : "true"), "CollapseBoxSetItems=false", "Recursive=true"]
        if (q.parentId) p.push("ParentId=" + q.parentId)
        if (q.types && q.types.length) p.push("IncludeItemTypes=" + q.types.join(","))
        if (q.genres && q.genres.length) p.push("Genres=" + encodeURIComponent(q.genres.join("|")))
        if (q.filters && q.filters.length) p.push("Filters=" + q.filters.join(","))
        if (q.sortBy) { p.push("SortBy=" + q.sortBy); p.push("SortOrder=" + (q.sortOrder || "Ascending")) }
        if (q.start) p.push("StartIndex=" + q.start)
        if (q.limit) p.push("Limit=" + q.limit)
        if (q.search) p.push("SearchTerm=" + encodeURIComponent(q.search))
        if (q.noImages) p.push("EnableImages=false")
        if (q.ids && q.ids.length) p.push("Ids=" + q.ids.join(","))
        if (q.tags && q.tags.length) p.push("Tags=" + encodeURIComponent(q.tags.join("|")))
        return p.join("&")
    }

    // ----- signing in -----
    function findServer(input, cb) {
        var tried = Util.addressCandidates(input)
        if (!tried.length) { cb({ error: "“" + String(input).trim() + "” doesn't look like a server address. Try something like 192.168.1.10:8096 or https://jellyfin.example.com" }); return }
        var results = new Array(tried.length), left = tried.length
        tried.forEach(function (base, i) {
            raw("GET", base + "/System/Info/Public", null, "", function (r) {
                var info = r.ok && r.data && (r.data.ServerName || r.data.Version || r.data.ProductName) ? r.data : null
                results[i] = { base: base, info: info, cert: r.cert }
                if (--left === 0) {
                    var hit = results.find(x => x.info)
                    if (hit) { cb({ server: hit.base, info: hit.info, tried: tried }); return }
                    var untrusted = results.find(x => x.cert)
                    if (untrusted) { cb({ cert: untrusted.cert, server: untrusted.base, tried: tried }); return }
                    cb({ server: tried[0], info: null, tried: tried })
                }
            })
        })
    }

    function login(serverInput, user, password, cb) {
        findServer(serverInput, function (found) {
            if (found.error) { cb({ error: found.error }); return }
            if (found.cert) { cb({ cert: found.cert }); return }
            raw("POST", found.server + "/Users/AuthenticateByName", { Username: user, Pw: password }, "", function (r) {
                if (r.ok && r.data && r.data.AccessToken) {
                    cb({ session: { server: found.server, token: r.data.AccessToken, userId: r.data.User.Id, userName: r.data.User.Name, avatarTag: r.data.User.PrimaryImageTag || "" } })
                    return
                }
                cb({ error: explain(r, found) })
            })
        })
    }

    function explain(r, found) {
        var where = found.server + (found.info && found.info.Version ? ", Jellyfin " + found.info.Version : "")
        var said = r.text ? " The server said: “" + r.text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) + "”." : ""
        if (r.status === 401) return "Wrong username or password."
        if (r.cert) return "The server's certificate isn't trusted."
        if (!found.info) return "That address answered, but not like Jellyfin does" + (r.status ? " (" + r.status + ")" : "") + ". Check the address, and any proxy or sub-path in front of Jellyfin. (" + found.server + ")"
        if (r.status === 400) return "The server refused the sign-in request (400 Bad Request)." + said + " (" + where + ")"
        if (r.status === 403) return "Access denied (403)." + said + " (" + where + ")"
        if (r.status === 404) return "Jellyfin didn't find the sign-in address (404). If it lives under a sub-path such as example.com/jellyfin, include that in the address. (" + where + ")"
        if (!r.status) return "Couldn't reach the server. Tried " + found.tried.join(", ") + ". Check the address, that the server is running, and that this computer can reach it."
        return "Sign-in failed (" + r.status + ")." + said + " (" + where + ")"
    }

    // ----- the library -----
    function browsable(v) { return ["movies", "tvshows", "boxsets", "homevideos", "mixed", ""].indexOf((v.CollectionType || "").toLowerCase()) >= 0 }
    function views(cb) { firstThatExists("views", ["/UserViews?userId=" + session.userId, "/Users/" + session.userId + "/Views"], r => cb(r.ok ? r.data.Items.filter(browsable) : [])) }
    /// Continue Watching is the canary: if even that fails it's a sign-in or connection problem worth showing.
    function probe(cb) { firstThatExists("resume", ["/UserItems/Resume?userId=" + session.userId + "&Limit=1", "/Users/" + session.userId + "/Items/Resume?Limit=1"], r => cb(r.ok ? "" : (r.status ? "the server answered " + r.status : (r.error || "no answer")))) }
    function resume(cb) { firstThatExists("resume", ["/UserItems/Resume?userId=" + session.userId + "&Limit=20&MediaTypes=Video&Fields=" + leanFields, "/Users/" + session.userId + "/Items/Resume?Limit=20&MediaTypes=Video&Fields=" + leanFields], r => cb(r.ok ? r.data.Items : [])) }
    function nextUp(cb) { get("/Shows/NextUp?UserId=" + session.userId + "&Limit=20&Fields=" + leanFields, r => cb(r.ok ? r.data.Items : [])) }
    function latest(type, cb) { firstThatExists("latest", ["/Items/Latest?userId=" + session.userId + "&Limit=20&IncludeItemTypes=" + type + "&GroupItems=false&Fields=" + fields, "/Users/" + session.userId + "/Items/Latest?Limit=20&IncludeItemTypes=" + type + "&GroupItems=false&Fields=" + fields], r => cb(r.ok ? r.data : [])) }
    function items(q, cb) { get("/Items?" + itemsQuery(q), r => cb(r.ok ? { items: r.data.Items, total: r.data.TotalRecordCount === undefined ? r.data.Items.length : r.data.TotalRecordCount } : { items: [], total: 0, error: r.error })) }
    function item(id, cb) { firstThatExists("item", ["/Items/" + Util.seg(id) + "?userId=" + session.userId, "/Users/" + session.userId + "/Items/" + Util.seg(id)], r => cb(r.ok ? r.data : null, r)) }
    function episodes(seriesId, cb) { get("/Shows/" + Util.seg(seriesId) + "/Episodes?UserId=" + session.userId + "&Fields=Overview,RunTimeTicks", r => cb(r.ok ? r.data.Items : [])) }
    function similar(id, cb) { get("/Items/" + Util.seg(id) + "/Similar?UserId=" + session.userId + "&Limit=12", r => cb(r.ok ? r.data.Items : [])) }
    function search(term, cb) { items({ types: ["Movie", "Series"], search: term, limit: 60, lean: true }, r => cb(r.items)) }
    function setFavorite(id, on, cb) { call(on ? "POST" : "DELETE", "/UserFavoriteItems/" + Util.seg(id) + "?userId=" + session.userId, null, r => { if (r.status === 404 || r.status === 405) call(on ? "POST" : "DELETE", "/Users/" + session.userId + "/FavoriteItems/" + Util.seg(id), null, x => cb && cb(x.ok)); else if (cb) cb(r.ok) }) }
    function setPlayed(id, on, cb) { call(on ? "POST" : "DELETE", "/UserPlayedItems/" + Util.seg(id) + "?userId=" + session.userId, null, r => { if (r.status === 404 || r.status === 405) call(on ? "POST" : "DELETE", "/Users/" + session.userId + "/PlayedItems/" + Util.seg(id), null, x => cb && cb(x.ok)); else if (cb) cb(r.ok) }) }

    function genres(opts, cb) {
        var p = ["userId=" + session.userId, "SortBy=SortName", "SortOrder=Ascending", "IncludeItemTypes=" + ((opts && opts.types) || ["Movie", "Series"]).join(",")]
        if (opts && opts.parentId) p.push("ParentId=" + opts.parentId)
        get("/Genres?" + p.join("&"), r => cb(r.ok ? r.data.Items.map(g => g.Name) : []))
    }
    /// (Newest first: asking the server for a random sample of a big library is slow.)
    function byGenre(genre, cb) { items({ types: ["Movie", "Series"], genres: [genre], sortBy: "DateCreated", sortOrder: "Descending", limit: 20, lean: true }, r => cb(r.items)) }
    function recommendations(cb) { get("/Movies/Recommendations?userId=" + session.userId + "&categoryLimit=3&itemLimit=14&Fields=" + leanFields, r => cb(r.ok ? r.data : [])) }
    function extras(id, cb) {
        var out = [], left = 2
        var done = function () { if (--left === 0) cb(out) }
        get("/Items/" + Util.seg(id) + "/LocalTrailers?userId=" + session.userId, r => { if (r.ok) out = r.data.concat(out); done() })
        get("/Items/" + Util.seg(id) + "/SpecialFeatures?userId=" + session.userId, r => { if (r.ok) out = out.concat(r.data); done() })
    }
    function searchPeople(term, cb) { items({ types: ["Person"], search: term, limit: 24 }, r => cb(r.items)) }
    function publicInfo(cb) { raw("GET", session.server + "/System/Info/Public", null, "", r => cb(r.ok ? r.data : null)) }
    function publicUsers(server, cb) { raw("GET", server + "/Users/Public", null, "", r => cb(r.ok && Array.isArray(r.data) ? r.data.filter(u => u.Id && u.Name) : [])) }
    function segments(id, cb) { get("/MediaSegments/" + Util.seg(id), r => cb(r.ok && r.data.Items ? r.data.Items.map(x => ({ type: String(x.Type), start: x.StartTicks / 1e7, end: x.EndTicks / 1e7 })) : [])) }

    // ----- pictures -----
    function image(id, tag, w, type) { if (!session) return ""; return session.server + "/Items/" + Util.seg(id) + "/Images/" + (type || "Primary") + "?maxWidth=" + w + (tag ? "&tag=" + encodeURIComponent(tag) : "") }
    function poster(it, w) {
        w = w || 400
        if (!session) return ""
        if (it.Type === "Episode" && it.SeriesId) return session.server + "/Items/" + Util.seg(it.SeriesId) + "/Images/Primary?maxWidth=" + w
        return it.ImageTags && it.ImageTags.Primary ? image(it.Id, it.ImageTags.Primary, w) : ""
    }
    function thumb(it, w) {
        w = w || 600
        if (!session) return ""
        if (it.ImageTags && it.ImageTags.Thumb) return image(it.Id, it.ImageTags.Thumb, w, "Thumb")
        if (it.BackdropImageTags && it.BackdropImageTags.length) return image(it.Id, it.BackdropImageTags[0], w, "Backdrop")
        if (it.ParentBackdropItemId && it.ParentBackdropImageTags && it.ParentBackdropImageTags.length) return image(it.ParentBackdropItemId, it.ParentBackdropImageTags[0], w, "Backdrop")
        return it.ImageTags && it.ImageTags.Primary ? image(it.Id, it.ImageTags.Primary, w) : ""
    }
    /// An episode's own picture first (its still), then the wide art of the title.
    function still(it, w) {
        w = w || 400
        if (!session) return ""
        if (it.ImageTags && it.ImageTags.Primary) return image(it.Id, it.ImageTags.Primary, w)
        return thumb(it, w)
    }
    function backdrop(it, w) {
        w = w || 1920
        if (!session) return ""
        if (it.BackdropImageTags && it.BackdropImageTags.length) return image(it.Id, it.BackdropImageTags[0], w, "Backdrop")
        if (it.SeriesId) return session.server + "/Items/" + Util.seg(it.SeriesId) + "/Images/Backdrop?maxWidth=" + w
        if (it.ParentBackdropItemId && it.ParentBackdropImageTags && it.ParentBackdropImageTags.length) return image(it.ParentBackdropItemId, it.ParentBackdropImageTags[0], w, "Backdrop")
        return ""
    }
    function trickplayUrl(id, mediaSourceId, width, tile) { return session.server + "/Videos/" + Util.seg(id) + "/Trickplay/" + width + "/" + tile + ".jpg?MediaSourceId=" + encodeURIComponent(mediaSourceId) + "&ApiKey=" + encodeURIComponent(session.token) }
    function openTarget(it) { return it.Type === "Episode" && it.SeriesId ? it.SeriesId : it.Id }

    // ----- playing -----
    /// What this player can play: everything. mpv decodes any codec, container, audio and subtitle format itself, so the file is
    /// always played as it is and the server never converts anything.
    readonly property var deviceProfile: ({
        Name: "Jellyflix", MaxStreamingBitrate: 400000000, MaxStaticBitrate: 400000000,
        DirectPlayProfiles: [{ Type: "Video" }, { Type: "Audio" }],
        TranscodingProfiles: [], CodecProfiles: [], ContainerProfiles: [],
        SubtitleProfiles: ["srt", "subrip", "ass", "ssa", "vtt", "pgssub", "dvdsub", "dvbsub", "sub", "idx", "smi"].map(f => ({ Format: f, Method: "External" }))
    })

    function playback(id, cb) {
        call("POST", "/Items/" + Util.seg(id) + "/PlaybackInfo", {
            UserId: session.userId, DeviceProfile: deviceProfile, EnableDirectPlay: true, EnableDirectStream: true, EnableTranscoding: false,
            AutoOpenLiveStream: false
        }, function (r) {
            var src = r.ok && r.data.MediaSources && r.data.MediaSources[0]
            if (!src) { cb({ error: r.ok ? "The server has nothing to play for this title." : "Couldn't ask the server how to play this (" + (r.status || r.error) + ")." }); return }
            var sid = r.data.PlaySessionId || ""
            var url = session.server + "/Videos/" + Util.seg(id) + "/stream?static=true&MediaSourceId=" + encodeURIComponent(src.Id) + "&PlaySessionId=" + encodeURIComponent(sid) +
                      "&DeviceId=" + encodeURIComponent(Backend.deviceId) + (src.ETag ? "&Tag=" + encodeURIComponent(src.ETag) : "") + "&ApiKey=" + encodeURIComponent(session.token)
            cb({ url: url, source: src, playSessionId: sid })
        })
    }

    function report(kind, id, plan, seconds, paused) {
        call("POST", "/Sessions/Playing" + (kind === "Playing" ? "" : "/" + kind), {
            ItemId: id, MediaSourceId: plan.source.Id, PlaySessionId: plan.playSessionId, PositionTicks: Math.floor(seconds * 1e7), IsPaused: paused, PlayMethod: "DirectPlay"
        }, function () {})
    }
}
