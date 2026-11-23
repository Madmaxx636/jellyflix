package app.jellyflix.android.data

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNamingStrategy

/** Jellyfin writes its fields in UpperCamelCase; the properties here are lowerCamelCase and are mapped to that. */
@OptIn(ExperimentalSerializationApi::class)
val JellyfinJson = Json {
    ignoreUnknownKeys = true
    explicitNulls = false
    coerceInputValues = true
    namingStrategy = JsonNamingStrategy { _, _, name -> name.replaceFirstChar { it.uppercaseChar() } }
}

@Serializable
data class Session(val server: String, val token: String, val userId: String, val userName: String, val avatarTag: String? = null)

@Serializable
data class Person(val name: String = "", val id: String = "", val role: String? = null, val type: String? = null, val primaryImageTag: String? = null)

@Serializable
data class UserData(val playbackPositionTicks: Long? = null, val playedPercentage: Double? = null, val played: Boolean? = null, val isFavorite: Boolean? = null)

@Serializable
data class MediaStream(
    val index: Int = 0,
    val type: String = "",
    val codec: String? = null,
    val language: String? = null,
    val displayTitle: String? = null,
    val isDefault: Boolean? = null,
    val isForced: Boolean? = null,
    val isTextSubtitleStream: Boolean? = null,
)

@Serializable
data class MediaSource(
    val id: String = "",
    val eTag: String? = null,
    val container: String? = null,
    val runTimeTicks: Long? = null,
    val mediaStreams: List<MediaStream>? = null,
    val defaultAudioStreamIndex: Int? = null,
    val supportsDirectPlay: Boolean? = null,
    val supportsDirectStream: Boolean? = null,
    val supportsTranscoding: Boolean? = null,
    /** A server-made address for the converted stream, relative to the server. */
    val transcodingUrl: String? = null,
    val transcodingSubProtocol: String? = null,
)

/** A title, an episode, a library, a person… Jellyfin calls them all items. */
@Serializable
data class Item(
    val id: String,
    val name: String = "",
    val type: String = "",
    val overview: String? = null,
    val productionYear: Int? = null,
    val officialRating: String? = null,
    val runTimeTicks: Long? = null,
    val communityRating: Double? = null,
    val genres: List<String>? = null,
    val taglines: List<String>? = null,
    val people: List<Person>? = null,
    val collectionType: String? = null,
    val seriesId: String? = null,
    val seriesName: String? = null,
    val parentIndexNumber: Int? = null,
    val indexNumber: Int? = null,
    val imageTags: Map<String, String>? = null,
    val backdropImageTags: List<String>? = null,
    val parentBackdropItemId: String? = null,
    val parentBackdropImageTags: List<String>? = null,
    val userData: UserData? = null,
    val mediaSources: List<MediaSource>? = null,
)

@Serializable
data class ItemsResponse(val items: List<Item> = emptyList(), val totalRecordCount: Int? = null)

@Serializable
data class PublicInfo(val serverName: String? = null, val version: String? = null, val productName: String? = null)

@Serializable
data class PublicUser(val id: String = "", val name: String = "", val primaryImageTag: String? = null)

@Serializable
data class AuthUser(val id: String, val name: String, val primaryImageTag: String? = null)

@Serializable
data class AuthResult(val accessToken: String, val user: AuthUser)

@Serializable
data class PlaybackInfoResponse(val mediaSources: List<MediaSource>? = null, val playSessionId: String? = null, val errorCode: String? = null)

/** A stretch of a video that can be skipped (intro, credits…), in seconds. */
data class Segment(val type: String, val start: Double, val end: Double)

/** What the app asks the server for when it starts or changes a stream. */
data class PlaybackOptions(val audio: Int? = null, val subtitle: Int? = null, val bitrate: Int? = null, val direct: Boolean = true)

/** How one title will be played: the address for the player, and what the server is doing for it. */
data class Playback(
    val playSessionId: String,
    val source: MediaSource,
    val url: String,
    val hls: Boolean,
    val method: String,
    val asked: PlaybackOptions,
)

data class Query(
    val parentId: String? = null,
    val types: List<String> = emptyList(),
    val genres: List<String> = emptyList(),
    val filters: List<String> = emptyList(),
    val sortBy: String? = null,
    val sortOrder: String = "Ascending",
    val start: Int = 0,
    val limit: Int? = null,
    val search: String? = null,
    val personId: String? = null,
)

class HttpError(val status: Int, message: String, val detail: String = "") : Exception(message)
