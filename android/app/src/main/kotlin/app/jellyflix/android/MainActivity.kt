package app.jellyflix.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import app.jellyflix.android.data.Item
import app.jellyflix.android.data.JellyfinApi
import app.jellyflix.android.data.Session
import app.jellyflix.android.ui.*

sealed interface Route {
    data object Home : Route
    data object Search : Route
    data object Settings : Route
    data class Library(val item: Item) : Route
    data class Details(val id: String) : Route
    data class Play(val item: Item) : Route
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val app = application as JellyflixApp
        setContent { Root(app) }
    }
}

@Composable
private fun Root(app: JellyflixApp) {
    var session by remember { mutableStateOf(app.store.session) }
    var look by remember { mutableStateOf(lookById(app.store.look)) }
    val tv = remember { isTv(app) }
    val stack = remember { mutableStateListOf<Route>(Route.Home) }

    DisposableEffect(Unit) {
        app.http.onUnauthorized = { session = null; app.store.session = null }
        onDispose { app.http.onUnauthorized = null }
    }

    val colors = darkColorScheme(primary = look.accent, background = look.background, surface = look.background, onBackground = Color.White, onSurface = Color.White)
    CompositionLocalProvider(LocalTv provides tv) { MaterialTheme(colorScheme = colors) {
        Surface(Modifier.fillMaxSize(), color = look.background) {
            val s = session
            if (s == null) {
                LoginScreen(app, look) { app.store.session = it; session = it; stack.clear(); stack.add(Route.Home) }
            } else {
                val api = remember(s) { JellyfinApi(app.http, s, app.capabilities) }
                val route = stack.last()
                BackHandler(enabled = stack.size > 1) { stack.removeAt(stack.lastIndex) }
                val open: (Item) -> Unit = { stack.add(Route.Details(it.id)) }
                if (route is Route.Play) {
                    PlayerScreen(api, route.item) { stack.removeAt(stack.lastIndex) }
                } else {
                    Scaffold(
                        containerColor = look.background,
                        topBar = { if (tv) TvNav(look, route, stack) },
                        bottomBar = {
                            if (!tv) NavigationBar(containerColor = look.surface) {
                                NavigationBarItem(route is Route.Home, { stack.clear(); stack.add(Route.Home) }, { Icon(Icons.Default.Home, "Home") }, label = { Text("Home") })
                                NavigationBarItem(route is Route.Search, { stack.clear(); stack.add(Route.Home); stack.add(Route.Search) }, { Icon(Icons.Default.Search, "Search") }, label = { Text("Search") })
                                NavigationBarItem(route is Route.Settings, { stack.clear(); stack.add(Route.Home); stack.add(Route.Settings) }, { Icon(Icons.Default.Settings, "Settings") }, label = { Text("Settings") })
                            }
                        },
                    ) { padding ->
                        Box(Modifier.padding(padding).fillMaxSize()) {
                            when (route) {
                                Route.Home -> HomeScreen(api, look, open) { stack.add(Route.Library(it)) }
                                Route.Search -> SearchScreen(api, look, open)
                                Route.Settings -> SettingsScreen(look, s, { look = it; app.store.look = it.id }) { app.store.session = null; session = null }
                                is Route.Library -> LibraryScreen(api, look, route.item, open)
                                is Route.Details -> DetailsScreen(api, look, route.id, { stack.add(Route.Play(it)) }, open)
                                is Route.Play -> Unit
                            }
                        }
                    }
                }
            }
        }
    }
    }
}

/** On a TV the navigation sits along the top, where a remote reaches it with Up. */
@Composable
private fun TvNav(look: Look, route: Route, stack: MutableList<Route>) {
    Row(Modifier.fillMaxWidth().background(look.background).padding(horizontal = 24.dp, vertical = 12.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(20.dp)) {
        Text("JELLYFLIX", color = look.accent, style = MaterialTheme.typography.titleLarge)
        @Composable fun entry(label: String, on: Boolean, go: () -> Unit) {
            Text(label.styled(look), Modifier.focusRing(look, go).padding(horizontal = 14.dp, vertical = 8.dp), color = if (on) look.accent else Color.White, style = MaterialTheme.typography.titleMedium)
        }
        entry("Home", route is Route.Home) { stack.clear(); stack.add(Route.Home) }
        entry("Search", route is Route.Search) { stack.clear(); stack.add(Route.Home); stack.add(Route.Search) }
        entry("Settings", route is Route.Settings) { stack.clear(); stack.add(Route.Home); stack.add(Route.Settings) }
    }
}
