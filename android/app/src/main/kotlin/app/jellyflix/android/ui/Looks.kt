package app.jellyflix.android.ui

import androidx.compose.ui.graphics.Color

/** One of the four looks. The same app, dressed like the service it imitates. */
data class Look(
    val id: String,
    val label: String,
    val accent: Color,
    val background: Color,
    val surface: Color,
    /** Wide tiles instead of tall posters in rows. */
    val landscape: Boolean,
    val corner: Int,
    val continueTitle: String,
    /** Section titles and the nav in capitals (HBO). */
    val caps: Boolean = false,
    /** Round pill buttons (Hulu, Disney+) or square ones. */
    val pill: Boolean = false,
)

val Looks = listOf(
    Look("netflix", "Netflix", Color(0xFFE50914), Color(0xFF141414), Color(0xFF232323), false, 4, "Continue Watching", caps = false),
    Look("hulu", "Hulu", Color(0xFF1CE783), Color(0xFF0B0C0F), Color(0xFF1B1D22), true, 10, "Keep Watching", pill = true),
    Look("hbo", "HBO", Color(0xFF8B5CF6), Color(0xFF000000), Color(0xFF16161A), true, 2, "Continue Watching", caps = true),
    Look("disney", "Disney+", Color(0xFF2BBCFF), Color(0xFF0A0F2E), Color(0xFF16204F), false, 14, "Continue Watching", pill = true),
)

fun lookById(id: String): Look = Looks.firstOrNull { it.id == id } ?: Looks.first()
