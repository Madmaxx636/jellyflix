package app.jellyflix.android.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import okhttp3.Request
import java.net.URI
import java.util.concurrent.TimeUnit

data class Found(val server: String, val info: PublicInfo?, val tried: List<String>)

/**
 * Turns whatever was typed into the addresses worth trying, best guess first. Handles a missing scheme or port, and a
 * pasted web-UI link (…/web/index.html#!/home.html).
 */
fun addressCandidates(input: String): List<String> {
    val raw = input.trim()
    if (raw.isEmpty()) return emptyList()
    val hasScheme = Regex("^[a-zA-Z][a-zA-Z0-9+.-]*://").containsMatchIn(raw)
    val uri = try { URI(if (hasScheme) raw else "http://$raw") } catch (e: Exception) { return emptyList() }
    val scheme = uri.scheme?.lowercase()
    if (scheme != "http" && scheme != "https") return emptyList()
    val host = uri.host ?: return emptyList()
    val port = uri.port
    val base = (uri.rawPath ?: "").replace(Regex("/web(/.*)?$", RegexOption.IGNORE_CASE), "").trimEnd('/')
    val hostPort = if (port >= 0) "$host:$port" else host
    if (hasScheme) return listOf("$scheme://$hostPort$base")
    if (port >= 0) {
        val http = "http://$hostPort$base"
        val https = "https://$hostPort$base"
        return if (port == 443 || port == 8920) listOf(https, http) else listOf(http, https)
    }
    return listOf("https://$host$base", "http://$host:8096$base", "http://$host$base", "https://$host:8920$base")
}

/** What to tell the user when signing in failed, in plain words. */
fun explainSignInFailure(e: Throwable, found: Found): String {
    val where = found.server + (found.info?.version?.let { ", Jellyfin $it" } ?: "")
    if (e is HttpError) {
        val said = if (e.detail.isNotEmpty()) " The server said: “${e.detail}”." else ""
        return when {
            e.status == 401 -> "Wrong username or password."
            Regex("plain http request was sent to https port", RegexOption.IGNORE_CASE).containsMatchIn(e.detail) ->
                "That port speaks HTTPS, not plain HTTP. Try ${found.server.replaceFirst(Regex("^http:", RegexOption.IGNORE_CASE), "https:")}."
            found.info == null -> "That address answered, but not like Jellyfin does (${e.status}).$said Check the address, and any proxy or sub-path in front of Jellyfin. (${found.server})"
            e.status == 400 -> "The server refused the sign-in request (400 Bad Request).$said ($where)"
            e.status == 403 -> "Access denied (403).$said The server, or a proxy in front of it, blocked the sign-in. ($where)"
            e.status == 404 -> "Jellyfin didn't find the sign-in address (404). If it lives under a sub-path such as example.com/jellyfin, include that in the address. ($where)"
            else -> "Sign-in failed (${e.status}).$said ($where)"
        }
    }
    return "Couldn't find a Jellyfin server. Tried ${found.tried.joinToString(", ")}. Check the address, that the server is running, and that this device can reach it."
}

class Connector(private val http: Http) {
    private class Probe(val hit: Pair<String, PublicInfo>? = null, val untrusted: CertificateNotTrusted? = null)

    private suspend fun probe(base: String): Probe = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder().url("$base/System/Info/Public").build()
            http.client.newBuilder().callTimeout(5, TimeUnit.SECONDS).build().newCall(request).await().use { response ->
                if (!response.isSuccessful) return@use Probe()
                val info = JellyfinJson.decodeFromString<PublicInfo>(response.body?.string().orEmpty())
                if (info.serverName == null && info.version == null && info.productName == null) return@use Probe() // some other web server
                // OkHttp follows redirects (http to https, a canonical host), so the final address is where the server lives.
                Probe(response.request.url.toString().removeSuffix("/System/Info/Public") to info)
            }
        } catch (e: Exception) { Probe(untrusted = untrustedIn(e)) }
    }

    /** Tries every likely address at once and takes the best-ranked one that answers like Jellyfin. Throws [CertificateNotTrusted] when the only answer came with a certificate the person hasn't approved. */
    suspend fun findServer(input: String): Found {
        val tried = addressCandidates(input)
        if (tried.isEmpty()) throw IllegalArgumentException("“${input.trim()}” doesn't look like a server address. Try something like 192.168.1.10:8096 or https://jellyfin.example.com")
        val results = coroutineScope { tried.map { async { probe(it) } }.awaitAll() }
        val hit = results.firstOrNull { it.hit != null }?.hit
        // Nothing answered, but one address did present a certificate this device doesn't know: ask about that one.
        if (hit == null) results.firstNotNullOfOrNull { it.untrusted }?.let { throw it }
        return Found(hit?.first ?: tried.first(), hit?.second, tried)
    }

    suspend fun login(serverInput: String, user: String, password: String): Session {
        val found = findServer(serverInput)
        try {
            val body = """{"Username":${quote(user)},"Pw":${quote(password)}}"""
            val result = JellyfinJson.decodeFromString<AuthResult>(http.text(found.server, "/Users/AuthenticateByName", method = "POST", body = body))
            return Session(found.server, result.accessToken, result.user.id, result.user.name, result.user.primaryImageTag)
        } catch (e: Exception) {
            throw IllegalStateException(explainSignInFailure(e, found), e)
        }
    }

    /** Profiles that can be picked on the sign-in screen (users the admin hasn't hidden). Needs no sign-in. */
    suspend fun publicUsers(server: String): List<PublicUser> = try {
        JellyfinJson.decodeFromString<List<PublicUser>>(http.text(server, "/Users/Public")).filter { it.id.isNotEmpty() && it.name.isNotEmpty() }
    } catch (e: Exception) { emptyList() }

    private fun quote(value: String) = buildString {
        append('"')
        for (c in value) when (c) {
            '"' -> append("\\\""); '\\' -> append("\\\\"); '\n' -> append("\\n"); '\r' -> append("\\r"); '\t' -> append("\\t")
            else -> if (c < ' ') append("\\u%04x".format(c.code)) else append(c)
        }
        append('"')
    }
}
