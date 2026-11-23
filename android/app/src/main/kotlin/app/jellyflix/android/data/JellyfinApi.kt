package app.jellyflix.android.data

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.net.URLEncoder

private fun enc(value: String) = URLEncoder.encode(value, "UTF-8").replace("+", "%20")

/** The calls the app makes once it is signed in: libraries, titles, My List, playback and picture addresses. */
class JellyfinApi(private val http: Http, val session: Session, private val capabilities: Capabilities) {
    private val s = session

    private suspend fun get(path: String): String = http.text(s.server, path, s.token)

    private suspend inline fun <reified T> fetch(path: String): T = JellyfinJson.decodeFromString<T>(get(path))

    /** Some routes moved between versions: try the current one, then the older spelling when a server doesn't know it (404/405). */
    private suspend inline fun <reified T> firstThatExists(vararg paths: String): T {
        var last: Exception? = null
        for (path in paths) {
            try { return fetch(path) } catch (e: HttpError) {
                last = e
                if (e.status != 404 && e.status != 405) throw e
            }
        }
        throw last ?: IllegalStateException("no route")
    }

    // ----- home -----
    suspend fun views(): List<Item> = firstThatExists<ItemsResponse>("/UserViews?userId=${s.userId}", "/Users/${s.userId}/Views").items
    suspend fun resume(): List<Item> = firstThatExists<ItemsResponse>(
        "/UserItems/Resume?userId=${s.userId}&Limit=20&MediaTypes=Video&Fields=$FIELDS",
        "/Users/${s.userId}/Items/Resume?Limit=20&MediaTypes=Video&Fields=$FIELDS",
    ).items
    suspend fun nextUp(): List<Item> = fetch<ItemsResponse>("/Shows/NextUp?UserId=${s.userId}&Limit=20&Fields=$FIELDS").items
    suspend fun latest(type: String): List<Item> = firstThatExists<List<Item>>(
        "/Items/Latest?userId=${s.userId}&Limit=20&IncludeItemTypes=$type&GroupItems=false&Fields=$FIELDS",
        "/Users/${s.userId}/Items/Latest?Limit=20&IncludeItemTypes=$type&GroupItems=false&Fields=$FIELDS",
    )

    // ----- browsing -----
    suspend fun items(q: Query): ItemsResponse = fetch("/Items?${itemsQuery(s.userId, q)}")
    suspend fun genres(types: List<String> = listOf("Movie", "Series")): List<String> {
        val response = get("/Genres?userId=${s.userId}&SortBy=SortName&SortOrder=Ascending&IncludeItemTypes=${types.joinToString(",")}")
        return JellyfinJson.parseToJsonElement(response).jsonObject["Items"]?.jsonArray?.mapNotNull { it.jsonObject["Name"]?.jsonPrimitive?.content }.orEmpty()
    }
    suspend fun search(term: String): List<Item> = items(Query(types = listOf("Movie", "Series"), search = term, limit = 60)).items

    // ----- one title -----
    suspend fun item(id: String): Item = firstThatExists("/Items/${enc(id)}?userId=${s.userId}", "/Users/${s.userId}/Items/${enc(id)}")
    suspend fun episodes(seriesId: String): List<Item> = fetch<ItemsResponse>("/Shows/${enc(seriesId)}/Episodes?UserId=${s.userId}&Fields=Overview,RunTimeTicks").items
    suspend fun similar(id: String): List<Item> = fetch<ItemsResponse>("/Items/${enc(id)}/Similar?UserId=${s.userId}&Limit=12").items

    // ----- My List and watched -----
    suspend fun setFavorite(id: String, on: Boolean) {
        try { http.text(s.server, "/UserFavoriteItems/${enc(id)}?userId=${s.userId}", s.token, if (on) "POST" else "DELETE") }
        catch (e: HttpError) {
            if (e.status != 404 && e.status != 405) throw e
            http.text(s.server, "/Users/${s.userId}/FavoriteItems/${enc(id)}", s.token, if (on) "POST" else "DELETE")
        }
    }
    suspend fun setPlayed(id: String, on: Boolean) {
        try { http.text(s.server, "/UserPlayedItems/${enc(id)}?userId=${s.userId}", s.token, if (on) "POST" else "DELETE") }
        catch (e: HttpError) {
            if (e.status != 404 && e.status != 405) throw e
            http.text(s.server, "/Users/${s.userId}/PlayedItems/${enc(id)}", s.token, if (on) "POST" else "DELETE")
        }
    }

    // ----- pictures -----
    private fun image(id: String, tag: String?, width: Int, type: String = "Primary") =
        "${s.server}/Items/${enc(id)}/Images/$type?maxWidth=$width" + (tag?.let { "&tag=${enc(it)}" } ?: "")

    fun poster(item: Item, width: Int = 400): String? {
        // Episode stills are 16:9, so on tall cards use the show's own poster instead.
        if (item.type == "Episode" && item.seriesId != null) return "${s.server}/Items/${enc(item.seriesId)}/Images/Primary?maxWidth=$width"
        return item.imageTags?.get("Primary")?.let { image(item.id, it, width) }
    }

    /** Wide 16:9 art for landscape tiles: Thumb, else Backdrop, else Primary. */
    fun thumb(item: Item, width: Int = 600): String? {
        item.imageTags?.get("Thumb")?.let { return image(item.id, it, width, "Thumb") }
        item.backdropImageTags?.firstOrNull()?.let { return image(item.id, it, width, "Backdrop") }
        val parent = item.parentBackdropItemId
        val parentTag = item.parentBackdropImageTags?.firstOrNull()
        if (parent != null && parentTag != null) return image(parent, parentTag, width, "Backdrop")
        return item.imageTags?.get("Primary")?.let { image(item.id, it, width) }
    }

    fun backdrop(item: Item, width: Int = 1920): String? {
        item.backdropImageTags?.firstOrNull()?.let { return image(item.id, it, width, "Backdrop") }
        item.seriesId?.let { return "${s.server}/Items/${enc(it)}/Images/Backdrop?maxWidth=$width" }
        return null
    }

    fun personImage(person: Person, width: Int = 240): String? = person.primaryImageTag?.let { image(person.id, it, width) }

    // ----- playback -----
    suspend fun segments(id: String): List<Segment> = try {
        val items = JellyfinJson.parseToJsonElement(get("/MediaSegments/${enc(id)}")).jsonObject["Items"]?.jsonArray ?: JsonArray(emptyList())
        items.map {
            val o: JsonObject = it.jsonObject
            Segment(o["Type"]?.jsonPrimitive?.content.orEmpty(), (o["StartTicks"]?.jsonPrimitive?.content?.toDoubleOrNull() ?: 0.0) / 1e7, (o["EndTicks"]?.jsonPrimitive?.content?.toDoubleOrNull() ?: 0.0) / 1e7)
        }
    } catch (e: Exception) { emptyList() }

    /** How to play a title: the file itself when this device can, otherwise the stream the server makes. */
    suspend fun playback(id: String, options: PlaybackOptions = PlaybackOptions()): Playback {
        val body = playbackRequest(s.userId, options, capabilities).toString()
        val info = JellyfinJson.decodeFromString<PlaybackInfoResponse>(http.text(s.server, "/Items/${enc(id)}/PlaybackInfo", s.token, "POST", body))
        planPlayback(s.server, s.token, http.deviceId, id, info, options)?.let { return it }
        // An older server that gives no stream address: ask for HLS the long way.
        val source = info.mediaSources?.firstOrNull() ?: throw IllegalStateException("The server has nothing to play for this title.")
        val params = linkedMapOf(
            "MediaSourceId" to source.id, "PlaySessionId" to info.playSessionId.orEmpty(), "ApiKey" to s.token, "DeviceId" to http.deviceId,
            "VideoCodec" to "h264", "AudioCodec" to "aac,mp3", "TranscodingMaxAudioChannels" to "2", "SegmentContainer" to "ts",
        )
        options.audio?.let { params["AudioStreamIndex"] = it.toString() }
        options.subtitle?.let { params["SubtitleStreamIndex"] = it.toString(); params["SubtitleMethod"] = "Encode" }
        options.bitrate?.let { params["VideoBitRate"] = it.toString(); params["MaxStreamingBitrate"] = (it + 192_000).toString() }
        val url = "${s.server}/Videos/${enc(id)}/master.m3u8?" + params.entries.joinToString("&") { "${enc(it.key)}=${enc(it.value)}" }
        return Playback(info.playSessionId.orEmpty(), source, url, hls = true, method = "Transcode", asked = options)
    }

    /** Tells Jellyfin what is playing and how far in, so Continue Watching stays right. */
    suspend fun report(kind: String, id: String, playback: Playback, positionMs: Long, paused: Boolean) {
        val body = Json.encodeToString(JsonObject.serializer(), kotlinx.serialization.json.buildJsonObject {
            put("ItemId", kotlinx.serialization.json.JsonPrimitive(id))
            put("MediaSourceId", kotlinx.serialization.json.JsonPrimitive(playback.source.id))
            put("PlaySessionId", kotlinx.serialization.json.JsonPrimitive(playback.playSessionId))
            put("PositionTicks", kotlinx.serialization.json.JsonPrimitive(positionMs * 10_000))
            put("IsPaused", kotlinx.serialization.json.JsonPrimitive(paused))
            put("PlayMethod", kotlinx.serialization.json.JsonPrimitive(playback.method))
        })
        try { http.text(s.server, "/Sessions/Playing" + (if (kind == "Playing") "" else "/$kind"), s.token, "POST", body) } catch (e: Exception) { /* reports are best effort */ }
    }
}
