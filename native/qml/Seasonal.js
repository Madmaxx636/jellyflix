.pragma library
.import "Util.js" as Util

// Holiday picks for the banner: a short list of well-known classics (by name, nothing is fetched from anywhere), then whatever
// else matches by tag, name or genre and rates well. See api/seasonal.ts in the web-engine app, which this follows.

var SEASONS = {
    valentines: { id: "valentines", title: "Valentine's Day picks", tags: ["valentine", "valentines"], names: ["valentine"], genres: ["Romance"], horror: false },
    halloween: { id: "halloween", title: "Halloween watch", tags: ["halloween"], names: ["halloween"], genres: ["Horror"], horror: true },
    thanksgiving: { id: "thanksgiving", title: "Thanksgiving favourites", tags: ["thanksgiving"], names: ["thanksgiving"], genres: [], horror: false },
    christmas: { id: "christmas", title: "Christmas classics", tags: ["christmas", "xmas", "holiday"], names: ["christmas", "xmas", "santa"], genres: [], horror: false }
}

function thanksgivingDay(year) {
    var firstThursday = 1 + ((4 - new Date(year, 10, 1).getDay() + 7) % 7)
    return firstThursday + 21
}

/// The seasons a date falls in; they can overlap (late November is Thanksgiving and Christmas time).
function seasonsFor(date) {
    var at = (date.getMonth() + 1) * 100 + date.getDate(), found = []
    if (at >= 201 && at <= 214) found.push(SEASONS.valentines)
    if (date.getMonth() === 9) found.push(SEASONS.halloween)
    if (at >= 1108 && at <= 1100 + thanksgivingDay(date.getFullYear())) found.push(SEASONS.thanksgiving)
    if (at >= 1115 && at <= 1231) found.push(SEASONS.christmas)
    return found
}

var M = function (t, y) { return { title: t, year: y } }
var E = function (s, t) { return { series: s, title: t } }
var DATA = {
    christmas: {
        movies: [M("It's a Wonderful Life", 1946), M("Miracle on 34th Street", 1947), M("Miracle on 34th Street", 1994), M("White Christmas", 1954), M("Holiday Inn", 1942),
            M("The Bishop's Wife", 1947), M("The Shop Around the Corner", 1940), M("Christmas in Connecticut", 1945), M("Meet Me in St. Louis", 1944), M("Scrooge", 1951), M("Scrooge", 1970),
            M("A Christmas Carol", 1984), M("A Christmas Carol", 1951), M("The Muppet Christmas Carol", 1992), M("Mickey's Christmas Carol", 1983), M("Scrooged", 1988),
            M("A Charlie Brown Christmas", 1965), M("How the Grinch Stole Christmas!", 1966), M("Dr. Seuss How the Grinch Stole Christmas", 2000), M("The Grinch", 2018),
            M("Rudolph the Red-Nosed Reindeer", 1964), M("Frosty the Snowman", 1969), M("Santa Claus Is Comin to Town", 1970), M("The Year Without a Santa Claus", 1974), M("The Snowman", 1982),
            M("A Christmas Story", 1983), M("National Lampoons Christmas Vacation", 1989), M("Home Alone", 1990), M("Home Alone 2 Lost in New York", 1992), M("The Santa Clause", 1994),
            M("The Nightmare Before Christmas", 1993), M("Elf", 2003), M("The Polar Express", 2004), M("Love Actually", 2003), M("The Holiday", 2006), M("Arthur Christmas", 2011),
            M("Klaus", 2019), M("Prancer", 1989), M("Jingle All the Way", 1996), M("Die Hard", 1988), M("Gremlins", 1984), M("Trading Places", 1983), M("The Man Who Invented Christmas", 2017),
            M("Fred Claus", 2007), M("The Christmas Chronicles", 2018), M("Noelle", 2019)],
        episodes: [E("The Twilight Zone", "The Night of the Meek"), E("The Twilight Zone", "Night of the Meek"), E("The Simpsons", "Simpsons Roasting on an Open Fire"), E("The Simpsons", "Miracle on Evergreen Terrace"),
            E("Seinfeld", "The Strike"), E("I Love Lucy", "Christmas Episode"), E("Frasier", "Merry Christmas, Mrs. Moskowitz"), E("Friends", "The One with the Holiday Armadillo"),
            E("The Office", "Christmas Party"), E("The Office", "Secret Santa"), E("Cheers", "Christmas Cheers"), E("The Andy Griffith Show", "Christmas Story"), E("The Brady Bunch", "The Voice of Christmas"),
            E("Doctor Who", "The Christmas Invasion"), E("Doctor Who", "A Christmas Carol"), E("Parks and Recreation", "Citizen Knope"), E("Community", "Abed's Uncontrollable Christmas"),
            E("Black Adder", "Blackadder's Christmas Carol")]
    },
    thanksgiving: {
        movies: [M("Planes, Trains and Automobiles", 1987), M("A Charlie Brown Thanksgiving", 1973), M("Home for the Holidays", 1995), M("Hannah and Her Sisters", 1986), M("Free Birds", 2013),
            M("Addams Family Values", 1993), M("Alice's Restaurant", 1969), M("Pieces of April", 2003), M("Scent of a Woman", 1992), M("Dutch", 1991), M("Garfield's Thanksgiving", 1989),
            M("The Mayflower Voyagers", 1988), M("Miracle on 34th Street", 1947), M("Funny Farm", 1988), M("Son-in-Law", 1993), M("Grumpy Old Men", 1993), M("Uncle Buck", 1989), M("Mrs. Doubtfire", 1993)],
        episodes: [E("Friends", "The One with All the Thanksgivings"), E("Friends", "The One with the Thanksgiving Flashbacks"), E("Friends", "The One with the Football"), E("WKRP in Cincinnati", "Turkeys Away"),
            E("Cheers", "Thanksgiving Orphans"), E("The Simpsons", "Bart vs. Thanksgiving"), E("Gilmore Girls", "A Deep-Fried Korean Thanksgiving"), E("Roseanne", "Thanksgiving 91"),
            E("The Golden Girls", "Sick and Tired"), E("The Office", "Thanksgiving"), E("The Cosby Show", "Happy Thanksgiving")]
    },
    halloween: {
        movies: [M("Hocus Pocus", 1993), M("Beetlejuice", 1988), M("Halloweentown", 1998), M("Casper", 1995), M("The Addams Family", 1991), M("Addams Family Values", 1993), M("Ghostbusters", 1984),
            M("The Nightmare Before Christmas", 1993), M("It's the Great Pumpkin, Charlie Brown", 1966), M("Young Frankenstein", 1974), M("Monster House", 2006), M("Coraline", 2009), M("Corpse Bride", 2005),
            M("Frankenweenie", 2012), M("ParaNorman", 2012), M("Hotel Transylvania", 2012), M("Monsters, Inc.", 2001), M("Abbott and Costello Meet Frankenstein", 1948), M("Psycho", 1960),
            M("Halloween", 1978), M("Frankenstein", 1931), M("Dracula", 1931), M("Nosferatu", 1922), M("The Shining", 1980), M("The Birds", 1963), M("Alien", 1979), M("The Thing", 1982),
            M("An American Werewolf in London", 1981), M("Poltergeist", 1982), M("Scream", 1996), M("Night of the Living Dead", 1968), M("Rosemarys Baby", 1968), M("The Sixth Sense", 1999),
            M("Arsenic and Old Lace", 1944)],
        episodes: [E("The Simpsons", "Treehouse of Horror"), E("The Twilight Zone", "Nightmare at 20,000 Feet"), E("The Twilight Zone", "Living Doll"), E("The Twilight Zone", "Eye of the Beholder")]
    },
    valentines: {
        movies: [M("Casablanca", 1942), M("When Harry Met Sally...", 1989), M("The Princess Bride", 1987), M("Sleepless in Seattle", 1993), M("Roman Holiday", 1953), M("An Affair to Remember", 1957),
            M("Breakfast at Tiffany's", 1961), M("The Philadelphia Story", 1940), M("Moonstruck", 1987), M("Dirty Dancing", 1987), M("Pretty Woman", 1990), M("Ghost", 1990), M("Notting Hill", 1999),
            M("Pride & Prejudice", 2005), M("The Notebook", 2004), M("La La Land", 2016), M("Singin' in the Rain", 1952), M("Beauty and the Beast", 1991), M("Lady and the Tramp", 1955),
            M("WALL-E", 2008), M("Say Anything...", 1989), M("Before Sunrise", 1995), M("It Happened One Night", 1934), M("The Apartment", 1960), M("Love Story", 1970), M("You've Got Mail", 1998)],
        episodes: [E("The Office", "Valentine's Day"), E("I Love Lucy", "Lucy's Valentine")]
    }
}

function norm(s) { return Util.plainName(s) }
function matchesClassic(it, w) {
    if (norm(it.Name) !== norm(w.title)) return false
    return w.year === undefined || it.ProductionYear === undefined || Math.abs(it.ProductionYear - w.year) <= 1
}
function matchesEpisode(it, w) {
    return it.Type === "Episode" && norm(it.Name) === norm(w.title) && norm(it.SeriesName || "").indexOf(norm(w.series)) >= 0
}

var ADULT = /^(R|NC-17|X|TV-MA|18|18\+|16|AO)$/i
var FAMILY = /^(G|PG|TV-G|TV-PG|TV-Y|TV-Y7|TV-Y7-FV)$/i

/// Is this a pick for the season that the library has no reason to be embarrassed by?
function qualifies(it, season) {
    if (it.OfficialRating && ADULT.test(String(it.OfficialRating).trim())) return false
    var genres = it.Genres || []
    var scary = genres.indexOf("Horror") >= 0 || genres.indexOf("Thriller") >= 0
    if (scary && !season.horror) return false
    if (it.CommunityRating === undefined || it.CommunityRating === null) {
        // no rating at all: older titles are trusted, and so is anything rated for the family
        return (it.ProductionYear || 9999) <= 1995 || (!!it.OfficialRating && FAMILY.test(String(it.OfficialRating).trim()) && !scary)
    }
    return it.CommunityRating >= (scary ? 7 : 6.4)
}
function score(it) {
    var year = it.ProductionYear || 2020
    return (it.CommunityRating || 6) * 10 + (it.OfficialRating && FAMILY.test(String(it.OfficialRating).trim()) ? 15 : 0) + (year <= 1980 ? 12 : year <= 2000 ? 6 : 0)
}

function dedupe(list) { var seen = {}; return list.filter(function (i) { if (seen[i.Id]) return false; seen[i.Id] = true; return true }) }

/// Runs `work(x, done)` over `list` a few at a time.
function inBatches(list, work, done) {
    var out = new Array(list.length), next = 0, active = 0, finished = false
    if (!list.length) { done(out); return }
    var pump = function () {
        while (active < 6 && next < list.length) {
            (function (i) { active++; work(list[i], function (r) { out[i] = r; active--; if (next >= list.length && active === 0 && !finished) { finished = true; done(out) } else pump() }) })(next++)
        }
    }
    pump()
}

function picksFor(api, season, style, cb) {
    var data = DATA[season.id], known = [], found = [], left = 2
    var check = function () {
        if (--left > 0) return
        var knownIds = {}; known.forEach(function (i) { knownIds[i.Id] = true })
        var extra = dedupe(found).filter(function (i) { return !knownIds[i.Id] && (style === "all" || qualifies(i, season)) })
        extra.sort(function (a, b) { return score(b) - score(a) })
        var k = dedupe(known).sort(function (a, b) { return score(b) - score(a) })
        cb(k.concat(extra).slice(0, style === "all" ? 24 : 12), { classics: k.length, others: extra.length, candidates: dedupe(found).length })
    }
    // the classics, by name
    var jobs = data.movies.map(function (w) { return { movie: w } }).concat(data.episodes.map(function (w) { return { episode: w } }))
    var word = function (title) {
        var words = String(title).replace(/[^A-Za-z0-9 ]+/g, " ").split(/\s+/).filter(function (w) { return w.length >= 3 })
        return words.sort(function (a, b) { return b.length - a.length })[0] || String(title)
    }
    inBatches(jobs, function (job, done) {
        var q = job.movie ? { types: ["Movie"], search: word(job.movie.title), limit: 40 } : { types: ["Episode"], search: word(job.episode.title), limit: 60 }
        api.items(q, function (r) { done(r.items.filter(function (i) { return job.movie ? matchesClassic(i, job.movie) : matchesEpisode(i, job.episode) })) })
    }, function (lists) { lists.forEach(function (l) { known = known.concat(l || []) }); check() })
    // whatever else looks like the season
    var asks = [], got = 0
    if (season.tags.length) asks.push({ types: ["Movie"], tags: season.tags, limit: 30 })
    season.names.forEach(function (n) { asks.push({ types: ["Movie"], search: n, limit: 30 }) })
    season.genres.forEach(function (g) { asks.push({ types: ["Movie"], genres: [g], sortBy: "CommunityRating", sortOrder: "Descending", limit: 30 }) })
    if (!asks.length) { check(); return }
    asks.forEach(function (q) { api.items(q, function (r) { found = found.concat(r.items); if (++got === asks.length) check() }) })
}

/// Picks for every season that applies, taking turns between seasons. Finding them takes a few dozen requests, so each season's picks
/// are kept for half a day in `store` ({get(key), set(key, text)}). cb({items, labels}).
function holidayPicks(api, seasons, style, cb, store) {
    var lists = [], left = seasons.length, TTL = 12 * 60 * 60 * 1000, report = []
    if (!left) { cb({ items: [], labels: ({}) }); return }
    var key = function (season) { return "holiday2." + api.session.server + "|" + api.session.userId + "." + season.id + "." + style }
    var combine = function () {
        var out = [], labels = {}
        for (var i = 0; lists.some(function (l) { return i < l.items.length }); i++) {
            lists.forEach(function (l) { var it = l.items[i]; if (it && labels[it.Id] === undefined) { labels[it.Id] = l.season.title; out.push(it) } })
        }
        cb({ items: out, labels: labels, report: report.join("; ") })
    }
    seasons.forEach(function (season, si) {
        var kept = null
        try { var raw = store && store.get(key(season)); if (raw) { var p = JSON.parse(raw); if (Date.now() - p.at < TTL) kept = p.items } } catch (e) { kept = null }
        var finish = function (items, stats) {
            lists[si] = { season: season, items: items }
            report.push(season.title + ": " + items.length + " shown" + (stats ? " (" + stats.classics + " from the classics list, " + stats.others + " other matches of " + stats.candidates + " looked at)" : " (kept from earlier)"))
            if (--left === 0) combine()
        }
        if (kept) { finish(kept, null); return }
        picksFor(api, season, style, function (items, stats) {
            if (items.length && store) { try { store.set(key(season), JSON.stringify({ at: Date.now(), items: items })) } catch (e) { /* too big */ } }
            finish(items, stats)
        })
    })
}
