package app.jellyflix.android.ui

import android.view.WindowManager
import androidx.activity.compose.BackHandler
import androidx.annotation.OptIn
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.*
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import app.jellyflix.android.data.*
import kotlinx.coroutines.DelicateCoroutinesApi
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.Locale

/** Plays one title and keeps Jellyfin told how far along it is. */
@Composable
fun PlayerScreen(api: JellyfinApi, look: Look, item: Item, onExit: () -> Unit) {
    val context = LocalContext.current
    var options by remember { mutableStateOf(PlaybackOptions()) }
    var failure by remember { mutableStateOf<String?>(null) }
    var plan by remember { mutableStateOf<Playback?>(null) }
    var attempt by remember { mutableIntStateOf(0) }

    LaunchedEffect(item.id, options, attempt) {
        failure = null
        try { plan = api.playback(item.id, options) } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { failure = e.message ?: "Couldn't start playback." }
    }

    DisposableEffect(Unit) {
        val window = (context as? android.app.Activity)?.window
        window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        onDispose { window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }
    }
    BackHandler(onBack = onExit)

    val current = plan
    Box(Modifier.fillMaxSize().background(Color.Black), Alignment.Center) {
        when {
            failure != null -> Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(failure!!, color = Color.White, modifier = Modifier.padding(24.dp))
                Button(onClick = { attempt++ }) { Text("Try again") }
                Spacer(Modifier.height(8.dp))
                Button(onClick = onExit) { Text("Back") }
            }
            current == null -> CircularProgressIndicator()
            else -> Video(api, look, item, current, onFallback = { if (options.direct) options = options.copy(direct = false) else failure = it }, onExit = onExit)
        }
    }
}

private const val JUMP_MS = 10_000L

@OptIn(UnstableApi::class, DelicateCoroutinesApi::class)
@Composable
private fun Video(api: JellyfinApi, look: Look, item: Item, plan: Playback, onFallback: (String) -> Unit, onExit: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val player = remember(plan.url) { ExoPlayer.Builder(context).build() }
    val start = remember(item.id) { (item.userData?.playbackPositionTicks ?: 0L) / 10_000 }

    var visible by remember { mutableStateOf(true) }
    var activity by remember { mutableIntStateOf(0) }
    var position by remember { mutableLongStateOf(start) }
    var duration by remember { mutableLongStateOf(0L) }
    var buffered by remember { mutableLongStateOf(0L) }
    var playing by remember { mutableStateOf(true) }
    var buffering by remember { mutableStateOf(true) }
    var tracksVersion by remember { mutableIntStateOf(0) }
    var menu by remember { mutableStateOf(false) }
    var segments by remember { mutableStateOf<List<Segment>>(emptyList()) }
    val rootFocus = remember { FocusRequester() }
    val playFocus = remember { FocusRequester() }

    DisposableEffect(player) {
        player.setMediaItem(MediaItem.fromUri(plan.url), start)
        player.prepare()
        player.playWhenReady = true
        val listener = object : Player.Listener {
            override fun onPlayerError(error: PlaybackException) { onFallback(error.message ?: "This file can't be played here.") }
            override fun onPlaybackStateChanged(state: Int) {
                buffering = state == Player.STATE_BUFFERING
                if (state == Player.STATE_ENDED) onExit()
            }
            override fun onTracksChanged(tracks: androidx.media3.common.Tracks) { tracksVersion++ }
        }
        player.addListener(listener)
        scope.launch { api.report("Playing", item.id, plan, start, false) }
        onDispose {
            val last = player.currentPosition
            val paused = !player.playWhenReady
            player.removeListener(listener)
            player.release()
            // This screen's own scope is cancelled as it leaves, so the final report goes out on the global one.
            GlobalScope.launch { api.report("Stopped", item.id, plan, last, paused) }
        }
    }
    LaunchedEffect(item.id) { segments = api.segments(item.id) }
    LaunchedEffect(player) {
        while (true) {
            position = player.currentPosition
            duration = player.duration.coerceAtLeast(0L)
            buffered = player.bufferedPosition
            playing = player.playWhenReady
            delay(500)
        }
    }
    LaunchedEffect(player) {
        while (true) { delay(10_000); api.report("Progress", item.id, plan, player.currentPosition, !player.playWhenReady) }
    }
    // Controls fade away a few seconds after the last touch or key press, while playing.
    LaunchedEffect(visible, playing, activity, menu) {
        if (visible && playing && !menu) { delay(4500); visible = false }
    }
    LaunchedEffect(visible) {
        try { if (visible) playFocus.requestFocus() else rootFocus.requestFocus() } catch (e: Exception) { /* not on screen yet */ }
    }
    BackHandler(enabled = menu || visible) { if (menu) menu = false else visible = false }

    fun seek(to: Long) { player.seekTo(to.coerceIn(0L, if (duration > 0) duration else Long.MAX_VALUE)); position = player.currentPosition; activity++ }
    fun toggle() { player.playWhenReady = !player.playWhenReady; playing = player.playWhenReady; activity++ }

    Box(
        Modifier.fillMaxSize()
            .focusRequester(rootFocus)
            .onPreviewKeyEvent { e ->
                if (e.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
                activity++
                if (!visible && !menu) {
                    when (e.key) {
                        Key.DirectionLeft -> { seek(position - JUMP_MS); visible = true; true }
                        Key.DirectionRight -> { seek(position + JUMP_MS); visible = true; true }
                        Key.DirectionUp, Key.DirectionDown -> { visible = true; true }
                        Key.MediaPlayPause -> { toggle(); visible = true; true }
                        else -> false
                    }
                } else if (e.key == Key.MediaPlayPause) { toggle(); true }
                else if (e.key == Key.MediaFastForward) { seek(position + 30_000L); true }
                else if (e.key == Key.MediaRewind) { seek(position - 30_000L); true }
                else false
            }
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) { visible = !visible; activity++ },
    ) {
        AndroidView(
            factory = { PlayerView(it).apply { this.player = player; useController = false; resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT } },
            modifier = Modifier.fillMaxSize(),
        )
        if (buffering) CircularProgressIndicator(Modifier.align(Alignment.Center), color = look.accent)

        val inSegment = segments.firstOrNull { (it.type == "Intro" || it.type == "Outro") && position / 1000.0 >= it.start && position / 1000.0 < it.end - 1 }
        if (inSegment != null) {
            Box(Modifier.align(Alignment.BottomEnd).padding(end = 24.dp, bottom = if (visible) 140.dp else 32.dp)) {
                Button(onClick = { seek((inSegment.end * 1000).toLong()) }, shape = look.buttonShape(), colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color.Black)) {
                    Text(if (inSegment.type == "Intro") "Skip intro" else "Skip credits")
                }
            }
        }

        if (visible) {
            Box(Modifier.fillMaxWidth().align(Alignment.TopCenter).background(Brush.verticalGradient(listOf(Color(0xCC000000), Color.Transparent)))) {
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    ControlButton(look, "‹ Back") { onExit() }
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text((if (item.type == "Episode") item.seriesName ?: item.name else item.name).styled(look), maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.titleMedium)
                        if (item.type == "Episode") Text("S${item.parentIndexNumber ?: 0} E${item.indexNumber ?: 0}  ${item.name}", color = Color(0xFFCCCCCC), maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            Column(Modifier.fillMaxWidth().align(Alignment.BottomCenter).background(Brush.verticalGradient(listOf(Color.Transparent, Color(0xDD000000)))).padding(horizontal = 24.dp, vertical = 12.dp)) {
                SeekBar(look, position, duration, buffered, ::seek)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(clock(position), style = MaterialTheme.typography.bodySmall)
                    Text("-" + clock((duration - position).coerceAtLeast(0)), style = MaterialTheme.typography.bodySmall)
                }
                Row(Modifier.fillMaxWidth().padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically) {
                    ControlButton(look, "−10") { seek(position - JUMP_MS) }
                    ControlButton(look, if (playing) "Pause" else "Play", Modifier.focusRequester(playFocus), accent = true) { toggle() }
                    ControlButton(look, "+10") { seek(position + JUMP_MS) }
                    ControlButton(look, "Audio & subtitles") { menu = true }
                }
            }
        }
    }

    if (menu) {
        val audio = remember(tracksVersion, menu) { choices(player, C.TRACK_TYPE_AUDIO, null) }
        val text = remember(tracksVersion, menu) { choices(player, C.TRACK_TYPE_TEXT, "Off") }
        AlertDialog(
            onDismissRequest = { menu = false },
            confirmButton = { TextButton(onClick = { menu = false }) { Text("Done") } },
            title = { Text("Audio & subtitles") },
            text = {
                Column(Modifier.verticalScroll(rememberScrollState())) {
                    if (audio.size > 1) { Text("Audio", color = look.accent, style = MaterialTheme.typography.labelLarge); audio.forEach { ChoiceRow(look, it) } }
                    Spacer(Modifier.height(10.dp))
                    Text("Subtitles", color = look.accent, style = MaterialTheme.typography.labelLarge)
                    if (text.size > 1) text.forEach { ChoiceRow(look, it) } else Text("None in this file.", color = Color(0xFFB3B3B3), style = MaterialTheme.typography.bodySmall)
                }
            },
        )
    }
}

@Composable
private fun ChoiceRow(look: Look, c: Choice) {
    Text((if (c.selected) "✓  " else "     ") + c.label, Modifier.fillMaxWidth().focusRing(look) { c.pick() }.padding(horizontal = 10.dp, vertical = 10.dp), color = if (c.selected) look.accent else Color.White)
}

@Composable
private fun ControlButton(look: Look, label: String, modifier: Modifier = Modifier, accent: Boolean = false, onClick: () -> Unit) {
    Text(
        label.styled(look), modifier.background(if (accent) look.accent else Color(0x44FFFFFF), look.buttonShape()).focusRing(look, onClick).padding(horizontal = 16.dp, vertical = 10.dp),
        color = Color.White, style = MaterialTheme.typography.titleSmall,
    )
}

private fun Look.buttonShape() = if (pill) RoundedCornerShape(50) else RoundedCornerShape(corner.dp)

@Composable
private fun SeekBar(look: Look, position: Long, duration: Long, buffered: Long, onSeek: (Long) -> Unit) {
    val source = remember { MutableInteractionSource() }
    val focused by source.collectIsFocusedAsState()
    var width by remember { mutableIntStateOf(1) }
    fun frac(v: Long) = if (duration > 0) (v.toFloat() / duration).coerceIn(0f, 1f) else 0f
    Box(
        Modifier.fillMaxWidth().height(28.dp)
            .onSizeChanged { width = it.width.coerceAtLeast(1) }
            .focusable(interactionSource = source)
            .onKeyEvent { e ->
                if (e.type == KeyEventType.KeyDown && duration > 0) when (e.key) {
                    Key.DirectionLeft -> { onSeek(position - JUMP_MS); true }
                    Key.DirectionRight -> { onSeek(position + JUMP_MS); true }
                    else -> false
                } else false
            }
            .pointerInput(duration) { detectTapGestures(onTap = { o -> if (duration > 0) onSeek((o.x / width * duration).toLong()) }) }
            .pointerInput(duration) { detectHorizontalDragGestures { change, _ -> if (duration > 0) onSeek((change.position.x / width * duration).toLong()) } },
        contentAlignment = Alignment.CenterStart,
    ) {
        val h = if (focused) 8.dp else 4.dp
        Box(Modifier.fillMaxWidth().height(h).background(Color(0x40FFFFFF), RoundedCornerShape(4.dp)))
        Box(Modifier.fillMaxWidth(frac(buffered)).height(h).background(Color(0x66FFFFFF), RoundedCornerShape(4.dp)))
        Box(Modifier.fillMaxWidth(frac(position)).height(h).background(look.accent, RoundedCornerShape(4.dp)))
    }
}

private data class Choice(val label: String, val selected: Boolean, val pick: () -> Unit)

@OptIn(UnstableApi::class)
private fun choices(player: ExoPlayer, type: Int, offLabel: String?): List<Choice> {
    val out = mutableListOf<Choice>()
    val disabled = type in player.trackSelectionParameters.disabledTrackTypes
    if (offLabel != null) out += Choice(offLabel, disabled) {
        player.trackSelectionParameters = player.trackSelectionParameters.buildUpon().setTrackTypeDisabled(type, true).build()
    }
    for (group in player.currentTracks.groups.filter { it.type == type }) {
        for (i in 0 until group.length) {
            if (!group.isTrackSupported(i)) continue
            val f = group.getTrackFormat(i)
            val name = f.label ?: f.language?.let { Locale.forLanguageTag(it).displayLanguage.takeIf { l -> l.isNotBlank() } } ?: "Track ${out.size + 1}"
            val label = if (type == C.TRACK_TYPE_AUDIO && f.channelCount > 0) "$name (${f.channelCount}ch)" else name
            out += Choice(label, !disabled && group.isTrackSelected(i)) {
                player.trackSelectionParameters = player.trackSelectionParameters.buildUpon()
                    .setTrackTypeDisabled(type, false).setOverrideForType(TrackSelectionOverride(group.mediaTrackGroup, i)).build()
            }
        }
    }
    return out
}

private fun clock(ms: Long): String {
    val s = (ms / 1000).coerceAtLeast(0)
    return if (s >= 3600) "%d:%02d:%02d".format(s / 3600, s / 60 % 60, s % 60) else "%d:%02d".format(s / 60, s % 60)
}
