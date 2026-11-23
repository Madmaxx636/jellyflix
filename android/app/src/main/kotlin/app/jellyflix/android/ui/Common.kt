package app.jellyflix.android.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/** Clickable, and shows a ring when focused with a remote's D-pad, so TV users can see where they are. */
@Composable
fun Modifier.focusRing(look: Look, onClick: () -> Unit): Modifier {
    val source = remember { MutableInteractionSource() }
    val focused by source.collectIsFocusedAsState()
    val shape = RoundedCornerShape(look.corner.dp)
    return this
        .clip(shape)
        .border(BorderStroke(if (focused) 3.dp else 0.dp, if (focused) Color.White else Color.Transparent), shape)
        .clickable(interactionSource = source, indication = null, onClick = onClick)
}

@Composable
fun Message(text: String, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().padding(24.dp)) { Text(text, color = Color(0xFFB3B3B3), style = MaterialTheme.typography.bodyMedium) }
}

fun minutes(ticks: Long?): String? = ticks?.let { val m = (it / 600_000_000L).toInt(); if (m >= 60) "${m / 60}h ${m % 60}m" else "${m}m" }
