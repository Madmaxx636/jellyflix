package app.jellyflix.android

import app.jellyflix.android.data.*
import org.junit.Assert.*
import org.junit.Test

class DataTest {
    @Test fun bareHostTriesHttpsThenJellyfinPort() {
        val c = addressCandidates("media.example.com")
        assertEquals("https://media.example.com", c.first())
        assertTrue("http://media.example.com:8096" in c)
    }

    @Test fun pastedWebUiLinkLosesItsPath() {
        assertEquals(listOf("http://192.168.1.10:8096"), addressCandidates("http://192.168.1.10:8096/web/index.html#!/home.html"))
    }

    @Test fun garbageGivesNothing() {
        assertTrue(addressCandidates("   ").isEmpty())
        assertTrue(addressCandidates("ftp://x").isEmpty())
    }

    @Test fun listsKeepMoviesOutOfCollections() {
        val q = itemsQuery("u1", Query(types = listOf("Movie"), sortBy = "SortName"))
        assertTrue("CollapseBoxSetItems=false" in q)
        assertTrue("IncludeItemTypes=Movie" in q)
    }

    @Test fun directPlayUsesTheFileItself() {
        val info = PlaybackInfoResponse(listOf(MediaSource(id = "m", supportsDirectPlay = true)), "ps")
        val p = planPlayback("http://s", "tok", "dev", "i1", info, PlaybackOptions())!!
        assertEquals("DirectPlay", p.method)
        assertTrue("/Videos/i1/stream?static=true" in p.url)
        assertFalse(p.hls)
    }

    @Test fun transcodeUrlGetsTheKeyAndIsHls() {
        val info = PlaybackInfoResponse(listOf(MediaSource(id = "m", supportsDirectPlay = false, transcodingUrl = "/videos/i1/master.m3u8?x=1", transcodingSubProtocol = "hls")), "ps")
        val p = planPlayback("http://s", "tok", "dev", "i1", info, PlaybackOptions())!!
        assertTrue(p.hls)
        assertTrue(p.url.startsWith("http://s/videos/i1/master.m3u8"))
        assertTrue("ApiKey=tok" in p.url)
    }

    @Test fun refusalSaysWhy() {
        val e = runCatching { planPlayback("http://s", "t", "d", "i", PlaybackInfoResponse(null, null, "NotAllowed"), PlaybackOptions()) }.exceptionOrNull()
        assertTrue(e!!.message!!.contains("isn't allowed"))
    }

    @Test fun jellyfinJsonMapsUpperCamelCase() {
        val item = JellyfinJson.decodeFromString<Item>("""{"Id":"a","Name":"Heat","Type":"Movie","ProductionYear":1995,"Extra":1}""")
        assertEquals("Heat", item.name)
        assertEquals(1995, item.productionYear)
    }

    @Test fun wrongPasswordIsPlain() {
        val msg = explainSignInFailure(HttpError(401, "401"), Found("http://s", PublicInfo("x", "10.9"), listOf("http://s")))
        assertEquals("Wrong username or password.", msg)
    }

    @Test fun authHeaderEncodesValues() {
        val h = authHeader("id 1", "Pixel 8", "1.0", "tok")
        assertTrue("DeviceId=\"id%201\"" in h)
        assertTrue("Token=\"tok\"" in h)
    }
}

class UpdateTest {
    @Test fun laterReleasesAreNewer() {
        assertTrue(isNewer("0.3.0", "0.3.1"))
        assertTrue(isNewer("0.9.9", "0.10.0"))
        assertTrue(isNewer("0.0.0-dev", "0.3.1"))
        assertTrue(isNewer("0.3.1", "v1.0.0"))
    }

    @Test fun sameOrOlderIsNot() {
        assertFalse(isNewer("0.3.1", "0.3.1"))
        assertFalse(isNewer("0.3.1", "0.3.0"))
        assertFalse(isNewer("1.0", "1.0.0"))
    }

    @Test fun checksumListIsRead() {
        val listing = "aaa111  Jellyflix-0.3.1-android.apk\nbbb222  Other-file.exe\n"
        assertEquals("aaa111", checksumFor(listing, "Jellyflix-0.3.1-android.apk"))
        assertNull(checksumFor(listing, "missing.apk"))
    }
}
