package app.jellyflix.android.data

import android.content.Context
import java.util.UUID

/** What the app remembers between launches: which device it is, who is signed in, and the chosen look. */
class Store(context: Context) {
    private val prefs = context.getSharedPreferences("jellyflix", Context.MODE_PRIVATE)

    val deviceId: String
        get() = prefs.getString("deviceId", null) ?: UUID.randomUUID().toString().also { prefs.edit().putString("deviceId", it).apply() }

    var session: Session?
        get() = prefs.getString("session", null)?.let { try { JellyfinJson.decodeFromString<Session>(it) } catch (e: Exception) { null } }
        set(value) { prefs.edit().apply { if (value == null) remove("session") else putString("session", JellyfinJson.encodeToString(Session.serializer(), value)) }.apply() }

    var look: String
        get() = prefs.getString("look", "netflix") ?: "netflix"
        set(value) { prefs.edit().putString("look", value).apply() }

    var lastServer: String
        get() = prefs.getString("lastServer", "") ?: ""
        set(value) { prefs.edit().putString("lastServer", value).apply() }
}
