package app.jellyflix.android.data

import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.io.IOException
import java.net.URLEncoder
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

suspend fun Call.await(): Response = suspendCancellableCoroutine { cont ->
    enqueue(object : Callback {
        override fun onFailure(call: Call, e: IOException) { if (!cont.isCancelled) cont.resumeWithException(e) }
        override fun onResponse(call: Call, response: Response) { cont.resume(response) }
    })
    cont.invokeOnCancellation { cancel() }
}

private fun quoted(value: String) = "\"" + URLEncoder.encode(value, "UTF-8").replace("+", "%20") + "\""

/**
 * Jellyfin's standard client identification, sent as the Authorization header. Servers from 12.0 on ignore the older
 * X-Emby-* headers and the api_key parameter, so this is the form to use.
 */
fun authHeader(deviceId: String, deviceName: String, version: String, token: String? = null): String =
    "MediaBrowser Client=${quoted("Jellyflix")}, Device=${quoted(deviceName)}, DeviceId=${quoted(deviceId)}, Version=${quoted(version)}" +
        (if (token != null) ", Token=${quoted(token)}" else "")

/** A short, readable reason from an error response: Jellyfin's JSON message, or a proxy's page. */
fun reasonFrom(body: String): String {
    val text = body.trim()
    if (text.isEmpty()) return ""
    Regex("\"(?:detail|title|message|Message|error)\"\\s*:\\s*\"([^\"]{1,200})\"").find(text)?.let { return it.groupValues[1] }
    Regex("<title[^>]*>([\\s\\S]*?)</title>", RegexOption.IGNORE_CASE).find(text)?.let { return it.groupValues[1].trim().take(200) }
    return text.replace(Regex("<[^>]+>"), " ").replace(Regex("\\s+"), " ").trim().take(200)
}

/** Sends requests to a Jellyfin server. [onUnauthorized] is called when a request that carried a token is turned down with 401. */
class Http(
    val client: OkHttpClient,
    val deviceId: String,
    val deviceName: String,
    val version: String,
) {
    var onUnauthorized: (() -> Unit)? = null

    suspend fun text(server: String, path: String, token: String? = null, method: String = "GET", body: String? = null): String =
        withContext(Dispatchers.IO) {
            val request = Request.Builder()
                .url(server + path)
                .header("Authorization", authHeader(deviceId, deviceName, version, token))
                .method(method, if (method == "GET") null else (body ?: "").toRequestBody("application/json".toMediaType()))
                .build()
            client.newBuilder().callTimeout(30, TimeUnit.SECONDS).build().newCall(request).await().use { response ->
                val text = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    if (response.code == 401 && token != null) onUnauthorized?.invoke()
                    throw HttpError(response.code, "${response.code} ${response.message}".trim() + reasonFrom(text).let { if (it.isEmpty()) "" else ": $it" }, reasonFrom(text))
                }
                text
            }
        }
}
