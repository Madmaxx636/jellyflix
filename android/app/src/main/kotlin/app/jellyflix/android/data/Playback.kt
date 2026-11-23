package app.jellyflix.android.data

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.net.URLEncoder

/** What this device's decoders can do, so the server only converts what it must. */
data class Capabilities(
    val hevc: Boolean = false,
    val av1: Boolean = false,
    val vp9: Boolean = true,
    val ac3: Boolean = false,
    val eac3: Boolean = false,
    val dts: Boolean = false,
)

private fun list(vararg values: String?) = values.filterNotNull().joinToString(",")

private fun profile(vararg fields: Pair<String, JsonElement>) = JsonObject(mapOf(*fields))
private fun text(value: String) = JsonPrimitive(value)

/** The device profile: what the Media3 player in this app can play as it is. Anything else the server converts. */
fun deviceProfile(c: Capabilities): JsonObject {
    val video = list("h264", if (c.hevc) "hevc" else null, if (c.vp9) "vp9" else null, if (c.av1) "av1" else null)
    val audio = list("aac", "mp3", "opus", "flac", "vorbis", if (c.ac3) "ac3" else null, if (c.eac3) "eac3" else null, if (c.dts) "dts" else null)
    return buildJsonObject {
        put("Name", "Jellyflix Android")
        put("MaxStreamingBitrate", 120_000_000)
        put("MaxStaticBitrate", 100_000_000)
        put("MusicStreamingTranscodingBitrate", 192_000)
        put("DirectPlayProfiles", buildJsonArray {
            add(profile("Container" to text("mp4,m4v,mov,mkv,webm,ts"), "Type" to text("Video"), "VideoCodec" to text(video), "AudioCodec" to text(audio)))
        })
        put("TranscodingProfiles", buildJsonArray {
            add(profile(
                "Container" to text("ts"), "Type" to text("Video"), "AudioCodec" to text(list("aac", "mp3", if (c.ac3) "ac3" else null)),
                "VideoCodec" to text(list("h264", if (c.hevc) "hevc" else null)), "Context" to text("Streaming"), "Protocol" to text("hls"),
                "MaxAudioChannels" to text("6"), "MinSegments" to text("1"), "BreakOnNonKeyFrames" to JsonPrimitive(true),
            ))
        })
        put("CodecProfiles", JsonArray(emptyList()))
        put("ContainerProfiles", JsonArray(emptyList()))
        put("SubtitleProfiles", buildJsonArray {
            for (format in listOf("vtt", "srt", "subrip", "ass", "ssa")) add(profile("Format" to text(format), "Method" to text("External")))
            for (format in listOf("pgssub", "dvdsub", "dvbsub")) add(profile("Format" to text(format), "Method" to text("Embed")))
        })
    }
}

/** The body of the PlaybackInfo request. */
fun playbackRequest(userId: String, o: PlaybackOptions, c: Capabilities): JsonObject = buildJsonObject {
    put("UserId", userId)
    put("DeviceProfile", deviceProfile(c))
    if (o.bitrate != null) put("MaxStreamingBitrate", o.bitrate + 192_000)
    if (o.audio != null) put("AudioStreamIndex", o.audio)
    if (o.subtitle != null) put("SubtitleStreamIndex", o.subtitle)
    put("EnableDirectPlay", o.direct && o.bitrate == null && o.subtitle == null)
    put("EnableDirectStream", o.direct)
    put("EnableTranscoding", true)
    put("AllowVideoStreamCopy", true)
    put("AllowAudioStreamCopy", true)
    put("AutoOpenLiveStream", false)
}

private val REFUSALS = mapOf(
    "NotAllowed" to "This account isn't allowed to play this title.",
    "NoCompatibleStream" to "The server can't make a stream from this file that this device can play.",
    "RateLimitExceeded" to "Too many streams are playing on this account.",
)

private fun enc(value: String) = URLEncoder.encode(value, "UTF-8").replace("+", "%20")

/**
 * Turns the server's answer into something to play. Null when the server gave no stream address and the file can't be played
 * as it is (an older server): the caller then asks for HLS the long way.
 */
fun planPlayback(server: String, token: String, deviceId: String, id: String, info: PlaybackInfoResponse, asked: PlaybackOptions): Playback? {
    val source = info.mediaSources?.firstOrNull()
        ?: throw IllegalStateException(info.errorCode?.let { REFUSALS[it] ?: "The server would not play this ($it)." } ?: "The server has nothing to play for this title.")
    val sessionId = info.playSessionId.orEmpty()
    val key = "ApiKey=${enc(token)}"

    if (source.supportsDirectPlay == true && asked.direct && asked.bitrate == null && asked.subtitle == null) {
        val tag = source.eTag?.let { "&Tag=${enc(it)}" }.orEmpty()
        val url = "$server/Videos/${enc(id)}/stream?static=true&MediaSourceId=${enc(source.id)}&PlaySessionId=${enc(sessionId)}&DeviceId=${enc(deviceId)}$tag&$key"
        return Playback(sessionId, source, url, hls = false, method = "DirectPlay", asked = asked)
    }
    val transcoding = source.transcodingUrl
    if (transcoding != null) {
        var url = if (Regex("^https?:", RegexOption.IGNORE_CASE).containsMatchIn(transcoding)) transcoding else server + (if (transcoding.startsWith("/")) "" else "/") + transcoding
        if (!Regex("[?&](ApiKey|api_key)=", RegexOption.IGNORE_CASE).containsMatchIn(url)) url += (if (url.contains("?")) "&" else "?") + key
        val hls = source.transcodingSubProtocol == "hls" || Regex("\\.m3u8(\\?|$)", RegexOption.IGNORE_CASE).containsMatchIn(url)
        return Playback(sessionId, source, url, hls, if (source.supportsDirectStream == true) "DirectStream" else "Transcode", asked)
    }
    return null
}
