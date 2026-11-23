package app.jellyflix.android.ui

import android.view.WindowManager
import androidx.activity.compose.BackHandler
import androidx.annotation.OptIn
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.unit.dp
import androidx.compose.ui.graphics.Color
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import app.jellyflix.android.data.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** Plays one title with the system player controls, keeping Jellyfin told how far along it is. */
@OptIn(UnstableApi::class)
@Composable
fun PlayerScreen(api: JellyfinApi, item: Item, onExit: () -> Unit) {
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
            else -> Video(api, item, current, onFallback = { if (options.direct) options = options.copy(direct = false) else failure = it }, onExit = onExit)
        }
    }
}

@OptIn(UnstableApi::class, kotlinx.coroutines.DelicateCoroutinesApi::class)
@Composable
private fun Video(api: JellyfinApi, item: Item, plan: Playback, onFallback: (String) -> Unit, onExit: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val player = remember(plan.url) { ExoPlayer.Builder(context).build() }
    val start = remember(item.id) { (item.userData?.playbackPositionTicks ?: 0L) / 10_000 }

    DisposableEffect(player) {
        player.setMediaItem(MediaItem.fromUri(plan.url), if (plan.method == "DirectPlay" || start > 0) start else 0L)
        player.prepare()
        player.playWhenReady = true
        val listener = object : Player.Listener {
            override fun onPlayerError(error: PlaybackException) { onFallback(error.message ?: "This file can't be played here.") }
            override fun onPlaybackStateChanged(state: Int) { if (state == Player.STATE_ENDED) onExit() }
        }
        player.addListener(listener)
        scope.launch { api.report("Playing", item.id, plan, start, false) }
        onDispose {
            val position = player.currentPosition
            val paused = !player.playWhenReady
            player.removeListener(listener)
            player.release()
            // The screen is leaving, so its own scope is cancelled: send the final report from the app's context.
            kotlinx.coroutines.GlobalScope.launch { api.report("Stopped", item.id, plan, position, paused) }
        }
    }
    LaunchedEffect(player) {
        while (true) { delay(10_000); api.report("Progress", item.id, plan, player.currentPosition, !player.playWhenReady) }
    }
    AndroidView(factory = { PlayerView(it).apply { this.player = player; useController = true; setShowBuffering(PlayerView.SHOW_BUFFERING_WHEN_PLAYING) } }, modifier = Modifier.fillMaxSize())
}
