package app.jellyflix.android.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.security.MessageDigest

const val RELEASES_API = "https://api.github.com/repos/Madmaxx636/jellyflix/releases/latest"

data class Update(val version: String, val apkUrl: String, val apkName: String, val sumsUrl: String?, val notes: String)

private fun parts(version: String): List<Int> =
    version.trim().removePrefix("v").substringBefore('-').split('.').map { it.toIntOrNull() ?: 0 }

/** True when [candidate] is a later release than [current]. A "-dev" build counts as its number, so 0.0.0-dev is older than any release. */
fun isNewer(current: String, candidate: String): Boolean {
    val a = parts(current)
    val b = parts(candidate)
    for (i in 0 until maxOf(a.size, b.size)) {
        val x = a.getOrElse(i) { 0 }
        val y = b.getOrElse(i) { 0 }
        if (y != x) return y > x
    }
    return false
}

/** The checksum for [name] from a `sha256sum` listing ("hash  file" per line). */
fun checksumFor(listing: String, name: String): String? =
    listing.lineSequence().map { it.trim().split(Regex("\\s+"), limit = 2) }
        .firstOrNull { it.size == 2 && it[1].removePrefix("*") == name }?.get(0)?.lowercase()

/** Looks for a newer release on GitHub, and downloads and checks its Android package. */
class Updater(private val client: OkHttpClient) {
    suspend fun latest(current: String): Update? = withContext(Dispatchers.IO) {
        val request = Request.Builder().url(RELEASES_API).header("Accept", "application/vnd.github+json").header("User-Agent", "Jellyflix").build()
        val body = client.newCall(request).await().use { r ->
            if (!r.isSuccessful) throw HttpError(r.code, "GitHub answered ${r.code}")
            r.body?.string().orEmpty()
        }
        val release: JsonObject = JellyfinJson.parseToJsonElement(body).jsonObject
        val version = release["tag_name"]?.jsonPrimitive?.content?.removePrefix("v") ?: return@withContext null
        if (!isNewer(current, version)) return@withContext null
        val assets = release["assets"]?.jsonArray?.map { it.jsonObject } ?: return@withContext null
        val apk = assets.firstOrNull { it["name"]?.jsonPrimitive?.content?.endsWith("-android.apk") == true } ?: return@withContext null
        val sums = assets.firstOrNull { it["name"]?.jsonPrimitive?.content == "SHA256SUMS.txt" }
        Update(
            version, apk["browser_download_url"]!!.jsonPrimitive.content, apk["name"]!!.jsonPrimitive.content,
            sums?.get("browser_download_url")?.jsonPrimitive?.content, release["body"]?.jsonPrimitive?.content.orEmpty(),
        )
    }

    /** Downloads the package into [dir] and refuses it unless its SHA-256 matches the release's checksum list. */
    suspend fun download(update: Update, dir: File, progress: (Float) -> Unit): File = withContext(Dispatchers.IO) {
        val sumsUrl = update.sumsUrl ?: throw IllegalStateException("The release has no checksum list, so the download can't be checked.")
        val listing = client.newCall(Request.Builder().url(sumsUrl).header("User-Agent", "Jellyflix").build()).await().use { it.body?.string().orEmpty() }
        val expected = checksumFor(listing, update.apkName) ?: throw IllegalStateException("The release's checksum list doesn't include ${update.apkName}.")
        dir.deleteRecursively(); dir.mkdirs()
        val file = File(dir, update.apkName)
        val digest = MessageDigest.getInstance("SHA-256")
        client.newCall(Request.Builder().url(update.apkUrl).header("User-Agent", "Jellyflix").build()).await().use { r ->
            if (!r.isSuccessful) throw HttpError(r.code, "The download failed (${r.code}).")
            val total = r.body?.contentLength() ?: -1L
            var done = 0L
            r.body!!.byteStream().use { input ->
                file.outputStream().use { out ->
                    val buffer = ByteArray(64 * 1024)
                    while (true) {
                        val n = input.read(buffer)
                        if (n < 0) break
                        out.write(buffer, 0, n); digest.update(buffer, 0, n); done += n
                        if (total > 0) progress(done.toFloat() / total)
                    }
                }
            }
        }
        val actual = digest.digest().joinToString("") { "%02x".format(it) }
        if (actual != expected) { file.delete(); throw IllegalStateException("The download doesn't match its checksum, so it was thrown away.") }
        file
    }
}
