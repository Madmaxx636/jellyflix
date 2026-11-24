.pragma library

/// The addresses worth trying for whatever was typed, best guess first.
function addressCandidates(input) {
    var raw = String(input).trim()
    if (!raw) return []
    var hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw)
    var m = /^(?:([a-zA-Z][a-zA-Z0-9+.-]*):\/\/)?([^\/:?#]+)(?::(\d+))?([^?#]*)/.exec(raw)
    if (!m) return []
    var scheme = (m[1] || "").toLowerCase()
    if (hasScheme && scheme !== "http" && scheme !== "https") return []
    var host = m[2], port = m[3] ? parseInt(m[3]) : -1
    var base = (m[4] || "").replace(/\/web(\/.*)?$/i, "").replace(/\/+$/, "")
    var hostPort = port >= 0 ? host + ":" + port : host
    if (hasScheme) return [scheme + "://" + hostPort + base]
    if (port >= 0) {
        var http = "http://" + hostPort + base, https = "https://" + hostPort + base
        return (port === 443 || port === 8920) ? [https, http] : [http, https]
    }
    return ["https://" + host + base, "http://" + host + ":8096" + base, "http://" + host + base, "https://" + host + ":8920" + base]
}

function minutes(ticks) {
    if (!ticks) return ""
    var m = Math.round(ticks / 600000000)
    return m >= 60 ? Math.floor(m / 60) + "h " + (m % 60) + "m" : m + "m"
}

function clock(seconds) {
    var s = Math.max(0, Math.floor(seconds || 0))
    var h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, r = s % 60
    var two = function (n) { return n < 10 ? "0" + n : "" + n }
    return h > 0 ? h + ":" + two(m) + ":" + two(r) : m + ":" + two(r)
}

function plainName(name) {
    return String(name).toLowerCase().replace(/&/g, " and ").replace(/^(the|a|an) /, "").replace(/[^a-z0-9]+/g, " ").trim()
}

function seg(s) { return encodeURIComponent(s) }
