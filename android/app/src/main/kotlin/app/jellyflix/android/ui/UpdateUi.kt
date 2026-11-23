package app.jellyflix.android.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import app.jellyflix.android.BuildConfig
import app.jellyflix.android.JellyflixApp
import app.jellyflix.android.data.Update
import app.jellyflix.android.data.Updater
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import java.io.File

/** What the update banner and the Settings button show: a newer release, a download under way, or a problem. */
class UpdateModel(private val app: JellyflixApp, private val scope: CoroutineScope) {
    private val updater = Updater(app.http.client)
    var available by mutableStateOf<Update?>(null)
    var progress by mutableStateOf<Float?>(null)
    var error by mutableStateOf<String?>(null)
    var message by mutableStateOf<String?>(null)
    var hidden by mutableStateOf(false)

    suspend fun check(manual: Boolean) {
        try {
            val found = updater.latest(BuildConfig.VERSION_NAME)
            if (found?.version != available?.version) hidden = false
            available = found
            if (manual) message = if (found == null) "You have the latest version (${BuildConfig.VERSION_NAME})." else "Version ${found.version} is available."
        } catch (e: CancellationException) { throw e } catch (e: Exception) {
            if (manual) message = "Couldn't check for updates: ${e.message ?: "no answer"}"
        }
    }

    fun checkNow() { scope.launch { check(true) } }

    fun install(context: Context) {
        val update = available ?: return
        if (progress != null) return
        if (!context.packageManager.canRequestPackageInstalls()) {
            error = "Allow Jellyflix to install apps, then tap Update again."
            context.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            return
        }
        error = null; progress = 0f
        scope.launch {
            try {
                val file = updater.download(update, File(context.cacheDir, "updates")) { progress = it }
                val uri = FileProvider.getUriForFile(context, "${context.packageName}.files", file)
                context.startActivity(
                    Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive")
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK),
                )
            } catch (e: CancellationException) { throw e } catch (e: Exception) { error = e.message ?: "The update failed." }
            progress = null
        }
    }
}

@Composable
fun UpdateBanner(look: Look, model: UpdateModel) {
    val update = model.available ?: return
    if (model.hidden) return
    val context = LocalContext.current
    Row(Modifier.fillMaxWidth().background(look.surface).padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        val p = model.progress
        Column(Modifier.weight(1f)) {
            Text(if (p != null) "Downloading version ${update.version}…" else "Version ${update.version} is available", style = MaterialTheme.typography.bodyMedium)
            model.error?.let { Text(it, color = Color(0xFFFF6B6B), style = MaterialTheme.typography.bodySmall) }
            if (p != null) LinearProgressIndicator(progress = { p }, Modifier.fillMaxWidth().padding(top = 4.dp), color = look.accent)
        }
        if (p == null) {
            Button(onClick = { model.install(context) }, colors = ButtonDefaults.buttonColors(containerColor = look.accent, contentColor = Color.White)) { Text("Update") }
            TextButton(onClick = { model.hidden = true }) { Text("Later") }
        }
    }
}
